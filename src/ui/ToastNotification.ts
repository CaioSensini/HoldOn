import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';

interface ToastOptions {
  scene: Phaser.Scene;
  message: string;
  /** Cor de borda accent. */
  color?: number;
  durationMs?: number;
  icon?: string;
}

const activeToasts: Phaser.GameObjects.Container[] = [];

export function showToast(opts: ToastOptions): void {
  const { scene, message } = opts;
  const dur = opts.durationMs ?? 2400;
  const color = opts.color ?? Colors.accent.cyan;

  const w = 380;
  const h = 60;
  const targetY = 24 + activeToasts.length * (h + 10);

  const c = scene.add.container(GAME_WIDTH + w, targetY);
  c.setDepth(2000);

  const gfx = scene.add.graphics();
  // sombra
  gfx.fillStyle(Colors.bg.overlay, 0.5);
  gfx.fillRoundedRect(2, 4, w, h, h / 2);
  // bg
  gfx.fillStyle(Colors.bg.secondary, 0.97);
  gfx.fillRoundedRect(0, 0, w, h, h / 2);
  // borda accent
  gfx.lineStyle(2, color, 1);
  gfx.strokeRoundedRect(0, 0, w, h, h / 2);
  c.add(gfx);

  const text = scene.add
    .text(28, h / 2, opts.icon ? `${opts.icon}  ${message}` : message, Type.body({
      fontSize: '17px',
      fontStyle: '600',
      color: hex(Colors.text.primary)
    }))
    .setOrigin(0, 0.5);
  c.add(text);

  activeToasts.push(c);

  scene.tweens.add({
    targets: c,
    x: GAME_WIDTH - w - 24,
    duration: 320,
    ease: 'Back.easeOut'
  });

  scene.time.delayedCall(dur, () => {
    scene.tweens.add({
      targets: c,
      x: GAME_WIDTH + 40,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeIn',
      onComplete: () => {
        c.destroy();
        const idx = activeToasts.indexOf(c);
        if (idx >= 0) activeToasts.splice(idx, 1);
        activeToasts.forEach((t, i) => {
          scene.tweens.add({
            targets: t,
            y: 24 + i * (h + 10),
            duration: 200,
            ease: 'Quad.easeOut'
          });
        });
      }
    });
  });
}
