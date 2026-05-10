import Phaser from 'phaser';
import { Colors } from '../theme/colors';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

/**
 * Transições padrão entre cenas.
 *
 * Uso:
 *   SceneTransition.fade(this, SCENES.HOME);
 *   SceneTransition.slide(this, SCENES.SHOP, 'right');
 *
 * Sempre prefira essas funções em vez de `scene.start()` direto.
 */

const FADE_HALF_MS = 250;
const SLIDE_MS = 320;

export const SceneTransition = {
  fade(from: Phaser.Scene, targetKey: string, data?: object): void {
    let started = false;
    let fallbackHandle: number | null = null;
    const startTarget = () => {
      if (started) return;
      started = true;
      if (fallbackHandle !== null && typeof window !== 'undefined') {
        window.clearTimeout(fallbackHandle);
        fallbackHandle = null;
      }
      try {
        from.scene.start(targetKey, data);
      } catch (err) {
        console.error(`[SceneTransition] Falha ao iniciar cena ${targetKey}`, err);
      }
    };
    try {
      const overlay = from.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 1.2, GAME_HEIGHT * 1.2, Colors.bg.overlay, 0)
        .setDepth(99999)
        .setScrollFactor(0);
      from.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: FADE_HALF_MS,
        ease: 'Quad.easeIn',
        onComplete: startTarget
      });
    } catch (err) {
      console.error(`[SceneTransition] Fade falhou para ${targetKey}`, err);
      startTarget();
      return;
    }
    if (typeof window !== 'undefined') {
      fallbackHandle = window.setTimeout(startTarget, FADE_HALF_MS + 700);
      from.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        if (fallbackHandle !== null) {
          window.clearTimeout(fallbackHandle);
          fallbackHandle = null;
        }
      });
    }
  },

  slide(
    from: Phaser.Scene,
    targetKey: string,
    direction: 'left' | 'right' = 'right',
    data?: object
  ): void {
    const offset = direction === 'right' ? GAME_WIDTH : -GAME_WIDTH;
    const overlay = from.add
      .rectangle(GAME_WIDTH / 2 - offset, GAME_HEIGHT / 2, GAME_WIDTH * 1.1, GAME_HEIGHT * 1.1, Colors.bg.primary, 1)
      .setDepth(99999)
      .setScrollFactor(0);
    from.tweens.add({
      targets: overlay,
      x: GAME_WIDTH / 2,
      duration: SLIDE_MS,
      ease: 'Cubic.easeInOut',
      onComplete: () => from.scene.start(targetKey, data)
    });
  },

  /** Inicial: chamar no create() pra fade-in suave a partir do preto. */
  enter(scene: Phaser.Scene, durationMs = 300): void {
    const overlay = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 1.2, GAME_HEIGHT * 1.2, Colors.bg.overlay, 1)
      .setDepth(99998)
      .setScrollFactor(0);
    scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => overlay.destroy()
    });
  }
};
