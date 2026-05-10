/**
 * Armadilhas do bioma FOREST.
 *
 *  ground   thorn_patch     Espinhos venenosos crescendo do solo. Pulsam.
 *  low      low_branch      Galho grosso atravessado, slide-under safe.
 *  high     tree_trunk      Tronco gigante musgoso. Pulo por cima.
 *  gap      canopy_gap      Folhagem densa em cima + raízes embaixo.
 *  dynamic  wasp_swarm      Enxame de vespas vai/vem horizontalmente.
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

/* ----------------------------- ground: thorn_patch ----------------------------- */

function buildThornPatch(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 200;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Sombra no chão
  g.fillStyle(0x000000, 0.32);
  g.fillEllipse(0, baseY - 2, w + 12, 8);

  // Base de musgo escuro
  g.fillStyle(0x1f3a18, 0.95);
  g.fillRoundedRect(-w / 2, baseY - 12, w, 12, 4);

  // Espinhos verde-veneno (8-10 pontas)
  const spikeCount = 9;
  for (let i = 0; i < spikeCount; i++) {
    const t = (i + 0.5) / spikeCount;
    const sx = -w / 2 + t * w;
    const height = 22 + ((i * 13) % 10);
    const halfBase = 5 + ((i * 7) % 3);
    const tipY = baseY - 8 - height;

    // Sombra esquerda
    g.fillStyle(0x2a4220, 1);
    g.beginPath();
    g.moveTo(sx - halfBase, baseY - 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx, baseY - 4);
    g.closePath();
    g.fillPath();

    // Highlight direita
    g.fillStyle(0x6bcb77, 1);
    g.beginPath();
    g.moveTo(sx, baseY - 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx + halfBase, baseY - 4);
    g.closePath();
    g.fillPath();

    // Brilho na ponta (gota venenosa)
    g.fillStyle(0xb6f0a8, 0.9);
    g.fillCircle(sx, tipY + 2, 1.6);
  }

  // Mancha venenosa pulsante embaixo
  const venom = scene.add.graphics();
  venom.fillStyle(0x6bcb77, 0.4);
  venom.fillEllipse(0, baseY - 6, w * 0.85, 10);
  container.add([g, venom]);

  const pulse = scene.tweens.add({
    targets: venom,
    alpha: { from: 0.25, to: 0.6 },
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [groundHitbox(w - 20)],
    triggerHitboxes: [],
    cleanup: () => pulse.stop()
  };
}

/* ----------------------------- low: low_branch ----------------------------- */

function buildLowBranch(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 240;
  const h = 56;
  const centerY = 250;

  const g = scene.add.graphics();

  // Galho principal — gradient marrom
  g.fillStyle(0x3a2818, 1);
  g.fillRoundedRect(-w / 2, centerY - h / 2, w, h, h / 2);
  g.fillStyle(0x6a4830, 1);
  g.fillRoundedRect(-w / 2 + 4, centerY - h / 2 + 4, w - 8, h * 0.4, h / 3);

  // Casca rugosa (linhas longitudinais)
  g.lineStyle(1.2, 0x1f140a, 0.9);
  for (let i = 0; i < 5; i++) {
    const ly = centerY - h / 2 + 8 + (i * (h - 16)) / 4;
    g.beginPath();
    g.moveTo(-w / 2 + 8, ly + Math.sin(i) * 2);
    g.lineTo(w / 2 - 8, ly - Math.sin(i) * 2);
    g.strokePath();
  }

  // Folhas verdes brotando do topo
  g.fillStyle(0x4a8a30, 0.95);
  for (let i = 0; i < 6; i++) {
    const lx = -w / 2 + 20 + i * ((w - 40) / 5);
    g.fillEllipse(lx, centerY - h / 2 - 4, 14, 7);
    g.fillEllipse(lx + 4, centerY - h / 2 - 8, 10, 5);
  }
  g.fillStyle(0x6bcb77, 0.85);
  for (let i = 0; i < 4; i++) {
    const lx = -w / 2 + 36 + i * ((w - 72) / 3);
    g.fillEllipse(lx, centerY - h / 2 - 12, 8, 4);
  }

  // Espinhos pontudos pendurados embaixo (do galho)
  g.fillStyle(0x2a1a0a, 1);
  for (let i = 0; i < 5; i++) {
    const sx = -w / 2 + 30 + i * ((w - 60) / 4);
    g.beginPath();
    g.moveTo(sx - 4, centerY + h / 2 - 2);
    g.lineTo(sx, centerY + h / 2 + 8);
    g.lineTo(sx + 4, centerY + h / 2 - 2);
    g.closePath();
    g.fillPath();
  }

  container.add(g);

  return {
    hitboxes: [airHitbox(w, h, centerY)],
    triggerHitboxes: []
  };
}

/* ----------------------------- high: tree_trunk ----------------------------- */

function buildTreeTrunk(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 78;
  const h = 240;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(8, baseY - 2, w + 18, 10);

  // Tronco — gradient lateral
  g.fillStyle(0x3a2818, 1);
  g.fillRoundedRect(-w / 2, topY, w, h, 6);
  g.fillStyle(0x5a3c20, 1);
  g.fillRoundedRect(-w / 2 + 4, topY + 4, w * 0.5, h - 8, 4);

  // Anéis de casca (faixas horizontais)
  g.lineStyle(1.5, 0x1a0e08, 0.85);
  for (let i = 0; i < 6; i++) {
    const ly = topY + 30 + i * ((h - 50) / 5);
    g.beginPath();
    g.moveTo(-w / 2 + 4, ly);
    g.lineTo(w / 2 - 4, ly + 3);
    g.strokePath();
  }

  // Nó na casca (knot)
  g.fillStyle(0x1a0e08, 0.85);
  g.fillEllipse(-w / 4, topY + h / 3, 12, 16);
  g.fillStyle(0x3a2818, 1);
  g.fillEllipse(-w / 4, topY + h / 3, 7, 9);

  // Musgo verde no lado esquerdo (simula umidade)
  g.fillStyle(0x4a8a30, 0.7);
  g.fillRoundedRect(-w / 2 + 2, topY + h * 0.6, 8, h * 0.35, 3);
  g.fillStyle(0x6bcb77, 0.55);
  g.fillRoundedRect(-w / 2 + 4, topY + h * 0.7, 4, h * 0.2, 2);

  // Folhagem no topo (copa)
  g.fillStyle(0x2a5a1a, 1);
  g.fillCircle(-12, topY - 8, 28);
  g.fillCircle(14, topY - 14, 32);
  g.fillCircle(0, topY - 26, 24);
  g.fillStyle(0x4a8a30, 0.85);
  g.fillCircle(-8, topY - 22, 18);
  g.fillCircle(8, topY - 18, 16);
  // Highlight nas folhas
  g.fillStyle(0x6bcb77, 0.55);
  g.fillCircle(-2, topY - 30, 8);
  g.fillCircle(10, topY - 24, 6);

  container.add(g);

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: []
  };
}

