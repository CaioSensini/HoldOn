import Phaser from 'phaser';
import { COIN_VALUES, type CoinTier } from '../data/BiomeDefs';
import type { Poolable } from '../systems/Pool';

const TIER_TEXTURE: Record<CoinTier, string> = {
  bronze: 'coin_bronze',
  silver: 'coin_silver',
  gold: 'coin_gold',
  diamond: 'coin_diamond',
  legendary: 'coin_legendary'
};

/**
 * Coin poolable. Rotação + pulse rodam no `update()` por trigonometria barata
 * (sem tweens infinitos por instância) — com 20 moedas na tela isso elimina
 * ~40 tweens ativos. Apenas o tween de coleta (curto, único) sobrevive.
 */
export class Coin implements Poolable {
  readonly sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  /** Fase aleatória inicial pra evitar pulse sincronizado entre moedas. */
  private pulsePhase = 0;

  active = false;
  alive = false;
  beingAttracted = false;

  /** Tier atual e valor base. Setado em reset(). */
  tier: CoinTier = 'bronze';
  baseValue = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.sprite = scene.add.image(0, 0, 'coin_bronze').setDepth(35).setVisible(false);
  }

  reset(x: number, y: number, tier: CoinTier): void {
    this.alive = true;
    this.beingAttracted = false;
    this.tier = tier;
    this.baseValue = COIN_VALUES[tier];
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.sprite
      .setTexture(TIER_TEXTURE[tier])
      .setPosition(x, y)
      .setVisible(true)
      .setAlpha(1)
      .setScale(1)
      .setAngle(Math.random() * 360);

    this.killCollectTween();
  }

  update(dx: number): void {
    if (!this.alive) return;
    if (!this.beingAttracted) {
      this.sprite.x -= dx;
      // Rotação manual sem tween: 4° por frame ≈ 240°/s a 60fps.
      this.sprite.angle = (this.sprite.angle + 4) % 360;
      // Pulse senoidal: 1 op por frame por moeda, sem tween manager.
      const t = this.scene.time.now / 600 + this.pulsePhase;
      this.sprite.setScale(1 + Math.sin(t) * 0.05);
    }
  }

  worldX(): number {
    return this.sprite.x;
  }

  worldY(): number {
    return this.sprite.y;
  }

  /** Coleta com efeito; o pool faz release ao terminar o tween. */
  collect(onComplete?: () => void): void {
    if (!this.alive) {
      onComplete?.();
      return;
    }
    this.alive = false;
    this.killCollectTween();
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1.6,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => onComplete?.()
    });
  }

  release(): void {
    this.alive = false;
    this.beingAttracted = false;
    this.killCollectTween();
    this.sprite.setVisible(false).setAlpha(1).setScale(1);
  }

  destroy(): void {
    this.killCollectTween();
    this.sprite.destroy();
  }

  /** Mata só o tween de coleta — rotação/pulse são manuais agora. */
  private killCollectTween(): void {
    this.scene.tweens.killTweensOf(this.sprite);
  }
}
