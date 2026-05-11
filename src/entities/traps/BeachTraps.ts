/**
 * Armadilhas do bioma BEACH.
 *
 *  ground   crab_nest         Caranguejos com pinças snap. Brilho vermelho.
 *  low      umbrella_low      Sombrinha de praia listrada baixa.
 *  high     sandcastle        Castelo de areia gigante com torres.
 *  gap      net_gap           Rede de vôlei suspensa, gap pelo meio.
 *  dynamic  seagull_dive      Gaivota mergulhando em arco.
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

/* -------- ground: crab_nest -------- */

function buildCrabNest(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 200;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(0, baseY - 2, w + 12, 8);

  // Areia molhada (depressão)
  g.fillStyle(0x8a6230, 0.95);
  g.fillRoundedRect(-w / 2, baseY - 10, w, 10, 4);

  // 3 caranguejos posicionados
  const positions = [-w / 3, 0, w / 3];
  for (let i = 0; i < positions.length; i++) {
    const cx = positions[i];
    const cy = baseY - 16;
    const size = 14 + ((i * 3) % 4);

    // Sombra do corpo
    g.fillStyle(0x4a2010, 0.6);
    g.fillEllipse(cx, cy + 2, size + 4, 6);

    // Corpo (laranja-vermelho)
    g.fillStyle(0xc94545, 1);
    g.fillEllipse(cx, cy, size, size * 0.7);
    // Highlight
    g.fillStyle(0xff8a3a, 0.95);
    g.fillEllipse(cx - 2, cy - 2, size * 0.7, size * 0.4);

    // Olhinhos sobre talos
    g.lineStyle(2, 0x4a2010, 1);
    g.beginPath();
    g.moveTo(cx - 4, cy - 4);
    g.lineTo(cx - 6, cy - 9);
    g.moveTo(cx + 4, cy - 4);
    g.lineTo(cx + 6, cy - 9);
    g.strokePath();
    g.fillStyle(0x14080a, 1);
    g.fillCircle(cx - 6, cy - 11, 1.6);
    g.fillCircle(cx + 6, cy - 11, 1.6);
    g.fillStyle(0xfff8c0, 1);
    g.fillCircle(cx - 6.5, cy - 11.5, 0.6);
    g.fillCircle(cx + 5.5, cy - 11.5, 0.6);

    // Pinças (laterais — abertas/agressivas)
    g.fillStyle(0xff4040, 1);
    // Pinça esquerda
    g.fillEllipse(cx - size, cy + 2, 8, 6);
    g.beginPath();
    g.moveTo(cx - size - 6, cy);
    g.lineTo(cx - size - 4, cy + 4);
    g.lineTo(cx - size - 10, cy + 4);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(cx - size - 6, cy + 4);
    g.lineTo(cx - size - 4, cy);
    g.lineTo(cx - size - 10, cy);
    g.closePath();
    g.fillPath();
    // Pinça direita
    g.fillEllipse(cx + size, cy + 2, 8, 6);
    g.beginPath();
    g.moveTo(cx + size + 6, cy);
    g.lineTo(cx + size + 4, cy + 4);
    g.lineTo(cx + size + 10, cy + 4);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(cx + size + 6, cy + 4);
    g.lineTo(cx + size + 4, cy);
    g.lineTo(cx + size + 10, cy);
    g.closePath();
    g.fillPath();

    // Pernas
    g.lineStyle(2, 0xc94545, 1);
    for (let leg = 0; leg < 3; leg++) {
      const lx = cx - size + 6 + leg * (size * 0.6);
      g.beginPath();
      g.moveTo(lx, cy + size * 0.3);
      g.lineTo(lx - 3 + leg, cy + size * 0.7);
      g.strokePath();
    }
  }

  container.add(g);

  // Pinças "snap" pulsa em escala (alerta)
  const pinchPulse = scene.tweens.add({
    targets: g,
    scaleY: { from: 1, to: 1.05 },
    duration: 280,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [groundHitbox(w - 14)],
    triggerHitboxes: [],
    cleanup: () => pinchPulse.stop()
  };
}

/* -------- low: umbrella_low -------- */

function buildUmbrellaLow(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 240;
  const h = 80;
  const centerY = 240;

  const g = scene.add.graphics();

  // Mastro vertical (cuspe de areia/madeira)
  g.fillStyle(0x6a4830, 1);
  g.fillRect(-3, centerY - 30, 6, 80);
  g.fillStyle(0x8a6240, 1);
  g.fillRect(-2, centerY - 30, 2, 80);

  // Sombrinha (gomos vermelho/branco)
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const a1 = Math.PI + (i / segments) * Math.PI;
    const a2 = Math.PI + ((i + 1) / segments) * Math.PI;
    const r = w / 2;
    const color = i % 2 === 0 ? 0xff4040 : 0xfff8c0;
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, centerY - 30);
    g.lineTo(Math.cos(a1) * r, centerY - 30 + Math.sin(a1) * 50);
    g.lineTo(Math.cos(a2) * r, centerY - 30 + Math.sin(a2) * 50);
    g.closePath();
    g.fillPath();
  }

  // Sombras radiais
  g.lineStyle(1.5, 0x6a1010, 0.6);
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI + (i / segments) * Math.PI;
    const r = w / 2;
    g.beginPath();
    g.moveTo(0, centerY - 30);
    g.lineTo(Math.cos(a) * r, centerY - 30 + Math.sin(a) * 50);
    g.strokePath();
  }

  // Borda inferior dentada (perigosa)
  g.fillStyle(0x6a1010, 1);
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI + (i / segments) * Math.PI;
    const r = w / 2;
    const px = Math.cos(a) * r;
    const py = centerY - 30 + Math.sin(a) * 50;
    g.beginPath();
    g.moveTo(px - 3, py - 2);
    g.lineTo(px, py + 6);
    g.lineTo(px + 3, py - 2);
    g.closePath();
    g.fillPath();
  }

  // Topo decorativo (esfera)
  g.fillStyle(0xfff8c0, 1);
  g.fillCircle(0, centerY - 38, 4);

  container.add(g);

  return {
    hitboxes: [airHitbox(w, h, centerY), ceilingCurtainHitbox(w, centerY - h / 2)],
    triggerHitboxes: []
  };
}

