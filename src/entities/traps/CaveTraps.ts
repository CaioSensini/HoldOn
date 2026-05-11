/**
 * Armadilhas do bioma CAVE.
 *
 *  ground   stalagmite_field  Cravados de cristal afiados no chão. Brilham.
 *  low      stalactite_low    Estalactite pendurada baixa, slide-under safe.
 *  high     boulder_block     Pedregulho enorme musgoso. Pulo por cima.
 *  gap      pillar_gap        Estalagmite + estalactite — thread pelo meio.
 *  dynamic  swing_pendant     Cristal pendurado oscilando em arco.
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

/* -------- ground: stalagmite_field -------- */

function buildStalagmiteField(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 200;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(0, baseY - 2, w + 16, 9);

  // Base de pedra escura
  g.fillStyle(0x1a1422, 0.95);
  g.fillRoundedRect(-w / 2, baseY - 14, w, 14, 5);

  // Cristais de cave roxo-magenta (8 espinhos cravados)
  const count = 8;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const sx = -w / 2 + t * w;
    const height = 26 + ((i * 17) % 12);
    const halfBase = 6 + ((i * 5) % 3);
    const tipY = baseY - 10 - height;

    // Sombra esquerda
    g.fillStyle(0x4a2868, 1);
    g.beginPath();
    g.moveTo(sx - halfBase, baseY - 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx, baseY - 4);
    g.closePath();
    g.fillPath();

    // Cristal direita
    g.fillStyle(0xa06cd5, 1);
    g.beginPath();
    g.moveTo(sx, baseY - 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx + halfBase, baseY - 4);
    g.closePath();
    g.fillPath();

    // Highlight branco no topo
    g.fillStyle(0xe8c8ff, 0.95);
    g.beginPath();
    g.moveTo(sx - 1.5, tipY + 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx + 1.5, tipY + 4);
    g.closePath();
    g.fillPath();

    // Glow pontudo (point of light)
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(sx, tipY + 1, 1.4);
  }

  // Halo magenta pulsante embaixo
  const glow = scene.add.graphics();
  glow.fillStyle(0xa06cd5, 0.42);
  glow.fillEllipse(0, baseY - 8, w * 0.85, 14);
  container.add([g, glow]);

  const pulse = scene.tweens.add({
    targets: glow,
    alpha: { from: 0.28, to: 0.6 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [groundHitbox(w - 16)],
    triggerHitboxes: [],
    cleanup: () => pulse.stop()
  };
}

/* -------- low: stalactite_low -------- */

function buildStalactiteLow(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 220;
  const h = 70;
  const centerY = 240;

  const g = scene.add.graphics();

  // Base superior (raiz da estalactite)
  g.fillStyle(0x2a1a3a, 1);
  g.fillRect(-w / 2, centerY - h / 2 - 8, w, 14);

  // Corpo principal — pendurando como faixa de pedra
  g.fillStyle(0x3a2a4a, 1);
  g.fillRoundedRect(-w / 2 + 4, centerY - h / 2, w - 8, h - 12, 8);

  // Ponta inferior dentada (estalactite tips)
  const tips = 7;
  g.fillStyle(0x2a1a3a, 1);
  g.beginPath();
  g.moveTo(-w / 2 + 4, centerY + h / 2 - 12);
  for (let i = 0; i < tips; i++) {
    const t = (i + 0.5) / tips;
    const sx = -w / 2 + 4 + t * (w - 8);
    const tipY = centerY + h / 2 - 2 + ((i * 7) % 4);
    g.lineTo(sx - 8, centerY + h / 2 - 12);
    g.lineTo(sx, tipY);
    g.lineTo(sx + 8, centerY + h / 2 - 12);
  }
  g.lineTo(w / 2 - 4, centerY + h / 2 - 12);
  g.closePath();
  g.fillPath();

  // Highlights (luz de cima — refletindo nos cristais)
  g.fillStyle(0xa06cd5, 0.45);
  g.fillRect(-w / 2 + 8, centerY - h / 2 + 4, w - 16, 5);

  // Cristais magenta espalhados (pequenos, brilhantes)
  g.fillStyle(0xa06cd5, 0.85);
  for (let i = 0; i < 6; i++) {
    const cx = -w / 2 + 16 + i * ((w - 32) / 5);
    const cy = centerY - 4 + ((i * 13) % 10) - 5;
    g.beginPath();
    g.moveTo(cx, cy - 4);
    g.lineTo(cx + 3, cy);
    g.lineTo(cx, cy + 4);
    g.lineTo(cx - 3, cy);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xe8c8ff, 0.9);
    g.fillCircle(cx, cy - 1, 1);
    g.fillStyle(0xa06cd5, 0.85);
  }

  container.add(g);

  return {
    hitboxes: [airHitbox(w, h, centerY), ceilingCurtainHitbox(w, centerY - h / 2)],
    triggerHitboxes: []
  };
}

