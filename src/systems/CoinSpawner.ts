import Phaser from 'phaser';
import { GAME_WIDTH, WORLD } from '../config';
import { rollCoinTier, type BiomeDef } from '../data/BiomeDefs';
import { Coin } from '../entities/Coin';
import { Pool } from './Pool';

/**
 * Padrões de coin spawn — todos posicionados de forma INTENCIONAL
 * pra não sobrepor hitboxes de obstáculos. Veja `RunDirector` para
 * os offsets calibrados por segmento.
 *
 * Hitboxes-chave (referência):
 *   wall_high   → y 400-620, x ±30   (pula por cima)
 *   pit         → y 540-620, x ±110  (pula por cima)
 *   beam_low    → y 210-270, x ±110  (passa por baixo, no chão)
 *   slide_gate  → y 546-600, x ±120  (desliza por baixo, y > 600)
 *   narrow_gap  → 2 caixas com abertura em centerY (310/370/430)
 *   breakable   → y 540-620, x ±40   (quebra)
 *
 * Cave: Y range 656-1080. Padrões cave usam toda a faixa.
 */
export type ScriptedCoinPattern =
  | 'arch_over' // arco que sobe e desce, pra colher pulando sobre obstáculo
  | 'low_run' // linha rasteira y=608 (compatível com slide / chão)
  | 'mid_run' // linha mid-air y=380 (filler entre obstáculos)
  | 'gap_thread' // 5 coins atravessando a abertura de narrow_gap
  | 'reward_burst' // 3 fileiras 4×4 pós-breakable, recompensa generosa
  | 'wave_filler'; // onda suave preenchendo trecho aberto

export interface ScriptedCoinOpts {
  /** Para gap_thread: centro-Y da abertura. */
  centerY?: number;
}

/** Padrões usados dentro da cave. spawnTunnelSegment cicla entre eles. */
type CavePattern = 'cave_wave' | 'cave_arc' | 'cave_column';

const CAVE_TOP = WORLD.SUBTERRANEAN_TOP_Y + 30; // 686
const CAVE_BOTTOM = WORLD.SUBTERRANEAN_FLOOR_Y - 40; // 1040
const CAVE_MID = (CAVE_TOP + CAVE_BOTTOM) / 2; // 863

/**
 * Pool de moedas com padrões intencionais. RunDirector chama
 * `spawnScripted(pattern, biome, x, opts?)` na hora certa pra cada
 * segmento; nada é "spawnado aleatório por distância".
 */
export class CoinSpawner {
  private scene: Phaser.Scene;
  private pool = new Pool<Coin>(160);
  private caveCycle = 0;
  /** Offset Y de fase aplicado a CADA spawn (Sea: +720, Space: −720, surface: 0). */
  phaseYOffset = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  reset(): void {
    this.pool.forEachActive((c) => this.pool.release(c));
    this.caveCycle = 0;
    this.phaseYOffset = 0;
  }

  forEachActive(fn: (c: Coin) => void): void {
    this.pool.forEachActive(fn);
  }
  countActive(): number {
    return this.pool.countActive();
  }
  countTotal(): number {
    return this.pool.countTotal();
  }

