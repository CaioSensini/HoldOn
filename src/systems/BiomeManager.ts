import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, EVENTS, WORLD } from '../config';
import { biomeForDistance, BIOMES, type BiomeDef, difficultyForDistance } from '../data/BiomeDefs';
import { Colors } from '../theme/colors';
import { showBiomeBanner } from '../ui/BiomeBanner';
import { ensureBiomeTextures } from '../utils/PlaceholderArt';
import { GameEventBus } from './EventSystem';

interface ParallaxLayer {
  /** Sprite atual (que rola). */
  sprite: Phaser.GameObjects.TileSprite;
  /** Velocidade relativa ao mundo (0 = parado, 1 = mesma do mundo). */
  speed: number;
}

/**
 * Gerencia bioma atual com parallax de 4 camadas + crossfade na transição.
 *
 * Camadas (do mais distante ao mais próximo):
 *   0. sky        — gradient + sol/lua/estrelas. velocidade 0.05x
 *   1. far        — silhuetas de paisagem. velocidade 0.2x
 *   2. mid        — montanhas/decoração média. velocidade 0.5x
 *   3. foreground — elementos pequenos cruzando. velocidade 1.2x
 */
export class BiomeManager {
  private scene: Phaser.Scene;
  private bus = GameEventBus.instance();

  current: BiomeDef = BIOMES[0];

  private layers: ParallaxLayer[] = [];
  /** Camadas "B" usadas durante crossfade. */
  private layersB: ParallaxLayer[] = [];

  private ground!: Phaser.GameObjects.TileSprite;
  private groundOffset = 0;
  private flowLines: Phaser.GameObjects.Rectangle[] = [];

  /**
   * Teto (limite superior visível). Mesma ideia do ground: TileSprite
   * tinted pela cor do bioma, scrolla com o mundo. Escondido em fases
   * que não têm teto (ex: Space — depois do ceiling break).
   */
  private ceiling: Phaser.GameObjects.TileSprite | null = null;
  private ceilingOffset = 0;

  /**
   * Layer subterrâneo permanente — sempre presente abaixo do chão.
   * Revelado apenas quando a câmera faz pan pra baixo (cave).
   * Estilo "bueiro/sewer" com tijolos.
   */
  private subterraneanBg: Phaser.GameObjects.TileSprite | null = null;
  private subterraneanOffset = 0;

  /** Acumulador de offset por camada (não usar tilePosition direto pra evitar drift). */
  private offsets = [0, 0, 0, 0];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    const id = this.current.id;
    // Lazy guard: se o usuário começou direto numa fase (dev start) que não
    // é forest/cave, gera as texturas antes de criar as TileSprites.
    ensureBiomeTextures(this.scene, id);
    this.layers = this.makeLayers(id);
    this.layers.forEach((l) => l.sprite.setAlpha(1));

    // Rua/chão: TileSprite com textura cobblestone 3D, tinted pela cor do bioma.
    // Scrolla com o mundo (1.0x parallax). A textura tem highlights/sombras
    // pra dar profundidade — multiplicada pelo tint do bioma.
    this.ground = this.scene.add
      .tileSprite(
        GAME_WIDTH / 2,
        WORLD.ROAD_TOP_Y + WORLD.ROAD_HEIGHT / 2,
        GAME_WIDTH,
        WORLD.ROAD_HEIGHT,
        'bg_road'
      )
      .setDepth(-46);
    this.ground.setTint(this.current.groundColor);

    // TETO — TileSprite no topo da tela. Indica visualmente o limite
    // superior (PLAYER.Y_MIN ≈ 120). Escondido em biomas com `ceilingHidden`
    // (ex: Space, depois do ceiling break, é cosmos sem fim).
    const ceilingKey = `bg_${this.current.id}_ceiling`;
    this.ceiling = this.scene.add
      .tileSprite(GAME_WIDTH / 2, 60, GAME_WIDTH, 120, ceilingKey)
      .setDepth(-44); // na frente das camadas de bioma, atrás do HUD
    this.ceiling.setTint(this.current.ceilingColor);
    if (this.current.ceilingHidden) this.ceiling.setVisible(false);

