import Phaser from 'phaser';
import { getServices } from '../adapters';
import { DEBUG_MODE, EVENTS, GAME_HEIGHT, GAME_WIDTH, PLAYER, SCENES, WORLD } from '../config';
import { biomeForDistance, type BiomeDef, type BiomeId } from '../data/BiomeDefs';
import { EquipEffects } from '../data/EquippableDefs';
import { GameState } from '../data/GameState';
import { POWERUP_DEFS, type PowerUpId } from '../data/PowerUpDefs';
import { Coin } from '../entities/Coin';
import { Obstacle } from '../entities/Obstacle';
import { ParticleEffects } from '../entities/ParticleEffects';
import { Player } from '../entities/Player';
import { AudioSystem } from '../systems/AudioSystem';
import { BiomeManager } from '../systems/BiomeManager';
import { CoinSpawner } from '../systems/CoinSpawner';
import { ComboSystem } from '../systems/ComboSystem';
import { GameEventBus } from '../systems/EventSystem';
import { NearMissDetector } from '../systems/NearMissDetector';
import { ObstacleSpawner } from '../systems/ObstacleSpawner';
import { PowerUpSpawner } from '../systems/PowerUpSpawner';
import { RunDirector } from '../systems/RunDirector';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Colors } from '../theme/colors';
import { DebugHUD } from '../ui/DebugHUD';
import { HUD } from '../ui/HUD';
import { Modal } from '../ui/Modal';
import { spawnFloatingText } from '../ui/FloatingText';
import { SceneTransition } from '../ui/SceneTransition';
import { JuiceManager } from '../utils/JuiceManager';
import { aabbDistance, clamp } from '../utils/MathUtils';
import { getTrailById } from '../data/SkinDefs';

interface GameSceneResumeStats {
  distance: number;
  score: number;
  coinsCollected: number;
  powerupsCollected: number;
  nearMisses: number;
  obstaclesBroken: number;
  survivedSeconds: number;
  rewardedReviveUsed?: boolean;
}

interface GameSceneData {
  revive?: boolean;
  resumeStats?: GameSceneResumeStats;
}

/**
 * GameScene principal — integra todas as mecânicas do gameplay.
 *
 * Princípios de cleanup (anti-leak):
 *  - Listeners do bus via `bus.onScoped(this, ...)` → auto-remove em shutdown
 *  - ScoreSystem timers via `scene.time.delayedCall` → auto-cancelados
 *  - Pools (Obstacle/Coin/PowerUp) limpos em `shutdown()`
 *  - Tweens infinitos sempre com referência guardada e `kill` em release
 *  - Window blur / pointercancel → libera input pra evitar dedo grudado
 */
export class GameScene extends Phaser.Scene {
  private bus = GameEventBus.instance();
  private state = GameState.instance();

  private player!: Player;
  private obstacleSpawner!: ObstacleSpawner;
  private coinSpawner!: CoinSpawner;
  private powerUpSpawner!: PowerUpSpawner;
  private runDirector!: RunDirector;
  private biomeManager!: BiomeManager;
  private scoreSystem!: ScoreSystem;
  private comboSystem = new ComboSystem();
  private nearMissDetector = new NearMissDetector();
  private hud!: HUD;
  private debugHud: DebugHUD | null = null;
  private juice!: JuiceManager;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private distance = 0;
  private worldSpeed: number = WORLD.BASE_SPEED;
  private speedMultiplier = 1;
  private bonusSpeedMultiplier = 1;
  private elapsedSeconds = 0;
  private survivedSeconds = 0;
  private coinsCollected = 0;
  private powerupsCollected = 0;
  private nearMissesThisRun = 0;
  private obstaclesBrokenThisRun = 0;
  private hasFreeRevive = false;
  private alreadyUsedRunRevive = false;
  private rewardedReviveUsed = false;
  private activeEffects = new Map<PowerUpId, { until: number }>();
  private dead = false;
  private paused = false;
  private inBonusTunnel = false;
  private bonusTunnelExitAt = 0;
  private nextTunnelCoinAt = 0;
  private tunnelExitSpawned = false;
  /** Flag pra spawnar o ceiling_hole UMA ÚNICA vez no fim do Citadel. */
  private ceilingHoleSpawned = false;
  /** Quando true, transição Citadel→Space em curso (player subindo pelo buraco). */
  private ascendingToSpace = false;
  /** Flags do gate cinemático Sea: entrada (navio) e saída (banco de areia). */
  private seaEntryGateSpawned = false;
  private seaExitGateSpawned = false;
  private descendingToSea = false;
  private ascendingFromSea = false;
  /** Próxima distância (m) onde o cofre/porquinho pode aparecer. */
  private nextCoinSafeAt = 1200;
  private tunnelDecor: Phaser.GameObjects.Container | null = null;
  private tunnelFlowLines: Phaser.GameObjects.Rectangle[] = [];
  private gameOverTransitionStarted = false;
  private gameOverFallbackHandle: number | null = null;

  /** Multitouch guard: só o primeiro pointer ativo controla o player. */
  private activePointerId: number | null = null;

  /** Handlers de window/document — armazenados pra remover em shutdown. */
  private windowBlurHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;
  private pointerCancelHandler: ((ev: PointerEvent) => void) | null = null;

  // Multipliers de equipável
  private coinMult = 1;
  private powerUpDurMult = 1;
  private magnetRangeMult = 1;
  private startsWithShield = false;
  private startsWithMagnetMs = 0;
  private scoreBaseMult = 1;
  private nearMissBoost = 1;
  private luckyDrop = 0;

  constructor() {
    super({ key: SCENES.GAME });
  }

