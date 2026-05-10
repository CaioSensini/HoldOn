import Phaser from 'phaser';
import { PLAYER, WORLD } from '../config';

export type PlayerState =
  | 'idle'
  | 'takeoff'
  | 'following'
  | 'falling'
  | 'prone'
  | 'boosting'
  | 'shielded'
  | 'floating'
  | 'dead';

interface PlayerOpts {
  scene: Phaser.Scene;
  x: number;
  y: number;
  textureKey: string;
}

/**
 * Controle livre:
 * - segurando: o player segue X/Y do dedo ou mouse dentro dos limites da tela;
 * - soltou: cai ate o chao e entra em `prone`, com hitbox baixo;
 * - arrastar ate o chao segurando ainda conta como `following`, nao como deitado.
 */
export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;

  hitbox: { x: number; y: number; w: number; h: number } = {
    x: 0,
    y: 0,
    w: PLAYER.WIDTH,
    h: PLAYER.HEIGHT
  };

  state: PlayerState = 'idle';

  shield = false;
  boosting = false;
  phantom = false;
  miniHitbox = false;
  hasReviveItem = false;

  private velY = 0;
  private xPos: number;
  private yPos: number;
  private isHolding = false;
  private targetX: number | null = null;
  private targetY: number | null = null;
  private downX = 0;
  private downY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private horizontalLocked = false;
  private yMin: number = PLAYER.Y_MIN;
  /** Valor "base" do yMin (sem ajustes de passthrough). */
  private defaultYMin: number = PLAYER.Y_MIN;
  private yMax: number = WORLD.GROUND_Y;
  private inBonusTunnel = false;

  /** Tweens de exitJump (para cancelar se player tocar a tela). */
  private upTween: Phaser.Tweens.Tween | null = null;
  private hoverTween: Phaser.Tweens.Tween | null = null;
  private floatEndTimer: Phaser.Time.TimerEvent | null = null;

  /** Imunidade temporária — pós-exit da cave, etc. */
  private immuneUntilMs = 0;
  private immuneAura: Phaser.GameObjects.Arc | null = null;
  private immuneAuraTween: Phaser.Tweens.Tween | null = null;
  /** Tween de blink no sprite durante imunidade (alpha pulsante). */
  private blinkTween: Phaser.Tweens.Tween | null = null;

  /**
   * Quando true, `updateRotation()` NÃO sobrescreve a rotação do sprite —
   * permite que tweens dramáticos (head-first dive) controlem a rotação
   * sem briga com o lerp do RotateTo do update loop.
   */
  private diveActive = false;

  constructor(opts: PlayerOpts) {
    this.scene = opts.scene;
    this.sprite = opts.scene.add.image(opts.x, opts.y, opts.textureKey).setDepth(50);
    this.xPos = opts.x;
    this.yPos = opts.y;
  }

  setSkin(key: string): void {
    if (this.scene.textures.exists(key)) this.sprite.setTexture(key);
  }

  onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state === 'dead' || this.boosting) return;

    // Se está flutuando pós-exit, o tap CANCELA o float (mas mantém imunidade).
    if (this.state === 'floating') {
      this.endFloat();
    }

    const onGround = this.state === 'prone' || this.yPos >= this.yMax - 2;
    this.isHolding = true;
    this.downX = pointer.x;
    // downY em WORLD coords pra que o delta (dy) continue válido mesmo
    // quando a câmera dá pan (ex: entrada/saída do bueiro). Sem isso,
    // o player ficava preso no topo da cave ao entrar segurando.
    this.downY = pointer.worldY ?? pointer.y;
    this.horizontalLocked = true;
    this.velY = 0;
    this.dragStartX = this.xPos;
    this.targetX = this.xPos;

    if (onGround) {
      // PULO do chão: vai EXATAMENTE pra altura do mouse (worldY, não screenY)
      // — sem lift mínimo forçado. Comportamento idêntico em superfície e cave.
      this.state = 'takeoff';
      const targetWorldY = pointer.worldY ?? pointer.y;
      this.targetY = Phaser.Math.Clamp(targetWorldY, this.yMin, this.yMax);
      this.dragStartY = this.targetY;
      this.playJumpAnim();
      this.spawnJumpDust();
    } else {
      // No ar: PARA de cair onde está. Não pula, não vai pro centro.
      // O target inicial é a posição atual; só se move quando o dedo
      // arrasta (`setTargets` calcula delta a partir do tap).
      this.state = 'following';
      this.targetY = this.yPos;
      this.dragStartY = this.yPos;
    }
  }

  onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isHolding || (this.state !== 'following' && this.state !== 'takeoff')) return;
    const moved = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.downX, this.downY);
    if (moved > 10) {
      this.horizontalLocked = false;
      this.state = 'following';
    }
    this.setTargets(pointer);
  }

  onPointerUp(): void {
    if (!this.isHolding) return;
    this.isHolding = false;
    this.targetX = null;
    this.targetY = null;
    this.horizontalLocked = false;
    if (this.state !== 'dead') {
      this.state = this.yPos >= this.yMax - 1 ? 'prone' : 'falling';
      this.velY = Math.max(0, this.velY);
    }
  }

  resetInputState(): void {
    this.isHolding = false;
    this.targetX = null;
    this.targetY = null;
    this.horizontalLocked = false;
  }

  private setTargets(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.downX;
    // dy em WORLD coords (downY foi capturado em pointer.worldY) pra que
    // o tracking não quebre quando a câmera dá pan na entrada/saída do bueiro.
    const dy = (pointer.worldY ?? pointer.y) - this.downY;
    this.targetX = this.horizontalLocked
      ? this.xPos
      : Phaser.Math.Clamp(this.dragStartX + dx, PLAYER.X_MIN, PLAYER.X_MAX);
    this.targetY = Phaser.Math.Clamp(this.dragStartY + dy, this.yMin, this.yMax);
  }

  setBoosting(b: boolean): void {
    this.boosting = b;
    if (b) {
      this.state = 'boosting';
      this.resetInputState();
      // Cancela qualquer tween residual de yPos (ex: float anterior)
      this.cancelFloatTweens();
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.killTweensOf(this.sprite);
      // LANÇAMENTO: sobe pro mid-air e estica feito foguete.
      const peakY = Math.max(this.yPos - 240, 240);
      this.velY = 0;
      this.scene.tweens.add({
        targets: this,
        yPos: peakY,
        duration: 320,
        ease: 'Cubic.easeOut'
      });
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 0.6,
        scaleY: 1.55,
        duration: 320,
        ease: 'Cubic.easeOut'
      });
      // Burst de poeira no take-off
      this.spawnJumpDust();
    } else if (this.state === 'boosting') {
      // Volta scale ao normal — exitJump (chamado em GameScene) cuida do estado.
      this.scene.tweens.killTweensOf(this.sprite);
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 180,
        ease: 'Back.easeOut'
      });
      this.state = this.isHolding ? 'following' : 'falling';
    }
  }

  setPhantom(p: boolean): void {
    this.phantom = p;
  }
  setMini(m: boolean): void {
    this.miniHitbox = m;
  }
  setShield(s: boolean): void {
    this.shield = s;
  }

  setBonusTunnel(active: boolean): void {
    this.inBonusTunnel = active;
    this.defaultYMin = active ? WORLD.SUBTERRANEAN_TOP_Y : PLAYER.Y_MIN + this.phaseYOffset;
    this.yMin = this.defaultYMin;
    this.yMax = active ? WORLD.SUBTERRANEAN_FLOOR_Y : WORLD.GROUND_Y + this.phaseYOffset;
    // NÃO faz auto-clamp — caller (enterCaveCinematic / Controlled / exitJump)
    // controla a posição. Auto-clamp causaria snap brusco visível.
  }

  /**
   * Offset Y de fase (Sea: +720, Space: −720, surface: 0). Quando muda,
   * yMin/yMax são reaplicados pra range correta da fase.
   */
  phaseYOffset = 0;
  setPhaseYOffset(offset: number): void {
    if (this.inBonusTunnel) return; // bonus tunnel tem range próprio
    this.phaseYOffset = offset;
    this.yMin = PLAYER.Y_MIN + offset;
    this.yMax = WORLD.GROUND_Y + offset;
    this.defaultYMin = this.yMin;
  }

  /**
   * Tween animado de transição de fase: o player desliza pro novo Y range
   * acompanhando a câmera. Reseta velocidades e estado pra `falling` no
   * fim. Usado nos gates Sea / Beach / Space.
   */
  transitionToPhase(newOffset: number, durationMs: number): void {
    if (this.inBonusTunnel) return;
    const oldOffset = this.phaseYOffset;
    const delta = newOffset - oldOffset;
    const targetY = this.yPos + delta;

    // Libera o yMin enquanto o tween roda (senão clamp brusco)
    this.yMin = Math.min(this.yMin, targetY - 50);
    this.yMax = Math.max(this.yMax, targetY + 50);
    this.scene.tweens.killTweensOf(this);
    this.cancelFloatTweens();
    this.state = 'floating'; // sem física durante o tween
    this.velY = 0;

    this.scene.tweens.add({
      targets: this,
      yPos: targetY,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.phaseYOffset = newOffset;
        this.yMin = PLAYER.Y_MIN + newOffset;
        this.yMax = WORLD.GROUND_Y + newOffset;
        this.defaultYMin = this.yMin;
        this.yPos = Phaser.Math.Clamp(this.yPos, this.yMin, this.yMax);
        this.state = this.isHolding ? 'following' : 'falling';
      }
    });
  }

  /**
   * Permite o player subir ACIMA do teto da cave — usado quando ele está
   * horizontalmente alinhado com o buraco de saída. Sem isso, o yMin
   * trava no teto e o player não consegue "passar 100%" pelo buraco.
   * Lift de 80px permite o hitbox inteiro ficar acima da abertura.
   */
  setCeilingPassthrough(allowed: boolean): void {
    if (!this.inBonusTunnel) return;
    this.yMin = allowed ? this.defaultYMin - 90 : this.defaultYMin;
  }

  /**
   * Permite o player subir ACIMA do teto da SUPERFÍCIE — usado no fim do
   * Citadel (gate pro Space). Quando alinhado com o buraco do teto, o
   * yMin baixa em 120px deixando o corpo inteiro escapar pra cima.
   */
  setSurfaceCeilingPassthrough(allowed: boolean): void {
    if (this.inBonusTunnel) return;
    this.yMin = allowed ? PLAYER.Y_MIN - 130 : PLAYER.Y_MIN;
  }

  /**
   * Animação de saída pelo teto: player tweena pra fora do topo da tela
   * com stretch + estado floating (sem física). Usado em ascendToSpace.
   */
  ascendBeyondCeiling(): void {
    if (!this.sprite || !this.sprite.scene) return;
    this.cancelFloatTweens();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.sprite);
    this.state = 'floating';
    this.isHolding = false;
    this.targetX = null;
    this.targetY = null;
    this.velY = 0;
    // Stretch vertical (foguete-like)
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0.55,
      scaleY: 1.6,
      duration: 600,
      ease: 'Cubic.easeOut'
    });
    // Sobe além do topo da tela
    this.scene.tweens.add({
      targets: this,
      yPos: -160,
      duration: 1000,
      ease: 'Cubic.easeOut'
    });
    this.spawnJumpDust();
  }

  /**
   * Reposiciona o player no Space após a subida — centro vertical da tela,
   * scale normal, estado falling (gravidade reativa). Limpa override do
   * yMin pra restaurar o teto padrão.
   */
  respawnAfterAscend(): void {
    if (!this.sprite || !this.sprite.scene) return;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.sprite);
    this.yMin = PLAYER.Y_MIN;
    this.yPos = 320;
    this.velY = 0;
    this.state = 'falling';
    this.sprite.setScale(1, 1);
    this.sprite.x = this.xPos;
    this.sprite.y = this.yPos;
  }

  /**
   * Animação de pulo: squash → stretch → settle.
   * Estilo cartoon clássico (Subway Surfers / Crossy Road feel).
   */
  playJumpAnim(): void {
    if (!this.sprite || !this.sprite.scene) return;
    try {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(1, 1);
      this.scene.tweens.chain({
        targets: this.sprite,
        tweens: [
          // 1. Squash de antecipação (esmaga no chão antes de pular)
          { scaleX: 1.45, scaleY: 0.55, duration: 70, ease: 'Quad.easeOut' },
          // 2. Stretch ascendente (corpo se alonga ao subir)
          { scaleX: 0.65, scaleY: 1.45, duration: 140, ease: 'Quad.easeOut' },
          // 3. Settle com overshoot (volta ao normal com vibe)
          { scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' }
        ]
      });
    } catch {
      /* tween manager pode estar desmontado */
    }
  }

  /**
   * Animação de queda: stretch (vertical) → squash (impacto) → settle.
   * Inverso do pulo — usado ao entrar na cave.
   */
  playDropAnim(): void {
    if (!this.sprite || !this.sprite.scene) return;
    try {
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(1, 1);
      this.scene.tweens.chain({
        targets: this.sprite,
        tweens: [
          // 1. Stretch vertical (corpo se alonga descendo)
          { scaleX: 0.65, scaleY: 1.45, duration: 70, ease: 'Quad.easeOut' },
          // 2. Squash de impacto (esmaga ao bater no chão)
          { scaleX: 1.45, scaleY: 0.55, duration: 140, ease: 'Quad.easeOut' },
          // 3. Settle
          { scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' }
        ]
      });
    } catch {
      /* */
    }
  }

  /** Burst de poeira nos pés — usado em jumps a partir do chão. */
  private spawnJumpDust(): void {
    if (!this.scene.add) return;
    try {
      const x = this.xPos;
      const y = this.yMax + 4;
      const e = this.scene.add.particles(x, y, 'pixel', {
        lifespan: 380,
        speedY: { min: -60, max: 20 },
        speedX: { min: -200, max: 200 },
        scale: { start: 2.8, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: [0xc4c8d8, 0xa8aebc, 0xcfd8dc, 0xb8bcc8],
        angle: { min: 0, max: 360 },
        gravityY: 100,
        emitting: false
      });
      e.explode(14, x, y);
      this.scene.time.delayedCall(450, () => {
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

  /**
   * Modo CINEMÁTICO de entrada na cave — usado quando o player cai em
   * queda livre (sem segurar a tela) e atinge o buraco. Animação dramática:
   *   • Mantém yPos atual (player tava no chão da superfície, ~620)
   *   • velY pequena pra dar momentum descendente
   *   • Gravidade faz o resto da queda
   *   • Tira controle do dedo
   *   • Anim drop (stretch→squash)
   *
   * Sem teleporte — player visualmente cai do chão da superfície
   * pra dentro da cave.
   */
  enterCaveCinematic(): void {
    // Modo SOLTO (não está segurando dedo): queda livre + dive head-first.
    // Sem puxão — gravidade acelera o player até o fundo da cave.
    this.velY = 0;
    this.state = 'falling';
    this.isHolding = false;
    this.horizontalLocked = false;
    this.targetX = null;
    this.targetY = null;
    this.playDropAnim();
    this.headFirstDive();
  }

  /**
   * Modo CONTROLADO: player segurando o dedo entra no bueiro mantendo
   * o controle. O drag math agora usa pointer.worldY, então enquanto a
   * câmera dá pan pra baixo o targetY acompanha naturalmente — sem
   * travar no topo da cave. Player decide o ritmo da descida.
   */
  enterCaveControlled(): void {
    if (!this.isHolding) {
      this.enterCaveCinematic();
      return;
    }
    // Mantém state ('following'/'takeoff'). Apenas reclampa o targetY
    // pra dentro da nova range subterrânea.
    if (this.targetY !== null) {
      this.targetY = Phaser.Math.Clamp(this.targetY, this.yMin, this.yMax);
    }
  }

  /**
   * Tomba pra frente como física real: o sprite gira pra cabeça-primeiro
   * (rotation π/2 + pequeno overshoot) com aceleração crescente. Sobreescreve
   * temporariamente a rotação que `updateRotation()` aplicaria.
   */
  private headFirstDive(): void {
    if (!this.sprite || !this.sprite.scene) return;
    try {
      this.scene.tweens.killTweensOf(this.sprite);
      this.diveActive = true;
      this.scene.tweens.add({
        targets: this.sprite,
        rotation: Math.PI / 2 + 0.35, // overshoot pra dar peso
        duration: 360,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          if (!this.sprite || !this.sprite.scene) return;
          // Volta pra π/2 (orientação que updateRotation manteria na cave)
          this.scene.tweens.add({
            targets: this.sprite,
            rotation: Math.PI / 2,
            duration: 200,
            ease: 'Sine.easeOut',
            onComplete: () => {
              this.diveActive = false;
            }
          });
        }
      });
    } catch {
      this.diveActive = false;
    }
  }

  /**
   * Pulo de saída da cave + flutuação no ar com imunidade.
   *
   * Sequência:
   *   1. PRESERVA xPos/yPos — sem teleporte (player não é puxado pra trás)
   *   2. Pulo relativo: tween yPos pra ~280px acima da posição atual
   *   3. Bobbing infinito no peak do pulo
   *   4. Após 2000ms, volta a falling (gravidade)
   *   5. Imunidade ativa por 2000ms (sprite blinka, aura ciano sutil)
   *   6. Tap durante float cancela bobbing — imunidade continua até 2s
   */
  exitJump(): void {
    const FLOAT_MS = 2000;
    const UP_MS = 480;

    // SEM teleporte — xPos e yPos preservados.
    this.velY = 0;
    this.state = 'floating';
    this.isHolding = false;
    this.horizontalLocked = false;
    this.targetX = null;
    this.targetY = null;
    this.playJumpAnim();
    this.setImmuneFor(FLOAT_MS);

    this.cancelFloatTweens();
    // Pulo: sobe ~280px da posição atual (clamp pra não passar do top da tela).
    const peakY = Math.max(this.yPos - 280, 220);
    this.upTween = this.scene.tweens.add({
      targets: this,
      yPos: peakY,
      duration: UP_MS,
      ease: 'Quart.easeOut',
      onComplete: () => {
        if (this.state !== 'floating') return;
        // Bobbing relativo ao peak
        this.hoverTween = this.scene.tweens.add({
          targets: this,
          yPos: peakY - 14,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    if (this.floatEndTimer) {
      this.floatEndTimer.remove(false);
    }
    this.floatEndTimer = this.scene.time.delayedCall(FLOAT_MS, () => {
      this.endFloat();
    });
  }

  /** Cancela tweens de float (sem mexer no estado/imunidade). */
  private cancelFloatTweens(): void {
    if (this.upTween) {
      this.upTween.stop();
      this.upTween = null;
    }
    if (this.hoverTween) {
      this.hoverTween.stop();
      this.hoverTween = null;
    }
  }

  /**
   * Encerra o estado floating — volta pra falling (gravidade ativa).
   * NÃO mexe na imunidade — ela continua até o `setImmuneFor` expirar.
   */
  private endFloat(): void {
    this.cancelFloatTweens();
    if (this.floatEndTimer) {
      this.floatEndTimer.remove(false);
      this.floatEndTimer = null;
    }
    if (this.state === 'floating') {
      this.state = 'falling';
      this.velY = 0;
    }
  }

  /** Imunidade temporária em ms — usada após exit da cave. */
  setImmuneFor(durationMs: number): void {
    if (!this.scene.add) return;
    this.immuneUntilMs = this.scene.time.now + durationMs;
    this.spawnImmuneAura(durationMs);
  }

  /** Verificado em GameScene.die() — quando true, hits são ignorados. */
  isImmune(): boolean {
    return this.scene.time.now < this.immuneUntilMs;
  }

  private spawnImmuneAura(durationMs: number): void {
    try {
      // Aura ciano sutil pulsante
      if (this.immuneAura) {
        if (this.immuneAuraTween) this.immuneAuraTween.stop();
        this.immuneAura.destroy();
        this.immuneAura = null;
      }
      const aura = this.scene.add.circle(this.xPos, this.yPos, 56, 0x4ecdc4, 0.32);
      aura.setDepth(45);
      this.immuneAura = aura;

      this.immuneAuraTween = this.scene.tweens.add({
        targets: aura,
        radius: { from: 56, to: 74 },
        alpha: { from: 0.32, to: 0.08 },
        duration: 460,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Blink no sprite — pisca entre semi-transparente e opaco (clássico
      // efeito de "imune" de jogos cartoon).
      if (this.blinkTween) this.blinkTween.stop();
      this.sprite.alpha = 1;
      this.blinkTween = this.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.4, to: 1 },
        duration: 160,
        yoyo: true,
        repeat: Math.ceil(durationMs / 320),
        ease: 'Sine.easeInOut',
        onComplete: () => {
          try {
            this.sprite.alpha = 1;
          } catch {
            /* */
          }
          this.blinkTween = null;
        }
      });

      // Fade-out da aura no fim do durationMs
      this.scene.time.delayedCall(durationMs, () => {
        try {
          if (this.immuneAuraTween) {
            this.immuneAuraTween.stop();
            this.immuneAuraTween = null;
          }
          if (this.immuneAura) {
            const fadingAura = this.immuneAura;
            this.immuneAura = null;
            this.scene.tweens.add({
              targets: fadingAura,
              alpha: 0,
              duration: 220,
              onComplete: () => {
                try {
                  fadingAura.destroy();
                } catch {
                  /* */
                }
              }
            });
          }
          // Garante alpha 1 no sprite no fim da imunidade
          if (this.blinkTween) {
            this.blinkTween.stop();
            this.blinkTween = null;
          }
          this.sprite.alpha = 1;
        } catch {
          /* */
        }
      });
    } catch {
      /* */
    }
  }

  update(dtMs: number): void {
    if (this.state === 'dead') return;
    const dt = dtMs / 1000;

    if (this.state === 'floating') {
      // Float: posição controlada por tween, sem física.
    } else if (this.boosting) {
      this.velY *= 0.9;
      this.yPos += this.velY * dt;
      this.yPos = Phaser.Math.Clamp(this.yPos, this.yMin, this.yMax);
    } else if ((this.state === 'following' || this.state === 'takeoff') && this.targetX !== null && this.targetY !== null) {
      this.xPos = Phaser.Math.Linear(this.xPos, this.targetX, PLAYER.FREE_MOVE_LERP_X);
      this.yPos = Phaser.Math.Linear(this.yPos, this.targetY, PLAYER.HORIZ_LERP_FOLLOW);
      this.xPos = Phaser.Math.Clamp(this.xPos, PLAYER.X_MIN, PLAYER.X_MAX);
      this.yPos = Phaser.Math.Clamp(this.yPos, this.yMin, this.yMax);
      this.velY = 0;
    } else if (this.state === 'prone') {
      this.yPos = this.yMax;
      this.velY = 0;
    } else {
      this.velY += PLAYER.GRAVITY * dt;
      this.velY = Math.min(this.velY, PLAYER.FALL_MAX_VEL);
      this.yPos += this.velY * dt;
      if (this.yPos >= this.yMax) {
        this.yPos = this.yMax;
        this.velY = 0;
        this.state = 'prone';
      }
    }

    this.sprite.x = this.xPos;
    this.sprite.y = this.yPos;
    this.updateRotation();
    this.updateHitbox();

    // Aura de imunidade segue o player
    if (this.immuneAura) {
      this.immuneAura.x = this.xPos;
      this.immuneAura.y = this.yPos;
    }
  }

  private updateRotation(): void {
    // Dive head-first em curso: tween direto controla rotação (cabeça
    // tomba pra frente com overshoot). Não bota a mão.
    if (this.diveActive) return;

    let desired = 0;
    if (this.state === 'prone') {
      desired = Math.PI / 2;
    } else if ((this.state === 'following' || this.state === 'takeoff') && this.targetX !== null && this.targetY !== null) {
      const dy = this.targetY - this.yPos;
      const dx = this.targetX - this.xPos;
      desired = this.state === 'takeoff' ? -0.22 : Phaser.Math.Clamp(dy / 520 + dx / 1800, -0.45, 0.45);
    } else if (this.state === 'falling') {
      // Rotação dramática proporcional à velocidade — cabeça tomba pra frente
      // como física real (era clamp 0.62; agora vai até π/2 ≈ 1.57 rad).
      desired = Phaser.Math.Clamp(this.velY / 700, 0.08, Math.PI / 2);
    }
    if (this.inBonusTunnel && this.state !== 'following') desired = Math.PI / 2;
    this.sprite.rotation = Phaser.Math.Angle.RotateTo(this.sprite.rotation, desired, 0.18);
  }

  private updateHitbox(): void {
    const prone = this.isProne;
    const mini = this.miniHitbox ? 0.5 : 1;
    this.hitbox.w = (prone ? PLAYER.PRONE_WIDTH : PLAYER.WIDTH) * mini;
    this.hitbox.h = (prone ? PLAYER.PRONE_HEIGHT : PLAYER.HEIGHT) * mini;
    this.hitbox.x = this.sprite.x - this.hitbox.w / 2;
    this.hitbox.y = prone ? this.yMax - this.hitbox.h / 2 : this.yPos - this.hitbox.h / 2;
  }

  setDead(): void {
    this.state = 'dead';
    this.velY = 0;
    this.diveActive = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.resetInputState();
    this.cancelFloatTweens();
    if (this.floatEndTimer) {
      this.floatEndTimer.remove(false);
      this.floatEndTimer = null;
    }
    this.immuneUntilMs = 0;
    if (this.immuneAuraTween) {
      this.immuneAuraTween.stop();
      this.immuneAuraTween = null;
    }
    if (this.immuneAura) {
      try {
        this.immuneAura.destroy();
      } catch {
        /* */
      }
      this.immuneAura = null;
    }
    if (this.blinkTween) {
      this.blinkTween.stop();
      this.blinkTween = null;
    }
    try {
      this.sprite.alpha = 1;
    } catch {
      /* */
    }
  }

  reviveAt(y: number): void {
    this.state = 'falling';
    this.yPos = y;
    this.velY = 0;
    this.sprite.setAlpha(1).setRotation(0);
    this.resetInputState();
  }

  get isProne(): boolean {
    return this.state === 'prone' && !this.isHolding;
  }

  /** True quando o player está com o dedo/mouse pressionado (controlando). */
  get isControlling(): boolean {
    return this.isHolding;
  }

  get x(): number {
    return this.xPos;
  }

  get y(): number {
    return this.yPos;
  }

  destroy(): void {
    this.resetInputState();
    this.cancelFloatTweens();
    if (this.floatEndTimer) {
      try {
        this.floatEndTimer.remove(false);
      } catch {
        /* */
      }
      this.floatEndTimer = null;
    }
    if (this.immuneAuraTween) {
      try {
        this.immuneAuraTween.stop();
      } catch {
        /* */
      }
      this.immuneAuraTween = null;
    }
    if (this.immuneAura) {
      try {
        this.immuneAura.destroy();
      } catch {
        /* */
      }
      this.immuneAura = null;
    }
    if (this.blinkTween) {
      try {
        this.blinkTween.stop();
      } catch {
        /* */
      }
      this.blinkTween = null;
    }
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this);
    this.sprite.destroy();
  }
}
