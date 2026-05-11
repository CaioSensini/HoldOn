/**
 * Geração procedural de arte placeholder em runtime.
 * Cada função adiciona uma textura ao cache do Phaser via CanvasTexture.
 *
 * Substituível depois: basta colocar o arquivo real no path correspondente
 * (ex: public/assets/images/player/rock.png) — o PreloadScene tenta carregar
 * o real primeiro, e cai no placeholder em caso de 404.
 */

import { WORLD } from '../config';
import { Colors } from '../theme/colors';

type Scene = Phaser.Scene;

function makeTexture(
  scene: Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
}

function hexToCss(hex: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgb(${r},${g},${b})`;
}

function rgbaCss(hex: number, alpha: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

function shadowCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function strokeRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ---------- PLAYER ---------- */

export function makePlayerTexture(scene: Scene, key = 'player_default'): void {
  makeTexture(scene, key, 64, 64, (ctx) => {
    shadowCircle(ctx, 32, 32, 32, rgbaCss(Colors.accent.cyan, 0.35));
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToCss(Colors.bg.primary);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(26, 26, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ---------- OBSTACLES (AAA bespoke artwork) ---------- */

interface ObstacleSpec {
  key: string;
  width: number;
  height: number;
}

/**
 * Specs apenas pra dimensão das texturas. O desenho é específico por
 * obstáculo (`make<Type>Texture`) — gradientes, sombras, highlights,
 * detalhes próprios pra dar a vibe AAA.
 */
export const OBSTACLE_SPECS: Record<string, ObstacleSpec> = {
  wall_high: { key: 'obs_wall_high', width: 64, height: 224 },
  beam_low: { key: 'obs_beam_low', width: 224, height: 68 },
  pit: { key: 'obs_pit', width: 224, height: 96 },
  moving_vertical: { key: 'obs_moving', width: 96, height: 96 },
  narrow_gap_top: { key: 'obs_gap_top', width: 88, height: 240 },
  narrow_gap_bot: { key: 'obs_gap_bot', width: 88, height: 240 },
  combo_seq: { key: 'obs_combo', width: 68, height: 192 },
  breakable: { key: 'obs_breakable', width: 88, height: 88 },
  slide_gate: { key: 'obs_slide_gate', width: 248, height: 64 },
  bonus_hole: { key: 'obs_bonus_hole', width: 260, height: 72 },
  pipe_exit: { key: 'obs_pipe_exit', width: 170, height: 132 }
};

export function makeObstacleTextures(scene: Scene): void {
  makeWallHighTexture(scene);
  makeBeamLowTexture(scene);
  makePitTexture(scene);
  makeMovingVerticalTexture(scene);
  makeNarrowGapTopTexture(scene);
  makeNarrowGapBotTexture(scene);
  makeComboSeqTexture(scene);
  makeBreakableTexture(scene);
  makeSlideGateTexture(scene);
  makeLegacyHoleTexture(scene);
  makeLegacyPipeTexture(scene);
}

/** WALL_HIGH — muro de pedra com tijolos, musgo, rachaduras e topo dentado. */
function makeWallHighTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.wall_high;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;

    // Sombra inferior projetada (depth)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 4, w / 2 + 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo do muro - gradient pedra
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#3a342c');
    grad.addColorStop(0.5, '#5a5046');
    grad.addColorStop(1, '#3a342c');
    ctx.fillStyle = grad;
    strokeRound(ctx, 2, 8, w - 4, h - 12, 6);
    ctx.fill();

    // Topo dentado (pedras pontudas no topo)
    ctx.fillStyle = '#2a241e';
    for (let i = 0; i < 5; i++) {
      const cx = (i + 0.5) * (w / 5);
      const peak = 4 + ((i * 13) % 6);
      ctx.beginPath();
      ctx.moveTo(cx - 7, 12);
      ctx.lineTo(cx, 12 - peak);
      ctx.lineTo(cx + 7, 12);
      ctx.closePath();
      ctx.fill();
    }

    // Tijolos (3 fileiras de 2, alternando offset)
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.5;
    const rowH = (h - 24) / 6;
    for (let row = 0; row < 6; row++) {
      const y = 14 + row * rowH;
      // Linha horizontal de junta
      ctx.beginPath();
      ctx.moveTo(2, y);
      ctx.lineTo(w - 2, y);
      ctx.stroke();
      // Junta vertical (alterna posição entre fileiras)
      const vx = row % 2 === 0 ? w / 2 : w / 3;
      ctx.beginPath();
      ctx.moveTo(vx, y);
      ctx.lineTo(vx, y + rowH);
      ctx.stroke();
      const vx2 = row % 2 === 0 ? null : (2 * w) / 3;
      if (vx2) {
        ctx.beginPath();
        ctx.moveTo(vx2, y);
        ctx.lineTo(vx2, y + rowH);
        ctx.stroke();
      }
    }

    // Rachaduras (3 linhas finas zigzag)
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 3; c++) {
      const x0 = (c + 1) * (w / 4);
      let y = 20 + c * 30;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      for (let s = 0; s < 5; s++) {
        const dx = (s % 2 === 0 ? 1 : -1) * (3 + (s % 2));
        ctx.lineTo(x0 + dx, y + 12);
        y += 12;
      }
      ctx.stroke();
    }

    // Musgo (manchas verde escuro no topo dos tijolos)
    ctx.fillStyle = 'rgba(60,90,40,0.55)';
    ctx.beginPath();
    ctx.ellipse(w * 0.3, 16, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.7, 18, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, 14, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight superior — luz vinda de cima
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    strokeRound(ctx, 4, 12, w - 8, 18, 4);
    ctx.fill();
  });
}

/** BEAM_LOW — laser horizontal vermelho-incandescente com glow e arcos. */
function makeBeamLowTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.beam_low;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;

    // Glow outer (gradient radial vertical)
    const outerGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.7);
    outerGrad.addColorStop(0, 'rgba(255,80,80,0.55)');
    outerGrad.addColorStop(1, 'rgba(255,80,80,0)');
    ctx.fillStyle = outerGrad;
    ctx.fillRect(0, 0, w, h);

    // Beam principal (núcleo vermelho-branco)
    const coreH = h * 0.45;
    const coreY = (h - coreH) / 2;
    const coreGrad = ctx.createLinearGradient(0, coreY, 0, coreY + coreH);
    coreGrad.addColorStop(0, '#ff8888');
    coreGrad.addColorStop(0.5, '#ffffff');
    coreGrad.addColorStop(1, '#ff8888');
    ctx.fillStyle = coreGrad;
    strokeRound(ctx, 8, coreY, w - 16, coreH, coreH / 2);
    ctx.fill();

    // Linha branca super-brilhante no centro
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(8, h / 2 - 1.5, w - 16, 3);

    // Terminais (cápsulas escuras nas pontas)
    ctx.fillStyle = '#3a1a1a';
    strokeRound(ctx, 0, h * 0.18, 18, h * 0.64, 6);
    ctx.fill();
    strokeRound(ctx, w - 18, h * 0.18, 18, h * 0.64, 6);
    ctx.fill();
    ctx.strokeStyle = '#ff4040';
    ctx.lineWidth = 2;
    strokeRound(ctx, 0, h * 0.18, 18, h * 0.64, 6);
    ctx.stroke();
    strokeRound(ctx, w - 18, h * 0.18, 18, h * 0.64, 6);
    ctx.stroke();

    // Pontos de descarga elétrica (pequenas faíscas dispersas)
    ctx.fillStyle = 'rgba(255,255,200,0.85)';
    for (let i = 0; i < 8; i++) {
      const x = 24 + ((i * 197) % (w - 48));
      const y = h / 2 + (((i * 31) % 14) - 7);
      ctx.fillRect(x, y, 2, 1);
    }
  });
}

/** PIT — buraco com espinhos de aço, sombra profunda, gotas vermelhas. */
function makePitTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.pit;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;

    // Borda do buraco (gradient marrom escuro)
    const rimGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    rimGrad.addColorStop(0, '#3a2a1a');
    rimGrad.addColorStop(1, '#1a0e08');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // Profundidade interna (negrume gradient)
    const insideGrad = ctx.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h * 0.55, w * 0.55);
    insideGrad.addColorStop(0, '#000000');
    insideGrad.addColorStop(0.7, 'rgba(0,0,0,0.85)');
    insideGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = insideGrad;
    ctx.fillRect(0, 0, w, h * 0.85);

    // Espinhos de aço (8 espalhados, alturas variadas)
    const spikes = 9;
    for (let i = 0; i < spikes; i++) {
      const cx = ((i + 0.5) / spikes) * w;
      const baseY = h * 0.78 + ((i * 17) % 8);
      const tipY = h * 0.18 + ((i * 23) % 18);
      const halfW = 5 + ((i * 11) % 4);
      // Sombra esquerda (escuro)
      const grad = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
      grad.addColorStop(0, '#1a1c20');
      grad.addColorStop(0.45, '#7a8090');
      grad.addColorStop(0.55, '#dde0e8');
      grad.addColorStop(1, '#3a3e48');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - halfW, baseY);
      ctx.lineTo(cx, tipY);
      ctx.lineTo(cx + halfW, baseY);
      ctx.closePath();
      ctx.fill();
      // Gota vermelha na ponta (sangue)
      ctx.fillStyle = '#c8202a';
      ctx.beginPath();
      ctx.arc(cx, tipY + 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight da borda superior (luz pega no rim)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(2, h * 0.6 + 1, w - 4, 2);
  });
}

/** MOVING_VERTICAL — serra circular com dentes e bolts. */
function makeMovingVerticalTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.moving_vertical;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;
    const cx = w / 2;
    const cy = h / 2;
    const rOuter = Math.min(w, h) / 2 - 2;
    const rTeeth = rOuter - 2;
    const rDisc = rOuter - 12;
    const rHub = 10;

    // Dentes da serra
    const teeth = 18;
    ctx.fillStyle = '#dde0e8';
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const tipR = rTeeth + 5;
      ctx.lineTo(cx + Math.cos(a) * tipR, cy + Math.sin(a) * tipR);
      const a2 = a + Math.PI / teeth;
      ctx.lineTo(cx + Math.cos(a2) * rTeeth, cy + Math.sin(a2) * rTeeth);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a3e48';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Disco central (gradient cinza)
    const discGrad = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, rDisc);
    discGrad.addColorStop(0, '#dde0e8');
    discGrad.addColorStop(0.7, '#7a8090');
    discGrad.addColorStop(1, '#3a3e48');
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, rDisc, 0, Math.PI * 2);
    ctx.fill();

    // Recortes triangulares no disco (estética moderna de serra)
    ctx.fillStyle = '#1a1c20';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (rDisc - 4), cy + Math.sin(a) * (rDisc - 4));
      ctx.lineTo(
        cx + Math.cos(a + 0.18) * (rDisc - 4),
        cy + Math.sin(a + 0.18) * (rDisc - 4)
      );
      ctx.lineTo(cx + Math.cos(a + 0.09) * (rHub + 2), cy + Math.sin(a + 0.09) * (rHub + 2));
      ctx.closePath();
      ctx.fill();
    }

    // Hub central com bolt
    ctx.fillStyle = '#1a1c20';
    ctx.beginPath();
    ctx.arc(cx, cy, rHub, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a8090';
    ctx.beginPath();
    ctx.arc(cx, cy, rHub - 3, 0, Math.PI * 2);
    ctx.fill();

    // Sangue salpicado em alguns dentes
    ctx.fillStyle = 'rgba(200,32,40,0.7)';
    for (let i = 0; i < 4; i++) {
      const a = ((i * 7) / teeth) * Math.PI * 2;
      const sx = cx + Math.cos(a) * (rTeeth + 3);
      const sy = cy + Math.sin(a) * (rTeeth + 3);
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** NARROW_GAP_TOP — estalactites pontudas (rocha hangering down). */
function makeNarrowGapTopTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.narrow_gap_top;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;

    // Corpo principal — rocha gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#3a2a4a');
    grad.addColorStop(0.7, '#5a3a6a');
    grad.addColorStop(1, '#2a1a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h - 16);

    // Estalactites na borda inferior (4-5 pontas)
    const stalCount = 4;
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.moveTo(0, h - 16);
    for (let i = 0; i < stalCount; i++) {
      const x = ((i + 0.5) / stalCount) * w;
      const tipY = h - 2 - ((i * 13) % 6);
      ctx.lineTo(x - 8, h - 16);
      ctx.lineTo(x, tipY);
      ctx.lineTo(x + 8, h - 16);
    }
    ctx.lineTo(w, h - 16);
    ctx.closePath();
    ctx.fill();

    // Highlights nas estalactites (luz lateral)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < stalCount; i++) {
      const x = ((i + 0.5) / stalCount) * w;
      const tipY = h - 2 - ((i * 13) % 6);
      ctx.beginPath();
      ctx.moveTo(x - 6, h - 14);
      ctx.lineTo(x - 1, tipY - 4);
      ctx.lineTo(x - 2, h - 14);
      ctx.closePath();
      ctx.fill();
    }

    // Textura rochosa (manchas escuras no corpo)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 12; i++) {
      const px = ((i * 53) % w);
      const py = ((i * 71) % (h - 30));
      const r = 2 + ((i * 7) % 4);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Linha clara de iluminação no topo (céu vindo)
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(2, 2, w - 4, 6);
  });
}

/** NARROW_GAP_BOT — estalagmites apontando para cima (espelhado de TOP). */
function makeNarrowGapBotTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.narrow_gap_bot;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;

    // Corpo
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2a1a3a');
    grad.addColorStop(0.3, '#5a3a6a');
    grad.addColorStop(1, '#3a2a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 16, w, h - 16);

    // Estalagmites na borda superior (apontando pra cima)
    const stalCount = 4;
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.moveTo(0, 16);
    for (let i = 0; i < stalCount; i++) {
      const x = ((i + 0.5) / stalCount) * w;
      const tipY = 2 + ((i * 13) % 6);
      ctx.lineTo(x - 8, 16);
      ctx.lineTo(x, tipY);
      ctx.lineTo(x + 8, 16);
    }
    ctx.lineTo(w, 16);
    ctx.closePath();
    ctx.fill();

    // Highlights
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < stalCount; i++) {
      const x = ((i + 0.5) / stalCount) * w;
      const tipY = 2 + ((i * 13) % 6);
      ctx.beginPath();
      ctx.moveTo(x - 6, 14);
      ctx.lineTo(x - 1, tipY + 4);
      ctx.lineTo(x - 2, 14);
      ctx.closePath();
      ctx.fill();
    }

    // Textura
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 12; i++) {
      const px = ((i * 53) % w);
      const py = 30 + ((i * 71) % (h - 40));
      const r = 2 + ((i * 7) % 4);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** COMBO_SEQ — pilar com runas brilhantes + cristal no topo. */
function makeComboSeqTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.combo_seq;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;

    // Pilar — gradient escuro
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#2a1a3a');
    grad.addColorStop(0.5, '#4a2a5a');
    grad.addColorStop(1, '#2a1a3a');
    ctx.fillStyle = grad;
    strokeRound(ctx, 4, 4, w - 8, h - 4, 8);
    ctx.fill();

    // Runas brilhantes (3 símbolos verticais)
    const runeColors = ['#ff6b6b', '#ffd166', '#4dd6ff'];
    for (let i = 0; i < 3; i++) {
      const ry = 24 + i * (h / 3.5);
      ctx.fillStyle = runeColors[i];
      ctx.shadowColor = runeColors[i];
      ctx.shadowBlur = 8;
      ctx.fillRect(w / 2 - 12, ry, 24, 3);
      ctx.fillRect(w / 2 - 4, ry + 6, 8, 12);
      ctx.fillRect(w / 2 - 12, ry + 18, 24, 3);
      ctx.shadowBlur = 0;
    }

    // Cristal no topo (gemstone)
    ctx.fillStyle = '#9eebff';
    ctx.beginPath();
    ctx.moveTo(w / 2, 2);
    ctx.lineTo(w / 2 + 10, 14);
    ctx.lineTo(w / 2, 22);
    ctx.lineTo(w / 2 - 10, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, 8);
    ctx.lineTo(w / 2, 4);
    ctx.lineTo(w / 2 + 4, 8);
    ctx.lineTo(w / 2, 14);
    ctx.closePath();
    ctx.fill();

    // Borda externa
    ctx.strokeStyle = '#1a0a2a';
    ctx.lineWidth = 2;
    strokeRound(ctx, 4, 4, w - 8, h - 4, 8);
    ctx.stroke();
  });
}

/** BREAKABLE — cristal amarelo facetado com rachaduras. */
function makeBreakableTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.breakable;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;
    const cx = w / 2;
    const cy = h / 2;

    // Corpo do cristal — gradient amarelo
    const grad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, w * 0.55);
    grad.addColorStop(0, '#fff5a0');
    grad.addColorStop(0.6, '#ffd23f');
    grad.addColorStop(1, '#a07a10');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(w - 6, cy - 6);
    ctx.lineTo(w - 4, cy + 8);
    ctx.lineTo(cx + 4, h - 4);
    ctx.lineTo(cx - 6, h - 6);
    ctx.lineTo(4, cy + 6);
    ctx.lineTo(8, cy - 8);
    ctx.closePath();
    ctx.fill();

    // Facetas (linhas internas pra dar 3D ao cristal)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx, h - 4);
    ctx.moveTo(8, cy);
    ctx.lineTo(w - 8, cy);
    ctx.moveTo(cx, 4);
    ctx.lineTo(8, cy);
    ctx.moveTo(cx, 4);
    ctx.lineTo(w - 8, cy);
    ctx.moveTo(cx, h - 4);
    ctx.lineTo(8, cy);
    ctx.moveTo(cx, h - 4);
    ctx.lineTo(w - 8, cy);
    ctx.stroke();

    // Rachaduras (signaling "quebrável")
    ctx.strokeStyle = 'rgba(60,30,0,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy - 14);
    ctx.lineTo(cx - 4, cy - 4);
    ctx.lineTo(cx - 10, cy + 8);
    ctx.lineTo(cx + 6, cy + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 8);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx + 12, cy + 12);
    ctx.stroke();

    // Glints brancos
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 12, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 12, cy + 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** SLIDE_GATE — barreira de energia ciano com 2 lasers e terminais. */
function makeSlideGateTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.slide_gate;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    const w = spec.width;
    const h = spec.height;

    // Glow ambiente cyan
    const glowGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h);
    glowGrad.addColorStop(0, 'rgba(78,205,196,0.6)');
    glowGrad.addColorStop(1, 'rgba(78,205,196,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Terminal esquerdo
    ctx.fillStyle = '#1a3a3a';
    strokeRound(ctx, 0, 4, 22, h - 8, 6);
    ctx.fill();
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    strokeRound(ctx, 0, 4, 22, h - 8, 6);
    ctx.stroke();
    // LED do terminal
    ctx.fillStyle = '#9eebff';
    ctx.beginPath();
    ctx.arc(11, h / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Terminal direito
    ctx.fillStyle = '#1a3a3a';
    strokeRound(ctx, w - 22, 4, 22, h - 8, 6);
    ctx.fill();
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    strokeRound(ctx, w - 22, 4, 22, h - 8, 6);
    ctx.stroke();
    ctx.fillStyle = '#9eebff';
    ctx.beginPath();
    ctx.arc(w - 11, h / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Lasers horizontais (2 linhas brilhantes)
    for (let i = 0; i < 2; i++) {
      const ly = h * (0.32 + i * 0.36);
      // Glow
      ctx.fillStyle = 'rgba(78,205,196,0.6)';
      ctx.fillRect(22, ly - 3, w - 44, 6);
      // Core branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(22, ly - 1, w - 44, 2);
    }

    // Pontos de descarga elétrica entre os lasers
    ctx.fillStyle = 'rgba(180,255,250,0.8)';
    for (let i = 0; i < 6; i++) {
      const x = 32 + ((i * 213) % (w - 64));
      const y = h / 2 + (((i * 37) % 8) - 4);
      ctx.fillRect(x, y, 2, 1);
    }
  });
}

/**
 * Texturas legadas (bonus_hole / pipe_exit). Esses dois agora são desenhados
 * direto no Obstacle.ts via Graphics — não usam estas texturas. Mantidas pra
 * compat com OBSTACLE_SPECS, mas o sprite é trocado por um stroke pequeno.
 */
function makeLegacyHoleTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.bonus_hole;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, spec.width, spec.height);
  });
}

function makeLegacyPipeTexture(scene: Scene): void {
  const spec = OBSTACLE_SPECS.pipe_exit;
  makeTexture(scene, spec.key, spec.width, spec.height, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, spec.width, spec.height);
  });
}

/* ---------- COINS ---------- */

interface CoinSpec {
  key: string;
  outer: number;
  inner: number;
  rim: number;
}

export const COIN_SPECS: Record<string, CoinSpec> = {
  bronze: { key: 'coin_bronze', outer: 0xcd7f32, inner: 0xe09a4f, rim: 0x6a3f15 },
  silver: { key: 'coin_silver', outer: 0xc0c0c0, inner: 0xe6e6e6, rim: 0x6a6a6a },
  gold: { key: 'coin_gold', outer: Colors.accent.yellow, inner: 0xfff0a0, rim: Colors.accent.yellowDark },
  diamond: { key: 'coin_diamond', outer: 0x6ee0ff, inner: 0xb6f4ff, rim: 0x1577a0 },
  legendary: { key: 'coin_legendary', outer: Colors.accent.purple, inner: 0xffc6ff, rim: 0x6a1a8a }
};

export function makeCoinTextures(scene: Scene): void {
  for (const spec of Object.values(COIN_SPECS)) {
    makeTexture(scene, spec.key, 32, 32, (ctx) => {
      const cx = 16;
      const cy = 16;
      const grd = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 14);
      grd.addColorStop(0, hexToCss(spec.inner));
      grd.addColorStop(1, hexToCss(spec.outer));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToCss(spec.rim);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/* ---------- POWERUPS ---------- */

interface PowerUpSpec {
  key: string;
  color: number;
  glyph: string;
}

export const POWERUP_SPECS: Record<string, PowerUpSpec> = {
  rocket: { key: 'pu_rocket', color: Colors.powerups.rocket, glyph: '➤' },
  shield: { key: 'pu_shield', color: Colors.powerups.shield, glyph: '◈' },
  magnet: { key: 'pu_magnet', color: Colors.powerups.magnet, glyph: 'U' },
  coins2x: { key: 'pu_coins2x', color: Colors.powerups.coins2x, glyph: '×2' },
  slowmo: { key: 'pu_slowmo', color: Colors.powerups.slowmo, glyph: '◷' },
  phantom: { key: 'pu_phantom', color: Colors.powerups.phantom, glyph: '◯' },
  revive: { key: 'pu_revive', color: Colors.powerups.revive, glyph: '+' },
  coinrain: { key: 'pu_coinrain', color: Colors.powerups.coinrain, glyph: '☂' },
  mini: { key: 'pu_mini', color: Colors.powerups.mini, glyph: '↧' }
};

export function makePowerUpTextures(scene: Scene): void {
  for (const spec of Object.values(POWERUP_SPECS)) {
    makeTexture(scene, spec.key, 48, 48, (ctx) => {
      const cx = 24;
      const cy = 24;
      const grd = ctx.createRadialGradient(cx - 4, cy - 6, 2, cx, cy, 22);
      grd.addColorStop(0, 'rgba(255,255,255,0.5)');
      grd.addColorStop(0.4, hexToCss(spec.color));
      grd.addColorStop(1, rgbaCss(spec.color, 0.85));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexToCss(Colors.bg.primary);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.glyph, cx, cy + 1);
    });
  }
}

/* ---------- TRAILS ---------- */

export const TRAIL_SPECS: Record<string, number> = {
  default: Colors.accent.yellow,
  fire: 0xff6b00,
  sparkle: Colors.accent.yellow,
  rainbow: 0xff66ff,
  smoke: Colors.text.secondary
};

export function makeTrailTextures(scene: Scene): void {
  for (const [name, color] of Object.entries(TRAIL_SPECS)) {
    const key = `trail_${name}`;
    makeTexture(scene, key, 24, 24, (ctx) => {
      const grd = ctx.createRadialGradient(12, 12, 1, 12, 12, 12);
      grd.addColorStop(0, hexToCss(color));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 24, 24);
    });
  }
}

/* ---------- SKINS ---------- */

interface SkinSpec {
  key: string;
  color: number;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
}

export const SKIN_SPECS: Record<string, SkinSpec> = {
  rock: { key: 'skin_rock', color: 0xcfd8dc, shape: 'circle' },
  arrow: { key: 'skin_arrow', color: Colors.accent.cyan, shape: 'triangle' },
  coin: { key: 'skin_coin', color: Colors.accent.yellow, shape: 'circle' },
  donut: { key: 'skin_donut', color: 0xff8ad6, shape: 'circle' },
  leaf: { key: 'skin_leaf', color: Colors.accent.green, shape: 'diamond' },
  drop: { key: 'skin_drop', color: 0x4ddba0, shape: 'circle' },
  dice: { key: 'skin_dice', color: 0xeeeeee, shape: 'square' },
  heart: { key: 'skin_heart', color: Colors.accent.coral, shape: 'circle' },
  boomerang: { key: 'skin_boomerang', color: Colors.accent.purple, shape: 'triangle' },
  kunai: { key: 'skin_kunai', color: 0x999999, shape: 'diamond' },
  crystal: { key: 'skin_crystal', color: 0x6ee0ff, shape: 'diamond' },
  lightning: { key: 'skin_lightning', color: Colors.accent.yellow, shape: 'star' },
  fireball: { key: 'skin_fireball', color: 0xff6b00, shape: 'star' },
  star: { key: 'skin_star', color: Colors.accent.yellow, shape: 'star' },
  rainbow_pulse: { key: 'skin_rainbow', color: 0xff66ff, shape: 'circle' }
};

export function makeSkinTextures(scene: Scene): void {
  for (const spec of Object.values(SKIN_SPECS)) {
    makeTexture(scene, spec.key, 64, 64, (ctx) => {
      const cx = 32;
      const cy = 32;
      shadowCircle(ctx, cx, cy, 32, 'rgba(255,255,255,0.18)');
      ctx.fillStyle = hexToCss(spec.color);
      ctx.strokeStyle = hexToCss(Colors.bg.primary);
      ctx.lineWidth = 3;
      switch (spec.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(cx, cy, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'square':
          ctx.fillRect(cx - 22, cy - 22, 44, 44);
          ctx.strokeRect(cx - 22, cy - 22, 44, 44);
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(cx, cy - 24);
          ctx.lineTo(cx + 22, cy + 18);
          ctx.lineTo(cx - 22, cy + 18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(cx, cy - 24);
          ctx.lineTo(cx + 22, cy);
          ctx.lineTo(cx, cy + 24);
          ctx.lineTo(cx - 22, cy);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'star': {
          const spikes = 5;
          const outer = 24;
          const inner = 11;
          let rot = (Math.PI / 2) * 3;
          const step = Math.PI / spikes;
          ctx.beginPath();
          ctx.moveTo(cx, cy - outer);
          for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
            rot += step;
          }
          ctx.lineTo(cx, cy - outer);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 7, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/* ---------- PARTICLE ---------- */

export function makeParticleTextures(scene: Scene): void {
  makeTexture(scene, 'spark', 16, 16, (ctx) => {
    const grd = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.5, hexToCss(Colors.accent.yellow));
    grd.addColorStop(1, rgbaCss(Colors.accent.yellow, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 16, 16);
  });
  makeTexture(scene, 'pixel', 4, 4, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 4, 4);
  });
}

/* ---------- BIOME PARALLAX (4 camadas) ---------- */

interface BiomePalette {
  sky: number;
  far: number;
  mid: number;
  ground: number;
  accent: number;
}

const BIOME_PALETTES: Record<string, BiomePalette> = {
  forest: Colors.biomes.forest,
  cave: Colors.biomes.cave,
  temple: Colors.biomes.temple,
  sea: Colors.biomes.sea,
  beach: Colors.biomes.beach,
  volcano: Colors.biomes.volcano,
  citadel: Colors.biomes.citadel,
  space: Colors.biomes.space
};

/**
 * Para cada bioma, gera 4 texturas de camada:
 *   bg_<id>_sky      — gradient céu (1280x720)
 *   bg_<id>_far      — silhuetas distantes (1280x320)
 *   bg_<id>_mid      — montanhas/médios (1280x260)
 *   bg_<id>_fg       — decorações foreground (1280x180)
 *
 * Todas tile-able horizontalmente (último pixel = primeiro).
 */
/**
 * Por default gera SÓ os biomas iniciais (forest + cave) — economiza ~16
 * texturas grandes (1280x720 sky + 1280x320 far + 1280x260 mid + 1280x180 fg
 * = ~3M pixels por bioma × 8 biomas = 25M pixels) durante o preload.
 * Os demais biomas são gerados lazy ao entrar via `ensureBiomeTextures()`.
 */
export function makeBiomeBackdrops(scene: Scene, ids: string[] = ['forest', 'cave']): void {
  for (const id of ids) {
    const p = BIOME_PALETTES[id];
    if (!p) continue;
    drawSky(scene, `bg_${id}_sky`, id, p);
    drawFar(scene, `bg_${id}_far`, id, p);
    drawMid(scene, `bg_${id}_mid`, id, p);
    drawForeground(scene, `bg_${id}_fg`, id, p);
    // legacy single bg (fallback) — usado pela home se não montar parallax
    drawSky(scene, `bg_${id}`, id, p, true);
  }
}

/**
 * Gera as 5 texturas (sky/far/mid/fg/ceiling) de UM bioma sob demanda.
 * No-op se as texturas já existem. Chamado pelo BiomeManager.crossfadeTo()
 * antes de instanciar as TileSprites do bioma novo.
 */
export function ensureBiomeTextures(scene: Scene, biomeId: string): void {
  const p = BIOME_PALETTES[biomeId];
  if (!p) return;
  if (!scene.textures.exists(`bg_${biomeId}_sky`)) {
    drawSky(scene, `bg_${biomeId}_sky`, biomeId, p);
  }
  if (!scene.textures.exists(`bg_${biomeId}_far`)) {
    drawFar(scene, `bg_${biomeId}_far`, biomeId, p);
  }
  if (!scene.textures.exists(`bg_${biomeId}_mid`)) {
    drawMid(scene, `bg_${biomeId}_mid`, biomeId, p);
  }
  if (!scene.textures.exists(`bg_${biomeId}_fg`)) {
    drawForeground(scene, `bg_${biomeId}_fg`, biomeId, p);
  }
  if (!scene.textures.exists(`bg_${biomeId}`)) {
    drawSky(scene, `bg_${biomeId}`, biomeId, p, true);
  }
  if (!scene.textures.exists(`bg_${biomeId}_ceiling`)) {
    drawCeiling(scene, `bg_${biomeId}_ceiling`, biomeId);
  }
}

function drawSky(scene: Scene, key: string, id: string, p: BiomePalette, withSilhouette = false): void {
  makeTexture(scene, key, 1280, 720, (ctx) => {
    const grd = ctx.createLinearGradient(0, 0, 0, 720);
    grd.addColorStop(0, hexToCss(p.sky));
    grd.addColorStop(1, hexToCss(p.mid));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1280, 720);

    // Sol/lua/estrelas conforme bioma
    if (id === 'forest') {
      ctx.fillStyle = 'rgba(255,255,200,0.8)';
      ctx.beginPath();
      ctx.arc(960, 180, 70, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'cave') {
      // pontos de luz dispersos
      ctx.fillStyle = 'rgba(180,150,200,0.7)';
      for (let i = 0; i < 30; i++) {
        const x = (i * 137) % 1280;
        const y = (i * 71) % 400;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'temple') {
      // sol grande baixo
      const grdSun = ctx.createRadialGradient(960, 320, 30, 960, 320, 200);
      grdSun.addColorStop(0, 'rgba(255,230,150,0.95)');
      grdSun.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = grdSun;
      ctx.fillRect(700, 100, 600, 500);
    } else if (id === 'space') {
      // estrelas
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 80; i++) {
        const x = (i * 191) % 1280;
        const y = (i * 113) % 600;
        const s = Math.random() * 1.6 + 0.4;
        ctx.globalAlpha = 0.4 + Math.random() * 0.6;
        ctx.fillRect(x, y, s, s);
      }
      ctx.globalAlpha = 1;
      // nebulosa
      const grdNeb = ctx.createRadialGradient(360, 240, 20, 360, 240, 280);
      grdNeb.addColorStop(0, 'rgba(120,80,200,0.4)');
      grdNeb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grdNeb;
      ctx.fillRect(0, 0, 800, 600);
    } else if (id === 'sea') {
      // bolhas subindo + raios de luz solar penetrando a água
      ctx.fillStyle = 'rgba(180,230,255,0.5)';
      for (let i = 0; i < 50; i++) {
        const x = (i * 73) % 1280;
        const y = (i * 41) % 720;
        ctx.beginPath();
        ctx.arc(x, y, 2 + ((i * 5) % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      // raios de luz vindos do topo
      ctx.fillStyle = 'rgba(180,220,255,0.12)';
      for (let i = 0; i < 6; i++) {
        const lx = 100 + i * 200;
        ctx.beginPath();
        ctx.moveTo(lx - 8, 0);
        ctx.lineTo(lx + 80, 720);
        ctx.lineTo(lx + 100, 720);
        ctx.lineTo(lx + 12, 0);
        ctx.closePath();
        ctx.fill();
      }
    } else if (id === 'beach') {
      // sol grande + nuvens fofas + gaivotas
      const grdSun3 = ctx.createRadialGradient(960, 200, 30, 960, 200, 180);
      grdSun3.addColorStop(0, 'rgba(255,250,200,1)');
      grdSun3.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = grdSun3;
      ctx.fillRect(720, 40, 480, 320);
      // nuvens
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 5; i++) {
        const cx = (i * 247) % 1280;
        const cy = 90 + ((i * 31) % 60);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 70 + (i % 3) * 16, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 30, cy - 8, 50, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // gaivotas (M's pretos pequenos)
      ctx.strokeStyle = '#1a2a3a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const gx = 200 + i * 220;
        const gy = 200 + ((i * 17) % 60);
        ctx.beginPath();
        ctx.moveTo(gx - 8, gy + 4);
        ctx.lineTo(gx, gy);
        ctx.lineTo(gx + 8, gy + 4);
        ctx.stroke();
      }
    } else if (id === 'volcano') {
      // explosões de lava no horizonte + cinzas
      const grdLava = ctx.createRadialGradient(640, 520, 40, 640, 520, 360);
      grdLava.addColorStop(0, 'rgba(255,140,40,0.7)');
      grdLava.addColorStop(0.6, 'rgba(180,40,20,0.4)');
      grdLava.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grdLava;
      ctx.fillRect(280, 280, 720, 440);
      ctx.fillStyle = 'rgba(255,210,140,0.5)';
      for (let i = 0; i < 50; i++) {
        const x = (i * 89) % 1280;
        const y = (i * 47) % 360;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + ((i * 7) % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'citadel') {
      // alto céu + nuvens longas + sol distante
      const grdSun2 = ctx.createRadialGradient(960, 220, 40, 960, 220, 180);
      grdSun2.addColorStop(0, 'rgba(255,240,200,0.9)');
      grdSun2.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = grdSun2;
      ctx.fillRect(720, 60, 480, 360);
      ctx.fillStyle = 'rgba(220,230,250,0.42)';
      for (let i = 0; i < 6; i++) {
        const cx = (i * 219) % 1280;
        const cy = 130 + ((i * 41) % 80);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 90 + (i % 3) * 18, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (withSilhouette) {
      ctx.fillStyle = rgbaCss(p.mid, 0.7);
      ctx.beginPath();
      ctx.moveTo(0, 540);
      for (let x = 0; x <= 1280; x += 80) {
        ctx.lineTo(x, 540 - 60 * Math.sin(x * 0.01));
      }
      ctx.lineTo(1280, 720);
      ctx.lineTo(0, 720);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function drawFar(scene: Scene, key: string, id: string, p: BiomePalette): void {
  makeTexture(scene, key, 1280, 320, (ctx) => {
    ctx.clearRect(0, 0, 1280, 320);
    ctx.fillStyle = rgbaCss(p.far, 0.55);
    ctx.beginPath();
    ctx.moveTo(0, 320);
    let x = 0;
    while (x < 1280) {
      const w = 80 + Math.sin(x * 0.013) * 30;
      const h = 120 + Math.sin(x * 0.02) * 60;
      ctx.lineTo(x + w / 2, 320 - h);
      x += w;
    }
    ctx.lineTo(1280, 320);
    ctx.closePath();
    ctx.fill();
    void id;
  });
}

function drawMid(scene: Scene, key: string, id: string, p: BiomePalette): void {
  makeTexture(scene, key, 1280, 260, (ctx) => {
    ctx.clearRect(0, 0, 1280, 260);
    ctx.fillStyle = hexToCss(p.mid);
    // Montanhas/colinas mais próximas
    ctx.beginPath();
    ctx.moveTo(0, 260);
    for (let x = 0; x <= 1280; x += 60) {
      const peak = 80 + Math.abs(Math.sin(x * 0.014 + 1.3)) * 100;
      ctx.lineTo(x, 260 - peak);
    }
    ctx.lineTo(1280, 260);
    ctx.closePath();
    ctx.fill();
    // outline
    ctx.strokeStyle = rgbaCss(Colors.bg.primary, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 260);
    for (let x = 0; x <= 1280; x += 60) {
      const peak = 80 + Math.abs(Math.sin(x * 0.014 + 1.3)) * 100;
      ctx.lineTo(x, 260 - peak);
    }
    ctx.stroke();
    // Decorações por bioma
    if (id === 'forest') {
      ctx.fillStyle = rgbaCss(Colors.accent.green, 0.6);
      for (let i = 0; i < 20; i++) {
        const x = (i * 71) % 1280;
        const y = 200 + ((i * 17) % 30);
        ctx.beginPath();
        ctx.arc(x, y, 8 + (i % 3) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function drawForeground(scene: Scene, key: string, id: string, p: BiomePalette): void {
  makeTexture(scene, key, 1280, 180, (ctx) => {
    ctx.clearRect(0, 0, 1280, 180);
    // Cluster de elementos pequenos esparsos (efeito de profundidade)
    ctx.fillStyle = rgbaCss(p.accent, 0.55);
    for (let i = 0; i < 18; i++) {
      const x = (i * 73) % 1280;
      const y = ((i * 23) % 60) + 40;
      const size = 4 + (i % 4) * 2;
      ctx.beginPath();
      if (id === 'space') {
        ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
      } else if (id === 'sea') {
        // peixinhos / corais (forma vertical alongada)
        ctx.ellipse(x, y, size * 0.5, size * 1.2, 0, 0, Math.PI * 2);
      } else if (id === 'beach') {
        // conchas / pedrinhas
        ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      } else if (id === 'volcano') {
        // chamas pequenas
        ctx.moveTo(x, y);
        ctx.lineTo(x - size, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
      } else {
        // folhas/cristais
        ctx.ellipse(x, y, size * 1.2, size * 0.6, 0.6, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  });
}

/* ---------- BIOME CEILING (limite superior visível) ---------- */

/**
 * Para cada bioma, gera uma textura de teto tile-able (1280×120) com
 * a vibe específica: copa da floresta, estalactites de pedra, vigas
 * de templo, etc. Usada como TileSprite no topo da tela pelo BiomeManager.
 */
/** Por default gera só forest/cave — demais lazy via ensureBiomeTextures. */
export function makeBiomeCeilings(scene: Scene, ids: string[] = ['forest', 'cave']): void {
  for (const id of ids) {
    if (!BIOME_PALETTES[id]) continue;
    drawCeiling(scene, `bg_${id}_ceiling`, id);
  }
}

function drawCeiling(scene: Scene, key: string, id: string): void {
  const w = 1280;
  const h = 120;
  makeTexture(scene, key, w, h, (ctx) => {
    ctx.clearRect(0, 0, w, h);
    if (id === 'forest') {
      // Copa de árvores — folhagem verde irregular
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a3a1f');
      grad.addColorStop(1, '#2a5a30');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h - 24);
      // Manchas de folhas mais claras
      ctx.fillStyle = 'rgba(80,150,70,0.6)';
      for (let i = 0; i < 24; i++) {
        const cx = (i * 53) % w;
        const cy = (i * 23) % (h - 30);
        ctx.beginPath();
        ctx.arc(cx, cy, 14 + ((i * 7) % 5), 0, Math.PI * 2);
        ctx.fill();
      }
      // Folhas pendendo na borda inferior
      ctx.fillStyle = '#1a3a1f';
      for (let x = 0; x < w; x += 28) {
        ctx.beginPath();
        ctx.arc(x, h - 20, 14 + ((x * 0.07) % 6), 0, Math.PI);
        ctx.fill();
      }
    } else if (id === 'cave') {
      // Rocha com estalactites pendendo
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a1622');
      grad.addColorStop(1, '#3d2645');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h - 22);
      // Textura de pedra
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      for (let i = 0; i < 30; i++) {
        const cx = (i * 71) % w;
        const cy = (i * 13) % (h - 30);
        ctx.beginPath();
        ctx.arc(cx, cy, 4 + ((i * 5) % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      // Estalactites na borda inferior
      ctx.fillStyle = '#2a1f33';
      for (let x = 0; x < w; x += 36) {
        const peak = 14 + ((x * 0.041) % 10);
        ctx.beginPath();
        ctx.moveTo(x - 12, h - 22);
        ctx.lineTo(x, h - 22 + peak);
        ctx.lineTo(x + 12, h - 22);
        ctx.closePath();
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(x - 8, h - 20);
        ctx.lineTo(x - 1, h - 22 + peak * 0.7);
        ctx.lineTo(x - 2, h - 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2a1f33';
      }
    } else if (id === 'temple') {
      // Pedra com vigas/colunas e ornamentos dourados
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#3a2b1a');
      grad.addColorStop(1, '#6a4a20');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h - 12);
      // Vigas de pedra (verticais)
      ctx.fillStyle = '#2a1f10';
      for (let x = 0; x < w; x += 80) {
        ctx.fillRect(x, 0, 12, h - 12);
      }
      // Faixa dourada com glifos
      ctx.fillStyle = '#a07a3a';
      ctx.fillRect(0, h - 30, w, 8);
      ctx.fillStyle = '#ffd166';
      for (let x = 0; x < w; x += 24) {
        ctx.fillRect(x + 4, h - 28, 4, 4);
      }
      // Borda inferior
      ctx.fillStyle = '#1a0e08';
      ctx.fillRect(0, h - 12, w, 12);
    } else if (id === 'sea') {
      // Superfície da água vista de baixo — ondas, luz solar penetrando
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a3258');
      grad.addColorStop(1, '#1a5a8a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h - 16);
      // Ondas (linhas onduladas brilhantes)
      ctx.strokeStyle = 'rgba(180,220,255,0.55)';
      ctx.lineWidth = 2;
      for (let row = 0; row < 3; row++) {
        const yLine = 14 + row * 24;
        ctx.beginPath();
        ctx.moveTo(0, yLine);
        for (let x = 0; x <= w; x += 16) {
          ctx.lineTo(x, yLine + Math.sin(x * 0.04 + row) * 4);
        }
        ctx.stroke();
      }
      // Bolhas
      ctx.fillStyle = 'rgba(220,240,255,0.65)';
      for (let i = 0; i < 24; i++) {
        const cx = (i * 53) % w;
        const cy = (i * 17) % (h - 20);
        ctx.beginPath();
        ctx.arc(cx, cy, 2 + ((i * 3) % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      // Borda inferior — superfície ondulada
      ctx.fillStyle = '#0a3258';
      ctx.beginPath();
      ctx.moveTo(0, h - 16);
      for (let x = 0; x <= w; x += 12) {
        ctx.lineTo(x, h - 16 + Math.sin(x * 0.06) * 4);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    } else if (id === 'beach') {
      // Céu de praia — gradiente azul claro com nuvens fofas
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#88c8e8');
      grad.addColorStop(1, '#b8e0f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Nuvens
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 261) % w);
        const cy = 30 + ((i * 19) % 40);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 70, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 30, cy - 10, 50, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - 28, cy + 4, 44, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Pássaros (M's pretos)
      ctx.strokeStyle = 'rgba(20,40,60,0.7)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const bx = 100 + i * 280;
        const by = 80 + ((i * 23) % 30);
        ctx.beginPath();
        ctx.moveTo(bx - 6, by + 3);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + 6, by + 3);
        ctx.stroke();
      }
    } else if (id === 'volcano') {
      // Rocha vulcânica com lava escorrendo
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a0606');
      grad.addColorStop(0.6, '#3a1810');
      grad.addColorStop(1, '#6a2a18');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h - 24);
      // Linhas de lava quente brilhante (rachaduras incandescentes)
      ctx.strokeStyle = 'rgba(255,140,40,0.85)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const xStart = (i * 213) % w;
        const yStart = (i * 17) % (h - 40);
        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xStart + 60, yStart + 14);
        ctx.lineTo(xStart + 130, yStart + 22);
        ctx.stroke();
      }
      // Gotas de lava penduradas (estalactites de magma)
      for (let x = 0; x < w; x += 64) {
        const drop = 18 + ((x * 0.073) % 12);
        // Forma da gota
        ctx.fillStyle = '#3a0a05';
        ctx.beginPath();
        ctx.moveTo(x - 8, h - 24);
        ctx.lineTo(x, h - 24 + drop);
        ctx.lineTo(x + 8, h - 24);
        ctx.closePath();
        ctx.fill();
        // Núcleo brilhante
        ctx.fillStyle = '#ff7820';
        ctx.beginPath();
        ctx.moveTo(x - 4, h - 22);
        ctx.lineTo(x, h - 24 + drop - 2);
        ctx.lineTo(x + 4, h - 22);
        ctx.closePath();
        ctx.fill();
        // Highlight branco
        ctx.fillStyle = 'rgba(255,240,200,0.7)';
        ctx.beginPath();
        ctx.arc(x - 1, h - 18, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'citadel') {
      // Vigas de aço/cristal com céu rachado (anuncia a quebra final)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#14223a');
      grad.addColorStop(1, '#445a8a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h - 16);
      // Vigas estruturais (X-bracing)
      ctx.strokeStyle = '#2a3a5a';
      ctx.lineWidth = 4;
      for (let x = 0; x < w; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 8);
        ctx.lineTo(x + 100, h - 20);
        ctx.moveTo(x + 100, 8);
        ctx.lineTo(x, h - 20);
        ctx.stroke();
      }
      // Pontos de luz nos cruzamentos (rivets)
      ctx.fillStyle = '#9ec4ff';
      for (let x = 50; x < w; x += 100) {
        ctx.beginPath();
        ctx.arc(x, h / 2 - 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Borda inferior reforçada
      ctx.fillStyle = '#1a2a44';
      ctx.fillRect(0, h - 16, w, 16);
      ctx.fillStyle = '#445a8a';
      for (let x = 0; x < w; x += 24) {
        ctx.fillRect(x + 4, h - 12, 16, 8);
      }
    } else if (id === 'space') {
      // Space sem teto sólido — apenas estrelas distantes (escondido por
      // ceilingHidden no BiomeManager, mas mantido por compat).
      ctx.fillStyle = 'rgba(20,16,40,0.4)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const x = (i * 191) % w;
        const y = (i * 113) % h;
        const s = 1 + ((i * 7) % 3) * 0.4;
        ctx.fillRect(x, y, s, s);
      }
    }
  });
}

/* ---------- UI ---------- */

export function makeUITextures(scene: Scene): void {
  makeTexture(scene, 'ui_btn', 240, 64, (ctx) => {
    ctx.fillStyle = '#ffffff';
    strokeRound(ctx, 0, 0, 240, 64, 24);
    ctx.fill();
  });
  makeTexture(scene, 'ui_panel', 320, 200, (ctx) => {
    ctx.fillStyle = '#ffffff';
    strokeRound(ctx, 0, 0, 320, 200, 28);
    ctx.fill();
  });
}

/* ---------- ROAD (cobblestone 3D tile-able) ---------- */

/**
 * Textura do chão/rua estilo cobblestone com efeito 3D — biséis em cada
 * pedra, highlight superior, sombra inferior, mortar entre pedras.
 *
 * Tile-able horizontalmente (240px largura). Aplicada como TileSprite
 * em BiomeManager com tint do groundColor do bioma — assim cada bioma
 * tem sua cor de calçamento mas o padrão 3D é compartilhado.
 *
 * Cores são near-white pra que tint multiplicativo do Phaser produza
 * exatamente a cor do bioma (white * tint = tint).
 */
export function makeRoadTexture(scene: Scene): void {
  // Altura proporcional ao ROAD_HEIGHT — mantém o desenho calibrado pra
  // qualquer altura (3 fileiras pra 84px, 4 pra 116px). O bottom gradient
  // mantém 9px no fim, independente da altura.
  const W = 240;
  const H = WORLD.ROAD_HEIGHT;
  const stoneH = 22;
  const rowGap = 3;
  const topPad = 5;
  const botPad = 9;
  const usable = H - topPad - botPad;
  const rowCount = Math.max(1, Math.floor((usable + rowGap) / (stoneH + rowGap)));

  makeTexture(scene, 'bg_road', W, H, (ctx) => {
    // === Base: near-white (multiplicado pelo tint do bioma) ===
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, W, H);

    // === Edge superior: highlight forte (catches a luz) ===
    const topGrad = ctx.createLinearGradient(0, 0, 0, topPad);
    topGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
    topGrad.addColorStop(1, 'rgba(255,255,255,0.2)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, topPad);

    // === Cobblestones — fileiras com offset alternado ===
    const startY = topPad + 1;
    const stoneW = 36;
    const stonePeriod = 40;

    for (let row = 0; row < rowCount; row++) {
      const rowY = startY + row * (stoneH + rowGap);
      const offset = (row % 2) * 20; // alternating row offset

      for (let col = -1; col <= 7; col++) {
        const sx = col * stonePeriod + offset;

        // Stone body — leve variação de tom por pedra
        const variation = ((row * 7 + col * 3) % 5);
        const grayValue = 218 + variation * 6; // 218-242 (near-white range)
        ctx.fillStyle = `rgb(${grayValue},${grayValue},${grayValue})`;
        ctx.fillRect(sx, rowY, stoneW, stoneH);

        // Top highlight (3px, lit edge)
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(sx, rowY, stoneW, 3);

        // Bottom shadow (3px, depth)
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(sx, rowY + stoneH - 3, stoneW, 3);

        // Left bevel (lit, 2px)
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(sx, rowY + 1, 2, stoneH - 2);

        // Right bevel (shadow, 2px)
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(sx + stoneW - 2, rowY + 1, 2, stoneH - 2);
      }

      // Mortar entre pedras (vertical, dark)
      ctx.fillStyle = '#3a3530';
      for (let col = -1; col <= 7; col++) {
        const sx = col * stonePeriod + offset + stoneW;
        ctx.fillRect(sx, rowY, stonePeriod - stoneW, stoneH);
      }

      // Mortar entre fileiras (horizontal, dark)
      if (row < rowCount) {
        ctx.fillStyle = '#3a3530';
        ctx.fillRect(0, rowY + stoneH, W, rowGap);
      }
    }

    // === Bottom shadow gradient (profundidade do chão) ===
    const botY = H - botPad;
    const botGrad = ctx.createLinearGradient(0, botY, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    botGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, botY, W, botPad);

    // === Cracks/desgaste sutis em algumas pedras ===
    ctx.fillStyle = 'rgba(60,60,60,0.55)';
    const crackPositions = [
      { x: 18, y: 12 },
      { x: 76, y: 36 },
      { x: 142, y: 16 },
      { x: 192, y: 60 },
      { x: 224, y: 38 }
    ];
    for (const c of crackPositions) {
      ctx.fillRect(c.x, c.y, 5, 1.5);
      ctx.fillRect(c.x + 3, c.y + 1, 3, 1);
    }

    // === Pequenas pedras/pebbles ===
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const pebbles = [
      { x: 32, y: 18 },
      { x: 88, y: 42 },
      { x: 116, y: 14 },
      { x: 168, y: 58 },
      { x: 208, y: 30 }
    ];
    for (const p of pebbles) {
      ctx.fillRect(p.x, p.y, 1.5, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(p.x + 0.5, p.y + 0.5, 1, 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
    }
  });
}

/* ---------- SUBTERRANEAN (layer permanente abaixo do chão) ---------- */

/**
 * Textura tileable estilo "subsolo medieval/sewer" — tijolos com argamassa,
 * raízes pendentes na parte superior, e ocasional cano/musgo. Usada como
 * fundo do mundo subterrâneo, sempre presente embaixo do chão.
 *
 * Tile 320×160 — repete horizontalmente. Não tile vertical pra preservar
 * detalhes específicos no topo (raízes) e fundo (sombras).
 */
export function makeSubterraneanTexture(scene: Scene): void {
  makeTexture(scene, 'bg_subterranean', 320, 160, (ctx) => {
    // === BASE: gradiente terra/dirt do top pro bottom ===
    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, '#1a1410'); // mais claro no topo
    grad.addColorStop(0.5, '#0e0908');
    grad.addColorStop(1, '#080604'); // mais escuro no fundo
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 320, 160);

    // === RAÍZES pendentes do topo (5 raízes irregulares) ===
    const rootColor = '#2a1c12';
    ctx.strokeStyle = rootColor;
    ctx.lineWidth = 3;
    const rootStarts = [22, 78, 145, 210, 280];
    for (const sx of rootStarts) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      // raiz curva descendo
      const len = 8 + (sx % 11);
      ctx.bezierCurveTo(sx + 4, 4, sx - 6, len * 0.6, sx + 2, len);
      ctx.stroke();
      // ponta da raiz
      ctx.fillStyle = rootColor;
      ctx.beginPath();
      ctx.arc(sx + 2, len, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // === TIJOLOS — 4 fileiras com offset alternado ===
    const brickW = 64;
    const brickH = 28;
    const startY = 14; // depois das raízes
    const brickColor = '#352a1f';
    const brickHighlight = 'rgba(255, 200, 140, 0.08)';
    const brickShadow = 'rgba(0, 0, 0, 0.55)';

    for (let row = 0; row < 5; row++) {
      const rowY = startY + row * brickH;
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col <= 5; col++) {
        const bx = col * brickW + offset + 2;
        const by = rowY + 2;
        const bw = brickW - 4;
        const bh = brickH - 4;
        // corpo
        ctx.fillStyle = brickColor;
        ctx.fillRect(bx, by, bw, bh);
        // highlight superior
        ctx.fillStyle = brickHighlight;
        ctx.fillRect(bx, by, bw, 3);
        // sombra inferior
        ctx.fillStyle = brickShadow;
        ctx.fillRect(bx, by + bh - 3, bw, 3);
      }
    }

    // === ARGAMASSA — linhas escuras entre fileiras ===
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    for (let row = 0; row <= 5; row++) {
      ctx.fillRect(0, startY + row * brickH, 320, 2);
    }

    // === CANO VERTICAL (decoração) — 1 cano à esquerda ===
    const pipeX = 50;
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(pipeX, 0, 14, 160);
    // Highlight do cano
    ctx.fillStyle = 'rgba(180, 200, 220, 0.18)';
    ctx.fillRect(pipeX + 2, 0, 3, 160);
    // Sombra do cano
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(pipeX + 11, 0, 3, 160);
    // Junções (anéis horizontais)
    ctx.fillStyle = '#1a2028';
    ctx.fillRect(pipeX - 2, 50, 18, 6);
    ctx.fillRect(pipeX - 2, 110, 18, 6);

    // === MUSGO/MANCHAS verdes em algumas pedras ===
    ctx.fillStyle = 'rgba(80, 110, 50, 0.25)';
    const mossSpots = [
      { x: 180, y: 30, r: 8 },
      { x: 240, y: 70, r: 6 },
      { x: 110, y: 100, r: 10 },
      { x: 280, y: 130, r: 7 }
    ];
    for (const m of mossSpots) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // === PARTÍCULAS de poeira/desgaste ===
    ctx.fillStyle = 'rgba(255, 200, 140, 0.08)';
    for (let i = 0; i < 30; i++) {
      const px = (i * 47 + 13) % 320;
      const py = (i * 23 + 7) % 160;
      ctx.fillRect(px, py, 2, 2);
    }
  });
}

/* ---------- ALL ---------- */

export function generateAllPlaceholders(scene: Scene): void {
  makePlayerTexture(scene);
  makeObstacleTextures(scene);
  makeCoinTextures(scene);
  makePowerUpTextures(scene);
  makeTrailTextures(scene);
  makeSkinTextures(scene);
  makeParticleTextures(scene);
  makeBiomeBackdrops(scene);
  makeBiomeCeilings(scene);
  makeSubterraneanTexture(scene);
  makeRoadTexture(scene);
  makeUITextures(scene);
}