  create(data: GameSceneData = {}): void {
    this.cleanedUp = false;
    const resumeStats = data.revive ? data.resumeStats : undefined;
    this.cameras.main.setScroll(0, 0).setZoom(1);
    // Bounds da câmera precisam cobrir TODAS as fases:
    //   • Surface     y=0..GAME_HEIGHT
    //   • Cave bonus  y=0..GAME_HEIGHT+SUBTERRANEAN_CAMERA_SCROLL
    //   • Sea         y=SEA_PHASE_OFFSET..SEA_PHASE_OFFSET+GAME_HEIGHT
    //   • Space       y=SPACE_PHASE_OFFSET..SPACE_PHASE_OFFSET+GAME_HEIGHT
    // Margem de 120px no topo e fundo pra easing/overshoot do pan.
    const boundsTop = WORLD.SPACE_PHASE_OFFSET - 120;          // -840
    const boundsBottom = WORLD.SEA_PHASE_OFFSET + GAME_HEIGHT + 120; // 1560
    this.cameras.main.setBounds(0, boundsTop, GAME_WIDTH, boundsBottom - boundsTop);

    this.dead = false;
    this.paused = false;
    // DEV: pula direto pra uma fase via botão DEV (limpo após uso)
    const devStart = this.registry.get('dev_start_meters') as number | undefined;
    this.registry.remove('dev_start_meters');
    this.registry.remove('dev_start_biome');
    this.distance = devStart ?? resumeStats?.distance ?? 0;
    this.elapsedSeconds = resumeStats?.survivedSeconds ?? 0;
    this.survivedSeconds = resumeStats?.survivedSeconds ?? 0;
    this.coinsCollected = resumeStats?.coinsCollected ?? 0;
    this.powerupsCollected = resumeStats?.powerupsCollected ?? 0;
    this.nearMissesThisRun = resumeStats?.nearMisses ?? 0;
    this.obstaclesBrokenThisRun = resumeStats?.obstaclesBroken ?? 0;
    this.hasFreeRevive = false;
    this.alreadyUsedRunRevive = false;
    this.rewardedReviveUsed = resumeStats?.rewardedReviveUsed ?? false;
    this.activeEffects.clear();
    this.activePointerId = null;
    this.speedMultiplier = 1;
    this.bonusSpeedMultiplier = 1;
    this.inBonusTunnel = false;
    this.bonusTunnelExitAt = 0;
    this.nextTunnelCoinAt = 0;
    this.tunnelExitSpawned = false;
    this.ceilingHoleSpawned = false;
    this.ascendingToSpace = false;
    this.seaEntryGateSpawned = false;
    this.seaExitGateSpawned = false;
    this.descendingToSea = false;
    this.ascendingFromSea = false;
    this.nextCoinSafeAt = (devStart ?? 0) + 1200;
    this.currentPhaseYOffset = 0;
    this.targetPhaseYOffset = 0;
    if (this.phaseTransitionTween) {
      try {
        this.phaseTransitionTween.stop();
      } catch {
        /* */
      }
      this.phaseTransitionTween = null;
    }
    this.tunnelDecor = null;
    this.tunnelFlowLines = [];
    this.gameOverTransitionStarted = false;
    this.gameOverFallbackHandle = null;

    this.computeEquipBonuses();

    this.juice = new JuiceManager(this);
    this.biomeManager = new BiomeManager(this);
    // DEV: se começou direto numa fase, pré-aponta o bioma certo antes
    // do init pra que as camadas iniciais já saiam temáticas.
    if (this.distance > 0) {
      this.biomeManager.current = biomeForDistance(this.distance);
    }
    this.biomeManager.init();

    const skinId = this.state.get().equippedSkin;
    const skinKey = this.textures.exists(`skin_${skinId}`) ? `skin_${skinId}` : 'skin_rock';
    this.player = new Player({
      scene: this,
      x: PLAYER.X,
      y: WORLD.GROUND_Y,
      textureKey: skinKey
    });

    const trailId = this.state.get().equippedTrail;
    const trailDef = getTrailById(trailId);
    if (trailDef) {
      this.trailEmitter = ParticleEffects.trail(this, this.player.sprite, trailDef.textureKey, trailDef.color);
    }

    this.obstacleSpawner = new ObstacleSpawner(this);
    this.coinSpawner = new CoinSpawner(this);
    this.powerUpSpawner = new PowerUpSpawner(this);
    this.runDirector = new RunDirector(this.obstacleSpawner, this.coinSpawner);
    this.powerUpSpawner.setLuckyDrop(this.luckyDrop);

    // DEV: aplica phaseYOffset INSTANTANEAMENTE (sem tween) se começou
    // numa fase com offset (Sea: +720, Space: −720). Player, câmera e
    // spawners são todos sincronizados pra fase escolhida.
    if (devStart && devStart > 0) {
      const startBiome = biomeForDistance(devStart);
      let initialOffset = 0;
      if (startBiome.id === 'sea') initialOffset = WORLD.SEA_PHASE_OFFSET;
      else if (startBiome.id === 'space') initialOffset = WORLD.SPACE_PHASE_OFFSET;

      this.currentPhaseYOffset = initialOffset;
      this.targetPhaseYOffset = initialOffset;
      this.obstacleSpawner.phaseYOffset = initialOffset;
      this.obstacleSpawner.currentBiomeId = startBiome.id;
      this.coinSpawner.phaseYOffset = initialOffset;
      this.player.setPhaseYOffset(initialOffset);
      // Reposiciona player no centro vertical da nova fase
      this.player.reviveAt(WORLD.GROUND_Y + initialOffset - 120);
      // Câmera alinhada à nova fase
      this.cameras.main.setScroll(0, initialOffset);

      // Pula gates já consumidos quando dev-start em fases avançadas
      if (devStart >= 7000) this.seaEntryGateSpawned = true;
      if (devStart >= 10000) this.seaExitGateSpawned = true;
      if (devStart >= 18000) this.ceilingHoleSpawned = true;

      // Se começa em Sea, ativa overlay de oceano imediatamente
      if (startBiome.id === 'sea') {
        this.biomeManager.setOceanView(true, 1);
        this.biomeManager.showSubterranean();
      }
    }

    this.hud = new HUD(this, () => this.togglePause());
    if (DEBUG_MODE) this.debugHud = new DebugHUD(this);

    this.scoreSystem = new ScoreSystem(this);
    this.scoreSystem.reset(this.scoreBaseMult, this.nearMissBoost);
    if (resumeStats) this.scoreSystem.rawScore = Math.max(0, resumeStats.score);
    this.comboSystem.reset();

    if (resumeStats) {
      this.player.reviveAt(220);
      this.player.setShield(true);
      this.bus.emit(EVENTS.DISTANCE_UPDATE, this.distance);
      this.biomeManager.updateForDistance(this.distance);
      this.bus.emit(EVENTS.POWERUP_COLLECTED, 'shield' as PowerUpId, 0);
      // Indicador visual: flash branco curto pra marcar a volta
      try {
        this.cameras.main.flash(360, 255, 255, 255, true);
      } catch {
        /* */
      }
    } else {
      const headStart = EquipEffects.headStartMeters({
        levels: this.state.get().equippableLevels,
        equipped: this.state.get().equippedSlots.filter((s): s is NonNullable<typeof s> => !!s)
      });
      if (headStart > 0) {
        this.distance = headStart;
        this.bus.emit(EVENTS.DISTANCE_UPDATE, this.distance);
      }

      if (this.startsWithShield) {
        this.player.setShield(true);
        this.bus.emit(EVENTS.POWERUP_COLLECTED, 'shield' as PowerUpId, 0);
      }
      if (this.startsWithMagnetMs > 0) {
        this.activatePowerUp('magnet', this.startsWithMagnetMs);
      }

      const startBoost = this.registry.get('start_boost') as PowerUpId | undefined;
      if (startBoost) {
        this.registry.remove('start_boost');
        this.activatePowerUp(startBoost, POWERUP_DEFS[startBoost].durationMs);
      }
    }
    // Após revive, garante 80m de pista limpa antes do próximo segmento.
    // Sem isso, o jogador volta com shield mas morre em 0.3s pq runDirector
    // spawna obstáculos imediatamente após a distância de morte.
    const graceMeters = resumeStats ? 80 : 0;
    this.runDirector.reset(this.distance + graceMeters);

    this.attachInput();
    this.attachBusListeners();
    this.registerShutdownCleanup();

    SceneTransition.enter(this);
  }

  private computeEquipBonuses(): void {
    const inputs = {
      levels: this.state.get().equippableLevels,
      equipped: this.state.get().equippedSlots.filter((s): s is NonNullable<typeof s> => !!s)
    };
    this.coinMult = EquipEffects.coinMultiplier(inputs);
    this.powerUpDurMult = EquipEffects.powerUpDurationMultiplier(inputs);
    this.magnetRangeMult = EquipEffects.magnetRangeMultiplier(inputs);
    this.startsWithShield = EquipEffects.startsWithShield(inputs);
    this.startsWithMagnetMs = EquipEffects.startsWithMagnetMs(inputs);
    this.scoreBaseMult = EquipEffects.scoreMultiplier(inputs);
    this.nearMissBoost = EquipEffects.nearMissBoostMultiplier(inputs);
    this.luckyDrop = EquipEffects.luckyDropChance(inputs);
  }

  /* -------- INPUT -------- */

  private attachInput(): void {
    this.input.addPointer(2);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    // Pointer sai do canvas → considerar como up (anti-stuck)
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);

