/**
 * Armadilhas com mecânica especial (não puramente de colisão):
 *  - bonus_hole   Cano horizontal no chão. Player desliza por dentro pra
 *                 entrar no atalho subterrâneo (cave bonus tunnel).
 *  - pipe_exit    Buraco no teto da cave + parede bloqueante. Player precisa
 *                 subir 100% pelo buraco pra escapar; se não, bate na parede.
 *  - ceiling_hole Mesma mecânica do pipe_exit, mas na superfície (gate
 *                 Citadel→Space). Único uso, no fim do Citadel.
 *  - breakable    Cristal smashable pelo Rocket. Só quebra com boost ativo.
 *
 * Visuais bespoke (Graphics direto) — sem tint biome temático.
 */

import type Phaser from 'phaser';
import { WORLD } from '../../config';
import {
  type TrapBuildOptions,
  type TrapDef,
  type TrapInstance,
  registerTraps
} from '../../data/TrapDefs';

const PLAYER_W = 56;

/* ============================ BONUS_HOLE ============================ */

function buildBonusHole(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const pipeW = 220;
  const pipeH = 80;
  const pipeCenterY = WORLD.ROAD_TOP_Y + 22;
  const pipeTopY = pipeCenterY - pipeH / 2;
  const pipeBotY = pipeCenterY + pipeH / 2;
  const r = pipeH / 2;

  const g = scene.add.graphics();

  // Sombra projetada
  g.fillStyle(0x000000, 0.42);
  g.fillEllipse(8, pipeBotY + 4, pipeW + 32, 14);

  // Corpo cilíndrico
  g.fillStyle(0x2e2e36, 1);
  g.fillRoundedRect(-pipeW / 2, pipeTopY, pipeW, pipeH, r);

  // Highlight superior
  g.fillStyle(0x6a6a74, 1);
  g.fillRoundedRect(-pipeW / 2 + 2, pipeTopY + 4, pipeW - 4, pipeH * 0.34, r * 0.7);
  g.fillStyle(0x9ea0a8, 0.7);
  g.fillRoundedRect(-pipeW / 2 + 8, pipeTopY + 8, pipeW - 16, pipeH * 0.16, 5);

  // Sombra inferior
  g.fillStyle(0x14141a, 0.7);
  g.fillRoundedRect(-pipeW / 2 + 2, pipeTopY + pipeH * 0.66, pipeW - 4, pipeH * 0.32, r * 0.7);

  // Junções entre segmentos
  g.lineStyle(2, 0x14141a, 0.85);
  for (let i = 1; i <= 4; i++) {
    const lx = -pipeW / 2 + (i * pipeW) / 5;
    g.beginPath();
    g.moveTo(lx, pipeTopY + 6);
    g.lineTo(lx, pipeBotY - 6);
    g.strokePath();
  }

  // Rivets
  const rivets = [
    { x: -pipeW / 2 + 14, y: pipeTopY + 12 },
    { x: pipeW / 2 - 14, y: pipeTopY + 12 },
    { x: -pipeW / 2 + 14, y: pipeBotY - 12 },
    { x: pipeW / 2 - 14, y: pipeBotY - 12 }
  ];
  for (const rv of rivets) {
    g.fillStyle(0x14141a, 1);
    g.fillCircle(rv.x, rv.y, 3);
    g.fillStyle(0x9ea0a8, 0.85);
    g.fillCircle(rv.x - 0.6, rv.y - 0.6, 1.4);
  }

  // Abertura à esquerda (entrada)
  const openX = -pipeW / 2 + 14;
  const openW = 30;
  const openH = pipeH - 18;
  g.fillStyle(0x14141a, 1);
  g.fillEllipse(openX, pipeCenterY, openW + 6, openH + 6);
  g.fillStyle(0x000000, 1);
  g.fillEllipse(openX - 1, pipeCenterY, openW, openH);
  g.lineStyle(2.5, 0x9ea0a8, 0.55);
  g.beginPath();
  g.arc(openX, pipeCenterY, openW / 2, Math.PI * 1.15, Math.PI * 1.85, false);
  g.strokePath();
  g.fillStyle(0x4a4a52, 0.45);
  g.fillEllipse(openX - 2, pipeCenterY - openH * 0.18, openW * 0.55, openH * 0.32);

  container.add(g);

  // Setas piscantes guiando entrada
  const arrows = scene.add.graphics();
  arrows.fillStyle(0xffd166, 0.95);
  for (let i = 0; i < 3; i++) {
    const ax = pipeW / 2 - 36 - i * 28;
    arrows.beginPath();
    arrows.moveTo(ax + 6, pipeCenterY - 9);
    arrows.lineTo(ax - 8, pipeCenterY);
    arrows.lineTo(ax + 6, pipeCenterY + 9);
    arrows.lineTo(ax + 6, pipeCenterY + 4);
    arrows.lineTo(ax + 16, pipeCenterY + 4);
    arrows.lineTo(ax + 16, pipeCenterY - 4);
    arrows.lineTo(ax + 6, pipeCenterY - 4);
    arrows.closePath();
    arrows.fillPath();
  }
  container.add(arrows);
  scene.tweens.add({
    targets: arrows,
    alpha: { from: 0.35, to: 0.95 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [],
    triggerHitboxes: [{
      x: -pipeW / 2 + 4,
      y: pipeTopY + 8,
      w: pipeW - 8,
      h: pipeH - 16
    }],
    cleanup: () => {
      scene.tweens.killTweensOf(arrows);
    }
  };
}

/* ============================ PIPE_EXIT ============================= */

function buildPipeExit(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const triggerW = 220;
  const ceilingY = WORLD.SUBTERRANEAN_TOP_Y;

  const g = scene.add.graphics();

  // Halos de luz
  g.fillStyle(0xfff5d0, 0.1);
  g.fillEllipse(0, ceilingY - 36, triggerW + 60, 70);
  g.fillStyle(0xffe88a, 0.18);
  g.fillEllipse(0, ceilingY - 22, triggerW + 24, 50);
  g.fillStyle(0xfff8c0, 0.36);
  g.fillEllipse(0, ceilingY - 12, triggerW - 12, 30);

  // Raios volumetric
  g.fillStyle(0xfff5d0, 0.14);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const xOff = i * 22;
    g.beginPath();
    g.moveTo(xOff, ceilingY + 4);
    g.lineTo(xOff + i * 6, ceilingY + 120);
    g.lineTo(xOff + 12 + i * 6, ceilingY + 120);
    g.lineTo(xOff + 12, ceilingY + 4);
    g.closePath();
    g.fillPath();
  }

  // Buraco escuro
  g.fillStyle(0x000000, 0.92);
  g.fillEllipse(0, ceilingY + 4, triggerW + 4, 30);

  // Estilhaços
  const fragmentCount = 14;
  for (let i = 0; i < fragmentCount; i++) {
    const t = (i + 0.5) / fragmentCount;
    const angle = -Math.PI + t * Math.PI;
    const r = (triggerW + 4) / 2;
    const px = Math.cos(angle) * r;
    const py = ceilingY + 4 + Math.sin(angle) * 16;
    const lift = 8 + ((i * 73) % 11);
    const inwardAngle = angle + Math.PI;
    const ix = px + Math.cos(inwardAngle) * lift * 0.55;
    const iy = py + Math.sin(inwardAngle) * lift * 0.55;
    const tipX = px + Math.cos(inwardAngle) * lift;
    const tipY = py + Math.sin(inwardAngle) * lift;
    g.fillStyle(0x8a5e30, 1);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(ix - 2, iy);
    g.lineTo(tipX, tipY);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x3a2818, 1);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(tipX, tipY);
    g.lineTo(ix + 2, iy + 2);
    g.closePath();
    g.fillPath();
  }

  // Rachaduras radiais
  g.lineStyle(1.8, 0x2a1810, 0.9);
  const crackCount = 9;
  for (let i = 0; i < crackCount; i++) {
    const t = (i + 0.5) / crackCount;
    const angle = -Math.PI + t * Math.PI;
    const r1 = (triggerW + 4) / 2 + 2;
    const r2 = r1 + 18 + ((i * 47) % 16);
    const x1 = Math.cos(angle) * r1;
    const y1 = ceilingY + 4 + Math.sin(angle) * 16;
    const xJog = ((i * 31) % 12) - 6;
    const x2 = Math.cos(angle) * r2 + xJog;
    const y2 = ceilingY + 4 + Math.sin(angle) * (16 + (r2 - r1) * 0.4);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo((x1 + x2) / 2 + xJog * 0.5, (y1 + y2) / 2);
    g.lineTo(x2, y2);
    g.strokePath();
  }

  g.fillStyle(0xfff8c0, 0.55);
  g.fillEllipse(0, ceilingY - 4, triggerW - 60, 20);
  g.fillStyle(0xffffff, 0.4);
  g.fillEllipse(0, ceilingY - 14, triggerW - 110, 14);

  // Parede bloqueante
  const wallOffset = triggerW / 2 + 55;
  const wallW = 90;
  const wallTopY = WORLD.SUBTERRANEAN_TOP_Y - 30;
  const wallBotY = WORLD.SUBTERRANEAN_FLOOR_Y + 30;
  const wallH = wallBotY - wallTopY;

  g.fillStyle(0x14080a, 1);
  g.fillRoundedRect(wallOffset - wallW / 2, wallTopY, wallW, wallH, 12);
  g.lineStyle(3, 0x3a1410, 1);
  g.strokeRoundedRect(wallOffset - wallW / 2, wallTopY, wallW, wallH, 12);
  g.fillStyle(0xffffff, 0.04);
  g.fillRoundedRect(wallOffset - wallW / 2 + 6, wallTopY + 6, wallW - 12, 30, 8);

  g.fillStyle(0xff4444, 0.95);
  const spikeCount = 9;
  for (let i = 0; i < spikeCount; i++) {
    const sy = wallTopY + 30 + (i * (wallH - 60)) / (spikeCount - 1);
    g.beginPath();
    g.moveTo(wallOffset - wallW / 2, sy);
    g.lineTo(wallOffset - wallW / 2 - 14, sy + 6);
    g.lineTo(wallOffset - wallW / 2, sy + 12);
    g.closePath();
    g.fillPath();
  }
  g.lineStyle(1, 0x4a2010, 0.6);
  for (let i = 1; i < 4; i++) {
    const lx = wallOffset - wallW / 2 + (i * wallW) / 4;
    g.beginPath();
    g.moveTo(lx, wallTopY + 24);
    g.lineTo(lx + 4, wallBotY - 24);
    g.strokePath();
  }

  container.add(g);

  // Placa luminosa
  const signX = wallOffset - wallW / 2 - 44;
  const signY = (wallTopY + wallBotY) / 2;
  const signContainer = scene.add.container(signX, signY);

  const haloOuter = scene.add.graphics();
  haloOuter.fillStyle(0xffd166, 0.18);
  haloOuter.fillCircle(0, 0, 52);
  signContainer.add(haloOuter);

  const haloMid = scene.add.graphics();
  haloMid.fillStyle(0xffd166, 0.32);
  haloMid.fillCircle(0, 0, 34);
  signContainer.add(haloMid);

  const disc = scene.add.graphics();
  disc.fillStyle(0x14080a, 0.95);
  disc.fillCircle(0, 0, 26);
  disc.lineStyle(2.5, 0xffd166, 1);
  disc.strokeCircle(0, 0, 26);
  signContainer.add(disc);

  const arrow = scene.add.graphics();
  arrow.fillStyle(0xffd166, 1);
  arrow.fillRoundedRect(-4, -2, 8, 18, 1.5);
  arrow.beginPath();
  arrow.moveTo(-13, -2);
  arrow.lineTo(0, -17);
  arrow.lineTo(13, -2);
  arrow.closePath();
  arrow.fillPath();
  signContainer.add(arrow);
  container.add(signContainer);

  scene.tweens.add({
    targets: signContainer,
    scale: { from: 0.92, to: 1.1 },
    duration: 720,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: haloOuter,
    alpha: { from: 0.12, to: 0.32 },
    duration: 720,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: haloMid,
    alpha: { from: 0.22, to: 0.5 },
    duration: 540,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: signContainer,
    y: signY - 6,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const visualHoleW = triggerW + 4;
  const triggerInnerW = visualHoleW - 2 * PLAYER_W;

  return {
    hitboxes: [{
      x: wallOffset - wallW / 2,
      y: wallTopY,
      w: wallW,
      h: wallH
    }],
    triggerHitboxes: [{
      x: -triggerInnerW / 2,
      y: ceilingY,
      w: triggerInnerW,
      h: 24
    }],
    cleanup: () => {
      scene.tweens.killTweensOf(signContainer);
      scene.tweens.killTweensOf(haloOuter);
      scene.tweens.killTweensOf(haloMid);
    }
  };
}

/* =========================== CEILING_HOLE =========================== */

function buildCeilingHole(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const ceilingH = 120;
  const holeW = 220;

  const g = scene.add.graphics();

  // Halos cósmicos
  g.fillStyle(0xa0c0ff, 0.12);
  g.fillEllipse(0, ceilingH - 8, holeW + 80, 80);
  g.fillStyle(0xc0d0ff, 0.22);
  g.fillEllipse(0, ceilingH - 14, holeW + 24, 56);
  g.fillStyle(0xe0e8ff, 0.4);
  g.fillEllipse(0, ceilingH - 20, holeW - 30, 36);

  // Raios volumetric
  g.fillStyle(0xb0c8ff, 0.16);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const xOff = i * 24;
    g.beginPath();
    g.moveTo(xOff, ceilingH - 10);
    g.lineTo(xOff + i * 7, ceilingH + 130);
    g.lineTo(xOff + 14 + i * 7, ceilingH + 130);
    g.lineTo(xOff + 14, ceilingH - 10);
    g.closePath();
    g.fillPath();
  }

  // Buraco
  g.fillStyle(0x000000, 0.92);
  g.fillEllipse(0, ceilingH - 10, holeW + 4, 32);

  // Estilhaços
  const fragments = 14;
  for (let i = 0; i < fragments; i++) {
    const t = (i + 0.5) / fragments;
    const angle = -Math.PI + t * Math.PI;
    const r = (holeW + 4) / 2;
    const px = Math.cos(angle) * r;
    const py = ceilingH - 10 + Math.sin(angle) * 16;
    const lift = 10 + ((i * 73) % 12);
    const inwardAngle = angle + Math.PI;
    const tipX = px + Math.cos(inwardAngle) * lift;
    const tipY = py + Math.sin(inwardAngle) * lift;
    g.fillStyle(0x6a7a90, 1);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + Math.cos(angle + Math.PI / 2) * (lift * 0.4),
             py + Math.sin(angle + Math.PI / 2) * (lift * 0.4));
    g.lineTo(tipX, tipY);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x2a3a5a, 1);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(tipX, tipY);
    g.lineTo(px + Math.cos(angle - Math.PI / 2) * (lift * 0.3),
             py + Math.sin(angle - Math.PI / 2) * (lift * 0.3));
    g.closePath();
    g.fillPath();
  }

  g.fillStyle(0xe0e8ff, 0.55);
  g.fillEllipse(0, ceilingH - 16, holeW - 70, 22);
  g.fillStyle(0xffffff, 0.4);
  g.fillEllipse(0, ceilingH - 24, holeW - 130, 16);

  // Parede bloqueante
  const wallOffset = holeW / 2 + 50;
  const wallW = 110;
  const wallTopY = 0;
  const wallBotY = WORLD.GROUND_Y;
  const wallH = wallBotY - wallTopY;

  g.fillStyle(0x1a2230, 1);
  g.fillRoundedRect(wallOffset - wallW / 2, wallTopY, wallW, wallH, 8);
  g.lineStyle(3, 0x445a8a, 1);
  g.strokeRoundedRect(wallOffset - wallW / 2, wallTopY, wallW, wallH, 8);
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(wallOffset - wallW / 2 + 6, wallTopY + 6, wallW - 12, 30, 6);

  g.fillStyle(0xff4040, 0.95);
  const spikes = 11;
  for (let i = 0; i < spikes; i++) {
    const sy = 30 + (i * (wallH - 60)) / (spikes - 1);
    g.beginPath();
    g.moveTo(wallOffset - wallW / 2, sy);
    g.lineTo(wallOffset - wallW / 2 - 16, sy + 7);
    g.lineTo(wallOffset - wallW / 2, sy + 14);
    g.closePath();
    g.fillPath();
  }
  g.fillStyle(0x445a8a, 0.4);
  for (let i = 1; i < 4; i++) {
    const lx = wallOffset - wallW / 2 + (i * wallW) / 4;
    g.fillRect(lx - 1, 12, 2, wallH - 24);
  }

  container.add(g);

  // Placa
  const signX = wallOffset - wallW / 2 - 50;
  const signY = ceilingH + 40;
  const signContainer = scene.add.container(signX, signY);
  const haloOuter = scene.add.graphics();
  haloOuter.fillStyle(0x9ec4ff, 0.2);
  haloOuter.fillCircle(0, 0, 56);
  signContainer.add(haloOuter);
  const haloMid = scene.add.graphics();
  haloMid.fillStyle(0x9ec4ff, 0.36);
  haloMid.fillCircle(0, 0, 36);
  signContainer.add(haloMid);
  const disc = scene.add.graphics();
  disc.fillStyle(0x14223a, 0.95);
  disc.fillCircle(0, 0, 28);
  disc.lineStyle(2.5, 0x9ec4ff, 1);
  disc.strokeCircle(0, 0, 28);
  signContainer.add(disc);
  const arrow = scene.add.graphics();
  arrow.fillStyle(0x9ec4ff, 1);
  arrow.fillRoundedRect(-4, -2, 8, 18, 1.5);
  arrow.beginPath();
  arrow.moveTo(-13, -2);
  arrow.lineTo(0, -18);
  arrow.lineTo(13, -2);
  arrow.closePath();
  arrow.fillPath();
  signContainer.add(arrow);
  container.add(signContainer);

  scene.tweens.add({
    targets: signContainer,
    scale: { from: 0.92, to: 1.12 },
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: haloOuter,
    alpha: { from: 0.14, to: 0.34 },
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  scene.tweens.add({
    targets: haloMid,
    alpha: { from: 0.24, to: 0.54 },
    duration: 540,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const visualHoleW = holeW + 4;
  const triggerInnerW = visualHoleW - 2 * PLAYER_W;

  return {
    hitboxes: [{
      x: wallOffset - wallW / 2,
      y: wallTopY,
      w: wallW,
      h: wallH
    }],
    triggerHitboxes: [{
      x: -triggerInnerW / 2,
      y: 0,
      w: triggerInnerW,
      h: 30
    }],
    cleanup: () => {
      scene.tweens.killTweensOf(signContainer);
      scene.tweens.killTweensOf(haloOuter);
      scene.tweens.killTweensOf(haloMid);
    }
  };
}

/* ============================ BREAKABLE ============================= */

function buildBreakable(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  _options: TrapBuildOptions
): TrapInstance {
  const s = 88;
  const y = WORLD.GROUND_Y - s / 2;
  const cx = 0;

  const g = scene.add.graphics();

  // Halo glow
  g.fillStyle(0xffd23f, 0.22);
  g.fillEllipse(cx, y, s + 24, s * 0.5);

  // Cristal facetado
  const half = s / 2;
  g.fillStyle(0xfff5a0, 1);
  g.beginPath();
  g.moveTo(cx, y - half + 4);
  g.lineTo(cx + half - 6, y - 6);
  g.lineTo(cx + half - 4, y + 8);
  g.lineTo(cx + 4, y + half - 4);
  g.lineTo(cx - 6, y + half - 6);
  g.lineTo(cx - half + 4, y + 6);
  g.lineTo(cx - half + 8, y - 8);
  g.closePath();
  g.fillPath();

  // Sombras internas (faceting)
  g.fillStyle(0xc8951a, 0.55);
  g.beginPath();
  g.moveTo(cx, y - half + 4);
  g.lineTo(cx + half - 6, y - 6);
  g.lineTo(cx, y);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xa07a10, 0.65);
  g.beginPath();
  g.moveTo(cx + 4, y + half - 4);
  g.lineTo(cx + half - 4, y + 8);
  g.lineTo(cx, y);
  g.closePath();
  g.fillPath();

  // Linhas de faceta
  g.lineStyle(1.5, 0xfff8c0, 0.7);
  g.beginPath();
  g.moveTo(cx, y - half + 4);
  g.lineTo(cx, y + half - 4);
  g.moveTo(cx - half + 4, y);
  g.lineTo(cx + half - 4, y);
  g.strokePath();

  // Rachaduras (sinaliza quebrável)
  g.lineStyle(1.6, 0x6a3a00, 0.85);
  g.beginPath();
  g.moveTo(cx - 14, y - 18);
  g.lineTo(cx - 4, y - 6);
  g.lineTo(cx - 12, y + 8);
  g.lineTo(cx + 6, y + 18);
  g.strokePath();
  g.beginPath();
  g.moveTo(cx + 16, y - 12);
  g.lineTo(cx + 6, y);
  g.lineTo(cx + 14, y + 14);
  g.strokePath();

  // Glints
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(cx - 10, y - 14, 2.4);
  g.fillCircle(cx + 14, y + 4, 1.6);

  container.add(g);

  // Pulse sutil
  const pulse = scene.tweens.add({
    targets: g,
    alpha: { from: 0.92, to: 1 },
    duration: 720,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [{
      x: -s / 2,
      y: WORLD.GROUND_Y - s,
      w: s,
      h: s
    }],
    triggerHitboxes: [],
    cleanup: () => {
      pulse.stop();
    }
  };
}

/* ========================== SEA_ENTRY_SHIP ========================= */

/**
 * Navio gigante atravessado: hull do "céu" até a água.
 * Player tem que se enfiar embaixo (slide level) pra mergulhar no mar.
 * Bater no casco = morte. Sliding pelo trigger = entra na fase Sea.
 */
function buildSeaEntryShip(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const shipW = 360;
  const hullTop = -50;
  const waterLine = WORLD.GROUND_Y - 6;
  const hullBottom = WORLD.GROUND_Y - 60; // hitbox sólido termina aqui (deixa margem pro dive)
  const keelBottom = waterLine - 4;       // visual desce até a linha d'água
  const hullH = hullBottom - hullTop;

  const g = scene.add.graphics();

  /* === ÁGUA E HORIZONTE === */
  // Mar embaixo (à esquerda E à direita do navio — preenchimento amplo)
  const seaBandY = waterLine;
  const seaBandH = WORLD.GROUND_Y + 60 - waterLine;
  g.fillStyle(0x062b4a, 1);
  g.fillRect(-shipW / 2 - 200, seaBandY, shipW + 400, seaBandH);
  // Faixa mais clara de superfície
  g.fillStyle(0x1a5a8a, 0.85);
  g.fillRect(-shipW / 2 - 200, seaBandY, shipW + 400, 8);

  /* === CASCO PRINCIPAL === */
  // Sombra de casco no mar
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(8, waterLine + 4, shipW + 60, 14);

  // Corpo do casco (gradient cinza-aço)
  g.fillStyle(0x1a1a22, 1);
  g.fillRoundedRect(-shipW / 2, hullTop, shipW, keelBottom - hullTop, 10);
  g.fillStyle(0x3a3a44, 1);
  g.fillRoundedRect(-shipW / 2 + 6, hullTop + 4, shipW - 12, hullH * 0.55, 8);
  // Highlight superior (luz do céu)
  g.fillStyle(0x6a6a74, 1);
  g.fillRoundedRect(-shipW / 2 + 12, hullTop + 8, shipW - 24, hullH * 0.18, 6);

  // Bow + stern arredondados (pintura de borda)
  g.lineStyle(3, 0x14141a, 1);
  g.strokeRoundedRect(-shipW / 2, hullTop, shipW, keelBottom - hullTop, 10);

  /* === CHAPAS DE CASCO (linhas horizontais) === */
  g.lineStyle(2, 0x14141a, 0.88);
  for (let i = 1; i < 6; i++) {
    const ly = hullTop + i * (hullH / 6);
    g.beginPath();
    g.moveTo(-shipW / 2 + 6, ly);
    g.lineTo(shipW / 2 - 6, ly);
    g.strokePath();
  }

  /* === RIVETS === */
  for (let row = 0; row < 6; row++) {
    const ly = hullTop + 12 + row * (hullH / 6);
    for (let x = -shipW / 2 + 18; x <= shipW / 2 - 18; x += 38) {
      g.fillStyle(0x14141a, 1);
      g.fillCircle(x, ly, 2.4);
      g.fillStyle(0x9a9aa4, 0.9);
      g.fillCircle(x - 0.6, ly - 0.6, 1.1);
    }
  }

  /* === PORTHOLES iluminadas === */
  for (let i = 0; i < 6; i++) {
    const px = -shipW / 2 + 36 + i * ((shipW - 72) / 5);
    const py = hullTop + hullH * 0.45;
    g.fillStyle(0x14141a, 1);
    g.fillCircle(px, py, 13);
    g.fillStyle(0x4a4a52, 1);
    g.fillCircle(px, py, 10);
    g.fillStyle(0xfff8c0, 1);
    g.fillCircle(px, py, 7);
    g.fillStyle(0xffd23f, 0.95);
    g.fillCircle(px, py, 5);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(px - 2, py - 2, 2.2);
  }

  /* === RUST STREAKS verticais === */
  g.fillStyle(0x6a3a14, 0.7);
  for (const rx of [-shipW / 2 + 32, -shipW / 4, shipW / 6, shipW / 2 - 50]) {
    g.fillRect(rx, hullTop + 60, 5, hullH - 80);
  }

  /* === LINHA D'ÁGUA: anti-fouling vermelho + faixa branca === */
  g.fillStyle(0xc94545, 1);
  g.fillRect(-shipW / 2 + 4, hullBottom - 6, shipW - 8, 18);
  g.fillStyle(0xffffff, 1);
  g.fillRect(-shipW / 2 + 4, hullBottom - 12, shipW - 8, 6);

  /* === KEEL (parte submersa do casco — visual, sem hitbox) === */
  g.fillStyle(0x2a2a32, 0.95);
  g.fillRoundedRect(-shipW / 2 + 12, keelBottom - 30, shipW - 24, 26, 6);

  /* === BOW WAVE (à esquerda — onda gigante quebrando) === */
  g.fillStyle(0xc0e0ff, 0.85);
  g.beginPath();
  g.moveTo(-shipW / 2 - 80, waterLine - 10);
  g.lineTo(-shipW / 2 - 60, waterLine - 22);
  g.lineTo(-shipW / 2 - 40, waterLine - 14);
  g.lineTo(-shipW / 2 - 20, waterLine - 26);
  g.lineTo(-shipW / 2, waterLine - 16);
  g.lineTo(-shipW / 2, waterLine + 6);
  g.lineTo(-shipW / 2 - 80, waterLine + 6);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xffffff, 0.95);
  g.fillEllipse(-shipW / 2 - 30, waterLine - 4, 80, 8);

  /* === ÂNCORA na proa === */
  g.fillStyle(0x4a4a52, 1);
  g.fillRect(-shipW / 2 - 6, hullTop + 90, 12, 70);
  g.fillRect(-shipW / 2 - 18, hullTop + 142, 36, 6);
  g.beginPath();
  g.moveTo(-shipW / 2 - 18, hullTop + 142);
  g.lineTo(-shipW / 2 - 28, hullTop + 162);
  g.lineTo(-shipW / 2 - 12, hullTop + 162);
  g.closePath();
  g.fillPath();
  g.beginPath();
  g.moveTo(-shipW / 2 + 6, hullTop + 142);
  g.lineTo(-shipW / 2 + 12, hullTop + 162);
  g.lineTo(-shipW / 2 - 4, hullTop + 162);
  g.closePath();
  g.fillPath();

  /* === LETREIRO grande (caixa branca + abstract glyphs) === */
  g.fillStyle(0xfff8c0, 0.92);
  g.fillRect(-50, hullTop + 80, 100, 22);
  g.fillStyle(0x14141a, 1);
  for (let i = 0; i < 6; i++) g.fillRect(-44 + i * 16, hullTop + 86, 10, 10);

  /* === SMOKE saindo de chaminé acima da tela === */
  const smoke = scene.add.graphics();
  function drawSmoke(this: void, time: number): void {
    smoke.clear();
    const phase = time * 0.001;
    smoke.fillStyle(0x4a4a52, 0.55);
    for (let i = 0; i < 5; i++) {
      const wob = Math.sin(phase + i * 0.7) * 4;
      smoke.fillEllipse(-30 + i * 18 + wob, hullTop + 4 - i * 8, 28 - i * 2, 10);
    }
    smoke.fillStyle(0x6a6a72, 0.4);
    for (let i = 0; i < 4; i++) {
      const wob = Math.cos(phase + i * 0.9) * 3;
      smoke.fillEllipse(-20 + i * 22 + wob, hullTop - 8 - i * 10, 22 - i * 2, 8);
    }
  }
  drawSmoke(0);

  /* === BOW WAVE animada na proa === */
  const wave = scene.add.graphics();
  function drawWave(this: void, time: number): void {
    wave.clear();
    const phase = time * 0.001 * 4;
    wave.fillStyle(0xffffff, 0.95);
    for (let i = 0; i < 6; i++) {
      const wx = -shipW / 2 - 16 - i * 10;
      const wy = waterLine - 4 + Math.sin(phase + i * 0.6) * 3;
      wave.fillEllipse(wx, wy, 18 - i * 2, 4);
    }
    wave.fillStyle(0xc0e0ff, 0.85);
    for (let i = 0; i < 4; i++) {
      wave.fillCircle(-shipW / 2 - 8 - i * 14, waterLine - 12 + Math.cos(phase + i) * 4, 3);
    }
  }
  drawWave(0);

  container.add([g, smoke, wave]);

  const animator = scene.time.addEvent({
    delay: 60,
    callback: () => {
      drawSmoke(scene.time.now);
      drawWave(scene.time.now);
    },
    loop: true
  });

  /* === HITBOX: casco do céu até pouco acima da água === */
  // Termina em (waterLine - 60) pra deixar uma janela de dive (~50px).
  return {
    hitboxes: [{
      x: -shipW / 2 + 8,
      y: hullTop,
      w: shipW - 16,
      h: hullBottom - hullTop
    }],
    /* === TRIGGER: faixa estreita na água, alinhada horizontalmente com o casco === */
    triggerHitboxes: [{
      x: -shipW / 2 + 30,
      y: WORLD.GROUND_Y - 12,
      w: shipW - 60,
      h: 28
    }],
    cleanup: () => animator.remove(false)
  };
}

/* ========================= SEA_EXIT_SANDBANK ======================= */

/**
 * Banco de areia subindo do fundo do mar até quase a superfície.
 * Player precisa estar no TOPO do range underwater pra escapar.
 * Bater = morte. Subindo pelo trigger = sai pra Beach.
 *
 * Coordenadas: container.y = SEA_PHASE_OFFSET (=720). Local y=0 → world y=720.
 *   • Topo do range jogável Sea (yMin)  ≈ local y=120
 *   • Fundo (yMax)                       ≈ local y=620
 *   • Banco de areia ocupa local y=210 → 620 (deixa janela de 90px no topo)
 */
function buildSeaExitSandbank(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 280;
  const surfaceLocalY = 110;          // limite superior (yMin do player em sea)
  const sandTopY = 220;               // pico do banco
  const seaFloorLocalY = 640;         // fundo de cena
  const sandH = seaFloorLocalY - sandTopY;

  const g = scene.add.graphics();

  /* === ÁGUA SOMBRA (atrás do banco) === */
  // Faixa de água mais clara em cima (luz vinda da superfície)
  g.fillStyle(0x4a8eb4, 0.45);
  g.fillRect(-w / 2 - 200, surfaceLocalY - 8, w + 400, 12);

  /* === BANCO DE AREIA (mound trapezoidal) === */
  // Sombra escura no fundo
  g.fillStyle(0x000814, 0.55);
  g.fillEllipse(8, seaFloorLocalY + 4, w + 80, 16);

  // Base ampla (areia escura úmida)
  g.fillStyle(0x6a4a30, 1);
  g.beginPath();
  g.moveTo(-w / 2 - 40, seaFloorLocalY);
  g.lineTo(-w / 2 - 20, sandTopY + 30);
  g.lineTo(-w / 4, sandTopY + 6);
  g.lineTo(0, sandTopY);
  g.lineTo(w / 4, sandTopY + 8);
  g.lineTo(w / 2 + 20, sandTopY + 36);
  g.lineTo(w / 2 + 40, seaFloorLocalY);
  g.closePath();
  g.fillPath();

  // Camada média (areia clara)
  g.fillStyle(0xc8a050, 1);
  g.beginPath();
  g.moveTo(-w / 2 - 30, seaFloorLocalY);
  g.lineTo(-w / 2 - 14, sandTopY + 36);
  g.lineTo(-w / 4 + 4, sandTopY + 12);
  g.lineTo(0, sandTopY + 4);
  g.lineTo(w / 4 - 4, sandTopY + 14);
  g.lineTo(w / 2 + 14, sandTopY + 42);
  g.lineTo(w / 2 + 30, seaFloorLocalY);
  g.closePath();
  g.fillPath();

  // Topo iluminado (sol penetrando)
  g.fillStyle(0xe8c878, 1);
  g.beginPath();
  g.moveTo(-w / 4, sandTopY + 10);
  g.lineTo(-8, sandTopY + 2);
  g.lineTo(0, sandTopY);
  g.lineTo(8, sandTopY + 4);
  g.lineTo(w / 4, sandTopY + 14);
  g.lineTo(w / 4 - 6, sandTopY + 22);
  g.lineTo(0, sandTopY + 14);
  g.lineTo(-w / 4 + 6, sandTopY + 22);
  g.closePath();
  g.fillPath();

  /* === DETALHES de areia (textura granulada) === */
  g.fillStyle(0x4a3220, 0.65);
  for (let i = 0; i < 60; i++) {
    const px = -w / 2 + ((i * 31) % w);
    const py = sandTopY + 30 + ((i * 47) % (sandH - 60));
    g.fillRect(px, py, 1, 1);
  }
  g.fillStyle(0xfff5d0, 0.55);
  for (let i = 0; i < 30; i++) {
    const px = -w / 4 + ((i * 23) % (w / 2));
    const py = sandTopY + 10 + ((i * 41) % 80);
    g.fillRect(px, py, 1, 1);
  }

  /* === ROCHAS espalhadas === */
  for (const rk of [{ x: -w / 3, y: seaFloorLocalY - 18, r: 16 }, { x: w / 4, y: seaFloorLocalY - 22, r: 20 }, { x: 0, y: seaFloorLocalY - 12, r: 12 }]) {
    g.fillStyle(0x2a1c14, 1);
    g.fillEllipse(rk.x, rk.y, rk.r * 1.4, rk.r);
    g.fillStyle(0x4a3a2a, 1);
    g.fillEllipse(rk.x - 2, rk.y - 2, rk.r * 1.1, rk.r * 0.8);
    g.fillStyle(0x6a5a44, 0.85);
    g.fillEllipse(rk.x - 3, rk.y - 4, rk.r * 0.6, rk.r * 0.4);
  }

  /* === SEA GRASS dançando === */
  const grass = scene.add.graphics();
  function drawGrass(this: void, time: number): void {
    grass.clear();
    const phase = time * 0.001 * 1.6;
    for (let i = 0; i < 7; i++) {
      const gx = -w / 3 + i * (w / 8);
      const baseY = sandTopY + 10 + ((i * 11) % 14);
      const len = 24 + ((i * 7) % 12);
      const tilt = Math.sin(phase + i * 0.6) * 7;
      grass.lineStyle(2.5, 0x2a8a4a, 1);
      grass.beginPath();
      grass.moveTo(gx, baseY);
      grass.lineTo(gx + tilt * 0.5, baseY - len * 0.55);
      grass.lineTo(gx + tilt, baseY - len);
      grass.strokePath();
      grass.lineStyle(1.5, 0x6bcb77, 0.9);
      grass.beginPath();
      grass.moveTo(gx + 1, baseY);
      grass.lineTo(gx + tilt * 0.5 + 1, baseY - len * 0.55);
      grass.lineTo(gx + tilt + 1, baseY - len);
      grass.strokePath();
    }
  }
  drawGrass(0);

  /* === CONCHAS pequenas === */
  for (const sh of [{ x: -w / 3 - 20, y: seaFloorLocalY - 6 }, { x: w / 4 + 14, y: seaFloorLocalY - 8 }, { x: -10, y: sandTopY + 36 }]) {
    g.fillStyle(0xff8aa8, 0.95);
    g.beginPath();
    g.arc(sh.x, sh.y, 5, Math.PI, 0);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x6a1010, 0.55);
    g.beginPath();
    g.moveTo(sh.x - 4, sh.y);
    g.lineTo(sh.x, sh.y - 4);
    g.moveTo(sh.x + 4, sh.y);
    g.lineTo(sh.x, sh.y - 4);
    g.strokePath();
  }

  /* === LIGHT SHAFTS descendo (sol penetrando água) === */
  g.fillStyle(0xfff5d0, 0.12);
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const sx = i * 60;
    g.beginPath();
    g.moveTo(sx, surfaceLocalY);
    g.lineTo(sx + i * 6, surfaceLocalY + 200);
    g.lineTo(sx + 14 + i * 6, surfaceLocalY + 200);
    g.lineTo(sx + 14, surfaceLocalY);
    g.closePath();
    g.fillPath();
  }

  /* === SETA-GUIA SUBA pulsante === */
  const arrowContainer = scene.add.container(0, surfaceLocalY + 30);
  const halo = scene.add.graphics();
  halo.fillStyle(0x9ec4ff, 0.32);
  halo.fillCircle(0, 0, 32);
  arrowContainer.add(halo);
  const disc = scene.add.graphics();
  disc.fillStyle(0x062b4a, 0.95);
  disc.fillCircle(0, 0, 24);
  disc.lineStyle(2.5, 0x9ec4ff, 1);
  disc.strokeCircle(0, 0, 24);
  arrowContainer.add(disc);
  const arrow = scene.add.graphics();
  arrow.fillStyle(0x9ec4ff, 1);
  arrow.fillRoundedRect(-3.5, -2, 7, 16, 1.5);
  arrow.beginPath();
  arrow.moveTo(-12, -2);
  arrow.lineTo(0, -16);
  arrow.lineTo(12, -2);
  arrow.closePath();
  arrow.fillPath();
  arrowContainer.add(arrow);

  container.add([g, grass, arrowContainer]);

  const animator = scene.time.addEvent({
    delay: 60,
    callback: () => drawGrass(scene.time.now),
    loop: true
  });

  const arrowPulse = scene.tweens.add({
    targets: arrowContainer,
    scale: { from: 0.92, to: 1.12 },
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
  const haloPulse = scene.tweens.add({
    targets: halo,
    alpha: { from: 0.18, to: 0.45 },
    duration: 540,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  /* === HITBOX: corpo do banco. Cobre do topo (sandTopY) até o fundo === */
  return {
    hitboxes: [{
      x: -w / 2,
      y: sandTopY,
      w,
      h: sandH
    }],
    /* === TRIGGER: faixa no topo do range underwater (player precisa breachar) === */
    triggerHitboxes: [{
      x: -w / 2 + 20,
      y: surfaceLocalY,
      w: w - 40,
      h: 26
    }],
    cleanup: () => {
      animator.remove(false);
      arrowPulse.stop();
      haloPulse.stop();
    }
  };
}

/* ============================ COIN SAFE (Porquinho) ============================ */

/**
 * Cofre estilo Jetpack Joyride. Visual: porquinho rosa com fenda dourada,
 * carinha sorridente. HP=3 — cada hit do player faz rachadura aparecer e
 * cospe algumas moedas. No 3º hit, explode em chuva dourada.
 */
function buildCoinSafe(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 110;
  const h = 90;
  const centerY = 380;

  const body = scene.add.graphics();

  // Sombra
  body.fillStyle(0x000000, 0.35);
  body.fillEllipse(8, centerY + h / 2 + 4, w + 24, 12);

  // Corpo rosa
  body.fillStyle(0xff8aa8, 1);
  body.fillEllipse(0, centerY, w, h);
  body.fillStyle(0xffb8c8, 1);
  body.fillEllipse(-8, centerY - 18, w * 0.7, h * 0.45);
  body.fillStyle(0xc06080, 0.55);
  body.fillEllipse(4, centerY + 14, w * 0.85, h * 0.5);

  // Patinhas
  body.fillStyle(0xc06080, 1);
  body.fillRoundedRect(-w / 2 + 18, centerY + h / 2 - 4, 14, 12, 3);
  body.fillRoundedRect(w / 2 - 32, centerY + h / 2 - 4, 14, 12, 3);

  // Orelhas
  body.fillStyle(0xff8aa8, 1);
  body.beginPath();
  body.moveTo(-w / 2 + 14, centerY - h / 2 + 6);
  body.lineTo(-w / 2 + 22, centerY - h / 2 - 8);
  body.lineTo(-w / 2 + 30, centerY - h / 2 + 10);
  body.closePath();
  body.fillPath();
  body.beginPath();
  body.moveTo(w / 2 - 14, centerY - h / 2 + 6);
  body.lineTo(w / 2 - 22, centerY - h / 2 - 8);
  body.lineTo(w / 2 - 30, centerY - h / 2 + 10);
  body.closePath();
  body.fillPath();

  // Focinho
  body.fillStyle(0xffd0dc, 1);
  body.fillEllipse(-w / 2 + 18, centerY + 4, 18, 14);
  body.fillStyle(0x6a3a48, 1);
  body.fillCircle(-w / 2 + 14, centerY + 2, 1.6);
  body.fillCircle(-w / 2 + 22, centerY + 2, 1.6);

  // Olhos
  body.fillStyle(0xffffff, 1);
  body.fillCircle(-w / 2 + 30, centerY - 14, 6);
  body.fillCircle(-w / 2 + 46, centerY - 14, 6);
  body.fillStyle(0x14080a, 1);
  body.fillCircle(-w / 2 + 31, centerY - 13, 3.2);
  body.fillCircle(-w / 2 + 47, centerY - 13, 3.2);
  body.fillStyle(0xffffff, 1);
  body.fillCircle(-w / 2 + 32, centerY - 14, 1.2);
  body.fillCircle(-w / 2 + 48, centerY - 14, 1.2);

  // Sorriso
  body.lineStyle(2, 0x6a3a48, 1);
  body.beginPath();
  body.arc(-w / 2 + 30, centerY + 12, 4, 0, Math.PI);
  body.strokePath();

  // Rabinho
  body.lineStyle(3, 0xff8aa8, 1);
  body.beginPath();
  body.arc(w / 2 - 8, centerY - 6, 6, 0, Math.PI * 1.6);
  body.strokePath();

  // Fenda dourada
  body.fillStyle(0xa07a3a, 1);
  body.fillRoundedRect(-12, centerY - h / 2 + 8, 24, 6, 2);
  body.fillStyle(0xffd23f, 1);
  body.fillRoundedRect(-10, centerY - h / 2 + 9, 20, 4, 1);
  body.fillStyle(0x14080a, 0.8);
  body.fillRect(-7, centerY - h / 2 + 10, 14, 2);

  // Highlight
  body.fillStyle(0xffffff, 0.4);
  body.fillEllipse(-12, centerY - 24, 16, 8);

  container.add(body);

  // Rachaduras (escondidas, reveladas a cada hit)
  const cracks: Phaser.GameObjects.Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const crack = scene.add.graphics().setVisible(false);
    crack.lineStyle(2, 0x6a3a48, 0.85);
    crack.beginPath();
    if (i === 0) {
      crack.moveTo(-w / 2 + 30, centerY - 8);
      crack.lineTo(-w / 2 + 26, centerY + 10);
      crack.lineTo(-w / 2 + 34, centerY + 24);
    } else if (i === 1) {
      crack.moveTo(w / 4, centerY - 22);
      crack.lineTo(w / 4 + 4, centerY - 4);
      crack.lineTo(w / 4 - 4, centerY + 14);
    } else {
      crack.moveTo(-w / 4, centerY + h / 2 - 14);
      crack.lineTo(-w / 4 + 8, centerY + h / 2 - 24);
      crack.lineTo(-w / 4 - 4, centerY + h / 2 - 30);
    }
    crack.strokePath();
    container.add(crack);
    cracks.push(crack);
  }

  // Pulso idle (sobe/desce levemente)
  const idleTween = scene.tweens.add({
    targets: body,
    y: { from: 0, to: -4 },
    duration: 760,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  // Glow dourado pulsante atrás do corpo
  const glow = scene.add.graphics();
  glow.fillStyle(0xffd23f, 0.18);
  glow.fillCircle(0, centerY, w * 0.85);
  container.add(glow);
  container.bringToTop(body);
  for (const c of cracks) container.bringToTop(c);
  const glowTween = scene.tweens.add({
    targets: glow,
    alpha: { from: 0.12, to: 0.32 },
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [{ x: -w / 2 + 6, y: centerY - h / 2 + 6, w: w - 12, h: h - 12 }],
    triggerHitboxes: [],
    hp: 3,
    onHit: (remainingHp: number) => {
      const idx = 3 - remainingHp - 1;
      if (idx >= 0 && idx < cracks.length) {
        cracks[idx].setVisible(true);
        cracks[idx].alpha = 0;
        scene.tweens.add({
          targets: cracks[idx],
          alpha: 1,
          duration: 180,
          ease: 'Quad.easeOut'
        });
      }
      scene.tweens.add({
        targets: body,
        scaleX: { from: 1.18, to: 1 },
        scaleY: { from: 0.82, to: 1 },
        duration: 220,
        ease: 'Back.easeOut'
      });
    },
    cleanup: () => {
      idleTween.stop();
      glowTween.stop();
    }
  };
}

/* ============================ REGISTRY ============================ */

export const SPECIAL_TRAP_DEFS: TrapDef[] = [
  {
    id: 'bonus_hole',
    category: 'special',
    biome: 'any',
    build: buildBonusHole
  },
  {
    id: 'pipe_exit',
    category: 'special',
    biome: 'any',
    build: buildPipeExit
  },
  {
    id: 'ceiling_hole',
    category: 'special',
    biome: 'any',
    build: buildCeilingHole
  },
  {
    id: 'breakable',
    category: 'breakable',
    biome: 'any',
    fromMeters: 1500,
    build: buildBreakable
  },
  {
    id: 'sea_entry_ship',
    category: 'special',
    biome: 'any',
    build: buildSeaEntryShip
  },
  {
    id: 'sea_exit_sandbank',
    category: 'special',
    biome: 'any',
    build: buildSeaExitSandbank
  },
  {
    id: 'coin_safe',
    category: 'special',
    biome: 'any',
    softHit: true,
    fromMeters: 1200,
    build: buildCoinSafe
  }
];

export function registerSpecialTraps(): void {
  registerTraps(SPECIAL_TRAP_DEFS);
}