    // SUBTERRÂNEO PERMANENTE — começa logo abaixo do chão e cobre toda
    // área "abaixo da água" da fase Sea (e além). Revelado quando a câmera
    // dá pan pra baixo: cave bonus tunnel (parcial) ou Sea (full screen).
    const subTop = WORLD.ROAD_TOP_Y + WORLD.ROAD_HEIGHT;
    const subBottom = WORLD.SEA_PHASE_OFFSET + WORLD.GROUND_Y + 120; // cobre fundo do mar
    const subHeight = subBottom - subTop;
    this.subterraneanBg = this.scene.add
      .tileSprite(GAME_WIDTH / 2, subTop + subHeight / 2, GAME_WIDTH, subHeight, 'bg_subterranean')
      .setDepth(-55) // atrás do ground (-46), na frente das camadas de bioma (-100..-70)
      .setVisible(false); // só revelado durante bonus tunnel / fase Sea

    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * GAME_WIDTH + Math.random() * 60;
      const r = this.scene.add
        .rectangle(x, 660, 40, 4, Colors.text.primary, 0.18)
        .setDepth(-45);
      this.flowLines.push(r);
    }
  }

  private makeLayers(biomeId: string): ParallaxLayer[] {
    const skyKey = `bg_${biomeId}_sky`;
    const farKey = `bg_${biomeId}_far`;
    const midKey = `bg_${biomeId}_mid`;
    const fgKey = `bg_${biomeId}_fg`;

    const sky = this.scene.add
      .tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, skyKey)
      .setDepth(-100);
    const far = this.scene.add
      .tileSprite(GAME_WIDTH / 2, 380, GAME_WIDTH, 320, farKey)
      .setDepth(-90);
    const mid = this.scene.add
      .tileSprite(GAME_WIDTH / 2, 510, GAME_WIDTH, 260, midKey)
      .setDepth(-80);
    const fg = this.scene.add
      .tileSprite(GAME_WIDTH / 2, 600, GAME_WIDTH, 180, fgKey)
      .setDepth(-70);

    return [
      { sprite: sky, speed: 0.05 },
      { sprite: far, speed: 0.2 },
      { sprite: mid, speed: 0.5 },
      { sprite: fg, speed: 1.2 }
    ];
  }

  updateForDistance(meters: number): void {
    const next = biomeForDistance(meters);
    if (next.id !== this.current.id) {
      this.crossfadeTo(next);
      this.current = next;
      this.bus.emit(EVENTS.BIOME_CHANGED, next);
      // Banner anunciando o novo bioma
      showBiomeBanner(this.scene, next.name, this.biomeAccent(next.id));
    }
  }

  /** Move tile-sprites em proporção a dx (px do mundo). */
  step(dx: number): void {
    for (let i = 0; i < this.layers.length; i++) {
      this.offsets[i] += dx * this.layers[i].speed;
      this.layers[i].sprite.tilePositionX = this.offsets[i];
      if (this.layersB[i]) this.layersB[i].sprite.tilePositionX = this.offsets[i];
    }
    // Subterrâneo: parallax mais lento que mid (sensação de profundidade).
    // Performance: tilePositionX só atualiza quando o subsolo está visível.
    // Evita render de ~988k pixels por frame quando o subsolo está oculto.
    if (this.subterraneanBg && this.subterraneanBg.visible) {
      this.subterraneanOffset += dx * 0.4;
      this.subterraneanBg.tilePositionX = this.subterraneanOffset;
    }
    // Rua: scrolla na velocidade do mundo (1.0x).
    if (this.ground) {
      this.groundOffset += dx;
      this.ground.tilePositionX = this.groundOffset;
    }
    // Teto: scrolla com o mundo (1.0x), mesma vibe da rua.
    if (this.ceiling) {
      this.ceilingOffset += dx;
      this.ceiling.tilePositionX = this.ceilingOffset;
    }
  }

  private crossfadeTo(next: BiomeDef): void {
    // Lazy load: garante que as 5 texturas do bioma destino existem antes de
    // criar TileSprites. No-op se já foram geradas. Forest/Cave foram pré-
    // geradas no preload; demais (temple/sea/beach/volcano/citadel/space) são
    // criadas aqui na transição.
    ensureBiomeTextures(this.scene, next.id);

    // Cria layers "B" do novo bioma com alpha 0, depois fade
    const newLayers = this.makeLayers(next.id);
    newLayers.forEach((l) => l.sprite.setAlpha(0));
    // Posiciona um pouco acima na ordem pra ficar sobre os antigos
    newLayers[0].sprite.setDepth(-99);
    newLayers[1].sprite.setDepth(-89);
    newLayers[2].sprite.setDepth(-79);
    newLayers[3].sprite.setDepth(-69);

    this.layersB = newLayers;

    this.scene.tweens.add({
      targets: newLayers.map((l) => l.sprite),
      alpha: 1,
      duration: 1500,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        // Promove os "B" a oficiais e descarta antigos
        for (const old of this.layers) old.sprite.destroy();
        this.layers = newLayers;
        // Restaura depths originais
        this.layers[0].sprite.setDepth(-100);
        this.layers[1].sprite.setDepth(-90);
        this.layers[2].sprite.setDepth(-80);
        this.layers[3].sprite.setDepth(-70);
        this.layersB = [];
      }
    });

    // Tween do tint da rua pra cor do novo bioma — interpolação correta
    // via addCounter + ColorWithColor (não snap).
    if (this.ground) {
      const startInt = (this.ground.tintTopLeft ?? next.groundColor) >>> 0;
      const start = Phaser.Display.Color.IntegerToColor(startInt);
      const end = Phaser.Display.Color.IntegerToColor(next.groundColor);
      this.scene.tweens.killTweensOf(this.ground);
      this.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 1200,
        ease: 'Quad.easeInOut',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(start, end, 100, t);
          this.ground?.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        }
      });
    }

    // Teto: troca textura + tint + visibilidade (Space tem `ceilingHidden`).
    if (this.ceiling) {
      const ceilingKey = `bg_${next.id}_ceiling`;
      if (this.scene.textures.exists(ceilingKey)) {
        this.ceiling.setTexture(ceilingKey);
      }
      const startInt = (this.ceiling.tintTopLeft ?? next.ceilingColor) >>> 0;
      const start = Phaser.Display.Color.IntegerToColor(startInt);
      const end = Phaser.Display.Color.IntegerToColor(next.ceilingColor);
      this.scene.tweens.killTweensOf(this.ceiling);
      this.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 1200,
        ease: 'Quad.easeInOut',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(start, end, 100, t);
          this.ceiling?.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        }
      });
      // Fade out se entra em bioma sem teto (Space)
      if (next.ceilingHidden) {
        this.scene.tweens.add({
          targets: this.ceiling,
          alpha: 0,
          duration: 1500,
          ease: 'Quad.easeInOut'
        });
      } else if (this.ceiling.alpha < 1) {
        this.scene.tweens.add({
          targets: this.ceiling,
          alpha: 1,
          duration: 1200,
          ease: 'Quad.easeInOut'
        });
      }
    }
  }

  private biomeAccent(id: string): number {
    switch (id) {
      case 'forest':
        return Colors.biomes.forest.accent;
      case 'cave':
        return Colors.biomes.cave.accent;
      case 'temple':
        return Colors.biomes.temple.accent;
      case 'sea':
        return Colors.biomes.sea.accent;
      case 'beach':
        return Colors.biomes.beach.accent;
      case 'volcano':
        return Colors.biomes.volcano.accent;
      case 'citadel':
        return Colors.biomes.citadel.accent;
      case 'space':
        return Colors.biomes.space.accent;
      default:
        return Colors.accent.cyan;
    }
  }

  /** Linhas de fluxo no chão (sensação extra de velocidade). */
  updateFlow(dx: number): void {
    for (const line of this.flowLines) {
      line.x -= dx * 1.8;
      if (line.x < -50) line.x = GAME_WIDTH + Math.random() * 80;
    }
  }

  /**
   * Tween o tint do chão pra cor de "subsolo" (dirt escuro) quando entra
   * na cave — dá a impressão de que a estrada virou um teto de terra visto
   * de baixo. Restaura ao sair. Duração casada com a pan da câmera (900ms)
   * com easing suave (Sine) pra ficar em sincronia visual.
   */
  /** Revela o TileSprite do subsolo — usado durante bonus tunnel / fase Sea. */
  showSubterranean(): void {
    this.subterraneanBg?.setVisible(true);
  }

  /** Esconde o TileSprite do subsolo — gameplay normal não deve mostrá-lo. */
  hideSubterranean(): void {
    this.subterraneanBg?.setVisible(false);
  }

  setSubterraneanView(active: boolean, durationMs = 900): void {
    if (!this.ground) return;
    const targetColor = active ? 0x2a1810 : this.current.groundColor;
    const startInt = (this.ground.tintTopLeft ?? targetColor) >>> 0;
    const start = Phaser.Display.Color.IntegerToColor(startInt);
    const end = Phaser.Display.Color.IntegerToColor(targetColor);
    this.scene.tweens.killTweensOf(this.ground);
    this.scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(start, end, 100, t);
        this.ground?.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      }
    });
  }

  /**
   * Bubbles container — overlay de bolhas + light shafts que aparece quando
   * o player está em fase Sea (offset +720). Diferencia o submerso do cave
   * (cave é dirty/subterrâneo, sea é luminoso azul com bolhas).
   */
  private oceanOverlay: Phaser.GameObjects.Container | null = null;
  private oceanBubbles: Phaser.GameObjects.Arc[] = [];
  private oceanShafts: Phaser.GameObjects.Rectangle[] = [];
  private oceanTween: Phaser.Tweens.Tween | null = null;

  /**
   * Ativa/desativa o overlay de oceano. Quando active=true:
   *   • Tinge o subterrâneo de azul-marinho profundo (em vez do dirt)
   *   • Adiciona bolhas subindo continuamente
   *   • Adiciona feixes de luz oblíquos (sun penetration)
   */
  setOceanView(active: boolean, durationMs = 1200): void {
    // Tint do subterrâneo
    if (this.subterraneanBg) {
      const targetColor = active ? 0x0a3a6a : 0xffffff;
      const startInt = (this.subterraneanBg.tintTopLeft ?? targetColor) >>> 0;
      const start = Phaser.Display.Color.IntegerToColor(startInt);
      const end = Phaser.Display.Color.IntegerToColor(targetColor);
      this.scene.tweens.killTweensOf(this.subterraneanBg);
      this.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: durationMs,
        ease: 'Sine.easeInOut',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          const c = Phaser.Display.Color.Interpolate.ColorWithColor(start, end, 100, t);
          this.subterraneanBg?.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        }
      });
    }

    if (active && !this.oceanOverlay) {
      this.buildOceanOverlay();
    } else if (!active && this.oceanOverlay) {
      this.destroyOceanOverlay();
    }
  }

  private buildOceanOverlay(): void {
    // Cobre o range Sea: superfície (top) até fundo do mar.
    const subTop = WORLD.SEA_PHASE_OFFSET + 60;
    const subBottom = WORLD.SEA_PHASE_OFFSET + WORLD.GROUND_Y + 120;
    const overlay = this.scene.add.container(0, 0).setDepth(-50);

    // Light shafts diagonais
    for (let i = 0; i < 7; i++) {
      const x = (i / 6) * GAME_WIDTH;
      const shaft = this.scene.add
        .rectangle(x, subTop + (subBottom - subTop) / 2, 18, subBottom - subTop, 0xfff5d0, 0.08)
        .setAngle(-12);
      this.oceanShafts.push(shaft);
      overlay.add(shaft);
    }

    // Bolhas subindo (10 instâncias, lifecycle individual via tween)
    for (let i = 0; i < 14; i++) {
      const bx = Math.random() * GAME_WIDTH;
      const by = subBottom - Math.random() * (subBottom - subTop);
      const radius = 2 + Math.random() * 4;
      const bubble = this.scene.add.circle(bx, by, radius, 0xc0e0ff, 0.65);
      this.oceanBubbles.push(bubble);
      overlay.add(bubble);
      this.animateBubble(bubble, subTop, subBottom);
    }

    overlay.setAlpha(0);
    this.scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 800,
      ease: 'Quad.easeOut'
    });

    this.oceanOverlay = overlay;
  }

  private animateBubble(bubble: Phaser.GameObjects.Arc, topY: number, bottomY: number): void {
    const duration = 3000 + Math.random() * 4000;
    const targetY = topY - 20;
    bubble.y = bottomY - Math.random() * 40;
    this.scene.tweens.add({
      targets: bubble,
      y: targetY,
      x: bubble.x + (Math.random() - 0.5) * 60,
      alpha: { from: 0.65, to: 0 },
      duration,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // Guards: se overlay foi destruído (oceanOverlay=null) ou a bubble já não
        // pertence à scene, NÃO continua o loop — evita leak de tween infinito.
        if (!bubble.scene || !this.oceanOverlay) return;
        bubble.x = Math.random() * GAME_WIDTH;
        bubble.alpha = 0.65;
        this.animateBubble(bubble, topY, bottomY);
      }
    });
  }

  private destroyOceanOverlay(): void {
    if (!this.oceanOverlay) return;
    const ov = this.oceanOverlay;
    this.oceanOverlay = null;
    this.oceanTween?.stop();
    this.oceanTween = null;
    for (const b of this.oceanBubbles) this.scene.tweens.killTweensOf(b);
    this.scene.tweens.add({
      targets: ov,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        try {
          ov.destroy();
        } catch {
          /* */
        }
      }
    });
    this.oceanBubbles = [];
    this.oceanShafts = [];
  }

  difficultyMultiplier(meters: number): number {
    return difficultyForDistance(meters);
  }

  shutdown(): void {
    for (const l of this.layers) {
      try {
        l.sprite.destroy();
      } catch {
        /* sprite pode já ter sido destruída pelo cleanup do Phaser */
      }
    }
    for (const l of this.layersB) {
      try {
        l.sprite.destroy();
      } catch {
        /* */
      }
    }
    this.layers = [];
    this.layersB = [];
    for (const f of this.flowLines) {
      try {
        f.destroy();
      } catch {
        /* */
      }
    }
    this.flowLines = [];
    try {
      this.ground?.destroy();
    } catch {
      /* */
    }
    try {
      this.ceiling?.destroy();
    } catch {
      /* */
    }
    this.ceiling = null;
    try {
      this.subterraneanBg?.destroy();
    } catch {
      /* */
    }
    this.subterraneanBg = null;
  }
}
