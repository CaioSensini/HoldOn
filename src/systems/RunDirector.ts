import { GAME_WIDTH } from '../config';
import type { BiomeDef } from '../data/BiomeDefs';
import type { TrapBuildOptions, TrapCategory } from '../data/TrapDefs';
import { randInt, weightedPick } from '../utils/MathUtils';
import { CoinSpawner, type ScriptedCoinOpts, type ScriptedCoinPattern } from './CoinSpawner';
import { ObstacleSpawner } from './ObstacleSpawner';

type SegmentId =
  | 'warmup_lane'
  | 'climb_arc'
  | 'dive_pit'
  | 'slide_read'
  | 'over_under'
  | 'moving_wave'
  | 'precision_gap'
  | 'breakable_reward'
  | 'combo_flow'
  | 'bonus_offer'
  | 'ground_hazard';

interface SegmentDef {
  id: SegmentId;
  fromMeters: number;
  lengthMeters: number;
  weight: number;
  spawn: (ctx: SegmentContext) => void;
}

interface SegmentContext {
  meters: number;
  difficulty: number;
  biome: BiomeDef;
  director: RunDirector;
}

/**
 * Compõe segmentos de gameplay (encadeamento de obstáculos + coins).
 *
 * Após o refactor, os segmentos chamam `director.trap(offset, category, opts)`
 * em vez de tipos específicos. O ObstacleSpawner consulta a palette do bioma
 * atual e escolhe a variante temática.
 *
 * Categorias usadas:
 *   high     → obstáculo do chão até alto (jump-over)
 *   low      → suspenso no ar (slide-under)
 *   ground   → no chão (slide-only damage; jump-over safe)
 *   gap      → abertura vertical (thread)
 *   dynamic  → móvel (timing)
 *   breakable→ smashable pelo Rocket
 */
export class RunDirector {
  private obstacleSpawner: ObstacleSpawner;
  private coinSpawner: CoinSpawner;
  private nextSegmentAt = 12;
  private lastSegment: SegmentId | null = null;
  private nextBonusOfferAt = 850;
  private gapVariant = 0;

  constructor(obstacleSpawner: ObstacleSpawner, coinSpawner: CoinSpawner) {
    this.obstacleSpawner = obstacleSpawner;
    this.coinSpawner = coinSpawner;
  }

  reset(startMeters = 0): void {
    this.nextSegmentAt = startMeters + 12;
    this.lastSegment = null;
    this.nextBonusOfferAt = Math.max(850, startMeters + 650);
    this.gapVariant = 0;
  }

  update(currentMeters: number, difficulty: number, biome: BiomeDef): void {
    if (currentMeters < this.nextSegmentAt) return;
    const segment = this.pickSegment(currentMeters, difficulty);
    segment.spawn({ meters: currentMeters, difficulty, biome, director: this });
    this.lastSegment = segment.id;
    this.nextSegmentAt = currentMeters + segment.lengthMeters * this.spacingFor(difficulty);
    if (segment.id === 'bonus_offer') this.nextBonusOfferAt = currentMeters + randInt(950, 1350);
  }

  private pickSegment(currentMeters: number, difficulty: number): SegmentDef {
    const pool = SEGMENTS.filter((segment) => {
      if (currentMeters < segment.fromMeters) return false;
      if (segment.id === this.lastSegment) return false;
      if (segment.id === 'bonus_offer' && currentMeters < this.nextBonusOfferAt) return false;
      return true;
    });
    return weightedPick(
      pool.map((segment) => ({
        value: segment,
        weight: this.weightFor(segment, currentMeters, difficulty)
      }))
    );
  }

  private weightFor(segment: SegmentDef, currentMeters: number, difficulty: number): number {
    let weight = segment.weight;
    const phrase = Math.floor(currentMeters / 240) % 4;
    if (phrase === 0 && (segment.id === 'climb_arc' || segment.id === 'dive_pit')) weight *= 1.4;
    if (phrase === 1 && (segment.id === 'slide_read' || segment.id === 'bonus_offer')) weight *= 1.55;
    if (phrase === 2 && (segment.id === 'over_under' || segment.id === 'moving_wave')) weight *= 1.45;
    if (phrase === 3 && (segment.id === 'precision_gap' || segment.id === 'combo_flow')) weight *= 1.45;

    // Scaling por bioma
    if (difficulty >= 1.25) {
      if (['slide_read', 'over_under', 'precision_gap', 'ground_hazard'].includes(segment.id)) {
        weight *= 1 + (difficulty - 1.0) * 0.8;
      }
    }
    if (difficulty >= 1.55) {
      if (['combo_flow', 'moving_wave'].includes(segment.id)) {
        weight *= 1 + (difficulty - 1.0) * 0.9;
      }
      if (segment.id === 'warmup_lane') weight *= 0.3;
    }
    if (difficulty >= 1.85) {
      if (['precision_gap', 'combo_flow', 'ground_hazard'].includes(segment.id)) {
        weight *= 1.5;
      }
      if (['climb_arc', 'dive_pit'].includes(segment.id)) weight *= 0.65;
    }
    if (difficulty >= 2.2) {
      if (segment.id === 'bonus_offer') weight *= 0.6;
    }
    return weight;
  }

  /**
   * Spacing entre segmentos. Cai com a dificuldade — Forest tem espaço
   * generoso, Space/post-Space tem segmentos quase encadeados.
   */
  private spacingFor(difficulty: number): number {
    return Math.max(0.6, 1.04 - (difficulty - 1) * 0.22);
  }

