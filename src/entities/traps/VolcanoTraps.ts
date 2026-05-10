/**
 * Armadilhas do bioma VOLCANO.
 *
 *  ground   lava_pool         Poça de lava borbulhante. Hitbox baixo.
 *  low      obsidian_low      Lasca de obsidiana suspensa baixo.
 *  high     basalt_pillar     Coluna de basalto vulcânico, brilho de magma.
 *  gap      lava_arch         Lava acima/abaixo, gap de fumaça pelo meio.
 *  dynamic  magma_blob        Bola de magma quicando vertical.
 */

import type Phaser from 'phaser';
import {
  registerTraps,
  addToPalette,
  type TrapBuildOptions,
  type TrapDef,
  type TrapInstance
} from '../../data/TrapDefs';
import { airHitbox, GROUND_Y, groundHitbox, wallHitbox } from './common';

/* -------- ground: lava_pool -------- */

function buildLavaPool(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 200;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Glow externo (calor)
  g.fillStyle(0xff4020, 0.32);
  g.fillEllipse(0, baseY - 14, w + 30, 32);
  g.fillStyle(0xff8a3a, 0.42);
  g.fillEllipse(0, baseY - 12, w + 12, 24);

  // Borda escura cravada na rocha
  g.fillStyle(0x14080a, 1);
  g.fillRoundedRect(-w / 2, baseY - 16, w, 16, 6);

  // Superfície de lava (camadas)
  g.fillStyle(0xff4020, 1);
  g.fillRoundedRect(-w / 2 + 6, baseY - 14, w - 12, 14, 5);
  g.fillStyle(0xff8a3a, 1);
  g.fillRoundedRect(-w / 2 + 12, baseY - 12, w - 24, 10, 4);
  g.fillStyle(0xffd23f, 0.95);
  g.fillRoundedRect(-w / 2 + 20, baseY - 10, w - 40, 6, 3);

  // Bolhas de magma estourando
  const bubbles = scene.add.graphics();
  function drawBubbles(this: void, time: number): void {
    bubbles.clear();
    for (let i = 0; i < 5; i++) {
      const phase = time * 0.001 * 1.4 + i * 1.3;
      const x = -w / 2 + 30 + (i + (Math.sin(phase) + 1) * 0.5) * ((w - 60) / 5);
      const y = baseY - 8 - Math.abs(Math.sin(phase)) * 6;
      const r = 3 + Math.abs(Math.sin(phase * 1.7)) * 4;
      bubbles.fillStyle(0xffd23f, 0.9);
      bubbles.fillCircle(x, y, r);
      bubbles.fillStyle(0xffffff, 0.85);
      bubbles.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.4);
    }
  }
  drawBubbles(0);
  container.add([g, bubbles]);

  // Atualização contínua das bolhas (animation)
  const updater = scene.time.addEvent({
    delay: 50,
    callback: () => drawBubbles(scene.time.now),
    loop: true
  });

  // Pulse de calor externo
  const heatGlow = scene.add.graphics();
  heatGlow.fillStyle(0xff4020, 0.28);
  heatGlow.fillEllipse(0, baseY - 14, w + 30, 32);
  container.add(heatGlow);
  const heat = scene.tweens.add({
    targets: heatGlow,
    alpha: { from: 0.18, to: 0.45 },
    duration: 480,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [groundHitbox(w - 20)],
    triggerHitboxes: [],
    cleanup: () => {
      heat.stop();
      updater.remove(false);
    }
  };
}

/* -------- low: obsidian_low -------- */

function buildObsidianLow(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 230;
  const h = 64;
  const centerY = 248;

  const g = scene.add.graphics();

  // Base superior (rocha incandescente)
  g.fillStyle(0x6a2010, 1);
  g.fillRect(-w / 2, centerY - h / 2 - 10, w, 14);
  g.fillStyle(0xff4020, 0.85);
  g.fillRect(-w / 2 + 8, centerY - h / 2 - 4, w - 16, 4);

  // Lascas de obsidiana negra apontando pra baixo
  g.fillStyle(0x14080a, 1);
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    const sx = -w / 2 + t * w;
    const tipY = centerY + h / 2 - 4 + ((i * 7) % 8);
    g.beginPath();
    g.moveTo(sx - 14, centerY - h / 2 + 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx + 14, centerY - h / 2 + 4);
    g.closePath();
    g.fillPath();
  }

  // Reflexos brancos (vidro vulcânico)
  g.fillStyle(0xffffff, 0.55);
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8;
    const sx = -w / 2 + t * w;
    const tipY = centerY + h / 2 - 4 + ((i * 7) % 8);
    g.beginPath();
    g.moveTo(sx - 4, centerY - h / 2 + 6);
    g.lineTo(sx - 1, tipY - 4);
    g.lineTo(sx - 6, centerY - h / 2 + 6);
    g.closePath();
    g.fillPath();
  }

  // Brasas brilhando entre as lascas
  g.fillStyle(0xff8a3a, 1);
  for (let i = 0; i < 7; i++) {
    const t = (i + 1) / 8;
    const sx = -w / 2 + t * w;
    g.fillCircle(sx, centerY - h / 2 + 8, 2);
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(sx, centerY - h / 2 + 8, 1);
    g.fillStyle(0xff8a3a, 1);
  }

  container.add(g);

  // Pulse de calor (alpha sutil)
  const pulse = scene.tweens.add({
    targets: g,
    alpha: { from: 0.92, to: 1 },
    duration: 460,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [airHitbox(w, h, centerY)],
    triggerHitboxes: [],
    cleanup: () => pulse.stop()
  };
}

