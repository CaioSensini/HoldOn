/**
 * Armadilhas do bioma SEA (underwater).
 *
 *  ground   urchin_field      Ouriços-do-mar agrupados, espinhos negros.
 *  low      anglerfish        Peixe-pescador pairando, lanterna brilhante.
 *  high     kelp_pillar       Coluna densa de kelp/algas — denso e sólido.
 *  gap      coral_arch        Coral acima + coral embaixo, gap pelo meio.
 *  dynamic  jellyfish         Medusa flutuando vertical, tentáculos.
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

/* -------- ground: urchin_field -------- */

function buildUrchinField(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 200;
  const baseY = GROUND_Y;

  const g = scene.add.graphics();

  // Sombra azul subaquática
  g.fillStyle(0x000814, 0.5);
  g.fillEllipse(0, baseY - 2, w + 12, 9);

  // Base de areia escura
  g.fillStyle(0x1a3a5a, 0.95);
  g.fillRoundedRect(-w / 2, baseY - 12, w, 12, 4);

  // 3-4 ouriços do mar grandes
  const positions = [-w / 3, 0, w / 3];
  for (let i = 0; i < positions.length; i++) {
    const cx = positions[i];
    const cy = baseY - 18;
    const radius = 14 + ((i * 5) % 4);

    // Corpo escuro
    g.fillStyle(0x14081a, 1);
    g.fillCircle(cx, cy, radius);

    // Highlight central
    g.fillStyle(0x4a2868, 0.85);
    g.fillCircle(cx - 3, cy - 3, radius * 0.55);

    // Espinhos negros (radial)
    const spikes = 16;
    g.fillStyle(0x000814, 1);
    g.lineStyle(2, 0x000814, 1);
    for (let s = 0; s < spikes; s++) {
      const a = (s / spikes) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * radius;
      const y1 = cy + Math.sin(a) * radius;
      const x2 = cx + Math.cos(a) * (radius + 8 + ((s * 3) % 4));
      const y2 = cy + Math.sin(a) * (radius + 8 + ((s * 3) % 4));
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.strokePath();
    }

    // Olhinhos brilhantes (alerta)
    g.fillStyle(0xff8a3a, 1);
    g.fillCircle(cx - 4, cy - 2, 1.4);
    g.fillCircle(cx + 4, cy - 2, 1.4);
  }

  // Bolhas subindo (efeito subaquático)
  const bubbles = scene.add.graphics();
  for (let i = 0; i < 6; i++) {
    const bx = -w / 2 + 20 + i * (w / 7);
    bubbles.fillStyle(0xc0e0ff, 0.7);
    bubbles.fillCircle(bx, baseY - 24 - (i * 2), 2);
  }

  container.add([g, bubbles]);

  const float = scene.tweens.add({
    targets: bubbles,
    y: -20,
    alpha: 0,
    duration: 1800,
    repeat: -1,
    ease: 'Sine.easeIn'
  });

  return {
    hitboxes: [groundHitbox(w - 10)],
    triggerHitboxes: [],
    cleanup: () => float.stop()
  };
}

/* -------- low: anglerfish -------- */

