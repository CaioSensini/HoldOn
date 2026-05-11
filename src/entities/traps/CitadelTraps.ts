/**
 * Armadilhas do bioma CITADEL.
 *
 *  ground   floor_spikes      Espinhos de aço subindo do chão. Industrial.
 *  low      energy_grate      Laser horizontal de defesa cromado.
 *  high     iron_gate         Portão metálico imponente com rivets.
 *  gap      portcullis        Grade dupla descendo + barricada subindo.
 *  dynamic  spinning_blade    Lâmina circular giratória vertical.
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

/* -------- ground: floor_spikes -------- */

function buildFloorSpikes(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 200;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(0, baseY - 2, w + 14, 9);

  // Base de aço
  g.fillStyle(0x2a3a5a, 1);
  g.fillRoundedRect(-w / 2, baseY - 14, w, 14, 4);
  g.fillStyle(0x445a8a, 1);
  g.fillRoundedRect(-w / 2 + 4, baseY - 12, w - 8, 4, 2);

  // Rivets ao longo da base
  for (let i = 0; i < 5; i++) {
    const rx = -w / 2 + 12 + i * ((w - 24) / 4);
    g.fillStyle(0x14223a, 1);
    g.fillCircle(rx, baseY - 5, 3);
    g.fillStyle(0x9ec4ff, 0.85);
    g.fillCircle(rx - 0.5, baseY - 5.5, 1.4);
  }

  // Espinhos cromados (8-10)
  const count = 9;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const sx = -w / 2 + t * w;
    const height = 28 + ((i * 11) % 10);
    const halfBase = 5 + ((i * 5) % 3);
    const tipY = baseY - 12 - height;

    // Sombra esquerda (escura)
    g.fillStyle(0x14223a, 1);
    g.beginPath();
    g.moveTo(sx - halfBase, baseY - 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx, baseY - 4);
    g.closePath();
    g.fillPath();

    // Aço claro direita
    g.fillStyle(0x9ec4ff, 1);
    g.beginPath();
    g.moveTo(sx, baseY - 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx + halfBase, baseY - 4);
    g.closePath();
    g.fillPath();

    // Highlight branco no topo
    g.fillStyle(0xffffff, 0.95);
    g.beginPath();
    g.moveTo(sx - 1.2, tipY + 4);
    g.lineTo(sx, tipY);
    g.lineTo(sx + 1.2, tipY + 4);
    g.closePath();
    g.fillPath();

    // Sangue/oxidação na ponta
    g.fillStyle(0xc94545, 0.85);
    g.fillCircle(sx, tipY + 1, 1);
  }

  // LED ciano vermelho de aviso pulsante
  const led = scene.add.graphics();
  led.fillStyle(0xff4040, 1);
  led.fillCircle(-w / 2 + 10, baseY - 10, 3);
  led.fillCircle(w / 2 - 10, baseY - 10, 3);
  led.fillStyle(0xfff8c0, 1);
  led.fillCircle(-w / 2 + 10, baseY - 10, 1.4);
  led.fillCircle(w / 2 - 10, baseY - 10, 1.4);

  container.add([g, led]);

  const blink = scene.tweens.add({
    targets: led,
    alpha: { from: 0.4, to: 1 },
    duration: 320,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [groundHitbox(w - 18)],
    triggerHitboxes: [],
    cleanup: () => blink.stop()
  };
}

/* -------- low: energy_grate -------- */

