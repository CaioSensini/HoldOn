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
 * Coin poolable. Tweens infinitos (rotação + pulse) são reiniciados em reset()
 * e mortos em release() para evitar callbacks órfãos.
 */
export class Coin implements Poolable {
  readonly sprite: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private rotateTween: Phaser.Tweens.Tween | null = null;
  private pulseTween: Phaser.Tweens.Tween | null = null;

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
    this.sprite
      .setTexture(TIER_TEXTURE[tier])
      .setPosition(x, y)
      .setVisible(true)
      .setAlpha(1)
      .setScale(1)
      .setAngle(0);

    this.killTweens();
    this.rotateTween = this.scene.tweens.add({
      targets: this.sprite,
      angle: 360,
      duration: 1800,
      repeat: -1
    });
    this.pulseTween = this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 1, to: 1.1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(dx: number): void {
    if (!this.alive) return;
    if (!this.beingAttracted) {
      this.sprite.x -= dx;
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
    this.killTweens();
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
    this.killTweens();
    this.sprite.setVisible(false).setAlpha(1).setScale(1);
  }

  destroy(): void {
    this.killTweens();
    this.sprite.destroy();
  }

  private killTweens(): void {
    if (this.rotateTween) {
      this.rotateTween.stop();
      this.rotateTween = null;
    }
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    this.scene.tweens.killTweensOf(this.sprite);
  }
}
