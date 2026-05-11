import Phaser from 'phaser';
import { getServices } from '../adapters';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { GameState } from '../data/GameState';
import { POWERUP_LIST } from '../data/PowerUpDefs';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';
import { Button } from '../ui/Button';
import { Button3D } from '../ui/components/Button3D';
import { Card } from '../ui/components/Card';
import { CurrencyPill } from '../ui/components/CurrencyPill';
import { Modal } from '../ui/Modal';
import { SceneTransition } from '../ui/SceneTransition';
import { showToast } from '../ui/ToastNotification';
import { randPick } from '../utils/MathUtils';

/**
 * Tela inicial — segue o design HTML "Float — Home Screen":
 *  - Backdrop forest estilizado (céu dramático, sol + raios, montanhas, árvores,
 *    grama, folhas drifting, sparkles)
 *  - Logo "HOLD ON" 3D cartoon (stacked)
 *  - BEST pill (top-left) + Coins pill (top-right) + Daily badge (conditional)
 *  - Hero character com aura/beams/bob
 *  - 3 slots de equipável
 *  - Botão PLAY 3D grande à direita com halo
 *  - Bottom nav 5 circle buttons
 *
 * Toda a lógica de state/services/scene-transition é preservada do código
 * anterior — apenas a camada visual mudou.
 */
export class HomeScene extends Phaser.Scene {
  private state = GameState.instance();
  private unsub?: () => void;