function buildAnglerfish(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 220;
  const h = 80;
  const centerY = 250;

  const g = scene.add.graphics();

  // Halo bioluminescente
  g.fillStyle(0x4ecdc4, 0.22);
  g.fillEllipse(60, centerY - 30, 80, 60);

  // Corpo do peixe (oval gigante esquerda → cauda direita)
  g.fillStyle(0x0a1a2a, 1);
  g.fillEllipse(-30, centerY, w * 0.7, h);

  // Highlight superior
  g.fillStyle(0x1e4878, 0.85);
  g.fillEllipse(-30, centerY - 16, w * 0.6, h * 0.4);

  // Cauda (à direita)
  g.fillStyle(0x0a1a2a, 1);
  g.beginPath();
  g.moveTo(40, centerY);
  g.lineTo(80, centerY - 30);
  g.lineTo(70, centerY);
  g.lineTo(80, centerY + 30);
  g.closePath();
  g.fillPath();

  // Boca aberta com dentes
  g.fillStyle(0x2a0a0a, 1);
  g.fillEllipse(-90, centerY + 10, 30, 18);
  // Dentes pontudos
  g.fillStyle(0xfff8c0, 1);
  for (let i = 0; i < 5; i++) {
    const tx = -100 + i * 4;
    g.beginPath();
    g.moveTo(tx, centerY + 4);
    g.lineTo(tx + 1, centerY + 10);
    g.lineTo(tx + 2, centerY + 4);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(tx, centerY + 16);
    g.lineTo(tx + 1, centerY + 10);
    g.lineTo(tx + 2, centerY + 16);
    g.closePath();
    g.fillPath();
  }

  // Olho gigante
  g.fillStyle(0xffd23f, 1);
  g.fillCircle(-60, centerY - 14, 7);
  g.fillStyle(0x000000, 1);
  g.fillCircle(-60, centerY - 14, 4);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(-58, centerY - 16, 1.6);

  // Lanterna luminescente (antena)
  g.lineStyle(2, 0x1e4878, 1);
  g.beginPath();
  g.moveTo(-40, centerY - 30);
  g.lineTo(-20, centerY - 60);
  g.strokePath();

  // Bulbo lanterna
  const lantern = scene.add.graphics();
  lantern.fillStyle(0x4ecdc4, 0.85);
  lantern.fillCircle(-20, centerY - 60, 9);
  lantern.fillStyle(0xfff8c0, 1);
  lantern.fillCircle(-20, centerY - 60, 5);
  lantern.fillStyle(0xffffff, 1);
  lantern.fillCircle(-22, centerY - 62, 2);

  container.add([g, lantern]);

  const lanternPulse = scene.tweens.add({
    targets: lantern,
    alpha: { from: 0.6, to: 1 },
    duration: 480,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [airHitbox(w, h, centerY), ceilingCurtainHitbox(w, centerY - h / 2)],
    triggerHitboxes: [],
    cleanup: () => lanternPulse.stop()
  };
}

/* -------- high: kelp_pillar -------- */

function buildKelpPillar(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const w = 80;
  const h = 230;
  const baseY = GROUND_Y;
  const topY = baseY - h;

  const g = scene.add.graphics();

  // Sombra
  g.fillStyle(0x000814, 0.5);
  g.fillEllipse(8, baseY - 2, w + 18, 12);

  // 3 colunas de kelp entrelaçadas
  for (let col = 0; col < 3; col++) {
    const cx = -w / 4 + col * (w / 4);
    g.fillStyle(0x1a4a2a, 1);
    g.fillRoundedRect(cx - 10, topY, 20, h, 8);
    // Highlight
    g.fillStyle(0x2a8a4a, 0.85);
    g.fillRoundedRect(cx - 7, topY + 4, 4, h - 8, 2);
  }

  // Folhas largas (kelp blades)
  g.fillStyle(0x2a8a4a, 1);
  for (let i = 0; i < 7; i++) {
    const ly = topY + 30 + i * ((h - 60) / 6);
    const dir = i % 2 === 0 ? 1 : -1;
    // Folha grande oval
    g.beginPath();
    g.moveTo(0, ly);
    g.lineTo(dir * 38, ly - 8);
    g.lineTo(dir * 50, ly + 4);
    g.lineTo(dir * 38, ly + 16);
    g.lineTo(0, ly + 6);
    g.closePath();
    g.fillPath();
    // Veia central
    g.lineStyle(1.5, 0x1a4a2a, 1);
    g.beginPath();
    g.moveTo(0, ly + 4);
    g.lineTo(dir * 46, ly + 4);
    g.strokePath();
  }

  // Bolhinhas grudadas no kelp (life)
  g.fillStyle(0xc0e0ff, 0.8);
  for (let i = 0; i < 6; i++) {
    const bx = ((i * 17) % w) - w / 2;
    const by = topY + 20 + ((i * 41) % (h - 40));
    g.fillCircle(bx, by, 2);
  }

  // Cardume pequeno (3 peixinhos cinza)
  g.fillStyle(0xc0e0ff, 1);
  for (const fish of [{ x: -36, y: topY + 60 }, { x: 30, y: topY + 110 }, { x: -30, y: topY + 160 }]) {
    g.fillEllipse(fish.x, fish.y, 8, 4);
    g.beginPath();
    g.moveTo(fish.x + 4, fish.y);
    g.lineTo(fish.x + 8, fish.y - 2);
    g.lineTo(fish.x + 8, fish.y + 2);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x000814, 1);
    g.fillCircle(fish.x - 2, fish.y, 1);
    g.fillStyle(0xc0e0ff, 1);
  }

  container.add(g);

  // Sway sutil (kelp balança no fluxo)
  const sway = scene.tweens.add({
    targets: g,
    angle: { from: -3, to: 3 },
    duration: 1600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    hitboxes: [wallHitbox(w, h)],
    triggerHitboxes: [],
    cleanup: () => sway.stop()
  };
}

/* -------- gap: coral_arch -------- */

function buildCoralArch(
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

  // ==== CORAL TOPO (laranja-rosa) ====
  g.fillStyle(0x6a1a3a, 1);
  g.fillRect(-w / 2, 0, w, topH - 12);
  // Coral branching
  g.fillStyle(0xff6b9b, 1);
  for (let i = 0; i < 5; i++) {
    const cx = -w / 2 + 12 + i * ((w - 24) / 4);
    g.fillCircle(cx, topH - 14 - ((i * 7) % 6), 11);
    g.fillCircle(cx + 4, topH - 24 - ((i * 5) % 8), 8);
    g.fillCircle(cx - 4, topH - 32 - ((i * 11) % 8), 6);
  }
  // Pólipos brilhantes
  g.fillStyle(0xfff8c0, 0.85);
  for (let i = 0; i < 8; i++) {
    const px = -w / 2 + 8 + i * ((w - 16) / 7);
    const py = topH - 20 - ((i * 13) % 14);
    g.fillCircle(px, py, 1.5);
  }

  // ==== CORAL FUNDO (azul-magenta) ====
  g.fillStyle(0x4a1a6a, 1);
  g.fillRect(-w / 2, botStart + 12, w, botH - 12);
  g.fillStyle(0xa06cd5, 1);
  for (let i = 0; i < 5; i++) {
    const cx = -w / 2 + 12 + i * ((w - 24) / 4);
    g.fillCircle(cx, botStart + 14 + ((i * 7) % 6), 11);
    g.fillCircle(cx + 4, botStart + 24 + ((i * 5) % 8), 8);
    g.fillCircle(cx - 4, botStart + 32 + ((i * 11) % 8), 6);
  }
  g.fillStyle(0xc0e0ff, 0.85);
  for (let i = 0; i < 8; i++) {
    const px = -w / 2 + 8 + i * ((w - 16) / 7);
    const py = botStart + 20 + ((i * 13) % 14);
    g.fillCircle(px, py, 1.5);
  }

  // Bolhas subindo no gap
  g.fillStyle(0xc0e0ff, 0.7);
  for (let i = 0; i < 4; i++) {
    g.fillCircle(((i * 13) % 40) - 20, opening + ((i * 17) % 60) - 30, 1.6);
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

/* -------- dynamic: jellyfish -------- */

function buildJellyfish(scene: Phaser.Scene, container: Phaser.GameObjects.Container): TrapInstance {
  const baseY = 360;
  const moveAmp = 110;
  const moveFreq = 1.0 + Math.random() * 0.4;
  const movePhase = Math.random() * Math.PI * 2;

  const body = scene.add.graphics();

  // Halo bioluminescente
  body.fillStyle(0xc080ff, 0.22);
  body.fillCircle(0, 0, 50);
  body.fillStyle(0xa06cd5, 0.36);
  body.fillCircle(0, 0, 32);

  // Cúpula (parte de cima da medusa)
  body.fillStyle(0xc080ff, 0.7);
  body.fillEllipse(0, -8, 56, 38);
  body.fillStyle(0xe8c8ff, 0.85);
  body.fillEllipse(0, -14, 44, 24);
  body.fillStyle(0xffffff, 0.55);
  body.fillEllipse(-6, -18, 18, 8);

  // Borda da cúpula (rim ondulado)
  body.lineStyle(2, 0x6a3a8a, 0.85);
  body.beginPath();
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const ax = -28 + t * 56;
    const ay = 8 + Math.sin(t * Math.PI * 4) * 3;
    if (i === 0) body.moveTo(ax, ay);
    else body.lineTo(ax, ay);
  }
  body.strokePath();

  // Tentáculos (urticantes)
  body.lineStyle(2, 0xc080ff, 0.85);
  for (let i = 0; i < 7; i++) {
    const tx = -22 + i * (44 / 6);
    body.beginPath();
    body.moveTo(tx, 8);
    body.lineTo(tx + Math.sin(i) * 4, 28);
    body.lineTo(tx - Math.sin(i + 1) * 4, 48);
    body.lineTo(tx + Math.sin(i + 2) * 4, 70);
    body.strokePath();
    body.fillStyle(0xff6b9b, 0.85);
    body.fillCircle(tx + Math.sin(i + 2) * 4, 70, 2);
  }

  body.x = 0;
  body.y = baseY;
  container.add(body);

  // Pulso da cúpula (sobe/abaixa)
  const cupolaPulse = scene.tweens.add({
    targets: body,
    scaleY: { from: 0.95, to: 1.05 },
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const w = 60;
  const h = 90;
  const hitbox = { x: -w / 2, y: baseY - 14, w, h };

  return {
    hitboxes: [hitbox],
    triggerHitboxes: [],
    update: (time) => {
      const t = time / 1000;
      const offset = Math.sin(t * moveFreq + movePhase) * moveAmp;
      body.y = baseY + offset;
      hitbox.y = body.y - 14;
    },
    cleanup: () => cupolaPulse.stop()
  };
}

/* -------- registry -------- */

const SEA_TRAPS: TrapDef[] = [
  {
    id: 'sea_urchin_field',
    category: 'ground',
    biome: 'sea',
    damageOnSlideOnly: true,
    build: buildUrchinField
  },
  {
    id: 'sea_anglerfish',
    category: 'low',
    biome: 'sea',
    build: buildAnglerfish
  },
  {
    id: 'sea_kelp_pillar',
    category: 'high',
    biome: 'sea',
    build: buildKelpPillar
  },
  {
    id: 'sea_coral_arch',
    category: 'gap',
    biome: 'sea',
    build: buildCoralArch
  },
  {
    id: 'sea_jellyfish',
    category: 'dynamic',
    biome: 'sea',
    build: buildJellyfish
  }
];

export function registerSeaTraps(): void {
  registerTraps(SEA_TRAPS);
  for (const t of SEA_TRAPS) {
    addToPalette('sea', t.category as 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable', t.id);
  }
}