function buildEnergyGrate(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 240;
  const h = 56;
  const centerY = 244;

  const g = scene.add.graphics();

  // Glow ambiente
  g.fillStyle(0x4ecdc4, 0.32);
  g.fillRect(-w / 2 - 8, centerY - h / 2 - 6, w + 16, h + 12);

  // Mancais (terminais)
  for (const sx of [-w / 2 + 14, w / 2 - 14]) {
    g.fillStyle(0x14223a, 1);
    g.fillRoundedRect(sx - 16, centerY - 22, 32, 44, 6);
    g.fillStyle(0x445a8a, 1);
    g.fillRoundedRect(sx - 12, centerY - 18, 24, 36, 5);
    // LED ciano
    g.fillStyle(0x9ec4ff, 1);
    g.fillCircle(sx, centerY, 5);
    g.fillStyle(0xfff8c0, 1);
    g.fillCircle(sx, centerY, 2);
    // Rivets
    for (const off of [{ x: -8, y: -10 }, { x: 8, y: -10 }, { x: -8, y: 10 }, { x: 8, y: 10 }]) {
      g.fillStyle(0x9ec4ff, 0.85);
      g.fillCircle(sx + off.x, centerY + off.y, 1.6);
    }
  }

  // Lasers cromados (3 linhas horizontais)
  const startX = -w / 2 + 30;
  const endX = w / 2 - 30;
  for (let i = 0; i < 3; i++) {
    const ly = centerY - 14 + i * 14;
    // Glow
    g.fillStyle(0x4ecdc4, 0.65);
    g.fillRect(startX, ly - 3, endX - startX, 6);
    // Núcleo branco
    g.fillStyle(0xffffff, 1);
    g.fillRect(startX, ly - 1, endX - startX, 2);
    // Pontos elétricos
    g.fillStyle(0x9ec4ff, 1);
    for (let p = 0; p < 6; p++) {
      const px = startX + 8 + p * ((endX - startX - 16) / 5);
      g.fillRect(px, ly - 0.5, 2, 1);
    }
  }

  container.add(g);

  // Pulse no glow ambiente
  const glow = scene.add.graphics();
  glow.fillStyle(0x4ecdc4, 0.32);
  glow.fillRect(-w / 2 - 8, centerY - h / 2 - 6, w + 16, h + 12);
  container.add(glow);
  const pulse = scene.tweens.add({
    targets: glow,
    alpha: { from: 0.18, to: 0.42 },
    duration: 340,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [airHitbox(w, h, centerY), ceilingCurtainHitbox(w, centerY - h / 2)],
    triggerHitboxes: [],
    cleanup: () => pulse.stop()
  };
}

/* -------- high: iron_gate -------- */

function buildIronGate(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 90;
  const h = 240;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.5);
  g.fillEllipse(8, baseY - 2, w + 24, 12);

  // Estrutura externa (frame)
  g.fillStyle(0x14223a, 1);
  g.fillRoundedRect(-w / 2 - 4, topY - 4, w + 8, h + 4, 4);
  g.fillStyle(0x2a3a5a, 1);
  g.fillRoundedRect(-w / 2, topY, w, h, 3);

  // Painel central (gradient cromado)
  g.fillStyle(0x445a8a, 1);
  g.fillRect(-w / 2 + 6, topY + 6, w - 12, h - 12);
  g.fillStyle(0x6e8aaa, 1);
  g.fillRect(-w / 2 + 10, topY + 10, w - 20, h - 20);
  g.fillStyle(0x9ec4ff, 0.85);
  g.fillRect(-w / 2 + 14, topY + 12, 6, h - 22);

  // Vigas verticais (3 listras)
  g.fillStyle(0x14223a, 1);
  for (let i = 1; i < 4; i++) {
    const lx = -w / 2 + (i * w) / 4;
    g.fillRect(lx - 1, topY + 8, 2, h - 16);
  }

  // Rivets em cantos + meio
  const rivetSpots: Array<{ x: number; y: number }> = [];
  for (const sx of [-w / 2 + 6, w / 2 - 6]) {
    rivetSpots.push({ x: sx, y: topY + 14 });
    rivetSpots.push({ x: sx, y: topY + h / 4 });
    rivetSpots.push({ x: sx, y: topY + h / 2 });
    rivetSpots.push({ x: sx, y: topY + (3 * h) / 4 });
    rivetSpots.push({ x: sx, y: baseY - 14 });
  }
  for (const r of rivetSpots) {
    g.fillStyle(0x14223a, 1);
    g.fillCircle(r.x, r.y, 2.6);
    g.fillStyle(0x9ec4ff, 0.85);
    g.fillCircle(r.x - 0.5, r.y - 0.5, 1.2);
  }

  // Trinco central (lock)
  g.fillStyle(0x14223a, 1);
  g.fillCircle(0, topY + h / 2, 14);
  g.fillStyle(0xffd23f, 1);
  g.fillCircle(0, topY + h / 2, 9);
  g.fillStyle(0x14223a, 1);
  g.fillCircle(0, topY + h / 2, 4);
  g.fillRect(-1.5, topY + h / 2, 3, 8);

  // LED de status verde no topo
  g.fillStyle(0x14223a, 1);
  g.fillRect(-6, topY + 16, 12, 6);
  g.fillStyle(0x6bcb77, 1);
  g.fillCircle(0, topY + 19, 3);
  g.fillStyle(0xfff8c0, 1);
  g.fillCircle(-1, topY + 18, 1);

  container.add(g);

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: []
  };
}