/* ----------------------------- gap: canopy_gap ----------------------------- */

function buildCanopyGap(
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

  // === TOPO: folhagem densa pendurando ===
  // Galhos
  g.fillStyle(0x3a2818, 1);
  g.fillRoundedRect(-w / 2, 0, w, topH, 6);
  // Sombras de galhos
  g.fillStyle(0x1a0e08, 0.85);
  g.lineStyle(2, 0x1a0e08, 0.85);
  for (let i = 0; i < 3; i++) {
    const ly = 20 + i * ((topH - 40) / 2);
    g.beginPath();
    g.moveTo(-w / 2 + 4, ly);
    g.lineTo(w / 2 - 4, ly + 4);
    g.strokePath();
  }

  // Folhagem verde escura (massa)
  g.fillStyle(0x2a5a1a, 1);
  g.fillEllipse(0, topH - 16, w + 20, 36);
  g.fillStyle(0x4a8a30, 0.95);
  g.fillEllipse(-8, topH - 22, w * 0.7, 20);
  g.fillEllipse(10, topH - 14, w * 0.6, 16);

  // Folhas individuais pendendo da borda inferior
  g.fillStyle(0x4a8a30, 0.95);
  for (let i = 0; i < 5; i++) {
    const lx = -w / 2 + 12 + i * ((w - 24) / 4);
    g.fillEllipse(lx, topH + 2, 8, 12);
    g.fillStyle(0x6bcb77, 0.7);
    g.fillEllipse(lx + 1, topH, 4, 6);
    g.fillStyle(0x4a8a30, 0.95);
  }

  // === FUNDO: raízes apontando pra cima ===
  g.fillStyle(0x3a2818, 1);
  g.fillRoundedRect(-w / 2, botStart, w, botH, 6);

  // Raízes/espinhos no topo da seção inferior
  g.fillStyle(0x1a0e08, 1);
  for (let i = 0; i < 5; i++) {
    const sx = -w / 2 + 12 + i * ((w - 24) / 4);
    const tipY = botStart - 12 - ((i * 11) % 6);
    g.beginPath();
    g.moveTo(sx - 5, botStart);
    g.lineTo(sx, tipY);
    g.lineTo(sx + 5, botStart);
    g.closePath();
    g.fillPath();
  }
  // Highlight nas raízes
  g.fillStyle(0x5a3c20, 0.85);
  for (let i = 0; i < 5; i++) {
    const sx = -w / 2 + 12 + i * ((w - 24) / 4);
    const tipY = botStart - 12 - ((i * 11) % 6);
    g.beginPath();
    g.moveTo(sx - 2, botStart - 2);
    g.lineTo(sx, tipY + 2);
    g.lineTo(sx + 1, botStart - 2);
    g.closePath();
    g.fillPath();
  }

  // Musgo na borda do solo
  g.fillStyle(0x4a8a30, 0.7);
  g.fillRoundedRect(-w / 2, botStart + 4, w, 6, 2);

  container.add(g);

  return {
    hitboxes: [
      { x: -w / 2, y: 0, w, h: topH },
      { x: -w / 2, y: botStart, w, h: botH }
    ],
    triggerHitboxes: []
  };
}