/* -------- high: sandcastle -------- */

function buildSandcastle(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 100;
  const h = 220;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(8, baseY - 2, w + 22, 12);

  // Base larga (muralha)
  g.fillStyle(0xa07a3a, 1);
  g.fillRect(-w / 2, baseY - h * 0.55, w, h * 0.55);
  g.fillStyle(0xc8a050, 1);
  g.fillRect(-w / 2 + 4, baseY - h * 0.55 + 4, w - 8, h * 0.55 - 8);

  // Mestre (torre central)
  g.fillStyle(0xa07a3a, 1);
  g.fillRect(-22, topY + 30, 44, h * 0.65);
  g.fillStyle(0xc8a050, 1);
  g.fillRect(-18, topY + 34, 36, h * 0.65 - 8);

  // Torre cônica do topo
  g.fillStyle(0xa07a3a, 1);
  g.beginPath();
  g.moveTo(-22, topY + 30);
  g.lineTo(0, topY - 8);
  g.lineTo(22, topY + 30);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xc8a050, 1);
  g.beginPath();
  g.moveTo(-16, topY + 34);
  g.lineTo(0, topY);
  g.lineTo(16, topY + 34);
  g.closePath();
  g.fillPath();

  // Mastro com bandeira azul
  g.lineStyle(2, 0x6a4830, 1);
  g.beginPath();
  g.moveTo(0, topY - 8);
  g.lineTo(0, topY - 28);
  g.strokePath();
  g.fillStyle(0x4ecdc4, 1);
  g.beginPath();
  g.moveTo(0, topY - 28);
  g.lineTo(14, topY - 24);
  g.lineTo(0, topY - 18);
  g.closePath();
  g.fillPath();

  // Janelas (4 quadradinhos escuros)
  g.fillStyle(0x4a3210, 1);
  for (let i = 0; i < 4; i++) {
    const wy = topY + 60 + i * 30;
    g.fillRect(-6, wy, 12, 14);
    g.fillStyle(0x14080a, 1);
    g.fillRect(-4, wy + 2, 8, 10);
    g.fillStyle(0xfff8c0, 0.6);
    g.fillRect(-3, wy + 3, 3, 4);
    g.fillStyle(0x4a3210, 1);
  }

  // Ameias na base (entalhes)
  g.fillStyle(0xa07a3a, 1);
  for (let i = 0; i < 5; i++) {
    const ax = -w / 2 + i * (w / 4);
    g.fillRect(ax, baseY - h * 0.55 - 8, 14, 8);
  }

  // Conchas decorativas (3 espalhadas)
  g.fillStyle(0xff8aa8, 0.9);
  for (const sh of [{ x: -32, y: baseY - 14 }, { x: 30, y: baseY - 10 }, { x: -16, y: baseY - 24 }]) {
    g.beginPath();
    g.arc(sh.x, sh.y, 5, Math.PI, 0);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x6a1010, 0.6);
    g.beginPath();
    g.moveTo(sh.x - 4, sh.y);
    g.lineTo(sh.x, sh.y - 4);
    g.moveTo(sh.x, sh.y);
    g.lineTo(sh.x, sh.y - 4);
    g.moveTo(sh.x + 4, sh.y);
    g.lineTo(sh.x, sh.y - 4);
    g.strokePath();
  }

  // Textura granulada (areia)
  g.fillStyle(0x6a4830, 0.5);
  for (let i = 0; i < 20; i++) {
    const px = ((i * 31) % w) - w / 2;
    const py = topY + ((i * 47) % h);
    g.fillRect(px, py, 1, 1);
  }

  container.add(g);

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: []
  };
}

