import Phaser from 'phaser';
import { GAME_WIDTH, PROGRESSION, WORLD } from '../config';
import type { BiomeId } from '../data/BiomeDefs';
import {
  BIOME_PALETTE,
  TRAP_DEFS,
  type TrapBuildOptions,
  type TrapCategory
} from '../data/TrapDefs';
import { Obstacle } from '../entities/Obstacle';
import { initializeTraps } from '../entities/traps';
import { randInt, randPick, weightedPick } from '../utils/MathUtils';
import { Pool } from './Pool';

/**
 * Pesos por categoria, usados quando o RunDirector deixa o spawner livre
 * pra escolher (pickRandom). RunDirector geralmente envia categoria
 * explícita via `spawnByCategory()`.
 */
interface CategoryWeight {
  category: TrapCategory;
  weight: number;
  fromMeters: number;
}

const CATEGORY_WEIGHTS: CategoryWeight[] = [
  { category: 'high',    weight: 12, fromMeters: 0 },
  { category: 'ground',  weight: 11, fromMeters: 0 },
  { category: 'low',     weight: 11, fromMeters: 180 },
  { category: 'dynamic', weight: 8,  fromMeters: 650 },
  { category: 'gap',     weight: 8,  fromMeters: 1200 },
  { category: 'breakable', weight: 6, fromMeters: 1500 }
];

/**
 * Spawner de armadilhas. Mantém um pool de `Obstacle` runtime containers
 * e os reusa. Decide o id da trap em duas modalidades:
 *
 *   • spawnRandom(meters, difficulty)  → escolhe categoria por peso e depois
 *                                         um id da palette do bioma atual
 *   • spawnByCategory(category, x, opts) → categoria fixa (chamado pelo
 *                                          RunDirector), id sorteado da palette
 *   • spawnSpecific(trapId, x, opts)   → id fixo (special traps, devbypass)
 *
 * Garante que initializeTraps() é chamado antes do primeiro pick — não
 * importa em que ordem o jogo carrega.
 */
export class ObstacleSpawner {
  private scene: Phaser.Scene;
  private pool = new Pool<Obstacle>(64);
  private nextSpawnAtMeters = 4;
  /** Última categoria spawnada — usado pra evitar repetição. */
  private lastCategory: TrapCategory | null = null;
  private nextBonusAllowedAt = 3500;

  /**
   * Offset Y aplicado a TODOS os spawns. Mudado pelo GameScene quando
   * o player troca de fase (Sea: +720, Space: −720, surface: 0).
   */
  phaseYOffset = 0;

  /** Bioma atual — define palette de variantes. */
  currentBiomeId: BiomeId = 'forest';

  constructor(scene: Phaser.Scene) {
    initializeTraps();
    this.scene = scene;
  }

  reset(): void {
    this.pool.forEachActive((o) => this.pool.release(o));
    this.nextSpawnAtMeters = 4;
    this.lastCategory = null;
    this.nextBonusAllowedAt = 900;
    this.phaseYOffset = 0;
    this.currentBiomeId = 'forest';
  }

  forEachActive(fn: (o: Obstacle) => void): void {
    this.pool.forEachActive(fn);
  }

  countActive(): number {
    return this.pool.countActive();
  }

  countTotal(): number {
    return this.pool.countTotal();
  }

  /**
   * Loop chamado pelo GameScene a cada frame. Quando RunDirector está
   * dirigindo o ritmo (segments), `update()` aqui complementa com spawns
   * filler — útil pra encher gaps largos.
   */
  update(currentMeters: number, difficulty: number): void {
    if (currentMeters >= this.nextSpawnAtMeters) {
      this.spawnRandom(currentMeters, difficulty);
      const gapPx = Math.max(
        PROGRESSION.GAP_PX_MIN,
        PROGRESSION.GAP_PX_BASE - PROGRESSION.GAP_PX_REDUCTION * Math.floor(currentMeters / 500) - difficulty * 14
      );
      const gapMeters = gapPx * 0.1;
      this.nextSpawnAtMeters = currentMeters + gapMeters;
    }
  }

  /**
   * Spawn aleatório: escolhe categoria por peso (filtrado por fromMeters),
   * depois um id da palette do bioma atual. Evita repetir a última categoria.
   */
  private spawnRandom(currentMeters: number, difficulty: number): void {
    const allowed = CATEGORY_WEIGHTS.filter((c) => currentMeters >= c.fromMeters);
    if (allowed.length === 0) return;
    let category = weightedPick(
      allowed.map((c) => ({
        value: c.category,
        weight: this.weightFor(c, currentMeters, difficulty)
      }))
    );
    if (category === this.lastCategory && allowed.length > 1) {
      const others = allowed.filter((c) => c.category !== this.lastCategory);
      category = randPick(others.map((c) => c.category));
    }
    const trapId = this.pickIdForCategory(category, currentMeters);
    if (!trapId) return;
    this.spawn(trapId, GAME_WIDTH + 80);
    this.lastCategory = category;
  }

