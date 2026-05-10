import Phaser from 'phaser';
import { GAME_WIDTH, PLAYER, WORLD } from '../config';
import { POWERUP_LIST, type PowerUpId } from '../data/PowerUpDefs';
import { PowerUp } from '../entities/PowerUp';
import { randRange, weightedPick } from '../utils/MathUtils';
import { Pool } from './Pool';

/**
 * Spawner de power-ups com pool. Lucky Drop equipável aumenta peso de raros.
 */
export class PowerUpSpawner {
  private scene: Phaser.Scene;
  private pool = new Pool<PowerUp>(16);
  private nextSpawnAtMeters = 100;
  private luckyDropBoost = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setLuckyDrop(boost: number): void {
    this.luckyDropBoost = boost;
  }

  reset(): void {
    this.pool.forEachActive((p) => this.pool.release(p));
    this.nextSpawnAtMeters = 80;
  }

  forEachActive(fn: (p: PowerUp) => void): void {
    this.pool.forEachActive(fn);
  }
  countActive(): number {
    return this.pool.countActive();
  }
  countTotal(): number {
    return this.pool.countTotal();
  }

  update(currentMeters: number): void {
    if (currentMeters >= this.nextSpawnAtMeters) {
      this.spawnRandom();
      this.nextSpawnAtMeters = currentMeters + randRange(150, 300);
    }
  }

  step(dx: number): void {
    this.pool.forEachActive((p) => {
      p.update(dx);
      if (p.alive && p.worldX() < -60) {
        this.pool.release(p);
      }
    });
  }

  releasePowerUp(p: PowerUp): void {
    this.pool.release(p);
  }

  shutdown(): void {
    this.pool.clear();
  }

  private spawnRandom(): void {
    const items = POWERUP_LIST.map((d) => ({
      value: d.id,
      weight: d.spawnWeight * (d.rare ? 1 + this.luckyDropBoost * 4 : 1)
    }));
    const id: PowerUpId = weightedPick(items);
    const x = GAME_WIDTH + 80;
    const y = randRange(PLAYER.Y_MIN + 60, WORLD.GROUND_Y - 80);
    const p = this.pool.acquire(() => new PowerUp(this.scene));
    p.reset(x, y, id);
  }
}