  /**
   * Power-up coinrain. No subsolo distribui em toda a altura da cave;
   * na superfície usa a faixa jogável padrão. `count` é só uma sugestão.
   */
  spawnRain(biome: BiomeDef, count: number, inCave = false): void {
    const baseX = GAME_WIDTH + 40;
    if (inCave) {
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        // distribui em colunas alternadas (cima / baixo) pra não amontoar
        const yA = Phaser.Math.Linear(CAVE_TOP, CAVE_BOTTOM, t);
        const y = yA + Math.sin(i * 0.9) * 20;
        this.spawnCoin(baseX + i * 38, y, rollCoinTier(biome));
      }
      return;
    }
    // Superfície: linhas horizontais em 3 alturas (alto / mid / baixo).
    const lanes = [200, 380, 560];
    for (let i = 0; i < count; i++) {
      const y = lanes[i % lanes.length] + Math.sin(i * 0.7) * 10;
      this.spawnCoin(baseX + i * 36, y, rollCoinTier(biome));
    }
  }

  /**
   * Spawna um pacote de moedas dentro do túnel bonus. Cicla 3 layouts
   * pra cobrir a altura inteira da cave (não só o chão).
   */
  spawnTunnelSegment(biome: BiomeDef): void {
    const baseX = GAME_WIDTH + 40;
    const patterns: CavePattern[] = ['cave_wave', 'cave_arc', 'cave_column'];
    const pattern = patterns[this.caveCycle % patterns.length];
    this.caveCycle += 1;
    this.spawnCavePattern(pattern, biome, baseX);
  }

  /**
   * Linha guia pra saída do túnel — sobe da cave até o nível do chão.
   * Mantém a sensação de "siga as moedas pra subir".
   */
  spawnTunnelExitGuide(biome: BiomeDef, x = GAME_WIDTH + 24): void {
    for (let i = 0; i < 11; i++) {
      const t = i / 10;
      // arco subindo: começa fundo, sobe até o nível do chão
      const y = Phaser.Math.Linear(CAVE_BOTTOM, WORLD.SUBTERRANEAN_TOP_Y - 8, t);
      this.spawnCoin(x + i * 34, y + Math.sin(i * 0.7) * 5, rollCoinTier(biome));
    }
  }

  spawnScripted(
    pattern: ScriptedCoinPattern,
    biome: BiomeDef,
    x = GAME_WIDTH + 40,
    opts: ScriptedCoinOpts = {}
  ): void {
    switch (pattern) {
      case 'arch_over':
        this.spawnArchOver(biome, x);
        break;
      case 'low_run':
        this.spawnLowRun(biome, x);
        break;
      case 'mid_run':
        this.spawnMidRun(biome, x);
        break;
      case 'gap_thread':
        this.spawnGapThread(biome, x, opts.centerY ?? 370);
        break;
      case 'reward_burst':
        this.spawnRewardBurst(biome, x);
        break;
      case 'wave_filler':
        this.spawnWaveFiller(biome, x);
        break;
    }
  }

  step(dx: number, onMissed?: (c: Coin) => void): void {
    this.pool.forEachActive((c) => {
      c.update(dx);
      if (c.alive && c.sprite.x < -40) {
        onMissed?.(c);
        this.pool.release(c);
      }
    });
  }

  cleanupMissed(onMissed: (c: Coin) => void): void {
    this.pool.forEachActive((c) => {
      if (c.alive && c.sprite.x < -40) {
        onMissed(c);
        this.pool.release(c);
      }
    });
  }

  releaseCoin(c: Coin): void {
    this.pool.release(c);
  }

  shutdown(): void {
    this.pool.clear();
  }

  // ---------------- patterns (surface) ----------------

  /**
   * Arco de 7 moedas: 380 → 200 → 380. Largura = 7 × 38 = 266 px.
   * Calibrado pra que o pico fique sobre o obstáculo (wall_high / pit).
   */
  private spawnArchOver(biome: BiomeDef, x: number): void {
    const count = 7;
    const gap = 38;
    const startY = 380;
    const peakY = 200;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const y = startY - (startY - peakY) * Math.sin(t * Math.PI);
      this.spawnCoin(x + i * gap, y, rollCoinTier(biome));
    }
  }

  /**
   * Linha rasteira a y=616 — abaixo do slide_gate (hitbox 546-600,
   * sprite raio 14 → coin top y=602 > gate bottom 600, ZERO overlap visual).
   * Player prone (hitbox 606-634, centro 620) coleta sem desviar.
   */
  private spawnLowRun(biome: BiomeDef, x: number): void {
    const count = 7;
    const gap = 40;
    const y = 616;
    for (let i = 0; i < count; i++) {
      this.spawnCoin(x + i * gap, y, rollCoinTier(biome));
    }
  }

  /**
   * Linha mid-air a y=380 — bem abaixo dos beams (210-270) e bem acima
   * dos obstáculos de chão (wall y≥400, pit y≥540). Filler safe.
   */
  private spawnMidRun(biome: BiomeDef, x: number): void {
    const count = 7;
    const gap = 42;
    const y = 380;
    for (let i = 0; i < count; i++) {
      this.spawnCoin(x + i * gap, y, rollCoinTier(biome));
    }
  }

  /**
   * 5 moedas atravessando a abertura do narrow_gap. centerY vem do
   * RunDirector pra casar com openingCenterY do obstáculo. Amplitude
   * limitada a ±14 pra ficar bem dentro da abertura (gap=160 → margem 66).
   */
  private spawnGapThread(biome: BiomeDef, x: number, centerY: number): void {
    const count = 5;
    const gap = 38;
    for (let i = 0; i < count; i++) {
      const y = centerY + Math.sin(i * 0.9) * 14;
      this.spawnCoin(x + i * gap, y, rollCoinTier(biome));
    }
  }

  /**
   * 3 fileiras × 3 moedas — recompensa pós-breakable. Posicionada
   * SEMPRE depois do obstáculo (RunDirector calibra offset). Y rows
   * 560/460/360 — todas safe (acima do chão sem obstáculos próximos).
   */
  private spawnRewardBurst(biome: BiomeDef, x: number): void {
    const rows = [560, 460, 360];
    const cols = 3;
    const gap = 42;
    for (let r = 0; r < rows.length; r++) {
      for (let i = 0; i < cols; i++) {
        this.spawnCoin(x + i * gap + r * 10, rows[r], rollCoinTier(biome));
      }
    }
  }

  /** Onda suave centrada y=380 ±54. Filler longo sem obstáculo perto. */
  private spawnWaveFiller(biome: BiomeDef, x: number): void {
    const count = 8;
    const gap = 40;
    const cy = 380;
    const amp = 54;
    for (let i = 0; i < count; i++) {
      const y = cy + Math.sin(i * 0.75) * amp;
      this.spawnCoin(x + i * gap, y, rollCoinTier(biome));
    }
  }

  // ---------------- patterns (cave) ----------------

  private spawnCavePattern(pattern: CavePattern, biome: BiomeDef, x: number): void {
    switch (pattern) {
      case 'cave_wave':
        this.spawnCaveWave(biome, x);
        break;
      case 'cave_arc':
        this.spawnCaveArc(biome, x);
        break;
      case 'cave_column':
        this.spawnCaveColumn(biome, x);
        break;
    }
  }

  /** Onda senoidal cobrindo toda a cave. 10 coins, amp ~150 px. */
  private spawnCaveWave(biome: BiomeDef, x: number): void {
    const count = 10;
    const gap = 38;
    const amp = 150;
    for (let i = 0; i < count; i++) {
      const y = CAVE_MID + Math.sin(i * 0.65) * amp;
      this.spawnCoin(x + i * gap, y, rollCoinTier(biome));
    }
  }

  /** Arco grande: começa baixo, sobe ao topo da cave, desce. */
  private spawnCaveArc(biome: BiomeDef, x: number): void {
    const count = 9;
    const gap = 38;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const y = Phaser.Math.Linear(
        CAVE_BOTTOM - 30,
        CAVE_TOP + 10,
        Math.sin(t * Math.PI)
      );
      // Linear(a, b, sin(tπ)) — 0..1..0 ⇒ a..b..a (arco simétrico)
      this.spawnCoin(x + i * gap, y, rollCoinTier(biome));
    }
  }

  /** 2 colunas verticais (8 moedas cada) cobrindo a altura inteira. */
  private spawnCaveColumn(biome: BiomeDef, x: number): void {
    const count = 8;
    const colSpacing = 220;
    for (let col = 0; col < 2; col++) {
      const cx = x + col * colSpacing;
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const y = Phaser.Math.Linear(CAVE_TOP, CAVE_BOTTOM, t);
        this.spawnCoin(cx, y, rollCoinTier(biome));
      }
    }
  }

  // ---------------- core ----------------

  private spawnCoin(x: number, y: number, tier: ReturnType<typeof rollCoinTier>): Coin {
    const c = this.pool.acquire(() => new Coin(this.scene));
    // Aplica offset Y de fase: surface=0, sea=+720, space=−720.
    // CavePattern já tem offset implícito (CAVE_TOP=686 etc), mas se o
    // player estiver em Sea/Space, o phaseYOffset prevalece sobre tudo.
    c.reset(x, y + this.phaseYOffset, tier);
    return c;
  }
}
