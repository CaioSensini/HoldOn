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
import { Modal } from '../ui/Modal';
import { SceneTransition } from '../ui/SceneTransition';
import { showToast } from '../ui/ToastNotification';
import { randPick } from '../utils/MathUtils';

/**
 * Tela inicial — reproduz fielmente `designs/screens/home/home.jsx` +
 * `backdrop.jsx`:
 *  - ForestBiome backdrop (sky 'dramatic', density 'rich')
 *  - HoldOnLogo: 130px Fredoka, 6 camadas de extrusão amarela + face branca
 *  - BEST pill (top-left) + coin pill (top-right) + daily badge
 *  - RockChar (rocha cartoon) com aura, beams 8x rotativos, bob, sombra
 *  - 3 slots de equipável (filled-rare cyan + 2 vazios) com caption
 *  - PLAY button gigante (yellow gradient + halo) com play.svg
 *  - Bottom nav 5 SVG icons
 *
 * State/services/scene-transition mantidos do código anterior — só a
 * camada visual mudou. Toda hipótese de posição/cor/tamanho vem dos
 * arquivos JSX, não de invenção.
 */
export class HomeScene extends Phaser.Scene {
  private state = GameState.instance();
  private unsub?: () => void;

  // Refs para refresh sem recriar tudo.
  private coinsValueText?: Phaser.GameObjects.Text;
  private bestValueText?: Phaser.GameObjects.Text;
  private slotsContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENES.HOME });
  }

  create(): void {
    this.buildBackground();
    this.buildTopLeftCluster();
    this.buildTopRightCluster();
    this.buildHero();
    this.buildPlay();
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
  /* BACKGROUND — Forest biome do backdrop.jsx                                */
  /* ====================================================================== */

  private buildBackground(): void {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    // Sky gradient "dramatic": navy → blue → sky-blue → green → dark-green.
    // (linear-gradient(180deg, #1f3a8a 0%, #3b6db8 28%, #5a9bcf 50%, #6ba85a 78%, #2a4d24 100%))
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

    // God-ray light shafts upper-left (3 polígonos, amarelo translúcido,
    // mix-blend-mode 'screen', opacity 0.45 no JSX).
    const rays = this.add.graphics().setDepth(-95);
    const rayColor = 0xfff7c0;
    const rayBase = 0.45 * 0.85; // emula mix-blend screen razoavelmente
    const rayPolys: Array<{ pts: number[]; a: number }> = [
      { pts: [0, 0, 240, 0, 380, 540, 100, 540], a: 1.0 },
      { pts: [120, 0, 280, 0, 460, 540, 280, 540], a: 0.6 },
      { pts: [240, 0, 360, 0, 540, 540, 420, 540], a: 0.4 }
    ];
    for (const r of rayPolys) {
      rays.fillStyle(rayColor, rayBase * r.a);
      rays.beginPath();
      rays.moveTo(r.pts[0], r.pts[1]);
      for (let i = 2; i < r.pts.length; i += 2) rays.lineTo(r.pts[i], r.pts[i + 1]);
      rays.closePath();
      rays.fillPath();
    }

    // Sun glow (.sun-glow: top:-120 left:-120 480x480 radial-gradient).
    const sunGlowCx = -120 + 240;
    const sunGlowCy = -120 + 240;
    const glow = this.add.graphics().setDepth(-90);
    const glowRings = [
      { r: 240, a: 0.0 },
      { r: 200, a: 0.10 },
      { r: 160, a: 0.22 },
      { r: 120, a: 0.40 },
      { r: 80,  a: 0.70 }
    ];
    for (const g of glowRings) {
      glow.fillStyle(0xffeca0, g.a);
      glow.fillCircle(sunGlowCx, sunGlowCy, g.r);
    }

    // Sun disc (.sun-disc: top:60 left:70 130x130 #ffe98a).
    const sunCx = 70 + 65;
    const sunCy = 60 + 65;
    const sun = this.add.graphics().setDepth(-89);
    sun.fillStyle(0xffe98a, 1);
    sun.fillCircle(sunCx, sunCy, 65);

    // Cloud strips (2 nuvens estilizadas, branco com outline).
    this.drawCloud(380 + 110, 90 + 18, 220, 36, 0.85);
    this.drawCloud(W - 320 - 90, 160 + 16, 180, 32, 0.7);

    // Distant mountain ridge (azul-cinza com pico, opacity 0.7).
    const farMtn = this.add.graphics().setDepth(-80);
    farMtn.lineStyle(3.5, 0x1a1d2e, 1);
    farMtn.fillStyle(0x3a5a78, 0.7);
    const farMtnY = H - 220;
    const farPts = [0, 200, 80, 80, 140, 130, 230, 30, 330, 110, 430, 60, 540, 130, 640, 40, 760, 120, 870, 70, 980, 130, 1080, 60, 1180, 120, 1280, 90, 1280, 240, 0, 240];
    farMtn.beginPath();
    farMtn.moveTo(farPts[0], farMtnY + farPts[1]);
    for (let i = 2; i < farPts.length; i += 2) farMtn.lineTo(farPts[i], farMtnY + farPts[i + 1]);
    farMtn.closePath();
    farMtn.fillPath();
    farMtn.strokePath();

    // Atmospheric fog band — linear-gradient horizontal fade.
    const fogGfx = this.add.graphics().setDepth(-78);
    fogGfx.fillStyle(0xb4d2dc, 0.25);
    fogGfx.fillRect(0, H - 280 - 55, W, 110);

    // Mid mountain ridge — dark green com triângulo claro nos picos.
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
    // Picos highlight (lighter green triangles).
    midMtn.fillStyle(0x5a8a4a, 0.7);
    midMtn.fillTriangle(230, midMtnY + 60, 200, midMtnY + 110, 260, midMtnY + 110);
    midMtn.fillTriangle(680, midMtnY + 70, 650, midMtnY + 120, 710, midMtnY + 120);

    // Rolling hills (curva bezier amostrada).
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
    // Faixa clara superior (#4a7c3a) entre topPath e lowerPath.
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

    // Grass blades — 80 triângulos pequenos no rodapé.
    const grass = this.add.graphics().setDepth(-58);
    for (let i = 0; i < 80; i++) {
      const x = i * 16 + (i % 3) * 3;
      const h = 12 + (i % 7) * 5;
      const baseY = H - 6;
      const col = i % 2 ? 0x2a4d24 : 0x1f3a1c;
      grass.fillStyle(col, 1);
      grass.fillTriangle(x, baseY, x + 3, baseY - h, x + 6, baseY);
    }

    // Trees + bushes (mesmas posições que backdrop.jsx).
    this.drawTree(50, H - 320, 1.2, 'round');
    this.drawTree(200, H - 270, 0.9, 'pine');
    this.drawTree(1130, H - 310, 1.1, 'round');
    this.drawTree(1010, H - 260, 0.8, 'pine');
    this.drawBush(10, H - 140, 1.0);
    this.drawBush(1190, H - 125, 0.95);

    // Drifting leaves (leafCount=4 em density='rich').
    const leafColors = [0x3d6b32, 0x2a4d24, 0x5a9a4a];
    for (let i = 0; i < 4; i++) {
      const lx = Math.random() * 1280;
      const ly = 140 + Math.random() * 320;
      const scale = 0.5 + Math.random() * 0.4;
      const color = leafColors[Math.floor(Math.random() * leafColors.length)];
      this.makeDriftingLeaf(lx, ly, scale, color);
    }

    // Sparkles (sparkleCount=8 em density='rich').
    for (let i = 0; i < 8; i++) {
      const sx = 200 + Math.random() * 900;
      const sy = 90 + Math.random() * 360;
      const size = 8 + Math.random() * 6;
      const delay = Math.random() * 2600;
      this.makeSparkle(sx, sy, size, delay);
    }

    // Vignette — radial + linear darkening (JSX: rgba(0,0,0,0.35) borda).
    const vignette = this.add.graphics().setDepth(-20);
    for (let r = 0; r < 4; r++) {
      const padding = r * 40;
      vignette.lineStyle(60, 0x000000, 0.06 + r * 0.04);
      vignette.strokeRect(-30 + padding, -30 + padding, W + 60 - padding * 2, H + 60 - padding * 2);
    }
    // Top fade (10% black on top 30%) and bottom fade (25% black on bottom 30%).
    const topDark = this.add.graphics().setDepth(-19);
    topDark.fillStyle(0x000000, 0.10);
    topDark.fillRect(0, 0, W, 80);
    const bottomDark = this.add.graphics().setDepth(-19);
    bottomDark.fillStyle(0x000000, 0.25);
    bottomDark.fillRect(0, H - 100, W, 100);
  }

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
        cube(start2[0], seg1[2], seg2[0], seg2[2], t),
        cube(start2[1], seg1[3], seg2[1], seg2[3], t)
      ]);
    }
    // 2º segmento usando seg2 end como destino
    const end2: [number, number] = [seg2[4], seg2[5]];
    pts.push(end2);
    return pts;
  }

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
    g.beginPath();
    g.moveTo(cx - w / 2 + 10, cy + h / 2 - 5);
    g.lineTo(cx - w / 2 + 10, cy);
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

  /** Tree do backdrop.jsx (variant 'round' = elipse, 'pine' = triângulos). */
  private drawTree(x: number, y: number, scale: number, variant: 'round' | 'pine'): void {
    const c = this.add.container(x, y).setDepth(-62);
    c.setScale(scale);
    const shadow = this.add.graphics();
    c.add(shadow);
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(60, 126, 20, 60, 6);

    const g = this.add.graphics();
    c.add(g);
    // Tronco (rect 60..80 x 120..180, fill #5a3a1f stroke #1a1d2e).
    g.lineStyle(4, 0x1a1d2e, 1);
    g.fillStyle(0x5a3a1f, 1);
    g.fillRoundedRect(60, 120, 20, 60, 6);
    g.strokeRoundedRect(60, 120, 20, 60, 6);
    g.fillStyle(0x2a1d0f, 0.6);
    g.fillRoundedRect(60, 120, 6, 60, 3);

    if (variant === 'round') {
      // Folha grande oval (ellipse cx=70 cy=80 rx=60 ry=55) + 2 highlights.
      g.lineStyle(4, 0x1a1d2e, 1);
      g.fillStyle(0x2d5a32, 1);
      g.fillEllipse(70, 80, 120, 110);
      g.strokeEllipse(70, 80, 120, 110);
      g.fillStyle(0x4a7c3a, 0.85);
      g.fillEllipse(50, 60, 44, 36);
      g.fillStyle(0x1f3a1c, 0.7);
      g.fillEllipse(92, 100, 40, 28);
    } else {
      // Pine — triangulos empilhados (path original do JSX).
      g.lineStyle(4, 0x1a1d2e, 1);
      g.fillStyle(0x1f3a1c, 1);
      g.beginPath();
      g.moveTo(70, 10);
      g.lineTo(110, 70);
      g.lineTo(90, 70);
      g.lineTo(120, 110);
      g.lineTo(100, 110);
      g.lineTo(130, 150);
      g.lineTo(10, 150);
      g.lineTo(40, 110);
      g.lineTo(20, 110);
      g.lineTo(50, 70);
      g.lineTo(30, 70);
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.fillStyle(0x3d6b32, 0.95);
      g.beginPath();
      g.moveTo(70, 10);
      g.lineTo(90, 38);
      g.lineTo(75, 38);
      g.closePath();
      g.fillPath();
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

  /** Bush do backdrop.jsx (silhueta cartoon com 3 elipses sobrepostas). */
  private drawBush(x: number, y: number, scale: number): void {
    const c = this.add.container(x, y).setDepth(-60);
    c.setScale(scale);
    const g = this.add.graphics();
    c.add(g);
    g.lineStyle(4, 0x1a1d2e, 1);
    g.fillStyle(0x2d5a32, 1);
    // 3 tufos (ellipse cy 38/28/38).
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
    g.fillEllipse(0, 0, 18 * scale, 14 * scale);
    g.strokeEllipse(0, 0, 18 * scale, 14 * scale);
    g.x = x;
    g.y = y;
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
    // 4-pontas star — path do JSX (M7 0 L 8.4 5.6 L 14 7 L 8.4 8.4 L 7 14 L 5.6 8.4 L 0 7 L 5.6 5.6 Z, escalado).
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
  /* TOP-LEFT — HoldOnLogo + BEST pill                                        */
  /* ====================================================================== */

  private buildTopLeftCluster(): void {
    // JSX: outer container at top:18, left:32. HoldOnLogo (rotated -3deg)
    // + BEST hpill (marginTop:-10, marginLeft:16) abaixo.
    this.buildHoldOnLogo(32, 18);
    this.buildBestPill(56, 260);
  }

  /**
   * HOLD ON wordmark — replica home.jsx#HoldOnLogo.
   *   - SVG viewBox 420×240, posicionado em (originX, originY)
   *   - HOLD: 130px Fredoka 700, baseline em (8, 122) dentro do SVG
   *   - "ON": baseline em (118, 230), rotacionado +2°
   *   - Cada palavra empilha 6 cópias deslocadas (extrusão amarela #ffd23f
   *     stroke #1a1d2e 6px) + 1 face frontal branca
   *   - Outer container rotacionado -3° ao redor de (origin, origin + 240)
   *   - Sparkle estilizado no canto sup-direito
   */
  private buildHoldOnLogo(originX: number, originY: number): void {
    // Pivot da rotação outer = bottom-left do SVG (left bottom em CSS).
    const pivotX = originX;
    const pivotY = originY + 240;
    const logo = this.add.container(pivotX, pivotY).setDepth(20);
    logo.setAngle(-3);

    const depth = 6;
    const yellow = 0xffd23f;
    const dark = 0x1a1d2e;

    const styleExtrusion: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "'Fredoka', 'Baloo 2', sans-serif",
      fontSize: '130px',
      fontStyle: '700',
      color: hex(yellow),
      stroke: hex(dark),
      strokeThickness: 6
    };
    const styleFront: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "'Fredoka', 'Baloo 2', sans-serif",
      fontSize: '130px',
      fontStyle: '700',
      color: hex(0xfff8dc),
      stroke: hex(dark),
      strokeThickness: 6
    };

    // === HOLD === (translate(8 122) no JSX → baseline at (8, 122 - 240) = (8, -118)).
    const holdBaselineY = 122 - 240; // -118
    for (let i = depth - 1; i >= 0; i--) {
      const t = this.add.text(8 + i, holdBaselineY + i, 'HOLD', styleExtrusion).setOrigin(0, 1);
      t.setLetterSpacing?.(-2.6); // -0.02em a 130px
      logo.add(t);
    }
    const holdFront = this.add.text(8 - 1, holdBaselineY - 1, 'HOLD', styleFront).setOrigin(0, 1);
    holdFront.setLetterSpacing?.(-2.6);
    logo.add(holdFront);

    // === ON === (translate(118 230) rotate(2)).
    const onContainer = this.add.container(118, 230 - 240); // (118, -10)
    onContainer.setAngle(2);
    for (let i = depth - 1; i >= 0; i--) {
      const t = this.add.text(i, i, 'ON', styleExtrusion).setOrigin(0, 1);
      t.setLetterSpacing?.(-2.6);
      onContainer.add(t);
    }
    const onFront = this.add.text(-1, -1, 'ON', styleFront).setOrigin(0, 1);
    onFront.setLetterSpacing?.(-2.6);
    onContainer.add(onFront);
    logo.add(onContainer);

    // === Spark sparkle (top-right of HOLD: translate(308 36) — baseline-relative).
    const spark = this.add.graphics();
    spark.lineStyle(2.5, dark, 1);
    spark.fillStyle(yellow, 1);
    // Path: M0 8 L 6 0 L 8 6 L 16 4 L 10 12 L 18 18 L 8 18 L 6 26 L 0 18 L -8 22 L -2 12 L -10 8 Z
    spark.beginPath();
    spark.moveTo(0, 8);
    spark.lineTo(6, 0);
    spark.lineTo(8, 6);
    spark.lineTo(16, 4);
    spark.lineTo(10, 12);
    spark.lineTo(18, 18);
    spark.lineTo(8, 18);
    spark.lineTo(6, 26);
    spark.lineTo(0, 18);
    spark.lineTo(-8, 22);
    spark.lineTo(-2, 12);
    spark.lineTo(-10, 8);
    spark.closePath();
    spark.fillPath();
    spark.strokePath();
    spark.x = 308;
    spark.y = 36 - 240; // (308, -204)
    logo.add(spark);
    // Sutil curva (smile-like arc) em cima da spark.
    this.tweens.add({
      targets: spark,
      scale: { from: 0.95, to: 1.05 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Entry: bounce in.
    logo.setAlpha(0).setY(pivotY + 40);
    this.tweens.add({
      targets: logo,
      y: pivotY,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut'
    });
  }

  /**
   * BEST pill — hpill.small (trophy icon + "BEST 12,450m").
   *   - Body: bg-secondary, border accent-yellow 2px, box-shadow inferior 4px
   *   - Padding 4px 14px 4px 6px, gap 6
   *   - Trophy SVG 26x26, depois "BEST" (text-secondary, 13px, letter-spacing 0.08em)
   *     + "12,450" (yellow 18px stroke 3px) + "m" (14px opacity 0.85)
   */
  private buildBestPill(x: number, y: number): void {
    const c = this.add.container(x, y).setDepth(20);

    // Trofeu icon — SVG carregada em PreloadScene.
    const trophy = this.textures.exists('icon-trophy')
      ? this.add.image(0, 0, 'icon-trophy').setDisplaySize(26, 26)
      : null;

    // "BEST" prefix (secondary color, small).
    const bestPrefix = this.add.text(0, 0, 'BEST', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      fontStyle: '600',
      color: hex(Colors.text.secondary)
    }).setOrigin(0, 0.5);
    bestPrefix.setLetterSpacing?.(1);

    // Número 12,450 — preenchido em refresh()
    this.bestValueText = this.add.text(0, 0, '0', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '18px',
      fontStyle: '700',
      color: hex(Colors.accent.yellow),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 3
    }).setOrigin(0, 0.5);

    const suffixM = this.add.text(0, 1, 'm', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '14px',
      fontStyle: '700',
      color: hex(Colors.accent.yellow),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 3
    }).setOrigin(0, 0.5).setAlpha(0.85);

    // Layout horizontal: icon | gap | BEST | sp | num | m.
    const padLeft = 6;
    const padRight = 14;
    const padY = 4;
    const iconBoxW = 26;
    const gap = 6;
    const innerGap = 8;
    const suffixGap = 2;

    const trophyW = trophy ? iconBoxW : 0;
    let xCursor = padLeft + trophyW + gap;
    bestPrefix.x = xCursor;
    xCursor += bestPrefix.width + innerGap;

    // O número vai ser definido em refresh — para layout inicial, reserve espaço.
    this.bestValueText.x = xCursor;
    // Suffix será reposicionado em refresh quando o texto for atualizado.
    suffixM.x = xCursor + 60;

    const pillH = 26 + padY * 2; // ~34
    const pillW = xCursor + 60 + suffixGap + suffixM.width + padRight;

    const bg = this.add.graphics();
    // Sombra inferior plana.
    bg.fillStyle(0x000000, 0.25);
    bg.fillRoundedRect(0, 4, pillW, pillH, pillH / 2);
    // Body.
    bg.fillStyle(Colors.bg.secondary, 0.95);
    bg.fillRoundedRect(0, 0, pillW, pillH, pillH / 2);
    // Borda yellow.
    bg.lineStyle(2, Colors.accent.yellow, 1);
    bg.strokeRoundedRect(0, 0, pillW, pillH, pillH / 2);
    // Highlight superior interno.
    bg.fillStyle(0xffffff, 0.08);
    bg.fillRoundedRect(4, 3, pillW - 8, 6, 4);

    c.add(bg);
    if (trophy) {
      trophy.setPosition(padLeft + iconBoxW / 2, pillH / 2);
      c.add(trophy);
    }
    bestPrefix.y = pillH / 2;
    this.bestValueText.y = pillH / 2;
    suffixM.y = pillH / 2;
    c.add(bestPrefix);
    c.add(this.bestValueText);
    c.add(suffixM);

    // Salva referências para reposicionar 'm' após refresh.
    (this.bestValueText as any).__suffixM = suffixM;
    (this.bestValueText as any).__suffixGap = suffixGap;
  }

  /* ====================================================================== */
  /* TOP-RIGHT — Coin pill + Daily badge                                      */
  /* ====================================================================== */

  private buildTopRightCluster(): void {
    // JSX: container at top:32, right:32, flex-column, gap:14, align-items:flex-end.
    // Pill 1: coin pill (medium).
    // Pill 2: daily badge (bouncing coral).
    const rightEdge = GAME_WIDTH - 32;
    const topY = 32;

    const coinsPill = this.buildCoinsPill(rightEdge, topY);
    const coinsHeight = 50; // pillH para medium

    // Daily badge — só aparece se não claimou hoje + ads ativos.
    const today = this.state.currentDateKey();
    if (!this.state.hasClaimedDailyChest(today) && !getServices().ads.isAdsRemoved()) {
      this.buildDailyBadge(rightEdge, topY + coinsHeight + 14, today);
    }
    void coinsPill;
  }

  /**
   * Coin pill — hpill (coin icon + value).
   *   - Body bg-secondary, border yellow 2px, padding 6px 16px 6px 8px
   *   - Coin SVG 32x32, gap 10
   *   - Número 22px yellow stroke 3px
   *   - rightEdge = posição da borda direita do pill (alinhamento à direita)
   */
  private buildCoinsPill(rightEdge: number, topY: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, topY).setDepth(20);

    const coin = this.textures.exists('icon-coin')
      ? this.add.image(0, 0, 'icon-coin').setDisplaySize(32, 32)
      : null;

    this.coinsValueText = this.add.text(0, 0, '0', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '22px',
      fontStyle: '700',
      color: hex(Colors.accent.yellow),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 3
    }).setOrigin(0, 0.5);

    const padLeft = 8;
    const padRight = 16;
    const padY = 6;
    const iconBoxW = 32;
    const gap = 10;
    const pillH = 32 + padY * 2; // 44, mas tenant 50 do design = altura final

    // Layout: padLeft + iconBoxW + gap + textW + padRight
    const textW = 88; // estimativa para layout inicial
    const pillW = padLeft + iconBoxW + gap + textW + padRight;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.25);
    bg.fillRoundedRect(0, 4, pillW, pillH, pillH / 2);
    bg.fillStyle(Colors.bg.secondary, 0.95);
    bg.fillRoundedRect(0, 0, pillW, pillH, pillH / 2);
    bg.lineStyle(2, Colors.accent.yellow, 1);
    bg.strokeRoundedRect(0, 0, pillW, pillH, pillH / 2);
    bg.fillStyle(0xffffff, 0.08);
    bg.fillRoundedRect(4, 3, pillW - 8, 6, 4);
    c.add(bg);

    if (coin) {
      coin.setPosition(padLeft + iconBoxW / 2, pillH / 2);
      c.add(coin);
    }
    this.coinsValueText.setPosition(padLeft + iconBoxW + gap, pillH / 2);
    c.add(this.coinsValueText);

    // Posiciona container alinhando edge direita.
    c.x = rightEdge - pillW;

    // Guarda refs para refresh poder recalcular largura se necessário.
    (this.coinsValueText as any).__pillContainer = c;
    (this.coinsValueText as any).__pillBg = bg;
    (this.coinsValueText as any).__rightEdge = rightEdge;
    (this.coinsValueText as any).__pillH = pillH;
    (this.coinsValueText as any).__layout = { padLeft, padRight, iconBoxW, gap };

    return c;
  }

  /**
   * Daily badge — .daily-badge (coral, gift icon + "Daily!").
   *   - bg accent-coral, border #1a1d2e 2.5px, box-shadow 0 4px 0 coralDark + glow
   *   - padding 6px 16px 6px 8px, gap 8
   *   - Animação dailyBounce: translateY ±6, rotate -3°↔+3°, 1.4s
   *   - Gift SVG 28x28 + label "Daily!" 16px white stroke 3px uppercase letter-spacing 0.06em
   */
  private buildDailyBadge(rightEdge: number, topY: number, today: string): void {
    const c = this.add.container(0, topY).setDepth(21);

    const gift = this.textures.exists('icon-gift')
      ? this.add.image(0, 0, 'icon-gift').setDisplaySize(28, 28)
      : null;

    const label = this.add.text(0, 0, 'DAILY!', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '16px',
      fontStyle: '700',
      color: hex(Colors.text.primary),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 3
    }).setOrigin(0, 0.5);
    label.setLetterSpacing?.(1);

    const padLeft = 8;
    const padRight = 16;
    const padY = 6;
    const iconBoxW = 28;
    const gap = 8;
    const pillH = 28 + padY * 2; // 40
    const pillW = padLeft + iconBoxW + gap + label.width + padRight;

    const bg = this.add.graphics();
    // Glow externo coral.
    bg.fillStyle(Colors.accent.coral, 0.55);
    bg.fillRoundedRect(-8, -8, pillW + 16, pillH + 16, (pillH + 16) / 2);
    // Sombra plana inferior (coralDark).
    bg.fillStyle(Colors.accent.coralDark, 1);
    bg.fillRoundedRect(0, 4, pillW, pillH, pillH / 2);
    // Body coral.
    bg.fillStyle(Colors.accent.coral, 1);
    bg.fillRoundedRect(0, 0, pillW, pillH, pillH / 2);
    // Borda dark 2.5px.
    bg.lineStyle(2.5, Colors.bg.primary, 1);
    bg.strokeRoundedRect(0, 0, pillW, pillH, pillH / 2);
    c.add(bg);

    if (gift) {
      gift.setPosition(padLeft + iconBoxW / 2, pillH / 2);
      c.add(gift);
    }
    label.setPosition(padLeft + iconBoxW + gap, pillH / 2);
    c.add(label);

    c.x = rightEdge - pillW;

    // dailyBounce: 0..100% translateY 0 → -6 → 0, rotate -3 → +3 → -3, 1.4s.
    this.tweens.add({
      targets: c,
      y: topY - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: c,
      angle: { from: -3, to: 3 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hit zone.
    const hit = this.add.rectangle(pillW / 2, pillH / 2, pillW + 8, pillH + 8, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerdown', () => {
      try { getServices().haptics.trigger('selection'); } catch { /* svcs not ready */ }
    });
    hit.on('pointerup', () => this.openDailyChest(today));
  }

  /* ====================================================================== */
  /* HERO — RockChar + aura/beams/bob + slots row                             */
  /* ====================================================================== */

  private buildHero(): void {
    // JSX: container at left:140, top:220, flex-column, gap:28, align-items:center.
    // Character is 220x220 (characterScale=220), then slots row 14px below.
    const charScale = 220;
    const heroX = 140 + charScale / 2; // 250
    const heroY = 220 + charScale / 2; // 330

    // 1) AuraBeams — 8 polígonos amarelos rotacionando 360deg em 14s.
    //    Container inset:-70 do char => raio = (220/2) + 70 = 180.
    const beams = this.add.container(heroX, heroY).setDepth(3);
    beams.setAlpha(0.85); // opacity 0.85 do .aura-beams
    const beamLen = 180; // distância do centro até o ápice
    const beamThickness = 12;
    for (let i = 0; i < 8; i++) {
      const beam = this.add.graphics();
      beam.fillStyle(Colors.accent.yellow, 0.85); // pico do gradient #ffd23f 0.85
      beam.beginPath();
      beam.moveTo(0, -beamLen);
      beam.lineTo(beamThickness, 0);
      beam.lineTo(-beamThickness, 0);
      beam.closePath();
      beam.fillPath();
      beam.angle = i * 45;
      beams.add(beam);
    }
    this.tweens.add({
      targets: beams,
      angle: 360,
      duration: 14000,
      repeat: -1,
      ease: 'Linear'
    });

    // 2) Aura disc — radial-gradient yellow, pulse 2s.
    //    Container inset:-50 do char => raio = (220/2) + 50 = 160.
    const aura = this.add.graphics().setDepth(3);
    aura.fillStyle(Colors.accent.yellow, 0.6);
    aura.fillCircle(heroX, heroY, 70);
    aura.fillStyle(Colors.accent.yellow, 0.20);
    aura.fillCircle(heroX, heroY, 110);
    aura.fillStyle(Colors.accent.yellow, 0.08);
    aura.fillCircle(heroX, heroY, 160);
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 0.95, to: 1.1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3) Bob container com RockChar dentro (translate -10..0, rotate -1.5..1.5, 3s).
    const bob = this.add.container(heroX, heroY).setDepth(5);
    this.drawRockChar(bob, charScale, 'confident');
    this.tweens.add({
      targets: bob,
      y: heroY - 10,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: bob,
      angle: { from: -1.5, to: 1.5 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 4) Shadow blob (left: (220-180)/2=20, bottom:-14 do container).
    //    Container fica em (140, 220), e o char tem 220px. Bottom = 220+220=440.
    //    Shadow center: (140 + 20 + 90, 220 + 220 + 14) = (250, 454).
    const shadow = this.add.graphics().setDepth(4);
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillEllipse(heroX, heroY + 130, 180, 26);

    // 5) Slots row — 28px abaixo do char container + 14px de marginTop.
    //    Bottom do char = 440, gap 28 → slots top = 468. Aparente: y center ~ 510.
    const slotsY = 220 + charScale + 28 + 14 + 40; // ~ 522
    this.slotsContainer = this.buildSlots(heroX, slotsY);
  }

  /**
   * RockChar — replica backdrop.jsx#RockChar (viewBox 0..220, expression='confident').
   * Desenha o personagem CENTRADO em (0,0) dentro do parent container.
   */
  private drawRockChar(parent: Phaser.GameObjects.Container, size: number, expression: 'confident' | 'determined' | 'smile'): void {
    // SVG viewBox 220x220 — desloco para centralizar em (0,0).
    const g = this.add.graphics();
    const sc = size / 220;
    g.setScale(sc);
    g.x = -size / 2;
    g.y = -size / 2;
    parent.add(g);

    const dark = 0x1a1d2e;
    // Body — polígono angular. Aproxima radial gradient (rockShade2: #a8a8a8 → #727275 → #3e3e44)
    // com fill sólido + sombra interna escura.
    const bodyPts = [
      96, 18,  138, 22,  174, 42,  196, 78,  200, 118,
      188, 160, 162, 188, 130, 200, 86, 196, 52, 178,
      28, 142, 22, 102, 32, 64,  60, 32
    ];
    // base mid-tone
    g.fillStyle(0x727275, 1);
    g.beginPath();
    g.moveTo(bodyPts[0], bodyPts[1]);
    for (let i = 2; i < bodyPts.length; i += 2) g.lineTo(bodyPts[i], bodyPts[i + 1]);
    g.closePath();
    g.fillPath();
    // overlay sombra inferior (emula gradient escuro embaixo)
    g.fillStyle(0x3e3e44, 0.5);
    g.fillEllipse(110, 165, 200, 80);
    // re-aplicar stroke por cima
    g.lineStyle(6, dark, 1);
    g.beginPath();
    g.moveTo(bodyPts[0], bodyPts[1]);
    for (let i = 2; i < bodyPts.length; i += 2) g.lineTo(bodyPts[i], bodyPts[i + 1]);
    g.closePath();
    g.strokePath();

    // Angular top highlight (chiseled) — M62 38 L 96 26 L 138 30 L 168 50 L 152 56 L 110 44 L 78 56 Z
    g.fillStyle(0xc8c8c8, 0.55);
    g.beginPath();
    g.moveTo(62, 38);
    g.lineTo(96, 26);
    g.lineTo(138, 30);
    g.lineTo(168, 50);
    g.lineTo(152, 56);
    g.lineTo(110, 44);
    g.lineTo(78, 56);
    g.closePath();
    g.fillPath();

    // Deep cracks — 3 linhas escuras.
    g.lineStyle(3, dark, 0.7);
    g.beginPath();
    g.moveTo(40, 80); g.lineTo(56, 96); g.lineTo(50, 116); g.lineTo(64, 134);
    g.strokePath();
    g.lineStyle(2.5, dark, 0.65);
    g.beginPath();
    g.moveTo(170, 90); g.lineTo(162, 108); g.lineTo(178, 124);
    g.strokePath();
    g.lineStyle(2.5, dark, 0.6);
    g.beginPath();
    g.moveTo(120, 178); g.lineTo(130, 188);
    g.strokePath();

    // Chipped edges — 2 small triangles.
    g.fillStyle(0x3e3e44, 1);
    g.lineStyle(2.5, dark, 1);
    g.beginPath();
    g.moveTo(28, 142); g.lineTo(38, 138); g.lineTo(36, 152);
    g.closePath();
    g.fillPath(); g.strokePath();
    g.beginPath();
    g.moveTo(196, 78); g.lineTo(188, 84); g.lineTo(200, 92);
    g.closePath();
    g.fillPath(); g.strokePath();

    // Surface speckles & pits.
    g.fillStyle(0x3e3e44, 1);
    g.fillEllipse(60, 158, 14, 7);
    g.fillEllipse(158, 166, 18, 8);
    g.fillEllipse(108, 184, 12, 5);
    g.fillStyle(dark, 0.55);
    g.fillCircle(148, 78, 2.5);
    g.fillStyle(dark, 0.5);
    g.fillCircle(78, 92, 2);

    // Eye whites — quadrilaterais com Q curves aproximados via lineTo.
    g.fillStyle(0xffffff, 1);
    g.lineStyle(4, dark, 1);
    // Left eye: M68 100 Q 84 88 102 102 Q 90 116 70 110 Z
    g.beginPath();
    g.moveTo(68, 100);
    // Q 84 88 102 102 — aproximação com 4 segmentos
    this.quadCurveTo(g, 68, 100, 84, 88, 102, 102, 6);
    // Q 90 116 70 110
    this.quadCurveTo(g, 102, 102, 90, 116, 70, 110, 6);
    g.closePath();
    g.fillPath(); g.strokePath();
    // Right eye: M122 102 Q 138 88 156 100 Q 152 114 134 116 Q 122 110 122 102 Z
    g.beginPath();
    g.moveTo(122, 102);
    this.quadCurveTo(g, 122, 102, 138, 88, 156, 100, 6);
    this.quadCurveTo(g, 156, 100, 152, 114, 134, 116, 6);
    this.quadCurveTo(g, 134, 116, 122, 110, 122, 102, 6);
    g.closePath();
    g.fillPath(); g.strokePath();

    // Pupils.
    g.fillStyle(dark, 1);
    g.fillCircle(86, 104, 6);
    g.fillCircle(138, 104, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(88, 102, 2);
    g.fillCircle(140, 102, 2);

    // Eyebrows — angled down toward center for attitude.
    g.lineStyle(6, dark, 1);
    g.beginPath();
    g.moveTo(62, 86); g.lineTo(102, 90);
    g.strokePath();
    g.beginPath();
    g.moveTo(122, 90); g.lineTo(162, 86);
    g.strokePath();

    // Mouth.
    if (expression === 'confident') {
      g.lineStyle(5, dark, 1);
      g.beginPath();
      g.moveTo(92, 152);
      g.lineTo(124, 152);
      // Q 134 152 138 144 — pequena curva pra cima
      this.quadCurveTo(g, 124, 152, 134, 152, 138, 144, 4);
      g.strokePath();
    } else if (expression === 'determined') {
      g.lineStyle(6, dark, 1);
      g.beginPath();
      g.moveTo(94, 156); g.lineTo(138, 156);
      g.strokePath();
    } else {
      // smile
      g.lineStyle(5, dark, 1);
      g.beginPath();
      g.moveTo(94, 150);
      this.quadCurveTo(g, 94, 150, 114, 164, 138, 150, 8);
      g.strokePath();
    }
  }

  /** Aproxima Q curve com N segmentos lineTo (Phaser.Graphics não tem quadTo). */
  private quadCurveTo(
    g: Phaser.GameObjects.Graphics,
    x0: number, y0: number,
    cx: number, cy: number,
    x1: number, y1: number,
    steps: number
  ): void {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      g.lineTo(x, y);
    }
  }

  /* ====================================================================== */
  /* SLOTS — 3 slots horizontais (1 filled-rare + 2 empty) + caption          */
  /* ====================================================================== */

  /**
   * Slots row + caption. JSX: 3 slots (80px circles, gap 16, filled-rare cyan
   * + 2 empty +), caption "Tap to equip" abaixo (text-secondary, 13px upper).
   */
  private buildSlots(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0).setDepth(15);
    const slotSize = 80;
    const gap = 16;
    const totalW = 3 * slotSize + 2 * gap;
    const startX = cx - totalW / 2 + slotSize / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotSize + gap);
      const unlocked = this.state.isSlotUnlocked(i);
      const id = this.state.get().equippedSlots[i];

      const slot = this.add.container(x, cy);
      const bg = this.add.graphics();

      if (unlocked && id && i === 0) {
        // Filled-rare: cyan body + cyan glow + dark border + inner highlight.
        // box-shadow: 0 4px 0 #1a1d2e, 0 0 0 4px rgba(78,205,196,0.35),
        //             0 0 22px rgba(78,205,196,0.5), inset 0 3px 0 rgba(255,255,255,0.35)
        bg.fillStyle(Colors.accent.cyan, 0.5);
        bg.fillCircle(0, 0, slotSize / 2 + 14);
        bg.fillStyle(Colors.accent.cyan, 0.35);
        bg.fillCircle(0, 0, slotSize / 2 + 6);
        // Sombra inferior 4px dark.
        bg.fillStyle(Colors.bg.primary, 1);
        bg.fillCircle(0, 4, slotSize / 2);
        // Body cyan.
        bg.fillStyle(Colors.rarity.rare, 1);
        bg.fillCircle(0, 0, slotSize / 2);
        // Borda dark 3px.
        bg.lineStyle(3, Colors.bg.primary, 1);
        bg.strokeCircle(0, 0, slotSize / 2);
        // Inset highlight superior.
        bg.fillStyle(0xffffff, 0.35);
        bg.fillEllipse(0, -slotSize / 2 + 8, slotSize - 16, 14);

        // Pulse rare (box-shadow scale): 2.4s ease-in-out.
        this.tweens.add({
          targets: slot,
          scale: { from: 1, to: 1.04 },
          duration: 2400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else if (unlocked) {
        // Empty: bg rgba(26,29,46,0.35) + dashed white border + "+".
        bg.fillStyle(Colors.bg.primary, 0.35);
        bg.fillCircle(0, 0, slotSize / 2);
        // dashed border (16 segmentos, 8 visíveis).
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
        // Locked: navy with muted border.
        bg.fillStyle(Colors.bg.primary, 0.6);
        bg.fillCircle(0, 0, slotSize / 2);
        bg.lineStyle(3, Colors.text.muted, 1);
        bg.strokeCircle(0, 0, slotSize / 2);
      }
      slot.add(bg);

      // Content of slot.
      if (unlocked && id && i === 0 && this.textures.exists('icon-magnet')) {
        // Magnet SVG 52x52.
        const magnet = this.add.image(0, 0, 'icon-magnet').setDisplaySize(52, 52);
        slot.add(magnet);
      } else if (unlocked && id) {
        // Outros equipáveis: fallback emoji-style char (não modificar comportamento).
        const t = this.add.text(0, 0, this.iconForId(id), {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '28px',
          fontStyle: '700',
          color: hex(Colors.text.primary),
          stroke: hex(Colors.bg.primary),
          strokeThickness: 3
        }).setOrigin(0.5);
        slot.add(t);
      } else if (unlocked) {
        // Empty + sign.
        const plus = this.add.text(0, 0, '+', {
          fontFamily: "'Fredoka', sans-serif",
          fontSize: '40px',
          fontStyle: '700',
          color: 'rgba(255,255,255,0.85)',
          stroke: 'rgba(0,0,0,0.4)',
          strokeThickness: 2
        }).setOrigin(0.5);
        slot.add(plus);
      } else {
        const lock = this.add.text(0, 0, '🔒', {
          fontFamily: 'sans-serif',
          fontSize: '32px',
          color: hex(Colors.text.muted)
        }).setOrigin(0.5);
        slot.add(lock);
      }

      // Hit zone + click handler.
      const hit = this.add.rectangle(0, 0, slotSize + 4, slotSize + 4, 0xffffff, 0)
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

      c.add(slot);
    }

    // Caption "Tap to equip" — 14px abaixo da row, text-secondary 13px uppercase letter-spacing 0.18em.
    const caption = this.add.text(cx, cy + slotSize / 2 + 14 + 8, 'TAP TO EQUIP', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      fontStyle: '600',
      color: hex(Colors.text.secondary),
      shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.5)', blur: 0, fill: true }
    }).setOrigin(0.5);
    caption.setLetterSpacing?.(2.3);
    c.add(caption);

    return c;
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
  /* PLAY — btn-play (yellow gradient, halo, lime green play-icon) + caption  */
  /* ====================================================================== */

  /**
   * PLAY button replicando .btn-play:
   *   - background linear-gradient #ffe168 → #ffd23f → #f0c020
   *   - border-radius 32, padding 28×80, outline 4px dark
   *   - box-shadow: 0 8px 0 yellowShadow + inset 0 5px white 0.55 + inset 0 -6px dark
   *   - texto "Play" 64px white stroke 4px upper letter-spacing 0.04em
   *   - play-icon 56×56 lime circle com triângulo branco (icon-play SVG)
   *   - halo: radial blur amarelo pulse 2.2s
   *   - caption "Tap to start" abaixo
   */
  private buildPlay(): void {
    // JSX: container at right:130, top:252, flex-column align-items:center.
    // Botão tem padding 28×80 + content (56 icon + gap 16 + ~Play text). Width ~= 280-300.
    const btnW = 320;
    const btnH = 116; // 28*2 + 60 (text/icon)
    const containerCenterX = GAME_WIDTH - 130 - btnW / 2; // 990
    const btnY = 252 + btnH / 2 + 36; // halo inset -36 above

    // 1) Halo — radial-gradient amarelo translúcido, blur, pulse 2.2s.
    const halo = this.add.graphics().setDepth(8);
    halo.fillStyle(Colors.accent.yellow, 0.55);
    halo.fillEllipse(containerCenterX, btnY, btnW + 100, btnH + 100);
    halo.fillStyle(Colors.accent.yellow, 0.25);
    halo.fillEllipse(containerCenterX, btnY, btnW + 200, btnH + 200);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 1, to: 1.08 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 2) Botão — face frontal sobre sombra inferior 8px.
    const btn = this.add.container(containerCenterX, btnY).setDepth(10);
    const bg = this.add.graphics();
    const radius = 32;
    const drawBtn = (pressed: boolean): void => {
      bg.clear();
      const faceOffset = pressed ? 6 : 0;
      const shadowOffset = pressed ? 2 : 8;
      // Outline externo dark 4px (outline-offset 0).
      bg.fillStyle(Colors.bg.primary, 1);
      bg.fillRoundedRect(-btnW / 2 - 4, -btnH / 2 - 4 + faceOffset, btnW + 8, btnH + 8 + (pressed ? 0 : 4), radius + 4);
      // Sombra inferior amarela escura.
      bg.fillStyle(Colors.accent.yellowDark, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2 + shadowOffset, btnW, btnH, radius);
      // Face frontal yellow (linear gradient simulada por 3 retângulos).
      bg.fillStyle(0xffe168, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2 + faceOffset, btnW, btnH, radius);
      bg.fillStyle(Colors.accent.yellow, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2 + faceOffset + btnH * 0.45, btnW, btnH * 0.45, radius - 6);
      bg.fillStyle(0xf0c020, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2 + faceOffset + btnH * 0.85, btnW, btnH * 0.15, radius - 12);
      // Inset 0 5px white 0.55 (gloss top).
      bg.fillStyle(0xffffff, 0.55);
      bg.fillRoundedRect(-btnW / 2 + 14, -btnH / 2 + faceOffset + 6, btnW - 28, 18, 12);
      // Inset 0 -6px dark amber.
      bg.fillStyle(0xb88200, 0.45);
      bg.fillRoundedRect(-btnW / 2 + 6, btnH / 2 + faceOffset - 12, btnW - 12, 8, 6);
    };
    drawBtn(false);
    btn.add(bg);

    // play-icon — lime circle + white triangle (use icon-play SVG se preloadado).
    let playIcon: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
    if (this.textures.exists('icon-play')) {
      const img = this.add.image(0, 0, 'icon-play').setDisplaySize(56, 56);
      playIcon = img;
    } else {
      const gI = this.add.graphics();
      gI.fillStyle(Colors.accent.green, 1);
      gI.fillCircle(0, 0, 28);
      gI.lineStyle(4, Colors.bg.primary, 1);
      gI.strokeCircle(0, 0, 28);
      gI.fillStyle(0xffffff, 1);
      gI.beginPath();
      gI.moveTo(-10, -14);
      gI.lineTo(14, 0);
      gI.lineTo(-10, 14);
      gI.closePath();
      gI.fillPath();
      playIcon = gI;
    }

    const label = this.add.text(0, 0, 'Play', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '64px',
      fontStyle: '700',
      color: hex(Colors.text.primary),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 4
    }).setOrigin(0, 0.5);
    label.setLetterSpacing?.(2.5);

    // Center icon+gap+label inside button.
    const contentGap = 16;
    const contentW = 56 + contentGap + label.width;
    playIcon.x = -contentW / 2 + 28;
    label.x = -contentW / 2 + 56 + contentGap;
    label.y = 0;
    btn.add(playIcon);
    btn.add(label);

    // Hit zone.
    const hit = this.add.rectangle(0, 4, btnW, btnH + 8, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    btn.add(hit);
    hit.on('pointerdown', () => {
      drawBtn(true);
      this.tweens.add({ targets: btn, scale: 0.97, duration: 90 });
      try { getServices().haptics.trigger('selection'); } catch { /* svc */ }
    });
    hit.on('pointerup', () => {
      drawBtn(false);
      this.tweens.add({ targets: btn, scale: 1, duration: 200, ease: 'Back.easeOut' });
      this.registry.remove('dev_start_meters');
      this.registry.remove('dev_start_biome');
      SceneTransition.fade(this, SCENES.GAME);
    });
    hit.on('pointerout', () => {
      drawBtn(false);
      this.tweens.add({ targets: btn, scale: 1, duration: 180 });
    });

    // Entry: scale-in com Back.
    btn.setScale(0).setAlpha(0);
    this.tweens.add({
      targets: btn,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });

    // 3) Caption "Tap to start" — 18px margin-top do botão (.play-caption).
    const cap = this.add.text(containerCenterX, btnY + btnH / 2 + 18 + 8, 'TAP TO START', {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '16px',
      fontStyle: '600',
      color: hex(Colors.text.primary),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(10);
    cap.setAlpha(0.95);
    cap.setLetterSpacing?.(1.9);
  }

  /* ====================================================================== */
  /* BOTTOM NAV — 5 circle items com SVG icons                                */
  /* ====================================================================== */

  /**
   * Bottom nav (.bottom-nav). JSX: 5 items horizontais (Shop, Inventory,
   * Missions, Leaderboard, Settings), gap 28, posicionado bottom:26 center.
   * Cada .nav-circle: 80x80 bg-secondary border cyan 4px outline dark.
   */
  private buildBottomNav(): void {
    const items: Array<{ iconKey: string; label: string; scene: string }> = [
      { iconKey: 'icon-shop',      label: 'SHOP',        scene: SCENES.SHOP },
      { iconKey: 'icon-backpack',  label: 'INVENTORY',   scene: SCENES.INVENTORY },
      { iconKey: 'icon-checklist', label: 'MISSIONS',    scene: SCENES.MISSIONS },
      { iconKey: 'icon-podium',    label: 'LEADERBOARD', scene: SCENES.LEADERBOARD },
      { iconKey: 'icon-settings',  label: 'SETTINGS',    scene: SCENES.SETTINGS }
    ];

    const itemW = 80;
    const gap = 28;
    const totalW = items.length * itemW + (items.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + itemW / 2;
    // bottom:26, container cresce de baixo pra cima. Circle (80) + gap (8) +
    // label (~16) = ~104. Centro do circle ≈ bottom - 26 - 16 - 8 - 40 = bottom - 90.
    const circleY = GAME_HEIGHT - 26 - 16 - 8 - 40; // ~ 630

    items.forEach((it, i) => {
      const x = startX + i * (itemW + gap);
      const c = this.makeNavCircle(x, circleY, it.iconKey, it.label, () => {
        SceneTransition.slide(this, it.scene);
      });
      c.setAlpha(0).setY(circleY + 30);
      this.tweens.add({
        targets: c,
        alpha: 1,
        y: circleY,
        duration: 320,
        delay: 50 * i,
        ease: 'Back.easeOut'
      });
    });
  }

  private makeNavCircle(
    x: number,
    y: number,
    iconKey: string,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const r = 40;
    const bg = this.add.graphics();
    const drawBg = (pressed: boolean): void => {
      bg.clear();
      const off = pressed ? 2 : 6;
      // Sombra inferior dark (box-shadow 0 6px 0 #0d0f1a).
      bg.fillStyle(0x0d0f1a, 1);
      bg.fillCircle(0, off, r);
      // Body navy.
      bg.fillStyle(Colors.bg.secondary, 1);
      bg.fillCircle(0, pressed ? 4 : 0, r);
      // Border cyan 4px.
      bg.lineStyle(4, Colors.accent.cyan, 1);
      bg.strokeCircle(0, pressed ? 4 : 0, r);
      // Outline 2px dark, offset 2.
      bg.lineStyle(2, Colors.bg.primary, 1);
      bg.strokeCircle(0, pressed ? 4 : 0, r + 4);
      // Inset highlight top.
      bg.fillStyle(0xffffff, 0.12);
      bg.fillCircle(-3, pressed ? -4 : -10, 18);
    };
    drawBg(false);
    c.add(bg);

    // Icon — SVG via key, 50x50 (.nav-circle img width 50).
    if (this.textures.exists(iconKey)) {
      const icon = this.add.image(0, 0, iconKey).setDisplaySize(50, 50);
      c.add(icon);
    }

    // Label.
    const labelText = this.add.text(0, 56, label, {
      fontFamily: "'Fredoka', sans-serif",
      fontSize: '13px',
      fontStyle: '700',
      color: hex(Colors.text.primary),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 2
    }).setOrigin(0.5);
    labelText.setLetterSpacing?.(1.6);
    c.add(labelText);

    const hit = this.add.circle(0, 0, r + 4, 0xffffff, 0).setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerdown', () => {
      drawBg(true);
      this.tweens.add({ targets: c, scale: 0.95, duration: 80 });
      try { getServices().haptics.trigger('selection'); } catch { /* svc */ }
    });
    hit.on('pointerup', () => {
      drawBg(false);
      this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.easeOut' });
      onClick();
    });
    hit.on('pointerout', () => {
      drawBg(false);
      this.tweens.add({ targets: c, scale: 1, duration: 180 });
    });
    return c;
  }

  /* ====================================================================== */
  /* EXTRA — Boost ad button (preservado, fora do JSX)                        */
  /* ====================================================================== */

  private buildExtraButtons(): void {
    if (!getServices().ads.isAdsRemoved()) {
      new Button3D({
        scene: this,
        x: 130,
        y: 690,
        width: 160,
        height: 40,
        label: 'BOOST',
        icon: '⚡',
        fontSize: 14,
        variant: 'success',
        radius: 20,
        onClick: () => this.startBoostAd()
      }).setDepth(22);
    }
  }

  /* ====================================================================== */
  /* DEV — picker de fase (preservado, fora do JSX)                           */
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
        try { panel.destroy(); overlay.destroy(); } catch { /* destroyed */ }
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
    if (this.coinsValueText) {
      this.coinsValueText.setText(s.coins.toLocaleString('pt-BR'));
    }
    if (this.bestValueText) {
      this.bestValueText.setText(s.bestDistance.toLocaleString('pt-BR'));
      const suffixM = (this.bestValueText as any).__suffixM as Phaser.GameObjects.Text | undefined;
      const suffixGap = (this.bestValueText as any).__suffixGap as number | undefined;
      if (suffixM && suffixGap !== undefined) {
        suffixM.x = this.bestValueText.x + this.bestValueText.width + suffixGap;
      }
    }
    if (this.slotsContainer) {
      // Slots: destruir e reconstruir (sem perder ref para tweens).
      const oldParent = this.slotsContainer;
      const parentX = oldParent.x;
      const parentY = oldParent.y;
      oldParent.destroy();
      // Reusa coords originais — slotsContainer foi criado dentro de buildHero
      // com cx=250, cy ~522. Vamos manter essa coord.
      const charScale = 220;
      const heroX = 140 + charScale / 2;
      const slotsY = 220 + charScale + 28 + 14 + 40;
      this.slotsContainer = this.buildSlots(heroX, slotsY);
      void parentX; void parentY;
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
