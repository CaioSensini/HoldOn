/**
 * Armadilhas do bioma TEMPLE.
 *
 *  ground   flame_jet         Jato de fogo saindo de grade dourada. Crucial:
 *                              hitbox curto + flag damageOnSlideOnly true.
 *  low      golden_blade      Lâmina horizontal dourada (laser-saw).
 *  high     temple_pillar     Coluna grega dourada com glifos.
 *  gap      door_gap          Porta de pedra meio fechada (gap central).
 *  dynamic  swing_axe         Machado pendular gigante.
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

/* -------- ground: flame_jet -------- */

function buildFlameJet(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 180;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.4);
  g.fillEllipse(0, baseY - 2, w + 14, 8);

  // Grade dourada cravada no chão
  g.fillStyle(0x6a4a14, 1);
  g.fillRoundedRect(-w / 2, baseY - 16, w, 16, 5);
  g.fillStyle(0xffd23f, 1);
  g.fillRoundedRect(-w / 2 + 4, baseY - 14, w - 8, 4, 2);
  // Buracos da grade (3 jatos)
  for (let i = 0; i < 3; i++) {
    const cx = -w / 2 + (i + 0.5) * (w / 3);
    g.fillStyle(0x14080a, 1);
    g.fillEllipse(cx, baseY - 9, 18, 6);
    g.fillStyle(0xffd23f, 0.6);
    g.fillEllipse(cx, baseY - 9, 14, 4);
  }

  // === CHAMAS ===
  // Cada chama é desenhada como triângulos sobrepostos (vermelho → laranja → amarelo → branco)
  const flames = scene.add.graphics();
  const flamePositions = [-w / 3, 0, w / 3];

  function drawFlames(this: void, scaleY: number): void {
    flames.clear();
    for (const fx of flamePositions) {
      const baseFlameY = baseY - 12;
      const flameH = 70 * scaleY;

      // Camada externa vermelha
      flames.fillStyle(0xff4020, 0.95);
      flames.beginPath();
      flames.moveTo(fx - 14, baseFlameY);
      flames.lineTo(fx - 4, baseFlameY - flameH * 0.7);
      flames.lineTo(fx, baseFlameY - flameH);
      flames.lineTo(fx + 4, baseFlameY - flameH * 0.7);
      flames.lineTo(fx + 14, baseFlameY);
      flames.closePath();
      flames.fillPath();

      // Laranja
      flames.fillStyle(0xff8a3a, 0.9);
      flames.beginPath();
      flames.moveTo(fx - 10, baseFlameY);
      flames.lineTo(fx - 2, baseFlameY - flameH * 0.55);
      flames.lineTo(fx, baseFlameY - flameH * 0.85);
      flames.lineTo(fx + 2, baseFlameY - flameH * 0.55);
      flames.lineTo(fx + 10, baseFlameY);
      flames.closePath();
      flames.fillPath();

      // Amarelo
      flames.fillStyle(0xffd23f, 1);
      flames.beginPath();
      flames.moveTo(fx - 6, baseFlameY);
      flames.lineTo(fx, baseFlameY - flameH * 0.55);
      flames.lineTo(fx + 6, baseFlameY);
      flames.closePath();
      flames.fillPath();

      // Centro branco-quente
      flames.fillStyle(0xffffff, 0.85);
      flames.beginPath();
      flames.moveTo(fx - 2, baseFlameY);
      flames.lineTo(fx, baseFlameY - flameH * 0.4);
      flames.lineTo(fx + 2, baseFlameY);
      flames.closePath();
      flames.fillPath();
    }
  }
  drawFlames(1);
  container.add([g, flames]);

  // Animação: chamas pulsam de tamanho continuamente (vivo)
  const flickerData = { scaleY: 1 };
  const flicker = scene.tweens.add({
    targets: flickerData,
    scaleY: { from: 0.78, to: 1.12 },
    duration: 220,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    onUpdate: () => drawFlames(flickerData.scaleY)
  });

  return {
    hitboxes: [groundHitbox(w - 16)],
    triggerHitboxes: [],
    cleanup: () => flicker.stop()
  };
}

/* -------- low: golden_blade -------- */