/* -------- high: boulder_block -------- */

function buildBoulderBlock(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 90;
  const h = 220;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(8, baseY - 2, w + 22, 12);

  // Pedregulho irregular (multi-segmented blob)
  g.fillStyle(0x3a2a4a, 1);
  g.beginPath();
  g.moveTo(-w / 2 + 8, baseY);
  g.lineTo(-w / 2, baseY - h * 0.3);
  g.lineTo(-w / 2 + 6, baseY - h * 0.6);
  g.lineTo(-w / 2 - 4, baseY - h * 0.8);
  g.lineTo(-w / 2 + 10, topY + 6);
  g.lineTo(0, topY - 10);
  g.lineTo(w / 2 - 8, topY + 4);
  g.lineTo(w / 2 + 6, baseY - h * 0.7);
  g.lineTo(w / 2 - 4, baseY - h * 0.4);
  g.lineTo(w / 2, baseY - h * 0.2);
  g.lineTo(w / 2 - 6, baseY);
  g.closePath();
  g.fillPath();

  // Highlight (luz vinda de cima-esquerda)
  g.fillStyle(0x6a5a7a, 1);
  g.beginPath();
  g.moveTo(-w / 2 + 8, baseY);
  g.lineTo(-w / 2 + 6, baseY - h * 0.6);
  g.lineTo(-w / 2 + 14, baseY - h * 0.8);
  g.lineTo(-4, topY + 6);
  g.lineTo(0, topY - 8);
  g.lineTo(-2, topY + 12);
  g.lineTo(-2, baseY - h * 0.3);
  g.lineTo(-w / 2 + 14, baseY - 12);
  g.closePath();
  g.fillPath();

  // Sombra interna (lado direito)
  g.fillStyle(0x1a0e22, 0.7);
  g.beginPath();
  g.moveTo(2, topY + 12);
  g.lineTo(w / 2 - 8, topY + 4);
  g.lineTo(w / 2 + 6, baseY - h * 0.7);
  g.lineTo(w / 2 - 4, baseY - h * 0.4);
  g.lineTo(w / 2 - 12, baseY - 8);
  g.lineTo(2, baseY - h * 0.4);
  g.closePath();
  g.fillPath();

  // Musgo roxo no topo (umidade da cave)
  g.fillStyle(0x9b6bcb, 0.65);
  g.fillEllipse(-12, topY + 4, 24, 8);
  g.fillEllipse(8, topY - 4, 18, 6);

  // Cristais cravados na superfície (3 pontos brilhantes)
  for (const pt of [{ x: -10, y: topY + 60 }, { x: 16, y: topY + h * 0.4 }, { x: -6, y: topY + h * 0.7 }]) {
    g.fillStyle(0xa06cd5, 1);
    g.beginPath();
    g.moveTo(pt.x, pt.y - 6);
    g.lineTo(pt.x + 4, pt.y);
    g.lineTo(pt.x, pt.y + 6);
    g.lineTo(pt.x - 4, pt.y);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(pt.x, pt.y - 2, 1.4);
  }

  // Rachaduras
  g.lineStyle(1.5, 0x1a0e22, 0.85);
  g.beginPath();
  g.moveTo(-12, topY + 30);
  g.lineTo(-4, topY + 80);
  g.lineTo(-14, topY + 130);
  g.lineTo(-2, topY + 180);
  g.strokePath();

  container.add(g);

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: []
  };
}

