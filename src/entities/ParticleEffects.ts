import Phaser from 'phaser';
import { PARTICLE_CAPS } from '../config';
import { Colors } from '../theme/colors';
import { EmitterPool } from '../systems/EmitterPool';

/**
 * Helpers de partículas. Os emitters mais frequentes (spark, coinPop,
 * powerUpFlash) ficam num pool e são reaproveitados — evita o custo de
 * criar/destroyar emitters do Phaser a cada hit (cada destroy recompila
 * shaders no WebGL no mobile). deathExplosion e confetti são raros, valem
 * a criação descartável e ficam no fluxo antigo.
 */
export class ParticleEffects {
  private static pool: EmitterPool | null = null;

  static init(scene: Phaser.Scene): void {
    ParticleEffects.pool = new EmitterPool(scene, 4);
  }

  static shutdown(): void {
    ParticleEffects.pool?.shutdown();
    ParticleEffects.pool = null;
  }

  static trail(
    scene: Phaser.Scene,
    follow: { x: number; y: number },
    textureKey: string,
    tint: number
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    return scene.add
      .particles(0, 0, textureKey, {
        x: () => follow.x - 18,
        y: () => follow.y,
        lifespan: 380,
        speedX: { min: -130, max: -60 },
        speedY: { min: -30, max: 30 },
        scale: { start: 0.95, end: 0.05 },
        alpha: { start: 0.75, end: 0 },
        tint,
        frequency: 28,
        maxParticles: PARTICLE_CAPS.TRAIL,
        blendMode: Phaser.BlendModes.ADD
      })
      .setDepth(48);
  }

  static spark(scene: Phaser.Scene, x: number, y: number, count = 6): void {
    if (!ParticleEffects.pool) {
      // fallback (cena sem init): cria descartável
      const e = scene.add.particles(x, y, 'spark', {
        lifespan: 420,
        speed: { min: 140, max: 320 },
        scale: { start: 0.95, end: 0 },
        alpha: { start: 1, end: 0 },
        maxParticles: PARTICLE_CAPS.SPARK,
        angle: { min: 0, max: 360 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false
      });
      e.explode(count, x, y);
      scene.time.delayedCall(500, () => e.destroy());
      return;
    }
    const e = ParticleEffects.pool.acquire('spark', () =>
      scene.add.particles(0, 0, 'spark', {
        lifespan: 420,
        speed: { min: 140, max: 320 },
        scale: { start: 0.95, end: 0 },
        alpha: { start: 1, end: 0 },
        maxParticles: PARTICLE_CAPS.SPARK,
        angle: { min: 0, max: 360 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false
      })
    );
    e.setDepth(50);
    e.explode(count, x, y);
    scene.time.delayedCall(500, () => ParticleEffects.pool?.release('spark', e));
  }

  static coinPop(scene: Phaser.Scene, x: number, y: number, tint: number): void {
    if (!ParticleEffects.pool) {
      const e = scene.add.particles(x, y, 'pixel', {
        lifespan: 320,
        speed: { min: 80, max: 220 },
        scale: { start: 2, end: 0 },
        alpha: { start: 1, end: 0 },
        maxParticles: PARTICLE_CAPS.COIN_POP,
        tint,
        angle: { min: 0, max: 360 },
        emitting: false
      });
      e.explode(8, x, y);
      scene.time.delayedCall(400, () => e.destroy());
      return;
    }
    const e = ParticleEffects.pool.acquire('coinPop', () =>
      scene.add.particles(0, 0, 'pixel', {
        lifespan: 320,
        speed: { min: 80, max: 220 },
        scale: { start: 2, end: 0 },
        alpha: { start: 1, end: 0 },
        maxParticles: PARTICLE_CAPS.COIN_POP,
        angle: { min: 0, max: 360 },
        emitting: false
      })
    );
    e.setDepth(50);
    e.setParticleTint(tint);
    e.explode(8, x, y);
    scene.time.delayedCall(400, () => ParticleEffects.pool?.release('coinPop', e));
  }

  static deathExplosion(scene: Phaser.Scene, x: number, y: number): void {
    const e = scene.add.particles(x, y, 'pixel', {
      lifespan: 800,
      speed: { min: 160, max: 540 },
      scale: { start: 3, end: 0 },
      alpha: { start: 1, end: 0 },
      maxParticles: PARTICLE_CAPS.DEATH_EXPLOSION,
      tint: [Colors.accent.coral, Colors.accent.yellow, 0xffffff],
      angle: { min: 0, max: 360 },
      gravityY: 600,
      emitting: false
    });
    e.explode(34, x, y);
    scene.time.delayedCall(950, () => e.destroy());
  }

  static powerUpFlash(scene: Phaser.Scene, x: number, y: number, tint: number): void {
    if (!ParticleEffects.pool) {
      const e = scene.add.particles(x, y, 'spark', {
        lifespan: 600,
        speed: { min: 60, max: 280 },
        scale: { start: 1.5, end: 0 },
        alpha: { start: 1, end: 0 },
        maxParticles: PARTICLE_CAPS.POWERUP_FLASH,
        tint,
        angle: { min: 0, max: 360 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false
      });
      e.explode(20, x, y);
      scene.time.delayedCall(750, () => e.destroy());
      return;
    }
    const e = ParticleEffects.pool.acquire('powerUpFlash', () =>
      scene.add.particles(0, 0, 'spark', {
        lifespan: 600,
        speed: { min: 60, max: 280 },
        scale: { start: 1.5, end: 0 },
        alpha: { start: 1, end: 0 },
        maxParticles: PARTICLE_CAPS.POWERUP_FLASH,
        angle: { min: 0, max: 360 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false
      })
    );
    e.setDepth(50);
    e.setParticleTint(tint);
    e.explode(20, x, y);
    scene.time.delayedCall(750, () => ParticleEffects.pool?.release('powerUpFlash', e));
  }

  /** Confete dourado (recorde quebrado, level up, compra). */
  static confetti(scene: Phaser.Scene, x: number, y: number): void {
    const e = scene.add.particles(x, y, 'pixel', {
      lifespan: 1200,
      speed: { min: 120, max: 400 },
      scale: { start: 4, end: 0 },
      alpha: { start: 1, end: 0 },
      maxParticles: 60,
      tint: [Colors.accent.yellow, Colors.accent.coral, Colors.accent.cyan, Colors.accent.purple],
      angle: { min: -110, max: -70 },
      gravityY: 700,
      emitting: false
    });
    e.explode(50, x, y);
    scene.time.delayedCall(1300, () => e.destroy());
  }
}