    // Anti-sticky touch: window blur / visibility change / pointer cancel
    this.windowBlurHandler = () => this.forceReleaseInput();
    this.visibilityHandler = () => {
      if (document.hidden) this.forceReleaseInput();
    };
    this.pointerCancelHandler = () => this.forceReleaseInput();
    window.addEventListener('blur', this.windowBlurHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    window.addEventListener('pointercancel', this.pointerCancelHandler);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.dead || this.paused) return;
    // Multitouch: só o primeiro pointer ativo controla
    if (this.activePointerId !== null) return;
    this.activePointerId = pointer.id;
    this.player.onPointerDown(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.dead || this.paused) return;
    if (this.activePointerId !== pointer.id) return;
    this.player.onPointerMove(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId !== pointer.id) return;
    this.activePointerId = null;
    this.player.onPointerUp();
  }

  /** Força soltar input — chamado em pause, blur, visibility change. */
  private forceReleaseInput(): void {
    this.activePointerId = null;
    this.player?.onPointerUp();
  }

  /* -------- BUS -------- */

  private attachBusListeners(): void {
    this.bus.onScoped(this, EVENTS.NEAR_MISS, ((pos: { x: number; y: number }) => {
      this.handleNearMiss(pos.x, pos.y);
    }) as (...args: unknown[]) => void);

    // Transições de fase (Sea / Beach / Space) — disparadas em mudança
    // de bioma. Sea desce a câmera totalmente, Beach volta pra surface,
    // Space sobe totalmente. Diferente do bonus tunnel (parcial).
    this.bus.onScoped(this, EVENTS.BIOME_CHANGED, ((biome: BiomeDef) => {
      this.handleBiomeChange(biome.id);
    }) as (...args: unknown[]) => void);
  }

  /**
   * Transição entre fases que envolvem mudança de Y range. Tween da
   * câmera + tween do player (yPos) + ajuste dos spawners pra que
   * obstáculos/coins novos apareçam na nova faixa Y.
   */
  private targetPhaseYOffset = 0;
  private currentPhaseYOffset = 0;
  private phaseTransitionTween: Phaser.Tweens.Tween | null = null;

  private handleBiomeChange(biomeId: string): void {
    // Atualiza o bioma atual no spawner pra que novos obstáculos venham
    // da palette temática correta.
    this.obstacleSpawner.currentBiomeId = biomeId as BiomeId;

    // Sea ↔ Beach AGORA são controlados pelos gates cinemáticos
    // (sea_entry_ship / sea_exit_sandbank). Não auto-transiciona aqui.
    // Space continua via ceiling_hole — chama transitionPhaseYOffset
    // no próprio ascendToSpace, então também não precisamos aqui.
    if (biomeId === 'sea' || biomeId === 'beach' || biomeId === 'space') return;

    // Outros biomas (forest, cave, temple, volcano, citadel) sempre offset 0.
    if (this.currentPhaseYOffset === 0) return;
    this.transitionPhaseYOffset(0);
  }

  /**
   * Tween de transição de fase. Move câmera + player + spawners pro novo
   * Y offset com FX (woosh, flash, shake).
   *
   * `keepObstacle` preserva uma armadilha específica do clearActive —
   * usado pelos gates cinemáticos pra que o navio/banco visual continue
   * presente durante a pan da câmera (scroll natural até sair da tela).
   */
  private transitionPhaseYOffset(newOffset: number, keepObstacle?: Obstacle): void {
    this.targetPhaseYOffset = newOffset;
    const DURATION = 1500;

    // FX dramáticos pra anunciar a transição
    AudioSystem.instance().playWoosh();
    getServices().haptics.trigger('medium');
    const flashColor = newOffset > 0 ? 0x4ecdc4 : newOffset < 0 ? 0x9ec4ff : 0xffffff;
    this.juice.flashScreen(flashColor, 0.45, 700);
    this.juice.shake('medium', 220);

    // Limpa obstáculos antigos — estão na faixa Y antiga, sumiriam de tela.
    if (keepObstacle) {
      this.obstacleSpawner.clearActiveExcept(keepObstacle);
    } else {
      this.obstacleSpawner.clearActive();
    }

    // Tween simultâneo: câmera + player + spawner phaseYOffset
    if (this.phaseTransitionTween) this.phaseTransitionTween.stop();
    const targetCamY = GAME_HEIGHT / 2 + newOffset;
    this.cameras.main.pan(GAME_WIDTH / 2, targetCamY, DURATION, 'Sine.easeInOut');
    this.player.transitionToPhase(newOffset, DURATION);
    this.player.setImmuneFor(DURATION + 300);

    this.phaseTransitionTween = this.tweens.add({
      targets: this,
      currentPhaseYOffset: newOffset,
      duration: DURATION,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Spawners passam a colocar novos obstáculos/coins na nova faixa
        this.obstacleSpawner.phaseYOffset = this.currentPhaseYOffset;
        this.coinSpawner.phaseYOffset = this.currentPhaseYOffset;
      },
      onComplete: () => {
        this.currentPhaseYOffset = newOffset;
        this.obstacleSpawner.phaseYOffset = newOffset;
        this.coinSpawner.phaseYOffset = newOffset;
        this.phaseTransitionTween = null;
      }
    });
  }

  private handleNearMiss(x: number, y: number): void {
    this.scoreSystem.registerNearMiss();
    this.nearMissesThisRun += 1;
    ParticleEffects.spark(this, x, y, 6);
    AudioSystem.instance().playNearMiss();
    getServices().haptics.trigger('light');
    this.juice.flashScreen(0xffffff, 0.15, 80);
    this.juice.shake('light', 120);
    this.juice.slowMo(0.4, 80);
    spawnFloatingText({
      scene: this,
      x,
      y: y - 40,
      text: '+50',
      color: Colors.accent.coral,
      fontSize: 24
    });
  }

  /* -------- LOOP -------- */

  update(_time: number, dtMs: number): void {
    if (this.dead || this.paused) return;
    const dt = dtMs / 1000;
    this.elapsedSeconds += dt;
    this.survivedSeconds = this.elapsedSeconds;

    const baseSpeed = clamp(
      WORLD.BASE_SPEED * (1 + (this.distance / 100) * WORLD.SPEED_GROWTH_PER_100M),
      WORLD.BASE_SPEED,
      WORLD.MAX_SPEED
    );
    const proneSlow = this.player?.isProne ? WORLD.PRONE_SPEED_MULTIPLIER : 1;
    this.worldSpeed = baseSpeed * this.speedMultiplier * this.bonusSpeedMultiplier * proneSlow;

    const dx = this.worldSpeed * dt;
    this.distance += dx * 0.1;
    this.bus.emit(EVENTS.DISTANCE_UPDATE, this.distance);
    this.scoreSystem.addDistance(dx * 0.1);

    this.player.update(dtMs);
    this.biomeManager.updateForDistance(this.distance);

    // Bloqueia runDirector quando QUALQUER gate cinemático está ativo
    // (entrada/saída do mar, ascendendo pro space, no bonus tunnel).
    const gateActive = this.descendingToSea || this.ascendingFromSea || this.ascendingToSpace ||
      (this.seaEntryGateSpawned && this.currentPhaseYOffset === 0 && this.distance < 7000) ||
      (this.seaExitGateSpawned && this.currentPhaseYOffset === WORLD.SEA_PHASE_OFFSET && this.distance < 10000);

    if (this.inBonusTunnel) {
      this.updateBonusTunnel(dx);
    } else if (!gateActive) {
      const difficulty = this.biomeManager.difficultyMultiplier(this.distance);
      this.runDirector.update(this.distance, difficulty, biomeForDistance(this.distance));
      this.powerUpSpawner.update(this.distance);
    }

    // Spawn do CEILING_HOLE no fim do Citadel — gate pro Space (fase 8).
    if (!this.ceilingHoleSpawned && this.distance >= 17900 && !this.ascendingToSpace) {
      this.ceilingHoleSpawned = true;
      this.obstacleSpawner.spawnCeilingHole();
    }

    // Spawn do SEA_ENTRY_SHIP — gate cinemático pra entrar no mar.
    // Spawna ~200m antes do threshold de Sea (7000m), enquanto ainda em surface.
    if (!this.seaEntryGateSpawned && this.distance >= 6800 && this.currentPhaseYOffset === 0) {
      this.seaEntryGateSpawned = true;
      // Limpa obstáculos pendentes pra dar palco pro navio
      this.obstacleSpawner.clearActive();
      this.runDirector.reset(this.distance + 600);
      this.obstacleSpawner.spawnSeaEntryShip();
    }

    // Spawn do SEA_EXIT_SANDBANK — gate cinemático pra sair do mar pra praia.
    // Spawna ~200m antes do threshold de Beach (10000m), enquanto ainda em sea phase.
    if (!this.seaExitGateSpawned && this.distance >= 9800 && this.currentPhaseYOffset === WORLD.SEA_PHASE_OFFSET) {
      this.seaExitGateSpawned = true;
      this.obstacleSpawner.clearActive();
      this.runDirector.reset(this.distance + 600);
      this.obstacleSpawner.spawnSeaExitSandbank();
    }

    // Spawn do COFRE/PORQUINHO — surpresa rara estilo Jetpack Joyride.
    if (
      !this.inBonusTunnel &&
      !gateActive &&
      !this.ascendingToSpace &&
      this.distance >= this.nextCoinSafeAt
    ) {
      this.obstacleSpawner.spawnCoinSafe();
      this.nextCoinSafeAt = this.distance + 1200 + Math.floor(Math.random() * 800);
    }

    this.obstacleSpawner.step(dx, _time);
    this.coinSpawner.step(dx, () => this.comboSystem.registerMiss());
    this.powerUpSpawner.step(dx);
    this.biomeManager.step(dx);
    this.biomeManager.updateFlow(dx);

    this.updateCeilingPassthrough();
    this.checkObstacleCollisions();
    this.checkCoinCollisions();
    this.checkPowerUpCollisions();

    this.tickPowerUps(_time);
    this.hud.update();

    if (this.debugHud) {
      this.debugHud.update({
        obstaclesActive: this.obstacleSpawner.countActive(),
        obstaclesTotal: this.obstacleSpawner.countTotal(),
        coinsActive: this.coinSpawner.countActive(),
        coinsTotal: this.coinSpawner.countTotal(),
        powerupsActive: this.powerUpSpawner.countActive(),
        powerupsTotal: this.powerUpSpawner.countTotal(),
        particles: this.countParticles(),
        tweens: this.tweens.getTweens().length
      });
    }
  }

  private countParticles(): number {
    let total = 0;
    this.children.list.forEach((g) => {
      if (g instanceof Phaser.GameObjects.Particles.ParticleEmitter) {
        total += g.getAliveParticleCount();
      }
    });
    return total;
  }

  /* -------- BONUS TUNNEL -------- */

  private enterBonusTunnel(source: Obstacle): void {
    if (this.inBonusTunnel || source.triggered) return;
    source.triggered = true;
    this.inBonusTunnel = true;
    this.bonusTunnelExitAt = this.distance + 280;
    this.nextTunnelCoinAt = this.distance + 6;
    this.tunnelExitSpawned = false;
    this.bonusSpeedMultiplier = 1.12;

    // O buraco NÃO congela: scrolla com o mundo como qualquer outro
    // obstáculo, desaparecendo naturalmente pela esquerda da tela.
    this.player.setBonusTunnel(true);
    this.obstacleSpawner.clearActiveExcept(source);
    this.biomeManager.setSubterraneanView(true);
    this.biomeManager.showSubterranean();

    // Detecta o modo: SEGURANDO = controlado (mantém o dedo no comando),
    // SOLTO = cinemático (queda livre + dive head-first).
    if (this.player.isControlling) {
      this.enterTunnelControlled(source);
    } else {
      this.enterTunnelCinematic(source);
    }
  }

  /**
   * Entrada CONTROLADA: player tá pilotando com o dedo. Mantém o controle —
   * o drag em worldY acompanha o pan da câmera, então o player desce no
   * ritmo do dedo sem travar. Sem dive (não tá caindo de cabeça).
   */
  private enterTunnelControlled(source: Obstacle): void {
    this.player.enterCaveControlled();

    const holeX = source.worldX();
    this.spawnEntryDust(holeX, WORLD.GROUND_Y);

    // Pan um pouco mais rápido pra acompanhar o input ativo do player.
    this.cameras.main.pan(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + WORLD.SUBTERRANEAN_CAMERA_SCROLL,
      750,
      'Sine.easeInOut'
    );

    AudioSystem.instance().playWoosh();
    getServices().haptics.trigger('light');
  }

  /**
   * Entrada CINEMÁTICA: player solto. Dust + pan suave + woosh + dive
   * head-first do player. Gravidade leva até o fundo da cave.
   */
  private enterTunnelCinematic(source: Obstacle): void {
    this.player.enterCaveCinematic();

    const holeX = source.worldX();
    this.spawnEntryDust(holeX, WORLD.GROUND_Y);

    this.cameras.main.pan(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + WORLD.SUBTERRANEAN_CAMERA_SCROLL,
      900,
      'Sine.easeInOut'
    );

    AudioSystem.instance().playWoosh();
    getServices().haptics.trigger('light');
  }

  /** Burst de poeira escura — usado na entrada do bonus tunnel. */
  private spawnEntryDust(x: number, y: number): void {
    try {
      const e = this.add.particles(x, y, 'pixel', {
        lifespan: 700,
        speedY: { min: 60, max: 180 },
        speedX: { min: -80, max: 80 },
        scale: { start: 4, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: [0x6b4a30, 0x4a3520, 0x8a6a40, 0x2a1810],
        angle: { min: 250, max: 290 },
        gravityY: 240,
        emitting: false
      });
      e.explode(28, x, y);
      this.time.delayedCall(820, () => {
        try {
          e.destroy();
        } catch {
          /* */
        }
      });
    } catch {
      /* */
    }
  }

  /** Onda de choque radial escura — efeito de "queda no buraco". */
  private spawnEntryShockwave(x: number, y: number): void {
    try {
      const ring = this.add.circle(x, y, 20, 0x000000, 0.55);
      ring.setDepth(7000);
      this.tweens.add({
        targets: ring,
        radius: 180,
        alpha: 0,
        duration: 520,
        ease: 'Quart.easeOut',
        onComplete: () => ring.destroy()
      });
    } catch {
      /* */
    }
  }

  /** Vignette: overlay full-screen que escurece e depois clareia. */
  private flashVignette(color: number, peakAlpha: number, fadeInMs: number, fadeOutMs: number): void {
    try {
      const overlay = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 1.4, GAME_HEIGHT * 1.4, color, 0)
        .setDepth(8500)
        .setScrollFactor(0);
      this.tweens.add({
        targets: overlay,
        alpha: peakAlpha,
        duration: fadeInMs,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: fadeOutMs,
            ease: 'Quad.easeOut',
            onComplete: () => overlay.destroy()
          });
        }
      });
    } catch {
      /* */
    }
  }

  private updateBonusTunnel(dx: number): void {
    const biome = biomeForDistance(this.distance);
    if (!this.tunnelExitSpawned && this.distance >= this.nextTunnelCoinAt) {
      this.coinSpawner.spawnTunnelSegment(biome);
      this.nextTunnelCoinAt = this.distance + 28;
    }
    if (!this.tunnelExitSpawned && this.distance >= this.bonusTunnelExitAt) {
      this.tunnelExitSpawned = true;
      this.coinSpawner.spawnTunnelExitGuide(biome, GAME_WIDTH + 24);
      this.obstacleSpawner.spawnPipeExit(GAME_WIDTH + 300);
    }
    for (const line of this.tunnelFlowLines) {
      line.x -= dx * 2.2;
      if (line.x < -80) line.x = GAME_WIDTH + Math.random() * 100;
    }
  }

  private exitBonusTunnel(source?: Obstacle): void {
    if (!this.inBonusTunnel) return;
    this.inBonusTunnel = false;
    this.bonusSpeedMultiplier = 1;
    this.player.setBonusTunnel(false);
    this.player.exitJump(); // anim pulo + tween up + float center 2s + imune
    // Graça de 200m após saída — durante a flutuação de 2s, o mundo continua
    // scrollando. Player precisa de margem após o float terminar.
    this.runDirector.reset(this.distance + 200);

    // Restaura tom verde do chão (estrada volta ao normal — saiu da cave).
    this.biomeManager.setSubterraneanView(false);
    this.biomeManager.hideSubterranean();

    // O pipe_exit NÃO congela: scrolla com o mundo como qualquer outro
    // obstáculo. Tudo continua se movendo pra esquerda — sem dissonância.
    void source;

    // === SAÍDA FLUIDA ===
    // Apenas sparkles sutis + camera pan suave + woosh. Sem shockwave,
    // flash, hit pause ou shake — sentiam como bater em parede.

    const exitX = this.player.x;
    const exitY = WORLD.SUBTERRANEAN_TOP_Y;
    this.spawnExitSparkles(exitX, exitY);

    // Camera pan up — Sine.easeInOut pra transição natural.
    this.cameras.main.pan(GAME_WIDTH / 2, GAME_HEIGHT / 2, 900, 'Sine.easeInOut');

    AudioSystem.instance().playWoosh();
    getServices().haptics.trigger('light');

    // Decor da cave faz fade out suave
    if (this.tunnelDecor) {
      const decor = this.tunnelDecor;
      this.tweens.add({
        targets: decor,
        alpha: 0,
        duration: 520,
        ease: 'Quart.easeOut',
        onComplete: () => {
          try {
            decor.destroy();
          } catch {
            /* */
          }
        }
      });
    }
    this.tunnelDecor = null;
    this.tunnelFlowLines = [];
  }

  /** Burst de sparkles douradas — usado na saída do bonus tunnel. */
  private spawnExitSparkles(x: number, y: number): void {
    try {
      const e = this.add.particles(x, y, 'spark', {
        lifespan: 850,
        speedY: { min: -260, max: -100 },
        speedX: { min: -100, max: 100 },
        scale: { start: 1.6, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd166, 0xfff8c0, 0xffffff, 0xffe88a],
        gravityY: 120,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false
      });
      e.explode(34, x, y);
      this.time.delayedCall(950, () => {
        try {
          e.destroy();
        } catch {
          /* */
        }
      });
    } catch {
      /* */
    }
  }

  /** Onda de choque radial dourada — efeito de "explosão de luz" na saída. */
  private spawnExitShockwave(x: number, y: number): void {
    try {
      const ring = this.add.circle(x, y, 24, 0xffd166, 0.7);
      ring.setDepth(7000);
      this.tweens.add({
        targets: ring,
        radius: 220,
        alpha: 0,
        duration: 600,
        ease: 'Quart.easeOut',
        onComplete: () => ring.destroy()
      });
      // Anel duplo pra mais impacto
      const ring2 = this.add.circle(x, y, 12, 0xffffff, 0.85);
      ring2.setDepth(7001);
      this.tweens.add({
        targets: ring2,
        radius: 140,
        alpha: 0,
        duration: 480,
        ease: 'Quart.easeOut',
        delay: 80,
        onComplete: () => ring2.destroy()
      });
    } catch {
      /* */
    }
  }

  private buildTunnelDecor(): void {
    this.tunnelDecor?.destroy();
    this.tunnelFlowLines = [];
    const c = this.add.container(0, 0).setDepth(24).setAlpha(0);
    // O fundo subterrâneo já está sempre presente em BiomeManager.
    // Aqui só adicionamos detalhes "vivos" da cave (luzes, faixas) — sem
    // soil overlay que cobre o cenário acima.
    const ceiling = this.add.rectangle(GAME_WIDTH / 2, WORLD.SUBTERRANEAN_TOP_Y - 6, GAME_WIDTH, 4, 0x2f6b3f, 0.4);
    const floor = this.add.rectangle(GAME_WIDTH / 2, WORLD.SUBTERRANEAN_FLOOR_Y + 30, GAME_WIDTH, 24, 0x030604, 0.85);
    const rail = this.add.rectangle(GAME_WIDTH / 2, WORLD.SUBTERRANEAN_TOP_Y + 118, GAME_WIDTH, 3, Colors.accent.cyan, 0.14);
    c.add([ceiling, floor, rail]);
    for (let i = 0; i < 14; i++) {
      const line = this.add.rectangle(
        i * 104,
        WORLD.SUBTERRANEAN_FLOOR_Y - 42 - (i % 3) * 34,
        64,
        4,
        Colors.accent.yellow,
        0.18
      );
      this.tunnelFlowLines.push(line);
      c.add(line);
    }
    for (let i = 0; i < 6; i++) {
      const lamp = this.add.circle(80 + i * 230, WORLD.SUBTERRANEAN_TOP_Y - 8, 7, Colors.accent.green, 0.24);
      c.add(lamp);
      this.tweens.add({
        targets: lamp,
        alpha: { from: 0.22, to: 0.48 },
        duration: 700 + i * 80,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    this.tunnelDecor = c;
    this.tweens.add({ targets: c, alpha: 1, duration: 180, ease: 'Quad.easeOut' });
  }

  /* -------- COLLISIONS -------- */

  private checkObstacleCollisions(): void {
    if (this.inBonusTunnel) {
      this.checkBonusTunnelExitCollisions();
      return;
    }
    const hb = this.player.hitbox;
    let hitObstacle: Obstacle | null = null;
    this.obstacleSpawner.forEachActive((o) => {
      if (!o.alive || hitObstacle || !o.def) return;

      // === SPECIAL TRAPS (mecânica única) ===
      if (o.trapId === 'bonus_hole') {
        const onGroundLevel = this.player.y >= WORLD.GROUND_Y - 8;
        if (onGroundLevel && this.intersectsTriggers(hb, o)) {
          this.enterBonusTunnel(o);
        }
        return;
      }
      if (o.trapId === 'pipe_exit') return;
      if (o.trapId === 'ceiling_hole') {
        this.checkCeilingHole(o);
        return;
      }
      if (o.trapId === 'sea_entry_ship') {
        this.checkSeaEntryShip(o);
        return;
      }
      if (o.trapId === 'sea_exit_sandbank') {
        this.checkSeaExitSandbank(o);
        return;
      }

      // === SOFT HIT (cofre/porquinho): bate, sai moeda, NÃO mata ===
      if (o.def.softHit) {
        if (this.intersects(hb, o) && o.alive) {
          this.handleCoinSafeHit(o);
        }
        return;
      }

      this.nearMissDetector.check(hb, o);

      // === ROCKET: destrói tudo no caminho ===
      if (this.player.boosting) {
        if (this.intersects(hb, o)) {
          this.obstaclesBrokenThisRun += 1;
          this.scoreSystem.addDistance(20);
          ParticleEffects.spark(this, o.worldX(), this.player.y);
          this.bus.emit(EVENTS.OBSTACLE_BROKEN);
          o.smash(() => this.obstacleSpawner.releaseObstacle(o));
        }
        return;
      }

      // === PHANTOM: passa por traps sólidos exceto low (ar) ===
      if (this.player.phantom && o.def.category !== 'low') return;

      // === GROUND TRAPS: dano só quando o player toca o chão ===
      // O hitbox da trap fica colado no solo. Pulo afasta o hitbox do
      // player e zera o intersect. O check abaixo é defensivo (deixa
      // visuais como chama/plasma se estenderem alto sem afetar hitbox):
      // qualquer player com centro vertical acima da faixa de slide
      // (≈ GROUND_Y - 30) está claramente saltando — passa em segurança.
      const groundLevel = this.player.y >= WORLD.GROUND_Y + (this.obstacleSpawner.phaseYOffset || 0) - 30;
      if (o.def.damageOnSlideOnly && !groundLevel) {
        return;
      }

      if (this.intersects(hb, o)) {
        hitObstacle = o;
      }
    });

    if (hitObstacle) this.handleHit(hitObstacle);
  }

  /**
   * Cofre/porquinho: cada hit não-fatal, no último explode em chuva dourada.
   * Sai moedas, feedback áudio/haptic/juice, mas player não morre.
   */
  private handleCoinSafeHit(o: Obstacle): void {
    if (this.time.now < o.softHitLockUntilMs) return;
    o.softHitLockUntilMs = this.time.now + 80;

    const x = o.worldX();
    const y = o.container.y + 380; // centerY hardcoded no buildCoinSafe
    const destroyed = o.applySoftHit();

    try {
      ParticleEffects.spark(this, x, y, 8);
      AudioSystem.instance().playCoin(o.maxHp - o.hp);
      getServices().haptics.trigger('medium');
      this.juice.shake('light', 100);
    } catch {
      /* */
    }

    if (!destroyed) {
      this.spawnCoinsBurst(x, y, 4);
      spawnFloatingText({
        scene: this,
        x,
        y: y - 40,
        text: `+4`,
        color: Colors.accent.yellow,
        fontSize: 20,
        rise: 50
      });
      return;
    }

    // Hit final: bônus direto + chuva grande
    const directReward = 12;
    this.coinsCollected += directReward;
    this.state.addCoins(directReward, { deferSave: true });
    this.bus.emit(EVENTS.COIN_COLLECTED, this.state.get().coins);

    spawnFloatingText({
      scene: this,
      x,
      y: y - 50,
      text: `COFRE +${directReward}!`,
      color: Colors.accent.yellow,
      fontSize: 28,
      rise: 80
    });

    this.spawnCoinsBurst(x, y, 14);

    try {
      AudioSystem.instance().playPowerUp();
      getServices().haptics.trigger('heavy');
      this.juice.flashScreen(Colors.accent.yellow, 0.4, 320);
      this.juice.shake('medium', 280);
      this.juice.hitPause(60);
      ParticleEffects.coinPop(this, x, y, Colors.accent.yellow);
    } catch {
      /* */
    }

    o.smash(() => this.obstacleSpawner.releaseObstacle(o));
  }

  /** Burst de moedas radial — usado pelo cofre em cada hit + explosão. */
  private spawnCoinsBurst(x: number, y: number, count: number): void {
    const biome = biomeForDistance(this.distance);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.7 + (i / Math.max(1, count - 1)) * Math.PI * 0.4;
      const dist = 60 + Math.random() * 80;
      const cx = x + Math.cos(angle) * dist;
      const cy = y + Math.sin(angle) * dist;
      this.coinSpawner.spawnSingleAt(cx, cy, biome);
    }
  }

  /**
   * Quando o player está horizontalmente alinhado com a abertura do
   * pipe_exit, libera o teto pra ele subir acima do nível da cave (passar
   * 100% pelo buraco). Fora do alinhamento, o teto é sólido e o player
   * trava no SUBTERRANEAN_TOP_Y.
   */
  private updateCeilingPassthrough(): void {
    if (!this.inBonusTunnel) {
      this.player.setCeilingPassthrough(false);
      return;
    }
    const hb = this.player.hitbox;
    let aligned = false;
    this.obstacleSpawner.forEachActive((o) => {
      if (!o.alive || o.trapId !== 'pipe_exit' || aligned) return;
      for (const ohb of o.getWorldTriggerHitboxes()) {
        // Apenas checagem HORIZONTAL (vertical é determinado pelo player).
        if (hb.x + hb.w > ohb.x && hb.x < ohb.x + ohb.w) {
          aligned = true;
          break;
        }
      }
    });
    this.player.setCeilingPassthrough(aligned);
  }

  private checkBonusTunnelExitCollisions(): void {
    const hb = this.player.hitbox;
    let hitObstacle: Obstacle | null = null;
    // Player precisa ter o CORPO INTEIRO acima da abertura do buraco
    // (passou 100%). Hole top visual ≈ ceilingY - 11 (parte de cima da elipse
    // do buraco escuro). Hitbox bottom <= hole top → y + h/2 <= top.
    const fullyAboveBottomY = WORLD.SUBTERRANEAN_TOP_Y - 11;
    this.obstacleSpawner.forEachActive((o) => {
      if (!o.alive || hitObstacle || o.trapId !== 'pipe_exit') return;

      // Trigger só dispara quando 100% do hitbox está ACIMA do buraco
      // (player conseguiu subir através) E o player está alinhado horizontalmente.
      const playerBottom = hb.y + hb.h;
      const fullyAbove = playerBottom <= fullyAboveBottomY;
      if (fullyAbove) {
        let horizontallyInside = false;
        for (const ohb of o.getWorldTriggerHitboxes()) {
          if (hb.x + hb.w > ohb.x && hb.x < ohb.x + ohb.w) {
            horizontallyInside = true;
            break;
          }
        }
        if (horizontallyInside) {
          o.triggered = true;
          this.exitBonusTunnel(o);
          return;
        }
      }

      if (this.intersects(hb, o)) {
        hitObstacle = o;
      }
    });

    if (hitObstacle) {
      this.die();
    }
  }

  /**
   * CEILING_HOLE (gate Citadel→Space): check tipo pipe_exit invertido.
   * Trigger só dispara quando o player tem o CORPO INTEIRO acima do buraco
   * do teto (y + h <= hole top) E está alinhado horizontalmente. Caso
   * contrário, hitbox da parede mata.
   */
  private checkCeilingHole(o: Obstacle): void {
    if (this.ascendingToSpace) return;
    const hb = this.player.hitbox;

    // Atualiza yMin override pra deixar o player subir pelo buraco quando
    // alinhado horizontalmente. Sem isso, o teto (PLAYER.Y_MIN=120) trava
    // o player e ele nunca consegue passar 100% pra cima.
    let horizontallyInside = false;
    for (const ohb of o.getWorldTriggerHitboxes()) {
      if (hb.x + hb.w > ohb.x && hb.x < ohb.x + ohb.w) {
        horizontallyInside = true;
        break;
      }
    }
    this.player.setSurfaceCeilingPassthrough(horizontallyInside);

    // Trigger fires quando hitbox bottom <= top do buraco (≈ y=30)
    const fullyAboveY = 30;
    const playerBottom = hb.y + hb.h;
    if (horizontallyInside && playerBottom <= fullyAboveY) {
      o.triggered = true;
      this.ascendToSpace(o);
      return;
    }

    // Não subiu → checa hitbox da parede (mata player)
    if (this.intersects(hb, o)) {
      this.die();
    }
  }

  /**
   * Trigger CITADEL→SPACE pelo ceiling_hole. Bumpa a distance pro
   * threshold do Space E aciona transitionPhaseYOffset diretamente
   * (handleBiomeChange ignora 'space' agora, transitions são manuais).
   */
  private ascendToSpace(source: Obstacle): void {
    if (this.ascendingToSpace) return;
    this.ascendingToSpace = true;

    this.player.setSurfaceCeilingPassthrough(false);
    this.runDirector.reset(this.distance + 200);

    // Bumpa pro threshold do Space (atualiza palette do bioma + bg)
    this.distance = Math.max(this.distance, 18000);
    this.biomeManager.updateForDistance(this.distance);
    // Dispara transição manual (handleBiomeChange skip 'space')
    this.transitionPhaseYOffset(WORLD.SPACE_PHASE_OFFSET, source);

    this.time.delayedCall(1700, () => {
      this.ascendingToSpace = false;
    });
  }

  /* ====================== SEA CINEMATIC GATES ====================== */

  /**
   * SEA_ENTRY_SHIP: navio gigante atravessado da "ceu" até o mar.
   * Trigger só dispara quando o player desliza ao nível d'água (prone)
   * e está horizontalmente alinhado com a faixa de água. Caso contrário,
   * bate no casco e morre.
   */
  private checkSeaEntryShip(o: Obstacle): void {
    if (this.descendingToSea) return;
    const hb = this.player.hitbox;

    // Trigger horizontal: dentro da faixa de água do navio?
    let horizontallyInside = false;
    for (const ohb of o.getWorldTriggerHitboxes()) {
      if (hb.x + hb.w > ohb.x && hb.x < ohb.x + ohb.w) {
        horizontallyInside = true;
        break;
      }
    }

    // Trigger vertical: player está rente à água? (no chão = slide level)
    const onSurfaceLevel = this.player.y >= WORLD.GROUND_Y - 12;
    if (horizontallyInside && onSurfaceLevel) {
      o.triggered = true;
      this.descendToSea(o);
      return;
    }

    // Não está mergulhando → casco mata
    if (this.intersects(hb, o)) {
      this.die();
    }
  }

  /**
   * Mergulho cinematográfico: bumpa a distance pro Sea, ativa overlay
   * de oceano, dispara transitionPhaseYOffset(+720). Source preservada
   * pra scrollar fora da tela naturalmente.
   */
  private descendToSea(source: Obstacle): void {
    if (this.descendingToSea) return;
    this.descendingToSea = true;

    // Splash de água quando o player mergulha
    this.spawnWaterSplash(this.player.x, WORLD.GROUND_Y, 0x4ecdc4);

    // Bumpa pro threshold do Sea (palette do bioma + bg crossfade)
    this.distance = Math.max(this.distance, 7000);
    this.biomeManager.updateForDistance(this.distance);

    // Ativa visual oceânico (bolhas, light shafts, tint azul)
    this.biomeManager.setOceanView(true);
    this.biomeManager.showSubterranean();

    // Tween de fase (handleBiomeChange skip 'sea' — chamamos manualmente)
    this.transitionPhaseYOffset(WORLD.SEA_PHASE_OFFSET, source);

    // Reseta director com graça pra dar margem antes dos sea traps
    this.runDirector.reset(this.distance + 200);

    this.time.delayedCall(1800, () => {
      this.descendingToSea = false;
    });
  }

  /**
   * SEA_EXIT_SANDBANK: banco de areia subindo do fundo. Player deve
   * estar no TOPO do range underwater + alinhado horizontalmente pra
   * "breachar" a superfície. Caso contrário, bate no banco e morre.
   */
  private checkSeaExitSandbank(o: Obstacle): void {
    if (this.ascendingFromSea) return;
    const hb = this.player.hitbox;

    // Trigger horizontal
    let horizontallyInside = false;
    for (const ohb of o.getWorldTriggerHitboxes()) {
      if (hb.x + hb.w > ohb.x && hb.x < ohb.x + ohb.w) {
        horizontallyInside = true;
        break;
      }
    }

    // Trigger vertical: player no topo do range underwater?
    // yMin do player em sea = PLAYER.Y_MIN(120) + SEA_OFFSET(720) = 840
    // Tolerância de 30px pra dar conforto
    const atSurfaceTop = this.player.y <= WORLD.SEA_PHASE_OFFSET + PLAYER.Y_MIN + 30;
    if (horizontallyInside && atSurfaceTop) {
      o.triggered = true;
      this.ascendFromSea(o);
      return;
    }

    // Bater no banco mata
    if (this.intersects(hb, o)) {
      this.die();
    }
  }

  /**
   * Emerge do oceano pra praia. Bumpa distance pro Beach, desativa overlay
   * de oceano, transitionPhaseYOffset(0).
   */
  private ascendFromSea(source: Obstacle): void {
    if (this.ascendingFromSea) return;
    this.ascendingFromSea = true;

    // Splash branco no surface — saindo da água
    this.spawnWaterSplash(this.player.x, WORLD.GROUND_Y + WORLD.SEA_PHASE_OFFSET - 700, 0xfff8c0);

    this.distance = Math.max(this.distance, 10000);
    this.biomeManager.updateForDistance(this.distance);

    this.biomeManager.setOceanView(false);
    this.biomeManager.hideSubterranean();

    this.transitionPhaseYOffset(0, source);

    this.runDirector.reset(this.distance + 200);

    this.time.delayedCall(1800, () => {
      this.ascendingFromSea = false;
    });
  }

  /** Splash de água — partículas azul-claras subindo + dispersando. */
  private spawnWaterSplash(x: number, y: number, tint: number): void {
    try {
      const e = this.add.particles(x, y, 'pixel', {
        lifespan: 700,
        speedY: { min: -360, max: -120 },
        speedX: { min: -200, max: 200 },
        scale: { start: 4, end: 0 },
        alpha: { start: 0.95, end: 0 },
        tint: [tint, 0xffffff, 0xc0e0ff],
        angle: { min: 250, max: 290 },
        gravityY: 600,
        emitting: false
      });
      e.explode(36, x, y);
      this.time.delayedCall(900, () => {
        try {
          e.destroy();
        } catch {
          /* */
        }
      });
    } catch {
      /* */
    }
  }

  private intersects(hb: { x: number; y: number; w: number; h: number }, o: Obstacle): boolean {
    for (const ohb of o.getWorldHitboxes()) {
      const d = aabbDistance(hb.x, hb.y, hb.w, hb.h, ohb.x, ohb.y, ohb.w, ohb.h);
      if (d === 0) return true;
    }
    return false;
  }

  private intersectsTriggers(hb: { x: number; y: number; w: number; h: number }, o: Obstacle): boolean {
    for (const ohb of o.getWorldTriggerHitboxes()) {
      const d = aabbDistance(hb.x, hb.y, hb.w, hb.h, ohb.x, ohb.y, ohb.w, ohb.h);
      if (d === 0) return true;
    }
    return false;
  }

  private handleHit(o: Obstacle): void {
    if (this.player.shield) {
      this.player.setShield(false);
      this.bus.emit(EVENTS.POWERUP_EXPIRED, 'shield' as PowerUpId);
      this.playProtectedImpactFeedback('shield');
      o.nearMissCounted = true;
      o.container.x -= 30;
      return;
    }
    this.die();
  }

  private die(): void {
    if (this.dead) return;
    // Imunidade temporária (pós-exit da cave) — ignora o hit silenciosamente.
    if (this.player.isImmune()) return;
    if (this.hasFreeRevive && !this.alreadyUsedRunRevive) {
      this.alreadyUsedRunRevive = true;
      this.hasFreeRevive = false;
      this.applyRevive();
      return;
    }
    this.dead = true;

    // ORDEM CRÍTICA — primeiro o que NUNCA pode falhar:
    //   1. Agendar transição (timers wall-clock independentes)
    //   2. Reset de estado (idempotente, try/catch interno)
    //   3. Feedback visual (todo wrappeado em try/catch)
    // Se 2 ou 3 lançarem, a transição em 1 já foi agendada.
    try {
      this.scheduleGameOverTransition();
    } catch (err) {
      console.error('[GameScene] scheduleGameOverTransition lançou', err);
      this.goToGameOver();
      return;
    }

    try {
      this.player.setDead();
    } catch (err) {
      console.error('[GameScene] player.setDead lançou', err);
    }
    try {
      this.hardResetSceneState();
    } catch (err) {
      console.error('[GameScene] hardResetSceneState lançou', err);
    }
    try {
      this.playProtectedDeathFeedback();
    } catch (err) {
      console.error('[GameScene] playProtectedDeathFeedback lançou', err);
    }
  }

  /** Reset defensivo de timeScale e câmera — chamável a qualquer momento. */
  private hardResetSceneState(): void {
    try {
      this.tweens.timeScale = 1;
      this.time.timeScale = 1;
    } catch {
      /* ignora */
    }
    try {
      // Reseta efeitos de câmera individualmente — mais robusto que resetFX().
      const cam = this.cameras.main;
      cam.panEffect?.reset();
      cam.zoomEffect?.reset();
      cam.shakeEffect?.reset();
      cam.flashEffect?.reset();
      cam.fadeEffect?.reset();
      cam.setZoom(1);
      cam.setScroll(0, 0);
    } catch {
      /* ignora */
    }
  }

  private scheduleGameOverTransition(): void {
    const fire = () => {
      try {
        this.goToGameOver();
      } catch (err) {
        console.error('[GameScene] goToGameOver lançou', err);
      }
    };
    if (typeof window === 'undefined') {
      fire();
      return;
    }
    // Primário: 500ms. Independente do scene clock.
    this.gameOverFallbackHandle = window.setTimeout(fire, 500);
    // Backup: 1.2s — se goToGameOver lançou no primeiro, tenta de novo.
    window.setTimeout(fire, 1200);
    // Hard fallback: 2.5s — força HOME se ainda não conseguimos.
    window.setTimeout(() => {
      if (!this.gameOverTransitionStarted) {
        console.error('[GameScene] hard fallback — forçando HOME');
        try {
          this.scene.start(SCENES.HOME);
        } catch (err) {
          console.error('[GameScene] HOME fallback falhou', err);
        }
      }
    }, 2500);
  }

  private playProtectedImpactFeedback(kind: 'shield' | 'death'): void {
    try {
      AudioSystem.instance().playImpact();
    } catch {
      // Feedback nao pode impedir o jogo de continuar.
    }
    try {
      getServices().haptics.trigger(kind === 'death' ? 'heavy' : 'medium');
    } catch {
      // Web/native haptics podem falhar silenciosamente.
    }
    try {
      if (kind === 'death') {
        this.juice.shake('heavy', 380);
        this.juice.flashScreen(Colors.accent.coral, 0.35, 280);
      } else {
        this.juice.shake('medium', 200);
        this.juice.flashScreen(Colors.accent.cyan, 0.25, 200);
      }
    } catch {
      this.tweens.timeScale = 1;
    }
  }

  private playProtectedDeathFeedback(): void {
    try {
      this.playProtectedImpactFeedback('death');
    } catch (err) {
      console.error('[GameScene] playProtectedImpactFeedback (death) lançou', err);
    }
    try {
      ParticleEffects.deathExplosion(this, this.player.sprite.x, this.player.y);
    } catch (err) {
      console.error('[GameScene] deathExplosion lançou', err);
    }
    try {
      this.tweens.add({
        targets: this.player.sprite,
        alpha: 0,
        duration: 220
      });
    } catch (err) {
      console.error('[GameScene] player alpha tween lançou', err);
      this.tweens.timeScale = 1;
    }
    try {
      this.bus.emit(EVENTS.PLAYER_DIED);
    } catch (err) {
      console.error('[GameScene] bus.emit PLAYER_DIED lançou', err);
    }
  }

  private applyRevive(): void {
    this.player.reviveAt(220);
    AudioSystem.instance().playPowerUp();
    this.cameras.main.flash(220, 255, 255, 255);
    this.bus.emit(EVENTS.PLAYER_REVIVED);
    // Limpa obstáculos próximos
    this.obstacleSpawner.forEachActive((o) => {
      const dx = o.worldX() - this.player.sprite.x;
      if (dx > -100 && dx < 400) {
        this.obstacleSpawner.releaseObstacle(o);
      }
    });
    this.player.setShield(true);
    this.bus.emit(EVENTS.POWERUP_COLLECTED, 'shield' as PowerUpId, 0);
  }

  private checkCoinCollisions(): void {
    const hb = this.player.hitbox;
    const magnetActive = this.activeEffects.has('magnet');
    const magnetRadius = magnetActive ? 200 * this.magnetRangeMult : 0;

    this.coinSpawner.forEachActive((c) => {
      if (!c.alive) return;
      const dx = c.worldX() - (hb.x + hb.w / 2);
      const dy = c.worldY() - (hb.y + hb.h / 2);
      const dist = Math.hypot(dx, dy);

      if (magnetActive && dist < magnetRadius && !c.beingAttracted) {
        c.beingAttracted = true;
        this.tweens.add({
          targets: c.sprite,
          x: hb.x + hb.w / 2,
          y: hb.y + hb.h / 2,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (c.alive) this.collectCoin(c);
          }
        });
        return;
      }

      if (dist < 36) this.collectCoin(c);
    });
  }

  private collectCoin(c: Coin): void {
    if (!c.alive) return;
    const tier = c.tier;
    const has2x = this.activeEffects.has('coins2x');
    // Sem multiplicador de combo — agora é bônus fixo a cada 10 moedas
    const baseValue = c.baseValue * (has2x ? 2 : 1) * this.coinMult;
    const value = Math.round(baseValue);
    this.coinsCollected += value;
    this.state.addCoins(value, { deferSave: true });

    // Combo: bônus crescente a cada múltiplo de 10
    const bonus = this.comboSystem.registerCollect();
    if (bonus > 0) {
      this.coinsCollected += bonus;
      this.state.addCoins(bonus, { deferSave: true });
      this.spawnComboBonusFx(c.sprite.x, c.sprite.y, bonus, this.comboSystem.streak);
    }

    AudioSystem.instance().playCoin(this.comboSystem.streak);
    getServices().haptics.trigger('light');
    ParticleEffects.coinPop(this, c.sprite.x, c.sprite.y, this.coinTint(tier));
    spawnFloatingText({
      scene: this,
      x: c.sprite.x,
      y: c.sprite.y,
      text: `+${value}`,
      color: this.coinTint(tier),
      fontSize: 18,
      rise: 50
    });
    c.collect(() => this.coinSpawner.releaseCoin(c));
    this.bus.emit(EVENTS.COIN_COLLECTED, this.state.get().coins);
  }

  private spawnComboBonusFx(x: number, y: number, bonus: number, streak: number): void {
    const intensity = Math.min(1.5, 0.6 + bonus * 0.15);
    spawnFloatingText({
      scene: this,
      x,
      y: y - 30,
      text: `COMBO ×${streak}  +${bonus}`,
      color: Colors.accent.yellow,
      fontSize: bonus >= 5 ? Math.round(22 + bonus * 3) : Math.round(22 + bonus * 2),
      rise: 70
    });
    try {
      ParticleEffects.coinPop(this, x, y, Colors.accent.yellow);
      this.juice.flashScreen(Colors.accent.yellow, 0.25 * intensity, 220);
      this.juice.shake('light', 120);
      AudioSystem.instance().playPowerUp();
      getServices().haptics.trigger('medium');
    } catch {
      /* feedback opcional */
    }
  }

  private coinTint(tier: string): number {
    const tints: Record<string, number> = {
      bronze: 0xcd7f32,
      silver: 0xe6e6e6,
      gold: 0xffd700,
      diamond: 0x6ee0ff,
      legendary: 0xff66ff
    };
    return tints[tier] ?? 0xffd700;
  }

  private checkPowerUpCollisions(): void {
    const hb = this.player.hitbox;
    this.powerUpSpawner.forEachActive((p) => {
      if (!p.alive) return;
      const dx = p.worldX() - (hb.x + hb.w / 2);
      const dy = p.worldY() - (hb.y + hb.h / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 38) {
        const id = p.id;
        this.activatePowerUp(id, POWERUP_DEFS[id].durationMs);
        this.powerupsCollected += 1;
        ParticleEffects.powerUpFlash(this, p.sprite.x, p.sprite.y, POWERUP_DEFS[id].color);
        AudioSystem.instance().playPowerUp();
        getServices().haptics.trigger('medium');
        this.juice.flashScreen(POWERUP_DEFS[id].color, 0.3, 220);
        this.juice.hitPause(80);
        p.collect(() => this.powerUpSpawner.releasePowerUp(p));
      }
    });
  }

  private activatePowerUp(id: PowerUpId, baseDurationMs: number): void {
    const duration = baseDurationMs > 0 ? Math.round(baseDurationMs * this.powerUpDurMult) : 0;

    switch (id) {
      case 'rocket':
        // Foguete: velocidade alta, animação de lançamento dramática.
        this.player.setBoosting(true);
        this.speedMultiplier = 2.6;
        AudioSystem.instance().playWoosh();
        this.juice.shake('medium', 220);
        this.juice.flashScreen(Colors.accent.coral, 0.32, 260);
        break;
      case 'shield':
        this.player.setShield(true);
        this.bus.emit(EVENTS.POWERUP_COLLECTED, 'shield', 0);
        return;
      case 'magnet':
        break;
      case 'coins2x':
        break;
      case 'slowmo':
        this.speedMultiplier = 0.6;
        break;
      case 'phantom':
        this.player.setPhantom(true);
        break;
      case 'revive':
        this.hasFreeRevive = true;
        this.bus.emit(EVENTS.POWERUP_COLLECTED, 'revive', 0);
        return;
      case 'coinrain':
        this.coinSpawner.spawnRain(biomeForDistance(this.distance), 18, this.inBonusTunnel);
        break;
      case 'mini':
        this.player.setMini(true);
        break;
    }

    if (duration > 0) {
      const existing = this.activeEffects.get(id);
      const newUntil = this.time.now + duration;
      if (existing) existing.until = Math.max(existing.until, newUntil);
      else this.activeEffects.set(id, { until: newUntil });
      this.bus.emit(EVENTS.POWERUP_COLLECTED, id, duration);
    }
  }

  private tickPowerUps(now: number): void {
    for (const [id, eff] of Array.from(this.activeEffects.entries())) {
      if (now >= eff.until) {
        this.deactivatePowerUp(id);
      }
    }
  }

  private deactivatePowerUp(id: PowerUpId): void {
    this.activeEffects.delete(id);
    switch (id) {
      case 'rocket':
        this.player.setBoosting(false);
        this.speedMultiplier = 1;
        // Após o lançamento, mesma sequência de saída do túnel bonus:
        // tween up + flutuação 2s + imunidade.
        this.player.exitJump();
        break;
      case 'slowmo':
        this.speedMultiplier = 1;
        break;
      case 'phantom':
        this.player.setPhantom(false);
        break;
      case 'mini':
        this.player.setMini(false);
        break;
    }
    this.bus.emit(EVENTS.POWERUP_EXPIRED, id);
  }

  /* -------- PAUSE / GAMEOVER -------- */

  private togglePause(): void {
    if (this.dead) return;
    this.paused = true;
    this.forceReleaseInput();
    new Modal({
      scene: this,
      title: 'Pausado',
      message: 'Continue ou volte para o menu.',
      buttons: [
        {
          label: 'Menu',
          onClick: () => this.scene.start(SCENES.HOME)
        },
        {
          label: 'Continuar',
          primary: true,
          onClick: () => {
            this.paused = false;
          }
        }
      ]
    });
  }

  private goToGameOver(): void {
    if (this.gameOverTransitionStarted) return;
    this.gameOverTransitionStarted = true;

    if (this.gameOverFallbackHandle !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.gameOverFallbackHandle);
      this.gameOverFallbackHandle = null;
    }

    // Reset defensivo (idempotente — pode já ter rodado em die()).
    this.hardResetSceneState();

    let stats: GameSceneResumeStats & { newRecord: boolean };
    try {
      stats = this.buildGameOverStats();
    } catch (err) {
      console.error('[GameScene] buildGameOverStats falhou', err);
      stats = {
        distance: Math.max(0, Math.floor(this.distance)),
        score: Math.max(0, Math.floor(this.distance)),
        coinsCollected: this.coinsCollected,
        powerupsCollected: this.powerupsCollected,
        nearMisses: this.nearMissesThisRun,
        obstaclesBroken: this.obstaclesBrokenThisRun,
        survivedSeconds: this.survivedSeconds,
        rewardedReviveUsed: this.rewardedReviveUsed,
        newRecord: false
      };
    }

    try {
      this.scene.start(SCENES.GAME_OVER, stats);
    } catch (err) {
      console.error('[GameScene] scene.start GAME_OVER falhou', err);
      this.gameOverTransitionStarted = false;
      try {
        this.scene.start(SCENES.HOME);
      } catch (err2) {
        console.error('[GameScene] scene.start HOME fallback falhou', err2);
      }
    }
  }

  private buildGameOverStats(): GameSceneResumeStats & { newRecord: boolean } {
    const score = (() => {
      try {
        return this.scoreSystem.finalScore();
      } catch (err) {
        console.error('[GameScene] Falha ao calcular score final', err);
        return Math.floor(this.distance);
      }
    })();
    const bestDistance = (() => {
      try {
        return this.state.get().bestDistance;
      } catch (err) {
        console.error('[GameScene] Falha ao ler recorde', err);
        return 0;
      }
    })();
    return {
      distance: this.distance,
      score,
      coinsCollected: this.coinsCollected,
      powerupsCollected: this.powerupsCollected,
      nearMisses: this.nearMissesThisRun,
      obstaclesBroken: this.obstaclesBrokenThisRun,
      survivedSeconds: this.survivedSeconds,
      rewardedReviveUsed: this.rewardedReviveUsed,
      newRecord: this.distance > bestDistance
    };
  }

  /* -------- SHUTDOWN -------- */

  /**
   * Registra um único callback de SHUTDOWN que limpa TUDO criado pela scene.
   * Idempotente: pode ser chamado múltiplas vezes sem efeito colateral.
   */
  private registerShutdownCleanup(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.fullCleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.fullCleanup());
  }

  private cleanedUp = false;
  private fullCleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;

    // CRÍTICO: cada bloco protegido. Quando SHUTDOWN dispara após scene.start,
    // o Phaser já desmonta cameras/sys progressivamente. Acessos a undefined
    // levantam exception que aborta a transição → tela congela.
    // Cada bloco é independente — falhar em um não impede os outros.

    // Window listeners
    try {
      if (this.windowBlurHandler) window.removeEventListener('blur', this.windowBlurHandler);
      if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
      if (this.pointerCancelHandler) window.removeEventListener('pointercancel', this.pointerCancelHandler);
    } catch {
      /* já removidos */
    }
    this.windowBlurHandler = null;
    this.visibilityHandler = null;
    this.pointerCancelHandler = null;

    // Tweens
    try {
      this.tweens?.killAll();
      if (this.tweens) this.tweens.timeScale = 1;
    } catch {
      /* tween manager pode já ter sido desmontado */
    }

    // Camera (ponto que estava quebrando) — checar undefined antes de cada chamada
    try {
      const cam = this.cameras?.main;
      if (cam) {
        cam.setZoom(1);
        cam.setScroll(0, 0);
      }
    } catch {
      /* cameras já desmontadas */
    }

    // Time
    try {
      this.time?.removeAllEvents();
    } catch {
      /* time clock já parado */
    }

    // Pools / sistemas — todos guardam scene refs internamente, podem falhar se scene morta
    try {
      this.obstacleSpawner?.shutdown();
    } catch {
      /* */
    }
    try {
      this.coinSpawner?.shutdown();
    } catch {
      /* */
    }
    try {
      this.powerUpSpawner?.shutdown();
    } catch {
      /* */
    }
    try {
      this.scoreSystem?.shutdown();
    } catch {
      /* */
    }
    try {
      this.biomeManager?.shutdown();
    } catch {
      /* */
    }
    try {
      this.juice?.shutdown();
    } catch {
      /* */
    }

    // HUDs
    try {
      this.hud?.destroy();
    } catch {
      /* */
    }
    try {
      this.debugHud?.destroy();
    } catch {
      /* */
    }
    try {
      this.tunnelDecor?.destroy();
    } catch {
      /* */
    }
    this.tunnelDecor = null;
    this.tunnelFlowLines = [];

    // Pending wall-clock timer
    if (this.gameOverFallbackHandle !== null && typeof window !== 'undefined') {
      try {
        window.clearTimeout(this.gameOverFallbackHandle);
      } catch {
        /* */
      }
      this.gameOverFallbackHandle = null;
    }

    // Trail
    if (this.trailEmitter) {
      try {
        this.trailEmitter.destroy();
      } catch {
        /* */
      }
      this.trailEmitter = null;
    }

    // Player
    try {
      this.player?.destroy();
    } catch {
      /* */
    }
  }
}
