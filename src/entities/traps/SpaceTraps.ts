/**
 * Armadilhas do bioma SPACE (terminal — sem teto).
 *
 *  ground   plasma_field      Campo de plasma elétrico no chão.
 *  low      force_field_low   Barreira de força horizontal.
 *  high     asteroid          Asteroide gigante com cratera.
 *  gap      wormhole_gap      Buraco-de-minhoca dual (cima + baixo).
 *  dynamic  satellite         Satélite alienígena com beam vertical.
 */

import type Phaser from 'phaser';
import {
  registerTraps,
  addToPalette,
  type TrapBuildOptions,
  type TrapDef,
  type TrapInstance
} from '../../data/TrapDefs';
import { airHitbox, ceilingCurtainHitbox, GROUND_Y, groundHitbox, wallHitbox } from './common';

/* -------- ground: plasma_field -------- */

function buildPlasmaField(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 200;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Glow externo cósmico
  g.fillStyle(0xa06cd5, 0.32);
  g.fillEllipse(0, baseY - 14, w + 28, 30);
  g.fillStyle(0x4ecdc4, 0.4);
  g.fillEllipse(0, baseY - 12, w + 12, 22);

  // Base de tecnologia alienígena
  g.fillStyle(0x14163a, 1);
  g.fillRoundedRect(-w / 2, baseY - 16, w, 16, 5);
  g.fillStyle(0x2a1c5a, 1);
  g.fillRoundedRect(-w / 2 + 4, baseY - 14, w - 8, 4, 2);

  // Núcleos energéticos (3 emissores)
  for (let i = 0; i < 3; i++) {
    const cx = -w / 2 + (i + 0.5) * (w / 3);
    g.fillStyle(0x14163a, 1);
    g.fillCircle(cx, baseY - 8, 8);
    g.fillStyle(0xa06cd5, 1);
    g.fillCircle(cx, baseY - 8, 6);
    g.fillStyle(0x4ecdc4, 1);
    g.fillCircle(cx, baseY - 8, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, baseY - 8, 1);
  }

  // === ARCS ELÉTRICOS ===
  // Plasma branco-roxo serpenteando entre os núcleos
  const arcs = scene.add.graphics();
  function drawArcs(this: void, time: number): void {
    arcs.clear();
    const phase = time * 0.001 * 6;
    const positions = [-w / 3, 0, w / 3];

    // Arc entre cada par
    for (let i = 0; i < positions.length - 1; i++) {
      const x1 = positions[i];
      const x2 = positions[i + 1];
      const y = baseY - 8;

      arcs.lineStyle(3, 0xa06cd5, 0.85);
      arcs.beginPath();
      arcs.moveTo(x1, y);
      const segs = 8;
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const x = x1 + (x2 - x1) * t;
        const wob = Math.sin(phase + s * 0.7 + i * 1.7) * 6;
        arcs.lineTo(x, y + wob);
      }
      arcs.strokePath();

      // Núcleo branco fininho
      arcs.lineStyle(1.5, 0xffffff, 0.95);
      arcs.beginPath();
      arcs.moveTo(x1, y);
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const x = x1 + (x2 - x1) * t;
        const wob = Math.sin(phase + s * 0.7 + i * 1.7) * 4;
        arcs.lineTo(x, y + wob);
      }
      arcs.strokePath();
    }

    // Sparks aleatórias
    for (let s = 0; s < 6; s++) {
      const sx = -w / 2 + ((s * 31 + time * 0.05) % w);
      const sy = baseY - 6 + Math.sin(phase + s) * 4;
      arcs.fillStyle(0xfff8c0, 0.9);
      arcs.fillRect(sx, sy, 2, 1);
    }
  }
  drawArcs(0);
  container.add([g, arcs]);

  // Throttle: 100 ms = 10 fps de redraw — diferença visual desprezível,
  // mas em 5+ obstáculos simultâneos economiza várias passes de path/fill
  // por frame (gargalo principal no mobile).
  const updater = scene.time.addEvent({
    delay: 100,
    callback: () => drawArcs(scene.time.now),
    loop: true
  });

  return {
    hitboxes: [groundHitbox(w - 12)],
    triggerHitboxes: [],
    cleanup: () => updater.remove(false)
  };
}