/* -------- gap: net_gap -------- */

function buildNetGap(
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

  // ==== TOPO: ponta de mastro + rede pendurada ====
  g.fillStyle(0x6a4830, 1);
  g.fillRect(-w / 2, 0, w, topH);
  g.fillStyle(0x8a6240, 1);
  g.fillRect(-w / 2 + 4, 4, w - 8, topH - 8);

  // Rede listrada (azul/branco)
  g.fillStyle(0x4ecdc4, 1);
  g.fillRect(-w / 2 + 6, topH - 18, w - 12, 4);
  g.fillStyle(0xfff8c0, 1);
  g.fillRect(-w / 2 + 6, topH - 14, w - 12, 4);
  g.fillStyle(0x4ecdc4, 1);
  g.fillRect(-w / 2 + 6, topH - 10, w - 12, 4);

  // Borda inferior arpoada (perigo!)
  g.fillStyle(0xc94545, 1);
  for (let i = 0; i < 6; i++) {
    const sx = -w / 2 + 12 + i * ((w - 24) / 5);
    g.beginPath();
    g.moveTo(sx - 4, topH);
    g.lineTo(sx, topH + 8);
    g.lineTo(sx + 4, topH);
    g.closePath();
    g.fillPath();
  }

  // ==== FUNDO: ponta de mastro espelhada ====
  g.fillStyle(0x6a4830, 1);
  g.fillRect(-w / 2, botStart, w, botH);
  g.fillStyle(0x8a6240, 1);
  g.fillRect(-w / 2 + 4, botStart + 4, w - 8, botH - 8);

  g.fillStyle(0x4ecdc4, 1);
  g.fillRect(-w / 2 + 6, botStart + 10, w - 12, 4);
  g.fillStyle(0xfff8c0, 1);
  g.fillRect(-w / 2 + 6, botStart + 14, w - 12, 4);
  g.fillStyle(0x4ecdc4, 1);
  g.fillRect(-w / 2 + 6, botStart + 18, w - 12, 4);

  // Borda superior espinhada
  g.fillStyle(0xc94545, 1);
  for (let i = 0; i < 6; i++) {
    const sx = -w / 2 + 12 + i * ((w - 24) / 5);
    g.beginPath();
    g.moveTo(sx - 4, botStart);
    g.lineTo(sx, botStart - 8);
    g.lineTo(sx + 4, botStart);
    g.closePath();
    g.fillPath();
  }

  container.add(g);

  return {
    hitboxes: [
      { x: -w / 2, y: 0, w, h: topH },
      { x: -w / 2, y: botStart, w, h: botH }
    ],
    triggerHitboxes: []
  };
}