  /**
   * Posiciona uma trap em offsetMeters do GAME_WIDTH. `category` decide
   * qual palette do bioma usar; opts repassa openingCenterY/comboIndex.
   * `currentMeters` = onde o RunDirector está (filtra fromMeters de defs).
   */
  trap(offsetMeters: number, category: TrapCategory, opts?: TrapBuildOptions, currentMeters = 0): void {
    this.obstacleSpawner.spawnByCategory(category, this.x(offsetMeters), opts, currentMeters);
  }

  /** Spawn de uma trap especial (bonus_hole). */
  bonusHole(offsetMeters: number, currentMeters = 0): void {
    this.obstacleSpawner.spawnBonusHole(this.x(offsetMeters), currentMeters);
  }

  /** Spawn de breakable (apenas Rocket destrói). */
  breakable(offsetMeters: number): void {
    this.obstacleSpawner.spawnSpecific('breakable', this.x(offsetMeters));
  }

  coins(
    offsetMeters: number,
    pattern: ScriptedCoinPattern,
    biome: BiomeDef,
    opts?: ScriptedCoinOpts
  ): void {
    this.coinSpawner.spawnScripted(pattern, biome, this.x(offsetMeters), opts);
  }

  x(offsetMeters: number): number {
    return GAME_WIDTH + offsetMeters * 10;
  }

  nextGapCenter(): number {
    const centers = [310, 370, 430];
    const center = centers[this.gapVariant % centers.length];
    this.gapVariant += 1;
    return center;
  }
}

/**
 * SEGMENTS — coreografia de gameplay. Cada segmento spawna obstáculos +
 * coins em offsets relativos ao GAME_WIDTH (offset * 10 = pixels).
 *
 * Os segmentos são INDEPENDENTES de bioma — usam categorias. O
 * ObstacleSpawner traduz pra arte temática do bioma atual.
 */
const SEGMENTS: SegmentDef[] = [
  {
    id: 'warmup_lane',
    fromMeters: 0,
    lengthMeters: 38,
    weight: 5,
    spawn: ({ biome, director }) => {
      // Sem obstáculo: linha mid-air pra praticar tap.
      director.coins(4, 'mid_run', biome);
    }
  },
  {
    id: 'climb_arc',
    fromMeters: 0,
    lengthMeters: 48,
    weight: 13,
    spawn: ({ biome, director, meters }) => {
      // High wall em 23m (jump por cima). Arco de coins.
      director.coins(11, 'arch_over', biome);
      director.trap(23, 'high', undefined, meters);
    }
  },
  {
    id: 'dive_pit',
    fromMeters: 100,
    lengthMeters: 52,
    weight: 12,
    spawn: ({ biome, director, meters }) => {
      // Ground trap em 28m (slide-only damage). Player precisa pular.
      director.coins(16, 'arch_over', biome);
      director.trap(28, 'ground', undefined, meters);
    }
  },
  {
    id: 'slide_read',
    fromMeters: 350,
    lengthMeters: 54,
    weight: 14,
    spawn: ({ biome, director, meters }) => {
      // Low (slide-under). low_run de coins passa por baixo.
      director.coins(20, 'low_run', biome);
      director.trap(32, 'low', undefined, meters);
    }
  },
  {
    id: 'over_under',
    fromMeters: 600,
    lengthMeters: 72,
    weight: 12,
    spawn: ({ biome, director, meters }) => {
      // Low em 20m + ground em 48m. Dois ritmos: slide → jump.
      director.coins(7, 'low_run', biome);
      director.coins(37, 'arch_over', biome);
      director.trap(20, 'low', undefined, meters);
      director.trap(48, 'ground', undefined, meters);
    }
  },
  {
    id: 'moving_wave',
    fromMeters: 1000,
    lengthMeters: 56,
    weight: 10,
    spawn: ({ director, meters }) => {
      // Dynamic — sem coins próximas (perigo móvel)
      director.trap(30, 'dynamic', undefined, meters);
    }
  },
  {
    id: 'bonus_offer',
    fromMeters: 1300,
    lengthMeters: 72,
    weight: 5,
    spawn: ({ director, meters }) => {
      director.bonusHole(34, meters);
    }
  },
  {
    id: 'precision_gap',
    fromMeters: 1700,
    lengthMeters: 58,
    weight: 10,
    spawn: ({ biome, director, meters }) => {
      const centerY = director.nextGapCenter();
      director.coins(22, 'gap_thread', biome, { centerY });
      director.trap(28, 'gap', { openingCenterY: centerY }, meters);
    }
  },
  {
    id: 'breakable_reward',
    fromMeters: 2300,
    lengthMeters: 54,
    weight: 7,
    spawn: ({ biome, director }) => {
      director.breakable(28);
      director.coins(38, 'reward_burst', biome);
    }
  },
  {
    id: 'combo_flow',
    fromMeters: 3500,
    lengthMeters: 82,
    weight: 8,
    spawn: ({ biome, director, meters }) => {
      // Encadeia 3-4 traps alternando high/low/ground (ritmo intenso)
      const count = randInt(3, 4);
      const cats: TrapCategory[] = ['high', 'low', 'ground', 'low'];
      for (let i = 0; i < count; i++) {
        director.trap(18 + i * 9, cats[i % cats.length], undefined, meters);
      }
      director.coins(56, 'wave_filler', biome);
    }
  },
  {
    id: 'ground_hazard',
    fromMeters: 800,
    lengthMeters: 50,
    weight: 9,
    spawn: ({ biome, director, meters }) => {
      // Foco em ground traps — força o jogador a pular precisamente
      director.coins(16, 'arch_over', biome);
      director.trap(22, 'ground', undefined, meters);
      director.trap(38, 'ground', undefined, meters);
    }
  }
];
