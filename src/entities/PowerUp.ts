import Phaser from 'phaser';
import { POWERUP_DEFS, type PowerUpId } from '../data/PowerUpDefs';
import type { Poolable } from '../systems/Pool';

/**
 * PowerUp poolable. Halo + bobbing tween são reiniciados em reset(),
 * mortos em release().
 */
export class PowerUp implements Poolable {
  readonly sprite: Phaser.GameObjects.Image;
  private halo: Phaser.GameObjects.Arc;
  private scene: Phaser.Scene;

  active = false;
  alive = false;
  id: PowerUpId = 'shield';

  private haloTween: Phaser.Tweens.Tween | null = null;
  private bobTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.halo = scene.add.circle(0, 0, 32, 0xffffff, 0.25).setDepth(34).setVisible(false);
    this.sprite = scene.add.image(0, 0, 'pu_shield').setDepth(35).setVisible(false);
  }

  reset(x: number, y: number, id: PowerUpId): void {
    this.alive = true;
    this.id = id;
    const def = POWERUP_DEFS[id];

    this.halo
      .setPosition(x, y)
      .setVisible(true)
      .setRadius(32)
      .setAlpha(0.25)
      .setFillStyle(def.color, 0.25);
    this.sprite
      .setPosition(x, y)
      .setTexture(def.textureKey)
      .setVisible(true)
      .setAlpha(1)
      .setScale(1);

    this.killTweens();
    this.haloTween = this.scene.tweens.add({
      targets: this.halo,
      radius: { from: 28, to: 38 },
      alpha: { from: 0.35, to: 0.1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.bobTween = this.scene.tweens.add({
      targets: this.sprite,
      y: y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(dx: number): void {
    if (!this.alive) return;
    this.sprite.x -= dx;
    this.halo.x -= dx;
  }

  worldX(): number {
    return this.sprite.x;
  }

  worldY(): number {
    return this.sprite.y;
  }

  collect(onComplete?: () => void): void {
    if (!this.alive) {
      onComplete?.();
      return;
    }
    this.alive = false;
    this.killTweens();
    this.halo.setVisible(false);
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 2,
      alpha: 0,
      duration: 220,
      onComplete: () => onComplete?.()
    });
  }

  release(): void {
    this.alive = false;
    this.killTweens();
    this.sprite.setVisible(false).setAlpha(1).setScale(1);
    this.halo.setVisible(false);
  }

  destroy(): void {
    this.killTweens();
    this.sprite.destroy();
    this.halo.destroy();
  }

  private killTweens(): void {
    if (this.haloTween) {
      this.haloTween.stop();
      this.haloTween = null;
    }
    if (this.bobTween) {
      this.bobTween.stop();
      this.bobTween = null;
    }
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.halo);
  }
}
