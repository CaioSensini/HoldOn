import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';

/**
 * Banner que cruza a tela do meio anunciando troca de bioma.
 * Anima: entra da esquerda, segura, sai pela direita.
 */
export function showBiomeBanner(scene: Phaser.Scene, name: string, accent: number): void {
  const w = 720;
  const h = 96;
  const cy = GAME_HEIGHT / 2;
  const start = -w;
  const end = GAME_WIDTH + w;

  const c = scene.add.container(start, cy).setDepth(500);

  const gfx = scene.add.graphics();
  gfx.fillStyle(Colors.bg.overlay, 0.35);
  gfx.fillRect(-GAME_WIDTH, -h / 2, GAME_WIDTH * 3, h);
  gfx.fillStyle(accent, 0.9);
  gfx.fillRect(-w / 2, -h / 2, w, h);
  gfx.fillStyle(0xffffff, 0.18);
  gfx.fillRect(-w / 2, -h / 2, w, h * 0.35);
  c.add(gfx);

  const subtitle = scene.add
    .text(0, -22, 'ENTERING', Type.caption({
      fontSize: '15px',
      color: hex(Colors.bg.primary),
      fontStyle: '600'
    }))
    .setOrigin(0.5)
    .setAlpha(0.85);
  const title = scene.add
    .text(0, 8, name.toUpperCase(), Type.heading({
      fontSize: '38px',
      color: hex(Colors.text.primary),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 4
    }))
    .setOrigin(0.5);
  c.add([subtitle, title]);

  scene.tweens.add({
    targets: c,
    x: { from: start, to: GAME_WIDTH / 2 },
    duration: 380,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      scene.time.delayedCall(700, () => {
        scene.tweens.add({
          targets: c,
          x: end,
          duration: 360,
          ease: 'Cubic.easeIn',
          onComplete: () => c.destroy()
        });
      });
    }
  });
}