/* -------- high: basalt_pillar -------- */

function buildBasaltPillar(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 86;
  const h = 240;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.5);
  g.fillEllipse(8, baseY - 2, w + 22, 12);

  // Coluna vulcânica (segmentos hexagonais)
  g.fillStyle(0x14080a, 1);
  g.fillRect(-w / 2, topY, w, h);
  g.fillStyle(0x4a1a08, 1);
  g.fillRect(-w / 2 + 6, topY + 4, w - 12, h - 8);

  // Segmentos hexagonais
  g.lineStyle(2, 0x14080a, 1);
  for (let i = 0; i < 8; i++) {
    const sy = topY + 12 + i * ((h - 24) / 8);
    g.beginPath();
    g.moveTo(-w / 2 + 8, sy);
    g.lineTo(w / 2 - 8, sy + 3);
    g.strokePath();
  }

  // Veias de magma quente correndo verticalmente
  g.fillStyle(0xff4020, 1);
  for (let i = 0; i < 3; i++) {
    const lx = -w / 2 + 14 + i * ((w - 28) / 2);
    g.fillRect(lx, topY + 10, 3, h - 20);
  }
  // Brilho amarelo no centro das veias
  g.fillStyle(0xffd23f, 0.85);
  for (let i = 0; i < 3; i++) {
    const lx = -w / 2 + 15 + i * ((w - 28) / 2);
    g.fillRect(lx, topY + 12, 1, h - 24);
  }

  // Topo coberto por brasas
  g.fillStyle(0xff4020, 1);
  g.fillRoundedRect(-w / 2 - 2, topY - 4, w + 4, 12, 4);
  g.fillStyle(0xff8a3a, 1);
  for (let i = 0; i < 5; i++) {
    const ex = -w / 2 + 8 + i * ((w - 16) / 4);
    g.fillCircle(ex, topY - 6, 3);
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(ex, topY - 6, 1.5);
    g.fillStyle(0xff8a3a, 1);
  }

  // Glow lateral (brasas saindo)
  g.fillStyle(0xff8a3a, 0.32);
  g.fillRoundedRect(-w / 2 - 6, topY - 8, w + 12, 14, 6);

  container.add(g);

  // Pulse das veias
  const pulse = scene.tweens.add({
    targets: g,
    alpha: { from: 0.94, to: 1 },
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: [],
    cleanup: () => pulse.stop()
  };
}

/* -------- gap: lava_arch -------- */

