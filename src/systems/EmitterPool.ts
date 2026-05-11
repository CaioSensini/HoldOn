import Phaser from 'phaser';

interface PooledEmitter {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  inUse: boolean;
}

/**
 * Pool de emitters por tipo. Evita criar/destruir emitters por evento — em vez
 * disso reusa um inativo configurando posição + tint + emitting. Mobile WebGL
 * agradece (criar/destroyar emitters compila novo shader / buffers a cada hit).
 */
export class EmitterPool {
  private scene: Phaser.Scene;
  private pools = new Map<string, PooledEmitter[]>();
  private maxPerType: number;

  constructor(scene: Phaser.Scene, maxPerType = 4) {
    this.scene = scene;
    this.maxPerType = maxPerType;
  }

  /** Acquire um emitter livre ou cria novo (até maxPerType). Reusa o mais antigo se estourar. */
  acquire(
    type: string,
    factory: () => Phaser.GameObjects.Particles.ParticleEmitter
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    if (!this.pools.has(type)) this.pools.set(type, []);
    const pool = this.pools.get(type)!;
    for (const p of pool) {
      if (!p.inUse) {
        p.inUse = true;
        return p.emitter;
      }
    }
    if (pool.length < this.maxPerType) {
      const emitter = factory();
      pool.push({ emitter, inUse: true });
      return emitter;
    }
    // Reusa o mais antigo (fila pode crescer, mas não acima do cap).
    const oldest = pool[0];
    oldest.inUse = true;
    return oldest.emitter;
  }

  /** Marca emitter como livre — não destrói. */
  release(type: string, emitter: Phaser.GameObjects.Particles.ParticleEmitter): void {
    const pool = this.pools.get(type);
    if (!pool) return;
    for (const p of pool) {
      if (p.emitter === emitter) {
        p.inUse = false;
        return;
      }
    }
  }

  shutdown(): void {
    for (const pool of this.pools.values()) {
      for (const p of pool) {
        try {
          p.emitter.destroy();
        } catch {
          /* */
        }
      }
    }
    this.pools.clear();
  }

  /** Reservado para evitar warning de unused — scene fica acessível se algum dia precisar. */
  getScene(): Phaser.Scene {
    return this.scene;
  }
}