/* ----------------------------- dynamic: wasp_swarm ----------------------------- */

function buildWaspSwarm(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 70;
  const h = 56;
  const baseY = 360;
  const moveAmp = 130;
  const moveFreq = 1.6 + Math.random() * 0.6;
  const movePhase = Math.random() * Math.PI * 2;

  const g = scene.add.graphics();

  g.fillStyle(0xffd23f, 0.18);
  g.fillCircle(0, 0, 38);
  g.fillStyle(0xffd23f, 0.32);
  g.fillCircle(0, 0, 22);

  g.fillStyle(0x14140a, 1);
  g.fillEllipse(0, 0, 24, 14);
  g.fillStyle(0xffb84e, 1);
  g.fillRect(-8, -3, 4, 6);
  g.fillRect(2, -3, 4, 6);
  g.fillStyle(0x14140a, 1);
  g.fillCircle(-12, 0, 5);
  g.fillStyle(0xff4040, 1);
  g.fillCircle(-13, -1.5, 1.4);
  g.fillCircle(-13, 1.5, 1.4);
  g.fillStyle(0x6a3a00, 1);
  g.beginPath();
  g.moveTo(12, 0);
  g.lineTo(18, -2);
  g.lineTo(18, 2);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xffffff, 0.4);
  g.fillEllipse(-2, -7, 14, 5);
  g.fillEllipse(-2, 7, 14, 5);

  for (const off of [{ x: -22, y: -14 }, { x: 22, y: 12 }, { x: 18, y: -12 }, { x: -18, y: 14 }]) {
    g.fillStyle(0x14140a, 1);
    g.fillEllipse(off.x, off.y, 10, 6);
    g.fillStyle(0xffb84e, 1);
    g.fillRect(off.x - 3, off.y - 1, 1.5, 2);
    g.fillRect(off.x + 1.5, off.y - 1, 1.5, 2);
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(off.x - 1, off.y - 4, 6, 2);
    g.fillEllipse(off.x - 1, off.y + 4, 6, 2);
  }

  container.add(g);
  g.x = 0;
  g.y = baseY;

  const wingPulse = scene.tweens.add({
    targets: g,
    alpha: { from: 0.85, to: 1 },
    duration: 100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const hitbox = airHitbox(w, h, baseY);

  return {
    hitboxes: [hitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const offset = Math.sin(t * moveFreq + movePhase) * moveAmp;
      g.y = baseY + offset;
      hitbox.y = baseY + offset - h / 2;
    },
    cleanup: () => wingPulse.stop()
  };
}

/* ----------------------------- registry ----------------------------- */

const FOREST_TRAPS: TrapDef[] = [
  {
    id: 'forest_thorn_patch',
    category: 'ground',
    biome: 'forest',
    damageOnSlideOnly: true,
    build: buildThornPatch
  },
  {
    id: 'forest_low_branch',
    category: 'low',
    biome: 'forest',
    fromMeters: 180,
    build: buildLowBranch
  },
  {
    id: 'forest_tree_trunk',
    category: 'high',
    biome: 'forest',
    build: buildTreeTrunk
  },
  {
    id: 'forest_canopy_gap',
    category: 'gap',
    biome: 'forest',
    fromMeters: 1000,
    build: buildCanopyGap
  },
  {
    id: 'forest_wasp_swarm',
    category: 'dynamic',
    biome: 'forest',
    fromMeters: 600,
    build: buildWaspSwarm
  }
];

export function registerForestTraps(): void {
  registerTraps(FOREST_TRAPS);
  for (const t of FOREST_TRAPS) {
    addToPalette('forest', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
