import Phaser from 'phaser';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';

interface FloatOpts {
  scene: Phaser.Scene;
  x: number;
  y: number;
  text: string;
  /** Cor do texto (default: amarelo). */
  color?: number;
  /** Distância em pixels que o texto sobe. */
  rise?: number;
  /** Duração (ms). */
  duration?: number;
  /** Tamanho da fonte. */
  fontSize?: number;
}

/**
 * Texto flutuante curto ("+50", "Near miss!", "Combo x2"). Sobe e fade out.
 */
export function spawnFloatingText(opts: FloatOpts): void {
  const { scene, x, y } = opts;
  const text = scene.add
    .text(
      x,
      y,
      opts.text,
      Type.numeric({
        fontSize: `${opts.fontSize ?? 22}px`,
        color: hex(opts.color ?? Colors.accent.yellow)
      })
    )
    .setOrigin(0.5)
    .setDepth(800);
  scene.tweens.add({
    targets: text,
    y: y - (opts.rise ?? 60),
    alpha: { from: 1, to: 0 },
    scale: { from: 1.15, to: 0.9 },
    duration: opts.duration ?? 700,
    ease: 'Quad.easeOut',
    onComplete: () => text.destroy()
  });
}