/* -------- gap: pillar_gap -------- */

function buildPillarGap(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  options: TrapBuildOptions
): TrapInstance {
  const w = 90;
  const opening = options.openingCenterY ?? 360;
  const gapHeight = 160;
  const topH = Math.max(40, opening - gapHeight / 2);
  const botStart = opening + gapHeight / 2;
  const botH = Math.max(40, GROUND_Y - botStart);

  const g = scene.add.graphics();

  // ==== TOPO: estalactites pesadas ====
  g.fillStyle(0x2a1a3a, 1);
  g.fillRect(-w / 2, 0, w, topH - 14);
  g.fillStyle(0x3a2a4a, 1);
  g.fillRect(-w / 2 + 4, 4, w - 8, topH - 22);

  // Pontas inferiores
  const tips = 4;
  g.fillStyle(0x2a1a3a, 1);
  g.beginPath();
  g.moveTo(-w / 2, topH - 14);
  for (let i = 0; i < tips; i++) {
    const t = (i + 0.5) / tips;
    const sx = -w / 2 + t * w;
    const tipY = topH - 2 - ((i * 11) % 6);
    g.lineTo(sx - 10, topH - 14);
    g.lineTo(sx, tipY);
    g.lineTo(sx + 10, topH - 14);
  }
  g.lineTo(w / 2, topH - 14);
  g.closePath();
  g.fillPath();

  // Cristais na ponta (alerta visual)
  for (let i = 0; i < tips; i++) {
    const t = (i + 0.5) / tips;
    const sx = -w / 2 + t * w;
    const tipY = topH - 2 - ((i * 11) % 6);
    g.fillStyle(0xa06cd5, 0.95);
    g.fillCircle(sx, tipY - 3, 2.4);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(sx, tipY - 3, 1.2);
  }

  // ==== FUNDO: estalagmites apontando pra cima ====
  g.fillStyle(0x2a1a3a, 1);
  g.fillRect(-w / 2, botStart + 14, w, botH - 14);
  g.fillStyle(0x3a2a4a, 1);
  g.fillRect(-w / 2 + 4, botStart + 18, w - 8, botH - 22);

  g.fillStyle(0x2a1a3a, 1);
  g.beginPath();
  g.moveTo(-w / 2, botStart + 14);
  for (let i = 0; i < tips; i++) {
    const t = (i + 0.5) / tips;
    const sx = -w / 2 + t * w;
    const tipY = botStart + 2 + ((i * 11) % 6);
    g.lineTo(sx - 10, botStart + 14);
    g.lineTo(sx, tipY);
    g.lineTo(sx + 10, botStart + 14);
  }
  g.lineTo(w / 2, botStart + 14);
  g.closePath();
  g.fillPath();

  for (let i = 0; i < tips; i++) {
    const t = (i + 0.5) / tips;
    const sx = -w / 2 + t * w;
    const tipY = botStart + 2 + ((i * 11) % 6);
    g.fillStyle(0xa06cd5, 0.95);
    g.fillCircle(sx, tipY + 3, 2.4);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(sx, tipY + 3, 1.2);
  }

  // Highlights laterais
  g.fillStyle(0x6a4a8a, 0.5);
  g.fillRect(-w / 2 + 4, 6, 4, topH - 24);
  g.fillRect(-w / 2 + 4, botStart + 20, 4, botH - 24);

  container.add(g);

  return {
    hitboxes: [
      { x: -w / 2, y: 0, w, h: topH },
      { x: -w / 2, y: botStart, w, h: botH }
    ],
    triggerHitboxes: []
  };
}

/* -------- dynamic: swing_pendant -------- */