/* -------- gap: portcullis -------- */

function buildPortcullis(
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

  // ==== TOPO: portão descendo ====
  g.fillStyle(0x14223a, 1);
  g.fillRect(-w / 2 - 4, 0, w + 8, topH);
  g.fillStyle(0x2a3a5a, 1);
  g.fillRect(-w / 2, 0, w, topH - 8);
  g.fillStyle(0x445a8a, 1);
  g.fillRect(-w / 2 + 4, 4, w - 8, topH - 16);

  // Grade (verticais)
  g.fillStyle(0x14223a, 1);
  for (let i = 0; i < 4; i++) {
    const lx = -w / 2 + 8 + i * ((w - 16) / 3);
    g.fillRect(lx, 8, 4, topH - 24);
  }
  // Pontas afiadas inferiores
  g.fillStyle(0x9ec4ff, 1);
  for (let i = 0; i < 4; i++) {
    const lx = -w / 2 + 10 + i * ((w - 16) / 3);
    g.beginPath();
    g.moveTo(lx - 4, topH - 8);
    g.lineTo(lx, topH + 6);
    g.lineTo(lx + 4, topH - 8);
    g.closePath();
    g.fillPath();
  }
  // Faixa horizontal LED
  g.fillStyle(0xff4040, 1);
  g.fillRect(-w / 2 + 6, topH - 14, w - 12, 3);

  // ==== FUNDO: barricada subindo ====
  g.fillStyle(0x14223a, 1);
  g.fillRect(-w / 2 - 4, botStart, w + 8, botH);
  g.fillStyle(0x2a3a5a, 1);
  g.fillRect(-w / 2, botStart + 8, w, botH - 8);
  g.fillStyle(0x445a8a, 1);
  g.fillRect(-w / 2 + 4, botStart + 12, w - 8, botH - 16);

  g.fillStyle(0x14223a, 1);
  for (let i = 0; i < 4; i++) {
    const lx = -w / 2 + 8 + i * ((w - 16) / 3);
    g.fillRect(lx, botStart + 16, 4, botH - 24);
  }
  g.fillStyle(0x9ec4ff, 1);
  for (let i = 0; i < 4; i++) {
    const lx = -w / 2 + 10 + i * ((w - 16) / 3);
    g.beginPath();
    g.moveTo(lx - 4, botStart + 8);
    g.lineTo(lx, botStart - 6);
    g.lineTo(lx + 4, botStart + 8);
    g.closePath();
    g.fillPath();
  }
  g.fillStyle(0xff4040, 1);
  g.fillRect(-w / 2 + 6, botStart + 11, w - 12, 3);

  container.add(g);

  // LED blink
  const blink = scene.tweens.add({
    targets: g,
    alpha: { from: 0.92, to: 1 },
    duration: 380,
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
    cleanup: () => blink.stop()
  };
}

/* -------- dynamic: spinning_blade -------- */

function buildSpinningBlade(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const baseY = 360;
  const moveAmp = 130;
  const moveFreq = 1.4 + Math.random() * 0.4;
  const movePhase = Math.random() * Math.PI * 2;

  const blade = scene.add.graphics();
  const r = 32;

  // Halo glow
  blade.fillStyle(0x9ec4ff, 0.32);
  blade.fillCircle(0, 0, r + 12);

  // Disco central (gradient cromado)
  blade.fillStyle(0x14223a, 1);
  blade.fillCircle(0, 0, r);
  blade.fillStyle(0x445a8a, 1);
  blade.fillCircle(0, 0, r - 4);
  blade.fillStyle(0x9ec4ff, 1);
  blade.fillCircle(0, 0, r - 12);
  blade.fillStyle(0xffffff, 0.85);
  blade.fillCircle(-3, -3, r - 18);

  // Dentes da serra (16 ao redor)
  blade.fillStyle(0xc4c8d8, 1);
  const teeth = 16;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const x1 = Math.cos(a) * r;
    const y1 = Math.sin(a) * r;
    const x2 = Math.cos(a + 0.1) * (r + 6);
    const y2 = Math.sin(a + 0.1) * (r + 6);
    const x3 = Math.cos(a + 0.2) * r;
    const y3 = Math.sin(a + 0.2) * r;
    blade.beginPath();
    blade.moveTo(x1, y1);
    blade.lineTo(x2, y2);
    blade.lineTo(x3, y3);
    blade.closePath();
    blade.fillPath();
  }

  // Hub central (parafuso)
  blade.fillStyle(0x14223a, 1);
  blade.fillCircle(0, 0, 8);
  blade.fillStyle(0x9ec4ff, 1);
  blade.fillCircle(0, 0, 5);
  blade.fillStyle(0x14223a, 1);
  blade.fillRect(-1, -5, 2, 10);
  blade.fillRect(-5, -1, 10, 2);

  // Sangue salpicado em alguns dentes
  blade.fillStyle(0xc94545, 0.85);
  for (let i = 0; i < 4; i++) {
    const a = ((i * 5) / teeth) * Math.PI * 2;
    blade.fillCircle(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4), 1.4);
  }

  blade.x = 0;
  blade.y = baseY;
  container.add(blade);

  // Rotation infinita
  const spin = scene.tweens.add({
    targets: blade,
    angle: 360,
    duration: 600,
    repeat: -1,
    ease: 'Linear'
  });

  const w = (r + 6) * 2;
  const h = (r + 6) * 2;
  const hitbox = { x: -w / 2, y: baseY - h / 2, w, h };

  return {
    hitboxes: [hitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const offset = Math.sin(t * moveFreq + movePhase) * moveAmp;
      blade.y = baseY + offset;
      hitbox.y = blade.y - h / 2;
    },
    cleanup: () => spin.stop()
  };
}

/* -------- registry -------- */

const CITADEL_TRAPS: TrapDef[] = [
  {
    id: 'citadel_floor_spikes',
    category: 'ground',
    biome: 'citadel',
    damageOnSlideOnly: true,
    build: buildFloorSpikes
  },
  {
    id: 'citadel_energy_grate',
    category: 'low',
    biome: 'citadel',
    build: buildEnergyGrate
  },
  {
    id: 'citadel_iron_gate',
    category: 'high',
    biome: 'citadel',
    build: buildIronGate
  },
  {
    id: 'citadel_portcullis',
    category: 'gap',
    biome: 'citadel',
    build: buildPortcullis
  },
  {
    id: 'citadel_spinning_blade',
    category: 'dynamic',
    biome: 'citadel',
    build: buildSpinningBlade
  }
];

export function registerCitadelTraps(): void {
  registerTraps(CITADEL_TRAPS);
  for (const t of CITADEL_TRAPS) {
    addToPalette('citadel', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
