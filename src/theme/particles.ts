/**
 * Configurações canônicas dos sistemas de partículas.
 * Centralizadas pra que ParticleEffects use, e ficam fáceis de tweakar.
 */

import { PARTICLE_CAPS } from '../config';

export const ParticleConfig = {
  trail: {
    lifespan: 400,
    frequency: 28,
    speedX: { min: -130, max: -60 } as { min: number; max: number },
    speedY: { min: -30, max: 30 } as { min: number; max: number },
    scale: { start: 0.95, end: 0.05 } as { start: number; end: number },
    alpha: { start: 0.75, end: 0 } as { start: number; end: number },
    maxParticles: PARTICLE_CAPS.TRAIL
  },
  spark: {
    lifespan: 420,
    speed: { min: 140, max: 320 } as { min: number; max: number },
    scale: { start: 0.95, end: 0 } as { start: number; end: number },
    quantity: 6,
    maxParticles: PARTICLE_CAPS.SPARK
  },
  coinPop: {
    lifespan: 320,
    speed: { min: 80, max: 220 } as { min: number; max: number },
    scale: { start: 2, end: 0 } as { start: number; end: number },
    quantity: 8,
    maxParticles: PARTICLE_CAPS.COIN_POP
  },
  powerUpFlash: {
    lifespan: 600,
    speed: { min: 60, max: 280 } as { min: number; max: number },
    scale: { start: 1.4, end: 0 } as { start: number; end: number },
    quantity: 18,
    maxParticles: PARTICLE_CAPS.POWERUP_FLASH
  },
  deathExplosion: {
    lifespan: 800,
    speed: { min: 160, max: 540 } as { min: number; max: number },
    scale: { start: 3, end: 0 } as { start: number; end: number },
    quantity: 30,
    maxParticles: PARTICLE_CAPS.DEATH_EXPLOSION
  }
} as const;