function buildSwingPendant(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const ropeAttachY = 120;
  const ropeLen = 220;
  const swingAmp = 0.95; // rad (≈54°)
  const swingFreq = 1.4 + Math.random() * 0.4;
  const swingPhase = Math.random() * Math.PI * 2;

  // Pivot fixo no teto
  const pivot = scene.add.container(0, ropeAttachY);

  // Corda (linha)
  const rope = scene.add.graphics();
  rope.lineStyle(3, 0x6a3a00, 1);
  rope.beginPath();
  rope.moveTo(0, 0);
  rope.lineTo(0, ropeLen);
  rope.strokePath();
  pivot.add(rope);

  // Cristal pendurado na ponta
  const pendantW = 60;
  const pendantH = 80;
  const py = ropeLen;

  const gem = scene.add.graphics();
  // Halo glow
  gem.fillStyle(0xa06cd5, 0.28);
  gem.fillCircle(0, py, 50);
  // Corpo facetado
  gem.fillStyle(0x4a2868, 1);
  gem.beginPath();
  gem.moveTo(0, py - pendantH / 2);
  gem.lineTo(pendantW / 2, py - pendantH / 4);
  gem.lineTo(pendantW / 2 - 4, py + pendantH / 4);
  gem.lineTo(0, py + pendantH / 2);
  gem.lineTo(-pendantW / 2 + 4, py + pendantH / 4);
  gem.lineTo(-pendantW / 2, py - pendantH / 4);
  gem.closePath();
  gem.fillPath();

  // Highlight (lado iluminado)
  gem.fillStyle(0xa06cd5, 1);
  gem.beginPath();
  gem.moveTo(0, py - pendantH / 2);
  gem.lineTo(-pendantW / 2 + 4, py - pendantH / 4);
  gem.lineTo(-4, py - 6);
  gem.closePath();
  gem.fillPath();

  // Glints brancos
  gem.fillStyle(0xffffff, 0.95);
  gem.fillCircle(-pendantW / 4, py - pendantH / 4 + 4, 2.4);
  gem.fillCircle(pendantW / 6, py + 8, 1.6);

  // Espinhos pontudos no fundo (ponta de aríete)
  gem.fillStyle(0x2a0e3a, 1);
  for (let i = -1; i <= 1; i++) {
    gem.beginPath();
    gem.moveTo(i * 8, py + pendantH / 2);
    gem.lineTo(i * 8 - 3, py + pendantH / 2 + 6);
    gem.lineTo(i * 8 + 3, py + pendantH / 2 + 6);
    gem.closePath();
    gem.fillPath();
  }

  pivot.add(gem);
  container.add(pivot);

  // Hitbox dinâmica — calculada em update conforme rotação do pivot
  const hitbox = { x: -pendantW / 2, y: ropeAttachY + py - pendantH / 2, w: pendantW, h: pendantH };

  return {
    hitboxes: [hitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const angle = Math.sin(t * swingFreq + swingPhase) * swingAmp;
      pivot.rotation = angle;
      // Posição do gem em mundo (relativa ao container do obstáculo)
      const gx = Math.sin(angle) * ropeLen;
      const gy = ropeAttachY + Math.cos(angle) * ropeLen;
      hitbox.x = gx - pendantW / 2;
      hitbox.y = gy - pendantH / 2;
    }
  };
}

/* -------- registry -------- */

const CAVE_TRAPS: TrapDef[] = [
  {
    id: 'cave_stalagmite_field',
    category: 'ground',
    biome: 'cave',
    damageOnSlideOnly: true,
    build: buildStalagmiteField
  },
  {
    id: 'cave_stalactite_low',
    category: 'low',
    biome: 'cave',
    build: buildStalactiteLow
  },
  {
    id: 'cave_boulder_block',
    category: 'high',
    biome: 'cave',
    build: buildBoulderBlock
  },
  {
    id: 'cave_pillar_gap',
    category: 'gap',
    biome: 'cave',
    build: buildPillarGap
  },
  {
    id: 'cave_swing_pendant',
    category: 'dynamic',
    biome: 'cave',
    build: buildSwingPendant
  }
];

export function registerCaveTraps(): void {
  registerTraps(CAVE_TRAPS);
  for (const t of CAVE_TRAPS) {
    addToPalette('cave', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