/* -------- low: force_field_low -------- */

function buildForceFieldLow(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 240;
  const h = 56;
  const centerY = 244;

  const g = scene.add.graphics();

  // Glow externo
  g.fillStyle(0xa06cd5, 0.42);
  g.fillRect(-w / 2 - 8, centerY - h / 2 - 6, w + 16, h + 12);

  // Mancais (postes alienígenas)
  for (const sx of [-w / 2 + 14, w / 2 - 14]) {
    g.fillStyle(0x14163a, 1);
    g.fillRoundedRect(sx - 16, centerY - 24, 32, 48, 8);
    g.fillStyle(0x4a2868, 1);
    g.fillRoundedRect(sx - 12, centerY - 20, 24, 40, 6);
    // Olho central pulsante
    g.fillStyle(0xa06cd5, 1);
    g.fillCircle(sx, centerY, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(sx, centerY, 4);
    g.fillStyle(0xa06cd5, 1);
    g.fillCircle(sx, centerY, 2);
    // Tentáculos curtos
    for (let t = 0; t < 4; t++) {
      const a = Math.PI * 0.25 + t * Math.PI * 0.5;
      g.fillStyle(0x4ecdc4, 0.85);
      g.fillCircle(sx + Math.cos(a) * 12, centerY + Math.sin(a) * 12, 2);
    }
  }

  // Campo de energia (faixas horizontais ondulantes)
  const startX = -w / 2 + 30;
  const endX = w / 2 - 30;

  const fieldGfx = scene.add.graphics();
  function drawField(this: void, time: number): void {
    fieldGfx.clear();
    const phase = time * 0.001 * 4;
    for (let line = 0; line < 4; line++) {
      const baseLineY = centerY - 12 + line * 8;
      // Glow
      fieldGfx.lineStyle(4, 0xa06cd5, 0.7);
      fieldGfx.beginPath();
      const segs = 24;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const x = startX + (endX - startX) * t;
        const wob = Math.sin(phase + s * 0.4 + line * 0.7) * 2;
        if (s === 0) fieldGfx.moveTo(x, baseLineY + wob);
        else fieldGfx.lineTo(x, baseLineY + wob);
      }
      fieldGfx.strokePath();
      // Núcleo branco
      fieldGfx.lineStyle(1.5, 0xffffff, 1);
      fieldGfx.beginPath();
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const x = startX + (endX - startX) * t;
        const wob = Math.sin(phase + s * 0.4 + line * 0.7) * 2;
        if (s === 0) fieldGfx.moveTo(x, baseLineY + wob);
        else fieldGfx.lineTo(x, baseLineY + wob);
      }
      fieldGfx.strokePath();
    }
  }
  drawField(0);

  container.add([g, fieldGfx]);

  // Throttle 100 ms — ver comentário em plasma_field acima.
  const updater = scene.time.addEvent({
    delay: 100,
    callback: () => drawField(scene.time.now),
    loop: true
  });

  return {
    hitboxes: [airHitbox(w, h, centerY), ceilingCurtainHitbox(w, centerY - h / 2)],
    triggerHitboxes: [],
    cleanup: () => updater.remove(false)
  };
}

/* -------- high: asteroid -------- */