  // Refs pra refresh sem recriar tudo.
  private coinsPill?: CurrencyPill;
  private bestPill?: CurrencyPill;
  private slotsContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENES.HOME });
  }

  create(): void {
    this.buildBackground();
    this.buildLogo();
    this.buildTopBar();
    this.buildCharacter();
    this.buildSlots();
    this.buildPlayButton();
    this.buildBottomNav();
    this.buildExtraButtons();
    this.buildDevButton();

    SceneTransition.enter(this);

    this.unsub = this.state.subscribe(() => this.refresh());
    this.events.on('shutdown', () => this.unsub?.());

    this.refresh();
    this.handleDailyReward();
  }

  /* ====================================================================== */
  /* BACKGROUND — Forest biome do design HTML                                */
  /* ====================================================================== */

  private buildBackground(): void {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    // Sky gradient "dramatic": navy → blue → sky-blue → green → dark-green.
    // Phaser não tem gradiente nativo em Graphics: faço bandas horizontais.
    const skyStops: Array<[number, number]> = [
      [0,         0x1f3a8a],
      [H * 0.28,  0x3b6db8],
      [H * 0.50,  0x5a9bcf],
      [H * 0.78,  0x6ba85a],
      [H,         0x2a4d24]
    ];
    const bandStep = 4;
    const skyGfx = this.add.graphics().setDepth(-100);
    for (let y = 0; y < H; y += bandStep) {
      const col = this.gradientAt(skyStops, y);
      skyGfx.fillStyle(col, 1);
      skyGfx.fillRect(0, y, W, bandStep);
    }

    // God-ray light shafts upper-left (3 polígonos, amarelo translúcido).
    const rays = this.add.graphics().setDepth(-95);
    const rayColor = 0xfff7c0;
    const rayBaseAlpha = 0.18;
    const rayPolys: Array<{ pts: number[]; a: number }> = [
      { pts: [0, 0, 240, 0, 380, 540, 100, 540], a: 1.0 },
      { pts: [120, 0, 280, 0, 460, 540, 280, 540], a: 0.62 },
      { pts: [240, 0, 360, 0, 540, 540, 420, 540], a: 0.42 }
    ];
    for (const r of rayPolys) {
      rays.fillStyle(rayColor, rayBaseAlpha * r.a);
      rays.beginPath();
      rays.moveTo(r.pts[0], r.pts[1]);
      for (let i = 2; i < r.pts.length; i += 2) rays.lineTo(r.pts[i], r.pts[i + 1]);
      rays.closePath();
      rays.fillPath();
    }

    // Sun glow (radial-ish: 4 círculos concêntricos com alpha decrescente).
    const sunCx = 70 + 65;
    const sunCy = 60 + 65;
    const glow = this.add.graphics().setDepth(-90);
    glow.fillStyle(0xffeca0, 0.55);
    glow.fillCircle(sunCx - 120 + 240, sunCy - 120 + 240, 100);
    // anéis decrescentes
    const ringSteps = [
      { r: 240, a: 0.10 },
      { r: 180, a: 0.18 },
      { r: 130, a: 0.28 },
      { r: 90,  a: 0.42 }
    ];
    for (const s of ringSteps) {
      glow.fillStyle(0xffeca0, s.a);
      glow.fillCircle(sunCx, sunCy, s.r);
    }
    // Sun disc (amarelo sólido).
    const sun = this.add.graphics().setDepth(-89);
    sun.fillStyle(0xffe98a, 1);
    sun.fillCircle(sunCx, sunCy, 65);
    sun.fillStyle(0x000000, 0.05);
    sun.fillCircle(sunCx + 8, sunCy + 8, 60);

    // Cloud strips (2 nuvens estilizadas).
    this.drawCloud(380 + 110, 90 + 18, 220, 36, 0.85);
    this.drawCloud(W - 320 - 90, 160 + 16, 180, 32, 0.7);

    // Distant mountain ridge (azul-cinza com pico).
    const farMtn = this.add.graphics().setDepth(-80);
    farMtn.lineStyle(3, 0x1a1d2e, 1);
    farMtn.fillStyle(0x3a5a78, 0.7);
    const farMtnY = H - 220;
    farMtn.beginPath();
    const farPts = [0, 200, 80, 80, 140, 130, 230, 30, 330, 110, 430, 60, 540, 130, 640, 40, 760, 120, 870, 70, 980, 130, 1080, 60, 1180, 120, 1280, 90, 1280, 240, 0, 240];
    farMtn.moveTo(farPts[0], farMtnY + farPts[1]);
    for (let i = 2; i < farPts.length; i += 2) farMtn.lineTo(farPts[i], farMtnY + farPts[i + 1]);
    farMtn.closePath();
    farMtn.fillPath();
    farMtn.strokePath();

    // Atmospheric fog band.
    const fogGfx = this.add.graphics().setDepth(-78);
    fogGfx.fillStyle(0xb4d2dc, 0.25);
    fogGfx.fillRect(0, H - 280 - 55, W, 110);

    // Mid mountain ridge (verde escuro com highlights).
    const midMtn = this.add.graphics().setDepth(-75);
    midMtn.lineStyle(4, 0x1a1d2e, 1);
    midMtn.fillStyle(0x2d5a32, 1);
    const midMtnY = H - 180;
    const midPts = [0, 180, 60, 100, 130, 150, 230, 60, 330, 130, 440, 90, 560, 150, 680, 70, 800, 140, 920, 80, 1040, 140, 1160, 90, 1280, 130, 1280, 200, 0, 200];
    midMtn.beginPath();
    midMtn.moveTo(midPts[0], midMtnY + midPts[1]);
    for (let i = 2; i < midPts.length; i += 2) midMtn.lineTo(midPts[i], midMtnY + midPts[i + 1]);
    midMtn.closePath();
    midMtn.fillPath();
    midMtn.strokePath();
    // Picos highlight (lighter green triangles dentro dos cumes).
    midMtn.fillStyle(0x5a8a4a, 0.7);
    midMtn.fillTriangle(230, midMtnY + 60, 200, midMtnY + 110, 260, midMtnY + 110);
    midMtn.fillTriangle(680, midMtnY + 70, 650, midMtnY + 120, 710, midMtnY + 120);

    // Rolling hills (curva amostrada com lineTo).
    const hills = this.add.graphics().setDepth(-70);
    hills.lineStyle(4, 0x1a1d2e, 1);
    hills.fillStyle(0x3d6b32, 1);
    const hillsY = H - 100;
    const hillsPath = this.sampleBezier(
      [0, hillsY + 130],
      [200, hillsY + 50, 400, hillsY + 170, 640, hillsY + 90],
      [880, hillsY + 30, 1080, hillsY + 160, 1280, hillsY + 80]
    );
    hills.beginPath();
    hills.moveTo(hillsPath[0][0], hillsPath[0][1]);
    for (let i = 1; i < hillsPath.length; i++) hills.lineTo(hillsPath[i][0], hillsPath[i][1]);
    hills.lineTo(1280, hillsY + 180);
    hills.lineTo(0, hillsY + 180);
    hills.closePath();
    hills.fillPath();
    hills.strokePath();

    // Foreground grass plateau (dark base + lighter top stripe).
    const plat = this.add.graphics().setDepth(-65);
    plat.lineStyle(5, 0x1a1d2e, 1);
    plat.fillStyle(0x2a4d24, 1);
    const platY = H - 180;
    const topPath = this.sampleBezier(
      [0, platY + 70],
      [160, platY + 40, 360, platY + 90, 640, platY + 60],
      [920, platY + 30, 1100, platY + 90, 1280, platY + 70]
    );
    plat.beginPath();
    plat.moveTo(topPath[0][0], topPath[0][1]);
    for (let i = 1; i < topPath.length; i++) plat.lineTo(topPath[i][0], topPath[i][1]);
    plat.lineTo(1280, platY + 180);
    plat.lineTo(0, platY + 180);
    plat.closePath();
    plat.fillPath();
    plat.strokePath();
    // Faixa clara superior (4a7c3a) — sobre a base.
    const platLight = this.add.graphics().setDepth(-64);
    platLight.fillStyle(0x4a7c3a, 1);
    const lowerPath = this.sampleBezier(
      [1280, platY + 88],
      [1100, platY + 110, 920, platY + 50, 640, platY + 80],
      [360, platY + 110, 160, platY + 60, 0, platY + 90]
    );
    platLight.beginPath();
    platLight.moveTo(topPath[0][0], topPath[0][1]);
    for (let i = 1; i < topPath.length; i++) platLight.lineTo(topPath[i][0], topPath[i][1]);
    platLight.lineTo(1280, platY + 88);
    for (let i = 0; i < lowerPath.length; i++) platLight.lineTo(lowerPath[i][0], lowerPath[i][1]);
    platLight.closePath();
    platLight.fillPath();

    // Grass blades — pequenos triângulos.
    const grass = this.add.graphics().setDepth(-58);
    for (let i = 0; i < 80; i++) {
      const x = i * 16 + (i % 3) * 3;
      const h = 12 + (i % 7) * 5;
      const baseY = H - 6;
      const col = i % 2 ? 0x2a4d24 : 0x1f3a1c;
      grass.fillStyle(col, 1);
      grass.fillTriangle(x, baseY, x + 3, baseY - h, x + 6, baseY);
    }

    // Trees + bushes — drawn directly via helper.
    this.drawTree(50, H - 320, 1.2, 'round');
    this.drawTree(200, H - 270, 0.9, 'pine');
    this.drawTree(1130, H - 310, 1.1, 'round');
    this.drawTree(1010, H - 260, 0.8, 'pine');
    this.drawBush(10, H - 140, 1.0);
    this.drawBush(1190, H - 125, 0.95);

    // Drifting leaves — 4 folhas com tween de drift+rotation.
    const leafColors = [0x3d6b32, 0x2a4d24, 0x5a9a4a];
    for (let i = 0; i < 4; i++) {
      const lx = 200 + Math.random() * 880;
      const ly = 140 + Math.random() * 320;
      const scale = 0.6 + Math.random() * 0.4;
      const color = leafColors[i % leafColors.length];
      this.makeDriftingLeaf(lx, ly, scale, color);
    }

    // Sparkle particles — 8 sparkles com fade-in/fade-out + drift.
    for (let i = 0; i < 8; i++) {
      const sx = 200 + Math.random() * 880;
      const sy = 90 + Math.random() * 360;
      const size = 8 + Math.random() * 6;
      const delay = Math.random() * 2600;
      this.makeSparkle(sx, sy, size, delay);
    }

    // Vignette + foreground darken (escurece bordas pra UI dominar).
    const vignette = this.add.graphics().setDepth(-20);
    // Radial-ish: 4 anéis nas bordas com alpha crescente.
    for (let r = 0; r < 4; r++) {
      const padding = r * 40;
      vignette.lineStyle(60, 0x000000, 0.06 + r * 0.04);
      vignette.strokeRect(-30 + padding, -30 + padding, W + 60 - padding * 2, H + 60 - padding * 2);
    }
    // Faixa inferior escura.
    const bottomDark = this.add.graphics().setDepth(-19);
    bottomDark.fillStyle(0x000000, 0.18);
    bottomDark.fillRect(0, H - 80, W, 80);
  }

  /**
   * Amostra uma curva composta por 2 segmentos Bezier cúbicos contíguos.
   * Cada segmento é definido por [cp1x, cp1y, cp2x, cp2y, endX, endY].
   * Retorna ~32 pontos por segmento — suficiente pra parecer suave em 1280px.
   */
  private sampleBezier(
    start: [number, number],
    seg1: [number, number, number, number, number, number],
    seg2: [number, number, number, number, number, number]
  ): Array<[number, number]> {
    const steps = 32;
    const pts: Array<[number, number]> = [start];
    const cube = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
      const u = 1 - t;
      return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
    };
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      pts.push([
        cube(start[0], seg1[0], seg1[2], seg1[4], t),
        cube(start[1], seg1[1], seg1[3], seg1[5], t)
      ]);
    }
    const start2: [number, number] = [seg1[4], seg1[5]];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      pts.push([
        cube(start2[0], seg2[0], seg2[2], seg2[4], t),
        cube(start2[1], seg2[1], seg2[3], seg2[5], t)
      ]);
    }
    return pts;
  }

  /** Interpolação linear entre 2 stops de gradiente, retornando cor inteira. */
  private gradientAt(stops: Array<[number, number]>, y: number): number {
    for (let i = 1; i < stops.length; i++) {
      const [y0, c0] = stops[i - 1];
      const [y1, c1] = stops[i];
      if (y >= y0 && y <= y1) {
        const t = (y - y0) / Math.max(1, y1 - y0);
        const r0 = (c0 >> 16) & 0xff, g0 = (c0 >> 8) & 0xff, b0 = c0 & 0xff;
        const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
        const r = Math.round(r0 + (r1 - r0) * t);
        const g = Math.round(g0 + (g1 - g0) * t);
        const b = Math.round(b0 + (b1 - b0) * t);
        return (r << 16) | (g << 8) | b;
      }
    }
    return stops[stops.length - 1][1];
  }

  private drawCloud(cx: number, cy: number, w: number, h: number, alpha: number): void {
    const g = this.add.graphics().setDepth(-87);
    g.lineStyle(2.5, 0x1a1d2e, alpha);
    g.fillStyle(0xffffff, alpha);
    // Cloud: 4 bumps + base.
    g.beginPath();
    g.moveTo(cx - w / 2 + 10, cy + h / 2 - 5);
    g.lineTo(cx - w / 2 + 10, cy);
    // top bumps (aproximados com lineTo)
    const bumps = [
      [cx - w / 2 + 36, cy - 8],
      [cx - w / 2 + 60, cy - 14],
      [cx - w / 2 + 92, cy - 5],
      [cx - w / 2 + 130, cy - 12],
      [cx - w / 2 + 162, cy - 5],
      [cx + w / 2 - 30, cy - 10],
      [cx + w / 2 - 10, cy + 4]
    ];
    for (const b of bumps) g.lineTo(b[0], b[1]);
    g.lineTo(cx + w / 2 - 10, cy + h / 2 - 5);
    g.lineTo(cx - w / 2 + 10, cy + h / 2 - 5);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private drawTree(x: number, y: number, scale: number, variant: 'round' | 'pine'): void {
    const c = this.add.container(x, y).setDepth(-62);
    c.setScale(scale);
    const g = this.add.graphics();
    c.add(g);
    // Sombra "drop-shadow(0 6px 0 rgba(0,0,0,0.3))" simulada por uma 2ª camada.
    const shadow = this.add.graphics();
    c.addAt(shadow, 0);
    // Tronco: rect 60..80 x 120..180, fill #5a3a1f stroke #1a1d2e.
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(60, 126, 20, 60, 6);
    g.lineStyle(4, 0x1a1d2e, 1);
    g.fillStyle(0x5a3a1f, 1);
    g.fillRoundedRect(60, 120, 20, 60, 6);
    g.strokeRoundedRect(60, 120, 20, 60, 6);
    // Listra escura no tronco.
    g.fillStyle(0x2a1d0f, 0.6);
    g.fillRoundedRect(60, 120, 6, 60, 3);
    if (variant === 'round') {
      // Folha grande oval + 2 highlights.
      g.lineStyle(4, 0x1a1d2e, 1);
      g.fillStyle(0x2d5a32, 1);
      g.fillEllipse(70, 80, 120, 110);
      g.strokeEllipse(70, 80, 120, 110);
      g.fillStyle(0x4a7c3a, 0.85);
      g.fillEllipse(50, 60, 44, 36);
      g.fillStyle(0x1f3a1c, 0.7);
      g.fillEllipse(92, 100, 40, 28);
    } else {
      // Pine: triangulos empilhados.
      g.lineStyle(4, 0x1a1d2e, 1);
      g.fillStyle(0x1f3a1c, 1);
      // tier 3 (largo, embaixo)
      g.beginPath();
      g.moveTo(10, 150);
      g.lineTo(130, 150);
      g.lineTo(100, 110);
      g.lineTo(120, 110);
      g.lineTo(90, 70);
      g.lineTo(110, 70);
      g.lineTo(70, 10);
      g.lineTo(30, 70);
      g.lineTo(50, 70);
      g.lineTo(20, 110);
      g.lineTo(40, 110);
      g.closePath();
      g.fillPath();
      g.strokePath();
      // pico claro
      g.fillStyle(0x3d6b32, 0.95);
      g.beginPath();
      g.moveTo(70, 10);
      g.lineTo(90, 38);
      g.lineTo(75, 38);
      g.closePath();
      g.fillPath();
      // banda intermediária
      g.fillStyle(0x2d5a32, 0.7);
      g.beginPath();
      g.moveTo(50, 80);
      g.lineTo(90, 80);
      g.lineTo(100, 100);
      g.lineTo(40, 100);
      g.closePath();
      g.fillPath();
    }
  }

  private drawBush(x: number, y: number, scale: number): void {
    const c = this.add.container(x, y).setDepth(-60);
    c.setScale(scale);
    const g = this.add.graphics();
    c.add(g);
    g.lineStyle(4, 0x1a1d2e, 1);
    g.fillStyle(0x2d5a32, 1);
    // Bush: 3 "tufos" sobrepostos para silhueta cartoon.
    g.fillEllipse(32, 38, 36, 28);
    g.strokeEllipse(32, 38, 36, 28);
    g.fillEllipse(62, 28, 40, 32);
    g.strokeEllipse(62, 28, 40, 32);
    g.fillEllipse(92, 38, 32, 26);
    g.strokeEllipse(92, 38, 32, 26);
    // Base achatada.
    g.fillRect(20, 48, 84, 14);
    g.strokeRect(20, 48, 84, 14);
  }

  private makeDriftingLeaf(x: number, y: number, scale: number, color: number): void {
    const g = this.add.graphics().setDepth(-25);
    g.lineStyle(1.5, 0x1a1d2e, 1);
    g.fillStyle(color, 1);
    // Folha como elipse simples (suficiente nessa escala).
    g.fillEllipse(0, 0, 18 * scale, 14 * scale);
    g.strokeEllipse(0, 0, 18 * scale, 14 * scale);
    g.x = x;
    g.y = y;
    // Drift loop (translate + rotate) — match HTML 6s leafDrift.
    this.tweens.add({
      targets: g,
      x: x + 20,
      y: y + 10,
      angle: 360,
      duration: 6000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private makeSparkle(x: number, y: number, size: number, delayMs: number): void {
    const g = this.add.graphics().setDepth(-22);
    g.fillStyle(0xfff7c0, 1);
    const half = size / 2;
    // estrela 4-pontas
    g.beginPath();
    g.moveTo(0, -half);
    g.lineTo(half * 0.3, -half * 0.3);
    g.lineTo(half, 0);
    g.lineTo(half * 0.3, half * 0.3);
    g.lineTo(0, half);
    g.lineTo(-half * 0.3, half * 0.3);
    g.lineTo(-half, 0);
    g.lineTo(-half * 0.3, -half * 0.3);
    g.closePath();
    g.fillPath();
    g.x = x;
    g.y = y;
    g.setAlpha(0);
    // Loop: aparece, drifta levemente, some.
    const dx = -20 + Math.random() * 40;
    const dy = -30 - Math.random() * 60;
    this.tweens.add({
      targets: g,
      alpha: { from: 0, to: 1 },
      x: x + dx,
      y: y + dy,
      scale: { from: 0.6, to: 1.2 },
      duration: 2600,
      delay: delayMs,
      ease: 'Sine.easeOut',
      repeat: -1,
      onRepeat: () => {
        g.x = x;
        g.y = y;
        g.setScale(0.6);
        g.setAlpha(0);
      }
    });
  }

  /* ====================================================================== */
  /* LOGO — "HOLD ON" 3D cartoon stacked wordmark                            */
  /* ====================================================================== */

  private buildLogo(): void {
    // Container do logo no canto superior-esquerdo.
    const logo = this.add.container(170, 130).setDepth(20);

    // "HOLD" — empilhado: amarelo (extrusion) atrás, branco na frente.
    const holdContainer = this.add.container(0, 0);
    const holdStyleBack = Type.display({
      fontSize: '96px',
      color: hex(Colors.accent.yellow),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 7
    });
    const holdStyleFront = Type.display({
      fontSize: '96px',
      color: hex(Colors.text.primary),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 7
    });
    // 3 camadas de extrusion offset, depois face frontal.
    for (let i = 5; i >= 1; i--) {
      const back = this.add.text(i * 1.2, i * 1.2, 'HOLD', holdStyleBack).setOrigin(0, 1);
      holdContainer.add(back);
    }
    const holdFront = this.add.text(0, 0, 'HOLD', holdStyleFront).setOrigin(0, 1);
    holdContainer.add(holdFront);
    holdContainer.setAngle(-3);
    logo.add(holdContainer);

    // "ON" — offset à direita e abaixo, rotacionado +2°.
    const onContainer = this.add.container(70, 78);
    for (let i = 5; i >= 1; i--) {
      const back = this.add.text(i * 1.2, i * 1.2, 'ON', holdStyleBack).setOrigin(0, 1);
      onContainer.add(back);
    }
    const onFront = this.add.text(0, 0, 'ON', holdStyleFront).setOrigin(0, 1);
    onContainer.add(onFront);
    onContainer.setAngle(2);
    logo.add(onContainer);

    // Sparkle pequeno no canto sup-direito do logo (do design).
    const sparkle = this.add.graphics();
    sparkle.lineStyle(2.5, 0x1a1d2e, 1);
    sparkle.fillStyle(Colors.accent.yellow, 1);
    sparkle.beginPath();
    sparkle.moveTo(0, 8);
    sparkle.lineTo(6, 0);
    sparkle.lineTo(8, 6);
    sparkle.lineTo(16, 4);
    sparkle.lineTo(10, 12);
    sparkle.lineTo(18, 18);
    sparkle.lineTo(8, 18);
    sparkle.lineTo(6, 26);
    sparkle.lineTo(0, 18);
    sparkle.lineTo(-8, 22);
    sparkle.lineTo(-2, 12);
    sparkle.lineTo(-10, 8);
    sparkle.closePath();
    sparkle.fillPath();
    sparkle.strokePath();
    sparkle.x = 260;
    sparkle.y = -70;
    logo.add(sparkle);
    // Sparkle subtle pulse (sutil — 1 tween só).
    this.tweens.add({
      targets: sparkle,
      scale: { from: 0.9, to: 1.1 },
      angle: 10,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Entry: bounce-in vindo de cima.
    logo.setY(50);
    logo.setAlpha(0);
    this.tweens.add({
      targets: logo,
      y: 130,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut'
    });
  }

  /* ====================================================================== */
  /* TOP BAR — Best pill (esq) + Coins pill (dir) + Daily badge (cond.)      */
  /* ====================================================================== */

  private buildTopBar(): void {
    // BEST pill (top-left, abaixo do logo).
    this.bestPill = new CurrencyPill({
      scene: this,
      x: 0,
      y: 230,
      icon: '🏆',
      iconColor: Colors.accent.yellow,
      value: '12,450m',
      valueColor: Colors.accent.yellow,
      borderColor: Colors.accent.yellow,
      size: 'small'
    });
    this.bestPill.setDepth(20);
    // Re-posiciona após medir largura.
    this.bestPill.setX(48 + this.bestPill.getPillWidth() / 2);

    // COINS pill (top-right).
    this.coinsPill = new CurrencyPill({
      scene: this,
      x: 0,
      y: 56,
      icon: '◉',
      iconColor: Colors.accent.yellow,
      value: 0,
      valueColor: Colors.accent.yellow,
      borderColor: Colors.accent.yellow,
      size: 'medium'
    });
    this.coinsPill.setDepth(20);
    this.coinsPill.setX(GAME_WIDTH - 32 - this.coinsPill.getPillWidth() / 2);

    // Daily badge — só aparece se ainda não reivindicou + tem ads.
    const today = this.state.currentDateKey();
    if (!this.state.hasClaimedDailyChest(today) && !getServices().ads.isAdsRemoved()) {
      const badge = this.add.container(0, 126).setDepth(21);
      const labelStr = '🎁  Daily!';
      const txt = this.add
        .text(0, 0, labelStr, Type.button({
          fontSize: '16px',
          color: hex(Colors.text.primary),
          stroke: hex(Colors.bg.primary),
          strokeThickness: 3,
          fontStyle: '700'
        }))
        .setOrigin(0.5);
      const bw = txt.width + 36;
      const bh = 40;
      const bgGfx = this.add.graphics();
      // Glow externo coral.
      bgGfx.fillStyle(Colors.accent.coral, 0.25);
      bgGfx.fillRoundedRect(-bw / 2 - 6, -bh / 2 - 6, bw + 12, bh + 12, (bh + 12) / 2);
      // Sombra inferior.
      bgGfx.fillStyle(Colors.accent.coralDark, 1);
      bgGfx.fillRoundedRect(-bw / 2, -bh / 2 + 4, bw, bh, bh / 2);
      // Body coral.
      bgGfx.fillStyle(Colors.accent.coral, 1);
      bgGfx.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
      bgGfx.lineStyle(2.5, Colors.bg.primary, 1);
      bgGfx.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
      badge.add(bgGfx);
      badge.add(txt);
      badge.setX(GAME_WIDTH - 32 - bw / 2);

      // Bounce animation (translate + rotate) — match HTML 1.4s dailyBounce.
      this.tweens.add({
        targets: badge,
        y: 120,
        angle: { from: -3, to: 3 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Hit zone.
      const hit = this.add
        .rectangle(0, 0, bw + 8, bh + 8, 0xffffff, 0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      badge.add(hit);
      hit.on('pointerdown', () => {
        try { getServices().haptics.trigger('selection'); } catch {}
      });
      hit.on('pointerup', () => this.openDailyChest(today));
    }
  }

  /* ====================================================================== */
  /* CHARACTER — Rock (skin equipada) + aura + aura beams + bob + shadow     */
  /* ====================================================================== */

  private buildCharacter(): void {
    const skinId = this.state.get().equippedSkin;
    const tex = this.textures.exists(`skin_${skinId}`) ? `skin_${skinId}` : 'skin_rock';
    const cx = 250;
    const cy = 380;

    // Aura beams — 8 polígonos amarelos rotating em container.
    const beams = this.add.container(cx, cy).setDepth(2);
    for (let i = 0; i < 8; i++) {
      const beam = this.add.graphics();
      beam.fillStyle(Colors.accent.yellow, 0.45);
      // beam: triângulo fino vertical, comprimento 160.
      beam.beginPath();
      beam.moveTo(0, -160);
      beam.lineTo(12, 0);
      beam.lineTo(-12, 0);
      beam.closePath();
      beam.fillPath();
      beam.angle = i * 45;
      beams.add(beam);
    }
    beams.setAlpha(0.7);
    // Slow rotation (14s no design).
    this.tweens.add({
      targets: beams,
      angle: 360,
      duration: 14000,
      repeat: -1,
      ease: 'Linear'
    });

    // Aura — círculo radial amarelo pulsando.
    const aura = this.add.graphics().setDepth(3);
    aura.fillStyle(Colors.accent.yellow, 0.18);
    aura.fillCircle(cx, cy, 110);
    aura.fillStyle(Colors.accent.yellow, 0.12);
    aura.fillCircle(cx, cy, 150);
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 0.95, to: 1.1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Personagem — sprite da skin com bob (translate + rotate).
    const sprite = this.add.image(cx, cy, tex).setScale(3.0).setDepth(5).setAlpha(0);
    this.tweens.add({
      targets: sprite,
      alpha: 1,
      scale: { from: 2.4, to: 3.0 },
      duration: 320,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Bob: -10..0 translate + -1.5..1.5deg rotate (HTML keyframes).
        this.tweens.add({
          targets: sprite,
          y: cy - 10,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.tweens.add({
          targets: sprite,
          angle: { from: -1.5, to: 1.5 },
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    // Shadow blob abaixo do personagem.
    const shadow = this.add.graphics().setDepth(4);
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillEllipse(cx, cy + 130, 180, 26);
  }

  /* ====================================================================== */
  /* SLOTS — 3 slots row + caption "Tap to equip"                            */
  /* ====================================================================== */

  private buildSlots(): void {
    this.slotsContainer = this.add.container(0, 0).setDepth(15);
    const baseY = 570;
    const slotSize = 80;
    const gap = 16;
    const totalW = 3 * slotSize + 2 * gap;
    const startX = 250 - totalW / 2 + slotSize / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotSize + gap);
      const unlocked = this.state.isSlotUnlocked(i);
      const id = this.state.get().equippedSlots[i];

      const slot = this.add.container(x, baseY);
      const bg = this.add.graphics();

      if (unlocked && id) {
        // filled-rare: cyan border + cyan glow.
        // glow externo.
        bg.fillStyle(Colors.accent.cyan, 0.25);
        bg.fillCircle(0, 0, slotSize / 2 + 10);
        bg.fillStyle(Colors.accent.cyan, 0.15);
        bg.fillCircle(0, 0, slotSize / 2 + 18);
        // sombra inferior.
        bg.fillStyle(Colors.bg.primary, 1);
        bg.fillCircle(0, 4, slotSize / 2);
        // body.
        bg.fillStyle(Colors.accent.cyan, 1);
        bg.fillCircle(0, 0, slotSize / 2);
        // borda dark.
        bg.lineStyle(3, Colors.bg.primary, 1);
        bg.strokeCircle(0, 0, slotSize / 2);
        // highlight superior.
        bg.fillStyle(0xffffff, 0.35);
        bg.fillCircle(0, -8, 16);
        // Pulse rare anim (subtle).
        this.tweens.add({
          targets: slot,
          scale: { from: 1, to: 1.04 },
          duration: 2400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else if (unlocked) {
        // empty: tracejado branco.
        bg.fillStyle(Colors.bg.primary, 0.35);
        bg.fillCircle(0, 0, slotSize / 2);
        // borda tracejada simulada com 8 segmentos.
        bg.lineStyle(3, Colors.text.primary, 0.85);
        const segs = 16;
        for (let s = 0; s < segs; s += 2) {
          const a0 = (s / segs) * Math.PI * 2;
          const a1 = ((s + 1) / segs) * Math.PI * 2;
          bg.beginPath();
          bg.arc(0, 0, slotSize / 2, a0, a1);
          bg.strokePath();
        }
      } else {
        // locked: navy + cinza.
        bg.fillStyle(Colors.bg.primary, 0.6);
        bg.fillCircle(0, 0, slotSize / 2);
        bg.lineStyle(3, Colors.text.muted, 1);
        bg.strokeCircle(0, 0, slotSize / 2);
      }
      slot.add(bg);

      let label = '+';
      let labelColor = hex(Colors.text.primary);
      let labelStrokeColor = hex(Colors.bg.primary);
      let labelStrokeWidth = 2;
      let labelSize = '40px';
      if (!unlocked) {
        label = '🔒';
        labelColor = hex(Colors.text.muted);
        labelStrokeWidth = 0;
        labelSize = '32px';
      } else if (id) {
        label = this.iconForId(id);
        labelColor = hex(Colors.text.primary);
        labelStrokeWidth = 3;
        labelSize = '28px';
      }
      const t = this.add
        .text(0, 0, label, {
          fontFamily: 'sans-serif',
          fontSize: labelSize,
          color: labelColor,
          fontStyle: '700',
          stroke: labelStrokeColor,
          strokeThickness: labelStrokeWidth
        })
        .setOrigin(0.5);
      slot.add(t);

      // Hit zone.
      const hit = this.add
        .rectangle(0, 0, slotSize, slotSize, 0xffffff, 0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      slot.add(hit);
      hit.on('pointerdown', () => {
        if (!unlocked) {
          showToast({
            scene: this,
            message: i === 1 ? 'Desbloqueia em 5.000m' : 'Desbloqueia em 10.000m',
            icon: '🔒'
          });
          return;
        }
        this.registry.set('slot_focus', i);
        SceneTransition.slide(this, SCENES.INVENTORY);
      });

      this.slotsContainer.add(slot);
    }

    // Caption "Tap to equip" — uppercase, letterSpacing.
    const caption = this.add
      .text(250, baseY + 68, 'TAP TO EQUIP', Type.caption({
        fontSize: '13px',
        color: hex(Colors.text.secondary),
        fontStyle: '600'
      }))
      .setOrigin(0.5);
    caption.setLetterSpacing?.(2.5);
    this.slotsContainer.add(caption);
  }

  private iconForId(id: string): string {
    const map: Record<string, string> = {
      head_start: '⚡',
      coin_bonus: '◉',
      powerup_duration: '⌛',
      magnet_range: '🧲',
      shield_initial: '◈',
      score_multiplier: '×',
      near_miss_boost: '⟿',
      lucky_drop: '☘'
    };
    return map[id] ?? '?';
  }

  /* ====================================================================== */
  /* PLAY — botão grande 3D + halo + caption                                 */
  /* ====================================================================== */

  private buildPlayButton(): void {
    const px = GAME_WIDTH - 280;
    const py = 400;

    // Halo — círculos amarelos translúcidos pulsando.
    const halo = this.add.graphics().setDepth(8);
    halo.fillStyle(Colors.accent.yellow, 0.35);
    halo.fillCircle(px, py, 200);
    halo.fillStyle(Colors.accent.yellow, 0.22);
    halo.fillCircle(px, py, 240);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 1, to: 1.08 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Botão grande primary.
    const btn = new Button3D({
      scene: this,
      x: px,
      y: py,
      width: 320,
      height: 110,
      label: 'PLAY',
      icon: '▶',
      fontSize: 48,
      variant: 'primary',
      radius: 32,
      onClick: () => {
        this.registry.remove('dev_start_meters');
        this.registry.remove('dev_start_biome');
        SceneTransition.fade(this, SCENES.GAME);
      }
    });
    btn.setDepth(9);

    // Entry: scale-in com Back.
    btn.setScale(0).setAlpha(0);
    this.tweens.add({
      targets: btn,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });

    // Caption "Tap to start".
    const cap = this.add
      .text(px, py + 80, 'TAP TO START', Type.caption({
        fontSize: '16px',
        color: hex(Colors.text.primary),
        stroke: hex(Colors.bg.primary),
        strokeThickness: 2,
        fontStyle: '600'
      }))
      .setOrigin(0.5)
      .setDepth(9);
    cap.setLetterSpacing?.(2);
  }

  /* ====================================================================== */
  /* BOTTOM NAV — 5 circle buttons                                            */
  /* ====================================================================== */

  private buildBottomNav(): void {
    const items: Array<{ icon: string; label: string; key: string }> = [
      { icon: '🛒', label: 'SHOP', key: SCENES.SHOP },
      { icon: '🎒', label: 'INVENTORY', key: SCENES.INVENTORY },
      { icon: '🎯', label: 'MISSIONS', key: SCENES.MISSIONS },
      { icon: '🏅', label: 'LEADERBOARD', key: SCENES.LEADERBOARD },
      { icon: '⚙', label: 'SETTINGS', key: SCENES.SETTINGS }
    ];
    const itemW = 80;
    const gap = 28;
    const totalW = items.length * itemW + (items.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + itemW / 2;
    const baseY = GAME_HEIGHT - 80;

    items.forEach((it, i) => {
      const x = startX + i * (itemW + gap);
      const c = this.makeNavCircle(x, baseY, it.icon, it.label, () => {
        SceneTransition.slide(this, it.key);
      });
      // Cascade entry.
      c.setAlpha(0).setY(baseY + 30);
      this.tweens.add({
        targets: c,
        alpha: 1,
        y: baseY,
        duration: 320,
        delay: 50 * i,
        ease: 'Back.easeOut'
      });
    });
  }

  private makeNavCircle(
    x: number,
    y: number,
    icon: string,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.graphics();
    const drawBg = (pressed: boolean) => {
      bg.clear();
      const off = pressed ? 2 : 6;
      // Sombra inferior.
      bg.fillStyle(Colors.bg.primary, 1);
      bg.fillCircle(0, off, 40);
      // Body navy.
      bg.fillStyle(Colors.bg.secondary, 1);
      bg.fillCircle(0, pressed ? 4 : 0, 40);
      // Borda cyan accent.
      bg.lineStyle(4, Colors.accent.cyan, 1);
      bg.strokeCircle(0, pressed ? 4 : 0, 40);
      // Highlight superior.
      bg.fillStyle(0xffffff, 0.12);
      bg.fillCircle(-3, pressed ? -4 : -10, 18);
    };
    drawBg(false);
    c.add(bg);

    const iconText = this.add
      .text(0, 0, icon, { fontFamily: 'sans-serif', fontSize: '30px' })
      .setOrigin(0.5);
    c.add(iconText);

    const labelText = this.add
      .text(0, 56, label, Type.caption({
        fontSize: '12px',
        color: hex(Colors.text.primary),
        stroke: hex(Colors.bg.primary),
        strokeThickness: 2,
        fontStyle: '700'
      }))
      .setOrigin(0.5);
    labelText.setLetterSpacing?.(1.5);
    c.add(labelText);

    const hitZone = this.add
      .circle(0, 0, 44, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    c.add(hitZone);
    hitZone.on('pointerdown', () => {
      drawBg(true);
      this.tweens.add({ targets: c, scale: 0.95, duration: 80 });
      try { getServices().haptics.trigger('selection'); } catch {}
    });
    hitZone.on('pointerup', () => {
      drawBg(false);
      this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.easeOut' });
      onClick();
    });
    hitZone.on('pointerout', () => {
      drawBg(false);
      this.tweens.add({ targets: c, scale: 1, duration: 180 });
    });
    return c;
  }

  /* ====================================================================== */
  /* EXTRA — Boost ad button (preserva functionality, fora do HTML)          */
  /* ====================================================================== */

  private buildExtraButtons(): void {
    // Boost button — só se ads ativos. Posicionado embaixo-esquerda, discreto.
    if (!getServices().ads.isAdsRemoved()) {
      new Button3D({
        scene: this,
        x: 150,
        y: 660,
        width: 180,
        height: 48,
        label: 'BOOST',
        icon: '⚡',
        fontSize: 16,
        variant: 'success',
        radius: 24,
        onClick: () => this.startBoostAd()
      }).setDepth(22);
    }
  }

  /* ====================================================================== */
  /* DEV — picker de fase (preservado, fora do HTML)                          */
  /* ====================================================================== */

  private buildDevButton(): void {
    new Button3D({
      scene: this,
      x: GAME_WIDTH - 80,
      y: GAME_HEIGHT - 30,
      width: 120,
      height: 36,
      label: 'DEV',
      icon: '🧪',
      fontSize: 14,
      variant: 'danger',
      radius: 18,
      onClick: () => this.openDevPhasePicker()
    }).setDepth(22);
  }

  private openDevPhasePicker(): void {
    const phases: Array<{ id: string; name: string; meters: number; emoji: string }> = [
      { id: 'forest',  name: 'Forest',  meters: 0,     emoji: '🌲' },
      { id: 'cave',    name: 'Cave',    meters: 2000,  emoji: '🦇' },
      { id: 'temple',  name: 'Temple',  meters: 4500,  emoji: '🏛️' },
      { id: 'sea',     name: 'Sea',     meters: 7000,  emoji: '🌊' },
      { id: 'beach',   name: 'Beach',   meters: 10000, emoji: '🏖️' },
      { id: 'volcano', name: 'Volcano', meters: 12500, emoji: '🌋' },
      { id: 'citadel', name: 'Citadel', meters: 15000, emoji: '🏰' },
      { id: 'space',   name: 'Space',   meters: 18000, emoji: '🌌' }
    ];

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 0.85)
      .setOrigin(0)
      .setDepth(2000)
      .setInteractive();

    const panelW = 760;
    const panelH = 520;
    const px = GAME_WIDTH / 2;
    const py = GAME_HEIGHT / 2;
    const panel = this.add.container(px, py).setDepth(2001);

    const card = new Card({
      scene: this,
      x: 0,
      y: 0,
      width: panelW,
      height: panelH,
      bgColor: Colors.bg.secondary,
      bgAlpha: 0.98,
      borderColor: Colors.accent.coral,
      borderWidth: 3,
      radius: 24
    });
    panel.add(card);

    const title = this.add
      .text(0, -panelH / 2 + 38, '🧪 DEV — Pular pra fase', Type.heading({ fontSize: '26px', color: hex(Colors.accent.coral) }))
      .setOrigin(0.5);
    panel.add(title);
    const subtitle = this.add
      .text(0, -panelH / 2 + 70, 'Preview rápido — escolha uma fase pra começar', Type.caption({ fontSize: '14px', color: hex(Colors.text.secondary) }))
      .setOrigin(0.5);
    panel.add(subtitle);

    const cols = 4;
    const rows = 2;
    const cellW = 170;
    const cellH = 130;
    const gridW = cols * cellW + (cols - 1) * 12;
    const gridH = rows * cellH + (rows - 1) * 12;
    const startX = -gridW / 2 + cellW / 2;
    const startY = -gridH / 2 + cellH / 2 + 20;

    phases.forEach((phase, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cellW + 12);
      const cy = startY + row * (cellH + 12);
      const phaseContainer = this.add.container(cx, cy);

      const bg = this.add.graphics();
      bg.fillStyle(Colors.bg.primary, 0.9);
      bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      bg.lineStyle(2, Colors.accent.cyan, 0.6);
      bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      phaseContainer.add(bg);

      const emoji = this.add
        .text(0, -28, phase.emoji, { fontFamily: 'sans-serif', fontSize: '36px' })
        .setOrigin(0.5);
      phaseContainer.add(emoji);

      const name = this.add
        .text(0, 14, phase.name, Type.button({ fontSize: '18px', color: hex(Colors.text.primary) }))
        .setOrigin(0.5);
      phaseContainer.add(name);

      const meters = this.add
        .text(0, 38, `${phase.meters}m`, Type.caption({ fontSize: '12px', color: hex(Colors.text.muted) }))
        .setOrigin(0.5);
      phaseContainer.add(meters);

      const hit = this.add
        .rectangle(0, 0, cellW, cellH, 0xffffff, 0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      phaseContainer.add(hit);

      hit.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(Colors.accent.cyan, 0.18);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
        bg.lineStyle(3, Colors.accent.cyan, 1);
        bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      });
      hit.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(Colors.bg.primary, 0.9);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
        bg.lineStyle(2, Colors.accent.cyan, 0.6);
        bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      });
      hit.on('pointerdown', () => {
        this.registry.set('dev_start_meters', phase.meters);
        this.registry.set('dev_start_biome', phase.id);
        SceneTransition.fade(this, SCENES.GAME);
      });

      panel.add(phaseContainer);
    });

    const closeBtn = new Button({
      scene: this,
      x: 0,
      y: panelH / 2 - 44,
      width: 200,
      height: 56,
      label: 'Fechar',
      variant: 'ghost',
      onClick: () => {
        try { panel.destroy(); overlay.destroy(); } catch {}
      }
    });
    panel.add(closeBtn);

    panel.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
  }

  /* ====================================================================== */
  /* STATE refresh + daily reward + extras                                    */
  /* ====================================================================== */

  private refresh(): void {
    const s = this.state.get();
    this.coinsPill?.setValue(s.coins);
    this.bestPill?.setValue(`${s.bestDistance.toLocaleString('pt-BR')}m`);
    if (this.slotsContainer) {
      this.slotsContainer.destroy();
      this.buildSlots();
    }
  }

  private handleDailyReward(): void {
    const s = this.state.get();
    if (s.dailyClaimed) return;
    const reward = this.state.getDailyReward(s.loginStreak);
    new Modal({
      scene: this,
      title: `Login diário · Dia ${s.loginStreak}`,
      message: `Você ganhou ${reward} moedas pela visita de hoje!`,
      accent: Colors.accent.yellow,
      buttons: [
        {
          label: 'Receber',
          variant: 'primary',
          onClick: () => {
            const got = this.state.claimDailyReward();
            showToast({
              scene: this,
              message: `+${got} moedas`,
              icon: '◉',
              color: Colors.accent.yellow
            });
          }
        }
      ]
    });
  }

  private async openDailyChest(today: string): Promise<void> {
    const r = await getServices().ads.show('rewarded');
    if (r.rewarded) {
      const reward = 200;
      this.state.addCoins(reward);
      this.state.markDailyChestClaimed(today);
      this.state.bumpChestCounter(false);
      showToast({ scene: this, message: `+${reward} moedas do baú!`, icon: '🎁', color: Colors.accent.yellow });
      this.scene.restart();
    } else {
      showToast({ scene: this, message: 'Ad cancelado', icon: '!' });
    }
  }

  private async startBoostAd(): Promise<void> {
    const r = await getServices().ads.show('rewarded');
    if (r.rewarded) {
      const id = randPick(POWERUP_LIST.filter((p) => p.durationMs > 0)).id;
      this.registry.set('start_boost', id);
      showToast({ scene: this, message: `Próxima run terá ${id} ativo!`, icon: '⚡', color: Colors.accent.green });
    }
  }
}