function buildLavaArch(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  options: TrapBuildOptions
): TrapInstance {
  const w = 100;
  const opening = options.openingCenterY ?? 360;
  const gapHeight = 160;
  const topH = Math.max(40, opening - gapHeight / 2);
  const botStart = opening + gapHeight / 2;
  const botH = Math.max(40, GROUND_Y - botStart);

  const g = scene.add.graphics();

  // ==== TOPO: rocha + lava escorrendo ====
  g.fillStyle(0x14080a, 1);
  g.fillRect(-w / 2, 0, w, topH - 8);
  g.fillStyle(0x4a1a08, 1);
  g.fillRect(-w / 2 + 4, 4, w - 8, topH - 16);

  // Lava escorrendo da borda
  g.fillStyle(0xff4020, 1);
  for (let i = 0; i < 5; i++) {
    const dx = -w / 2 + 12 + i * ((w - 24) / 4);
    const dripLen = 12 + ((i * 7) % 8);
    g.beginPath();
    g.moveTo(dx - 4, topH - 16);
    g.lineTo(dx, topH - 16 + dripLen);
    g.lineTo(dx + 4, topH - 16);
    g.closePath();
    g.fillPath();
    // Highlight amarelo no centro
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(dx, topH - 16 + dripLen - 2, 1.5);
    g.fillStyle(0xff4020, 1);
  }

  // Brasas
  g.fillStyle(0xffd23f, 0.95);
  for (let i = 0; i < 4; i++) {
    g.fillCircle(-w / 4 + i * (w / 6), topH - 6, 1.4);
  }

  // ==== FUNDO: rocha + brasas saindo ====
  g.fillStyle(0x14080a, 1);
  g.fillRect(-w / 2, botStart + 8, w, botH - 8);
  g.fillStyle(0x4a1a08, 1);
  g.fillRect(-w / 2 + 4, botStart + 12, w - 8, botH - 16);

  // Lava brotando do topo
  g.fillStyle(0xff4020, 1);
  for (let i = 0; i < 5; i++) {
    const dx = -w / 2 + 12 + i * ((w - 24) / 4);
    const liftLen = 12 + ((i * 7) % 8);
    g.beginPath();
    g.moveTo(dx - 4, botStart + 16);
    g.lineTo(dx, botStart + 16 - liftLen);
    g.lineTo(dx + 4, botStart + 16);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(dx, botStart + 16 - liftLen + 2, 1.5);
    g.fillStyle(0xff4020, 1);
  }

  // Glow externo (calor)
  g.fillStyle(0xff4020, 0.18);
  g.fillRect(-w / 2 - 8, 0, w + 16, topH);
  g.fillRect(-w / 2 - 8, botStart, w + 16, botH);

  container.add(g);

  return {
    hitboxes: [
      { x: -w / 2, y: 0, w, h: topH },
      { x: -w / 2, y: botStart, w, h: botH }
    ],
    triggerHitboxes: []
  };
}

/* -------- dynamic: magma_blob -------- */

function buildMagmaBlob(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const baseY = 380;
  const moveAmp = 160;
  const moveFreq = 1.6 + Math.random() * 0.5;
  const movePhase = Math.random() * Math.PI * 2;

  const blob = scene.add.graphics();

  // Halo amarelo brilhante
  blob.fillStyle(0xff4020, 0.38);
  blob.fillCircle(0, 0, 50);
  blob.fillStyle(0xff8a3a, 0.55);
  blob.fillCircle(0, 0, 36);

  // Corpo de magma (oval irregular)
  blob.fillStyle(0xff4020, 1);
  blob.fillCircle(0, 0, 28);
  blob.fillStyle(0xff8a3a, 1);
  blob.fillCircle(0, 0, 22);
  blob.fillStyle(0xffd23f, 1);
  blob.fillCircle(-4, -4, 14);
  blob.fillStyle(0xffffff, 0.8);
  blob.fillCircle(-6, -6, 4);

  // Mini-bolhas saindo (brasas)
  blob.fillStyle(0xffd23f, 0.9);
  blob.fillCircle(20, -22, 3);
  blob.fillCircle(-22, -18, 2.5);
  blob.fillCircle(18, 22, 3);
  blob.fillCircle(-18, 22, 2.5);
  blob.fillStyle(0xff8a3a, 1);
  blob.fillCircle(20, -22, 1.5);
  blob.fillCircle(-22, -18, 1.5);
  blob.fillCircle(18, 22, 1.5);
  blob.fillCircle(-18, 22, 1);

  blob.x = 0;
  blob.y = baseY;
  container.add(blob);

  // Pulse interno (vivo, latejando)
  const pulse = scene.tweens.add({
    targets: blob,
    scale: { from: 0.92, to: 1.08 },
    duration: 380,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const w = 56;
  const h = 56;
  const hitbox = { x: -w / 2, y: baseY - h / 2, w, h };

  return {
    hitboxes: [hitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const offset = Math.sin(t * moveFreq + movePhase) * moveAmp;
      blob.y = baseY + offset;
      hitbox.y = blob.y - h / 2;
    },
    cleanup: () => pulse.stop()
  };
}

/* -------- registry -------- */

const VOLCANO_TRAPS: TrapDef[] = [
  {
    id: 'volcano_lava_pool',
    category: 'ground',
    biome: 'volcano',
    damageOnSlideOnly: true,
    build: buildLavaPool
  },
  {
    id: 'volcano_obsidian_low',
    category: 'low',
    biome: 'volcano',
    build: buildObsidianLow
  },
  {
    id: 'volcano_basalt_pillar',
    category: 'high',
    biome: 'volcano',
    build: buildBasaltPillar
  },
  {
    id: 'volcano_lava_arch',
    category: 'gap',
    biome: 'volcano',
    build: buildLavaArch
  },
  {
    id: 'volcano_magma_blob',
    category: 'dynamic',
    biome: 'volcano',
    build: buildMagmaBlob
  }
];

export function registerVolcanoTraps(): void {
  registerTraps(VOLCANO_TRAPS);
  for (const t of VOLCANO_TRAPS) {
    addToPalette('volcano', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