function buildAsteroid(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 100;
  const h = 240;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Halo magenta
  g.fillStyle(0xa06cd5, 0.22);
  g.fillEllipse(0, topY + h / 2, w + 20, h * 0.7);

  // Corpo do asteroide (irregular blob)
  g.fillStyle(0x2a1c5a, 1);
  g.beginPath();
  g.moveTo(-w / 2 + 8, baseY);
  g.lineTo(-w / 2, baseY - h * 0.3);
  g.lineTo(-w / 2 + 4, baseY - h * 0.55);
  g.lineTo(-w / 2 - 6, baseY - h * 0.75);
  g.lineTo(-w / 2 + 8, topY + 6);
  g.lineTo(0, topY - 12);
  g.lineTo(w / 2 - 6, topY + 4);
  g.lineTo(w / 2 + 8, baseY - h * 0.65);
  g.lineTo(w / 2 - 4, baseY - h * 0.4);
  g.lineTo(w / 2, baseY - h * 0.2);
  g.lineTo(w / 2 - 6, baseY);
  g.closePath();
  g.fillPath();

  // Highlight (lado iluminado pelas estrelas)
  g.fillStyle(0x4a3a80, 1);
  g.beginPath();
  g.moveTo(-w / 2 + 8, baseY);
  g.lineTo(-w / 2 + 4, baseY - h * 0.55);
  g.lineTo(-w / 2 + 12, baseY - h * 0.75);
  g.lineTo(-2, topY + 8);
  g.lineTo(0, topY - 10);
  g.lineTo(-4, topY + 14);
  g.lineTo(-2, baseY - h * 0.3);
  g.lineTo(-w / 2 + 14, baseY - 12);
  g.closePath();
  g.fillPath();

  // Sombra interna
  g.fillStyle(0x14163a, 0.85);
  g.beginPath();
  g.moveTo(2, topY + 14);
  g.lineTo(w / 2 - 6, topY + 4);
  g.lineTo(w / 2 + 8, baseY - h * 0.65);
  g.lineTo(w / 2 - 4, baseY - h * 0.4);
  g.lineTo(w / 2 - 12, baseY - 8);
  g.lineTo(2, baseY - h * 0.4);
  g.closePath();
  g.fillPath();

  // Crateras (3-4 com profundidade)
  const craters = [
    { x: -16, y: topY + 50, r: 12 },
    { x: 14, y: topY + 130, r: 16 },
    { x: -8, y: topY + 200, r: 10 }
  ];
  for (const c of craters) {
    g.fillStyle(0x14163a, 1);
    g.fillCircle(c.x, c.y, c.r);
    g.fillStyle(0x4a3a80, 1);
    g.fillCircle(c.x - 1, c.y - 1, c.r - 2);
    g.fillStyle(0x14163a, 1);
    g.fillCircle(c.x + 1, c.y + 1, c.r - 4);
  }

  // Cristais alienígenas brilhando (3 pontos)
  for (const pt of [{ x: -10, y: topY + 30 }, { x: 16, y: topY + 90 }, { x: -4, y: topY + 170 }]) {
    g.fillStyle(0x4ecdc4, 1);
    g.beginPath();
    g.moveTo(pt.x, pt.y - 6);
    g.lineTo(pt.x + 4, pt.y);
    g.lineTo(pt.x, pt.y + 6);
    g.lineTo(pt.x - 4, pt.y);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(pt.x, pt.y - 2, 1.4);
  }

  // Estrelas em volta (mini glints)
  g.fillStyle(0xfff8c0, 1);
  for (const s of [{ x: -50, y: topY + 20 }, { x: 50, y: topY + 60 }, { x: -45, y: topY + 150 }, { x: 48, y: topY + 200 }]) {
    g.fillRect(s.x, s.y, 2, 2);
    g.fillRect(s.x - 2, s.y, 1, 1);
    g.fillRect(s.x + 3, s.y, 1, 1);
    g.fillRect(s.x, s.y - 2, 1, 1);
    g.fillRect(s.x, s.y + 3, 1, 1);
  }

  container.add(g);

  // Slow rotation sutil (asteroide girando)
  const rotate = scene.tweens.add({
    targets: g,
    angle: { from: -2, to: 2 },
    duration: 4000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: [],
    cleanup: () => rotate.stop()
  };
}

/* -------- gap: wormhole_gap -------- */

function buildWormholeGap(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  options: TrapBuildOptions
): TrapInstance {
  const w = 110;
  const opening = options.openingCenterY ?? 360;
  const gapHeight = 160;
  const topH = Math.max(40, opening - gapHeight / 2);
  const botStart = opening + gapHeight / 2;
  const botH = Math.max(40, GROUND_Y - botStart);

  const g = scene.add.graphics();

  function drawWormhole(centerY: number): void {
    // Glow externo
    g.fillStyle(0xa06cd5, 0.32);
    g.fillCircle(0, centerY, 60);
    g.fillStyle(0x4ecdc4, 0.42);
    g.fillCircle(0, centerY, 44);
    // Núcleo escuro
    g.fillStyle(0x14163a, 0.95);
    g.fillCircle(0, centerY, 36);
    // Anéis concêntricos coloridos (warp)
    for (let r = 32; r > 8; r -= 6) {
      const t = (32 - r) / 24;
      g.lineStyle(2, t < 0.5 ? 0xa06cd5 : 0x4ecdc4, 0.6 + t * 0.4);
      g.strokeCircle(0, centerY, r);
    }
    // Centro singular
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, centerY, 4);
  }

  // ==== TOPO: parede + buraco wormhole ====
  g.fillStyle(0x14163a, 1);
  g.fillRect(-w / 2, 0, w, topH);
  g.fillStyle(0x2a1c5a, 1);
  g.fillRect(-w / 2 + 4, 4, w - 8, topH - 8);
  // Wormhole no centro do bloco superior
  if (topH > 80) {
    drawWormhole(topH - 50);
  }
  // Borda inferior afiada (cravos)
  g.fillStyle(0xa06cd5, 1);
  for (let i = 0; i < 6; i++) {
    const sx = -w / 2 + 12 + i * ((w - 24) / 5);
    g.beginPath();
    g.moveTo(sx - 4, topH);
    g.lineTo(sx, topH + 6);
    g.lineTo(sx + 4, topH);
    g.closePath();
    g.fillPath();
  }

  // ==== FUNDO ====
  g.fillStyle(0x14163a, 1);
  g.fillRect(-w / 2, botStart, w, botH);
  g.fillStyle(0x2a1c5a, 1);
  g.fillRect(-w / 2 + 4, botStart + 4, w - 8, botH - 8);
  if (botH > 80) {
    drawWormhole(botStart + 50);
  }
  // Borda superior afiada
  g.fillStyle(0xa06cd5, 1);
  for (let i = 0; i < 6; i++) {
    const sx = -w / 2 + 12 + i * ((w - 24) / 5);
    g.beginPath();
    g.moveTo(sx - 4, botStart);
    g.lineTo(sx, botStart - 6);
    g.lineTo(sx + 4, botStart);
    g.closePath();
    g.fillPath();
  }

  container.add(g);

  // Pulse no warp
  const pulse = scene.tweens.add({
    targets: g,
    alpha: { from: 0.92, to: 1 },
    duration: 480,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [
      { x: -w / 2, y: 0, w, h: topH },
      { x: -w / 2, y: botStart, w, h: botH }
    ],
    triggerHitboxes: [],
    cleanup: () => pulse.stop()
  };
}

/* -------- dynamic: satellite -------- */

function buildSatellite(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const baseY = 320;
  const moveAmp = 130;
  const moveFreq = 1.2 + Math.random() * 0.3;
  const movePhase = Math.random() * Math.PI * 2;

  const sat = scene.add.graphics();

  // Halo
  sat.fillStyle(0x4ecdc4, 0.32);
  sat.fillCircle(0, 0, 50);

  // Corpo central (cubo metálico)
  sat.fillStyle(0x2a1c5a, 1);
  sat.fillRoundedRect(-18, -14, 36, 28, 4);
  sat.fillStyle(0x4a3a80, 1);
  sat.fillRoundedRect(-15, -11, 30, 22, 3);
  sat.fillStyle(0x9ec4ff, 0.85);
  sat.fillRoundedRect(-12, -9, 24, 6, 2);

  // Painéis solares laterais
  sat.fillStyle(0x14163a, 1);
  sat.fillRect(-50, -14, 30, 28);
  sat.fillRect(20, -14, 30, 28);
  sat.fillStyle(0x4ecdc4, 0.85);
  for (let i = 0; i < 4; i++) {
    sat.fillRect(-48 + i * 8, -12, 6, 24);
    sat.fillRect(22 + i * 8, -12, 6, 24);
  }
  sat.lineStyle(1, 0x14163a, 1);
  sat.strokeRect(-50, -14, 30, 28);
  sat.strokeRect(20, -14, 30, 28);

  // Antena central com bola
  sat.lineStyle(2, 0x9ec4ff, 1);
  sat.beginPath();
  sat.moveTo(0, -14);
  sat.lineTo(0, -28);
  sat.strokePath();
  sat.fillStyle(0xff4040, 1);
  sat.fillCircle(0, -28, 4);
  sat.fillStyle(0xfff8c0, 1);
  sat.fillCircle(0, -28, 2);

  // Olho/lente alienígena no centro
  sat.fillStyle(0xa06cd5, 1);
  sat.fillCircle(0, 0, 6);
  sat.fillStyle(0xffffff, 1);
  sat.fillCircle(0, 0, 3);

  // Beam vertical descendo (laser de scan)
  const beam = scene.add.graphics();
  function drawBeam(this: void, time: number, sy: number): void {
    beam.clear();
    const phase = time * 0.001 * 5;
    const beamH = 90;
    const flicker = 0.55 + Math.sin(phase) * 0.18;
    // Glow
    beam.fillStyle(0xff4040, 0.32 * flicker);
    beam.fillRect(-12, sy + 14, 24, beamH);
    // Núcleo
    beam.fillStyle(0xfff8c0, 0.8 * flicker);
    beam.fillRect(-3, sy + 14, 6, beamH);
    beam.fillStyle(0xffffff, 1 * flicker);
    beam.fillRect(-1, sy + 14, 2, beamH);
  }
  drawBeam(0, baseY);

  sat.x = 0;
  sat.y = baseY;
  container.add([beam, sat]);

  // Throttle 120 ms — flicker do beam é sutil, não precisa ser 20 fps.
  const updater = scene.time.addEvent({
    delay: 120,
    callback: () => drawBeam(scene.time.now, sat.y),
    loop: true
  });

  // Hitbox COMBINADA: corpo + beam
  const w = 100;
  const h = 30;
  const bodyHitbox = { x: -w / 2, y: baseY - h / 2, w, h };
  const beamHitbox = { x: -12, y: baseY + 14, w: 24, h: 90 };

  return {
    hitboxes: [bodyHitbox, beamHitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const offset = Math.sin(t * moveFreq + movePhase) * moveAmp;
      sat.y = baseY + offset;
      bodyHitbox.y = sat.y - h / 2;
      beamHitbox.y = sat.y + 14;
    },
    cleanup: () => updater.remove(false)
  };
}

/* -------- registry -------- */

const SPACE_TRAPS: TrapDef[] = [
  {
    id: 'space_plasma_field',
    category: 'ground',
    biome: 'space',
    damageOnSlideOnly: true,
    build: buildPlasmaField
  },
  {
    id: 'space_force_field_low',
    category: 'low',
    biome: 'space',
    build: buildForceFieldLow
  },
  {
    id: 'space_asteroid',
    category: 'high',
    biome: 'space',
    build: buildAsteroid
  },
  {
    id: 'space_wormhole_gap',
    category: 'gap',
    biome: 'space',
    build: buildWormholeGap
  },
  {
    id: 'space_satellite',
    category: 'dynamic',
    biome: 'space',
    build: buildSatellite
  }
];

export function registerSpaceTraps(): void {
  registerTraps(SPACE_TRAPS);
  for (const t of SPACE_TRAPS) {
    addToPalette('space', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