/* -------- dynamic: seagull_dive -------- */

function buildSeagullDive(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const baseY = 360;
  const moveAmp = 140;
  const moveFreq = 1.5 + Math.random() * 0.4;
  const movePhase = Math.random() * Math.PI * 2;

  const bird = scene.add.graphics();

  // Sombra (pequena bola escura no chão)
  // (não desenhada — gaivota voa)

  // Corpo branco
  bird.fillStyle(0xfff8c0, 1);
  bird.fillEllipse(0, 0, 36, 22);
  // Ventre
  bird.fillStyle(0xffffff, 1);
  bird.fillEllipse(0, 4, 28, 14);

  // Cabeça
  bird.fillStyle(0xfff8c0, 1);
  bird.fillCircle(-16, -2, 9);
  // Olho preto agressivo
  bird.fillStyle(0xffd23f, 1);
  bird.fillCircle(-18, -4, 3);
  bird.fillStyle(0x14080a, 1);
  bird.fillCircle(-18, -4, 1.6);

  // Bico amarelo afiado
  bird.fillStyle(0xff8a3a, 1);
  bird.beginPath();
  bird.moveTo(-23, -2);
  bird.lineTo(-32, 0);
  bird.lineTo(-23, 2);
  bird.closePath();
  bird.fillPath();

  // Asas (extendidas — diving)
  bird.fillStyle(0x6a6a74, 1);
  bird.beginPath();
  bird.moveTo(-4, -8);
  bird.lineTo(20, -22);
  bird.lineTo(28, -10);
  bird.lineTo(8, -2);
  bird.closePath();
  bird.fillPath();
  bird.fillStyle(0x4a4a52, 1);
  bird.beginPath();
  bird.moveTo(-4, 8);
  bird.lineTo(20, 22);
  bird.lineTo(28, 10);
  bird.lineTo(8, 2);
  bird.closePath();
  bird.fillPath();

  // Pés laranja
  bird.fillStyle(0xff8a3a, 1);
  bird.fillRect(2, 10, 2, 8);
  bird.fillRect(8, 10, 2, 8);

  bird.x = 0;
  bird.y = baseY;
  container.add(bird);

  const w = 60;
  const h = 40;
  const hitbox = { x: -w / 2, y: baseY - h / 2, w, h };

  return {
    hitboxes: [hitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const offset = Math.sin(t * moveFreq + movePhase) * moveAmp;
      bird.y = baseY + offset;
      // Tilt baseado na velocidade vertical
      bird.rotation = Math.cos(t * moveFreq + movePhase) * moveFreq * 0.16;
      hitbox.y = bird.y - h / 2;
    }
  };
}

/* -------- registry -------- */

const BEACH_TRAPS: TrapDef[] = [
  {
    id: 'beach_crab_nest',
    category: 'ground',
    biome: 'beach',
    damageOnSlideOnly: true,
    build: buildCrabNest
  },
  {
    id: 'beach_umbrella_low',
    category: 'low',
    biome: 'beach',
    build: buildUmbrellaLow
  },
  {
    id: 'beach_sandcastle',
    category: 'high',
    biome: 'beach',
    build: buildSandcastle
  },
  {
    id: 'beach_net_gap',
    category: 'gap',
    biome: 'beach',
    build: buildNetGap
  },
  {
    id: 'beach_seagull_dive',
    category: 'dynamic',
    biome: 'beach',
    build: buildSeagullDive
  }
];

export function registerBeachTraps(): void {
  registerTraps(BEACH_TRAPS);
  for (const t of BEACH_TRAPS) {
    addToPalette('beach', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