function buildGoldenBlade(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 240;
  const h = 50;
  const centerY = 248;

  const g = scene.add.graphics();

  // Glow ambiente dourado
  g.fillStyle(0xffd23f, 0.32);
  g.fillRect(-w / 2 - 8, centerY - h / 2 - 8, w + 16, h + 16);

  // Mancais nas pontas (estilo grego)
  for (const sx of [-w / 2 + 16, w / 2 - 16]) {
    g.fillStyle(0x6a4a14, 1);
    g.fillRoundedRect(sx - 14, centerY - 18, 28, 36, 6);
    g.fillStyle(0xa07a3a, 1);
    g.fillRoundedRect(sx - 11, centerY - 14, 22, 28, 5);
    // LED dourado
    g.fillStyle(0xfff8c0, 1);
    g.fillCircle(sx, centerY, 4);
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(sx, centerY, 6);
    g.fillStyle(0xfff8c0, 1);
    g.fillCircle(sx, centerY, 2);
  }

  // Lâmina principal — gradient dourado afiado
  const bladeStartX = -w / 2 + 30;
  const bladeEndX = w / 2 - 30;
  const bladeW = bladeEndX - bladeStartX;
  g.fillStyle(0x8a6520, 1);
  g.fillRoundedRect(bladeStartX, centerY - 18, bladeW, 36, 4);
  g.fillStyle(0xffd23f, 1);
  g.fillRoundedRect(bladeStartX + 2, centerY - 16, bladeW - 4, 32, 3);
  g.fillStyle(0xfff8c0, 1);
  g.fillRoundedRect(bladeStartX + 4, centerY - 14, bladeW - 8, 8, 2);

  // Dentes na borda inferior (aríete)
  g.fillStyle(0x6a4a14, 1);
  const teeth = 18;
  for (let i = 0; i < teeth; i++) {
    const tx = bladeStartX + 4 + (i + 0.5) * ((bladeW - 8) / teeth);
    g.beginPath();
    g.moveTo(tx - 3, centerY + 10);
    g.lineTo(tx, centerY + 18);
    g.lineTo(tx + 3, centerY + 10);
    g.closePath();
    g.fillPath();
  }

  // Glifos egípcios em runas dourado-luz
  g.fillStyle(0xfff8c0, 0.95);
  for (let i = 0; i < 5; i++) {
    const gx = bladeStartX + 18 + i * ((bladeW - 36) / 4);
    g.fillRect(gx - 4, centerY - 4, 8, 1.5);
    g.fillRect(gx - 2, centerY - 6, 4, 4);
  }

  container.add(g);

  // Pulse no glow
  const glow = scene.add.graphics();
  glow.fillStyle(0xffd23f, 0.32);
  glow.fillRect(-w / 2 - 8, centerY - h / 2 - 8, w + 16, h + 16);
  container.add(glow);
  const pulse = scene.tweens.add({
    targets: glow,
    alpha: { from: 0.18, to: 0.42 },
    duration: 320,
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

/* -------- high: temple_pillar -------- */

function buildTemplePillar(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 84;
  const h = 230;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(8, baseY - 2, w + 26, 12);

  // Capitel (topo decorado)
  g.fillStyle(0x6a4a14, 1);
  g.fillRoundedRect(-w / 2 - 6, topY - 4, w + 12, 24, 4);
  g.fillStyle(0xa07a3a, 1);
  g.fillRoundedRect(-w / 2 - 3, topY - 1, w + 6, 18, 3);
  g.fillStyle(0xffd23f, 0.85);
  g.fillRect(-w / 2, topY + 6, w, 4);

  // Volutas (espirais decorativas no capitel)
  g.fillStyle(0x6a4a14, 1);
  g.fillCircle(-w / 2, topY + 8, 5);
  g.fillCircle(w / 2, topY + 8, 5);
  g.fillStyle(0xa07a3a, 1);
  g.fillCircle(-w / 2, topY + 8, 3);
  g.fillCircle(w / 2, topY + 8, 3);

  // Coluna principal (gradient lateral)
  g.fillStyle(0x6a4a14, 1);
  g.fillRect(-w / 2 + 4, topY + 22, w - 8, h - 32);
  g.fillStyle(0xa07a3a, 1);
  g.fillRect(-w / 2 + 8, topY + 24, w - 16, h - 36);
  g.fillStyle(0xc89a4a, 1);
  g.fillRect(-w / 2 + 12, topY + 26, 6, h - 40);

  // Ranhuras verticais (caneluras)
  g.lineStyle(2, 0x4a3210, 0.85);
  for (let i = 1; i < 5; i++) {
    const lx = -w / 2 + 8 + (i * (w - 16)) / 5;
    g.beginPath();
    g.moveTo(lx, topY + 26);
    g.lineTo(lx, baseY - 16);
    g.strokePath();
  }

  // Glifos egípcios brilhantes (3 painéis)
  g.fillStyle(0xfff8c0, 0.92);
  for (let p = 0; p < 3; p++) {
    const py = topY + 50 + p * 60;
    // Mini-grid de runas
    g.fillRect(-12, py, 24, 2);
    g.fillRect(-4, py + 4, 8, 8);
    g.fillRect(-8, py + 14, 16, 2);
  }

  // Halos atrás dos glifos
  g.fillStyle(0xffd23f, 0.32);
  for (let p = 0; p < 3; p++) {
    const py = topY + 56 + p * 60;
    g.fillCircle(0, py, 14);
  }

  // Base
  g.fillStyle(0x6a4a14, 1);
  g.fillRoundedRect(-w / 2 - 6, baseY - 16, w + 12, 16, 3);
  g.fillStyle(0xa07a3a, 1);
  g.fillRoundedRect(-w / 2 - 3, baseY - 13, w + 6, 10, 2);

  container.add(g);

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: []
  };
}

/* -------- gap: door_gap -------- */

function buildDoorGap(
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

  // ==== Porta superior (descendo) ====
  g.fillStyle(0x4a3210, 1);
  g.fillRect(-w / 2, 0, w, topH);
  g.fillStyle(0x6a4a14, 1);
  g.fillRect(-w / 2 + 4, 4, w - 8, topH - 8);
  // Painéis
  g.lineStyle(2, 0x2a1a08, 0.9);
  for (let p = 0; p < 2; p++) {
    g.strokeRect(-w / 2 + 12, 12 + p * (topH / 2), w - 24, topH / 2 - 16);
  }
  // Glifo central no painel
  g.fillStyle(0xffd23f, 0.95);
  g.fillCircle(0, topH / 2, 12);
  g.fillStyle(0xfff8c0, 1);
  g.fillCircle(0, topH / 2, 6);

  // Borda inferior afiada (lâmina da porta)
  g.fillStyle(0xffd23f, 1);
  g.fillRect(-w / 2 + 2, topH - 4, w - 4, 4);
  g.fillStyle(0x8a6520, 1);
  for (let i = 0; i < 8; i++) {
    const tx = -w / 2 + 6 + (i + 0.5) * ((w - 12) / 8);
    g.beginPath();
    g.moveTo(tx - 4, topH);
    g.lineTo(tx, topH + 6);
    g.lineTo(tx + 4, topH);
    g.closePath();
    g.fillPath();
  }

  // ==== Porta inferior (subindo) ====
  g.fillStyle(0x4a3210, 1);
  g.fillRect(-w / 2, botStart, w, botH);
  g.fillStyle(0x6a4a14, 1);
  g.fillRect(-w / 2 + 4, botStart + 4, w - 8, botH - 8);
  for (let p = 0; p < 2; p++) {
    g.lineStyle(2, 0x2a1a08, 0.9);
    g.strokeRect(-w / 2 + 12, botStart + 12 + p * (botH / 2), w - 24, botH / 2 - 16);
  }
  g.fillStyle(0xffd23f, 0.95);
  g.fillCircle(0, botStart + botH / 2, 12);
  g.fillStyle(0xfff8c0, 1);
  g.fillCircle(0, botStart + botH / 2, 6);

  // Borda superior afiada
  g.fillStyle(0xffd23f, 1);
  g.fillRect(-w / 2 + 2, botStart, w - 4, 4);
  g.fillStyle(0x8a6520, 1);
  for (let i = 0; i < 8; i++) {
    const tx = -w / 2 + 6 + (i + 0.5) * ((w - 12) / 8);
    g.beginPath();
    g.moveTo(tx - 4, botStart);
    g.lineTo(tx, botStart - 6);
    g.lineTo(tx + 4, botStart);
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

/* -------- dynamic: swing_axe -------- */

function buildSwingAxe(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const ropeAttachY = 110;
  const ropeLen = 240;
  const swingAmp = 1.05;
  const swingFreq = 1.3 + Math.random() * 0.4;
  const swingPhase = Math.random() * Math.PI * 2;

  const pivot = scene.add.container(0, ropeAttachY);

  // Corrente (segments)
  const chain = scene.add.graphics();
  chain.fillStyle(0x4a4250, 1);
  for (let i = 0; i < 14; i++) {
    chain.fillCircle(0, (i + 0.5) * (ropeLen / 14), 4);
  }
  chain.lineStyle(2, 0x2a2230, 1);
  chain.beginPath();
  chain.moveTo(0, 0);
  chain.lineTo(0, ropeLen);
  chain.strokePath();
  pivot.add(chain);

  // Cabeça do machado
  const axeY = ropeLen + 10;
  const axe = scene.add.graphics();
  // Halo dourado
  axe.fillStyle(0xffd23f, 0.18);
  axe.fillCircle(0, axeY, 60);

  // Cabo central
  axe.fillStyle(0x4a3210, 1);
  axe.fillRoundedRect(-4, axeY - 30, 8, 60, 3);

  // Lâmina esquerda
  axe.fillStyle(0xa07a3a, 1);
  axe.beginPath();
  axe.moveTo(-4, axeY - 18);
  axe.lineTo(-50, axeY + 6);
  axe.lineTo(-4, axeY + 18);
  axe.closePath();
  axe.fillPath();
  axe.fillStyle(0xffd23f, 1);
  axe.beginPath();
  axe.moveTo(-4, axeY - 12);
  axe.lineTo(-44, axeY + 6);
  axe.lineTo(-4, axeY + 12);
  axe.closePath();
  axe.fillPath();
  // Borda afiada (linha branca)
  axe.lineStyle(2, 0xfff8c0, 1);
  axe.beginPath();
  axe.moveTo(-4, axeY - 14);
  axe.lineTo(-46, axeY + 6);
  axe.lineTo(-4, axeY + 14);
  axe.strokePath();

  // Lâmina direita (espelho)
  axe.fillStyle(0xa07a3a, 1);
  axe.beginPath();
  axe.moveTo(4, axeY - 18);
  axe.lineTo(50, axeY + 6);
  axe.lineTo(4, axeY + 18);
  axe.closePath();
  axe.fillPath();
  axe.fillStyle(0xffd23f, 1);
  axe.beginPath();
  axe.moveTo(4, axeY - 12);
  axe.lineTo(44, axeY + 6);
  axe.lineTo(4, axeY + 12);
  axe.closePath();
  axe.fillPath();
  axe.lineStyle(2, 0xfff8c0, 1);
  axe.beginPath();
  axe.moveTo(4, axeY - 14);
  axe.lineTo(46, axeY + 6);
  axe.lineTo(4, axeY + 14);
  axe.strokePath();

  // Joia central
  axe.fillStyle(0xff4040, 1);
  axe.fillCircle(0, axeY + 6, 4);
  axe.fillStyle(0xffaaaa, 0.95);
  axe.fillCircle(0, axeY + 6, 2);

  pivot.add(axe);
  container.add(pivot);

  const hitbox = { x: -50, y: ropeAttachY + axeY - 18, w: 100, h: 36 };

  return {
    hitboxes: [hitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const angle = Math.sin(t * swingFreq + swingPhase) * swingAmp;
      pivot.rotation = angle;
      const cx = Math.sin(angle) * axeY;
      const cy = ropeAttachY + Math.cos(angle) * axeY;
      hitbox.x = cx - 50;
      hitbox.y = cy - 18;
    }
  };
}

/* -------- registry -------- */

const TEMPLE_TRAPS: TrapDef[] = [
  {
    id: 'temple_flame_jet',
    category: 'ground',
    biome: 'temple',
    damageOnSlideOnly: true,
    build: buildFlameJet
  },
  {
    id: 'temple_golden_blade',
    category: 'low',
    biome: 'temple',
    build: buildGoldenBlade
  },
  {
    id: 'temple_pillar',
    category: 'high',
    biome: 'temple',
    build: buildTemplePillar
  },
  {
    id: 'temple_door_gap',
    category: 'gap',
    biome: 'temple',
    build: buildDoorGap
  },
  {
    id: 'temple_swing_axe',
    category: 'dynamic',
    biome: 'temple',
    build: buildSwingAxe
  }
];

export function registerTempleTraps(): void {
  registerTraps(TEMPLE_TRAPS);
  for (const t of TEMPLE_TRAPS) {
    addToPalette('temple', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