  /**
   * Boost de peso por bioma — algumas categorias se encaixam melhor com
   * a estética/dificuldade da fase.
   */
  private weightFor(c: CategoryWeight, currentMeters: number, difficulty: number): number {
    let weight = c.weight;
    const phase = Math.floor(currentMeters / 180) % 5;
    if (phase === 0 && c.category === 'low') weight *= 1.6;
    if (phase === 1 && (c.category === 'high' || c.category === 'ground')) weight *= 1.5;
    if (phase === 2 && c.category === 'low') weight *= 1.4;
    if (phase === 3 && (c.category === 'dynamic' || c.category === 'gap')) weight *= 1.5;
    if (difficulty > 1.25 && c.category === 'gap') weight *= difficulty;
    if (difficulty > 1.5 && c.category === 'dynamic') weight *= difficulty * 0.85;
    return weight;
  }

  /**
   * Escolhe um trap id da palette do bioma atual para a categoria pedida.
   * Filtra por `fromMeters` do TrapDef (algumas traps só aparecem mais tarde).
   */
  private pickIdForCategory(category: TrapCategory, currentMeters: number): string | null {
    if (category === 'special') return null;
    const palette = BIOME_PALETTE[this.currentBiomeId];
    if (!palette) return null;
    const ids = palette[category as keyof typeof palette] ?? [];
    const eligible = ids.filter((id) => {
      const def = TRAP_DEFS[id];
      if (!def) return false;
      return currentMeters >= (def.fromMeters ?? 0);
    });
    if (eligible.length === 0) return null;
    return randPick(eligible);
  }

  /**
   * RunDirector usa isto pra spawnar uma trap específica numa posição.
   * `category` decide a palette; `options` repassa openingCenterY/comboIndex.
   */
  spawnByCategory(category: TrapCategory, x: number, options?: TrapBuildOptions, currentMeters = 0): void {
    const id = this.pickIdForCategory(category, currentMeters);
    if (!id) return;
    this.spawn(id, x, options);
    this.lastCategory = category;
  }

  /** Spawn de id explícito — usado pra special traps (bonus_hole, etc). */
  spawnSpecific(trapId: string, x: number, options?: TrapBuildOptions): void {
    this.spawn(trapId, x, options);
    const def = TRAP_DEFS[trapId];
    if (def) this.lastCategory = def.category;
  }

  /** Helper interno. */
  private spawn(trapId: string, x: number, options?: TrapBuildOptions): void {
    const o = this.pool.acquire(() => new Obstacle(this.scene));
    o.reset(trapId, x, options);
    o.container.y = this.phaseYOffset;
  }

  /* === HELPERS DE SPAWN ESPECIAL (chamados pelo GameScene) === */

  spawnPipeExit(x = GAME_WIDTH + 140): void {
    this.spawn('pipe_exit', x);
  }

  spawnCeilingHole(x = GAME_WIDTH + 600): void {
    this.spawn('ceiling_hole', x);
  }

  /** Navio gigante de entrada na fase Sea — single use. */
  spawnSeaEntryShip(x = GAME_WIDTH + 480): void {
    this.spawn('sea_entry_ship', x);
  }

  /** Banco de areia de saída do Sea pra Beach — single use. */
  spawnSeaExitSandbank(x = GAME_WIDTH + 480): void {
    this.spawn('sea_exit_sandbank', x);
  }

  /** Spawn do cofre/porquinho — chamado periodicamente pelo GameScene. */
  spawnCoinSafe(x = GAME_WIDTH + 200): void {
    this.spawn('coin_safe', x);
  }

  spawnBonusHole(x = GAME_WIDTH + 80, currentMeters = 0): void {
    this.spawn('bonus_hole', x);
    this.nextBonusAllowedAt = currentMeters + randInt(4000, 6500);
  }

  /** Throttle pro RunDirector saber se pode oferecer bonus_hole. */
  isBonusReady(currentMeters: number): boolean {
    return currentMeters >= this.nextBonusAllowedAt;
  }

  setBonusCooldown(currentMeters: number): void {
    this.nextBonusAllowedAt = currentMeters + randInt(4000, 6500);
  }

  clearActive(): void {
    this.pool.forEachActive((o) => this.pool.release(o));
  }

  clearActiveExcept(except: Obstacle): void {
    this.pool.forEachActive((o) => {
      if (o !== except) this.pool.release(o);
    });
  }

  /** Move e devolve ao pool quando sai da tela. */
  step(dx: number, t: number): void {
    this.pool.forEachActive((o) => {
      o.update(dx, t);
      if (!o.frozen && o.alive && o.worldX() < -300) {
        this.pool.release(o);
      }
    });
  }

  releaseObstacle(o: Obstacle): void {
    this.pool.release(o);
  }

  shutdown(): void {
    this.pool.clear();
  }

  static groundY(): number {
    return WORLD.GROUND_Y;
  }
}
