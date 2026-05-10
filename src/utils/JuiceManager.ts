import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export type ShakeIntensity = 'light' | 'medium' | 'heavy';

const SHAKE_AMPS: Record<ShakeIntensity, number> = {
  light: 0.005,
  medium: 0.012,
  heavy: 0.025
};

/**
 * Centralizador de "juice": shake, hit pause, flash de tela.
 * Uma instância por scene (criada em create()), destruída em shutdown.
 *
 * Cada método é defensivo — se a scene já estiver em estado de shutdown
 * e algum subsystem do Phaser estiver indisponível, falha silenciosamente
 * em vez de propagar exception.
 */
export class JuiceManager {
  private scene: Phaser.Scene;
  private hitPauseTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  shake(intensity: ShakeIntensity, durationMs?: number): void {
    try {
      this.scene.cameras?.main?.shake(durationMs ?? 200, SHAKE_AMPS[intensity]);
    } catch {
      /* cameras já desmontadas */
    }
  }

  hitPause(durationMs: number): void {
    try {
      if (this.hitPauseTimer) {
        this.hitPauseTimer.remove(false);
        this.hitPauseTimer = null;
      }
      if (!this.scene.tweens) return;
      this.scene.tweens.timeScale = 0.05;
      this.hitPauseTimer = this.scene.time.delayedCall(durationMs, () => {
        if (this.scene.tweens) this.scene.tweens.timeScale = 1;
        this.hitPauseTimer = null;
      });
    } catch {
      /* tween/time manager já desmontado */
    }
    // Failsafe wall-clock: se o time clock travar, restaura mesmo assim.
    if (typeof window !== 'undefined') {
      const failsafeMs = Math.max(durationMs * 6, 1500);
      window.setTimeout(() => {
        try {
          if (this.scene.tweens && this.scene.tweens.timeScale < 1) this.scene.tweens.timeScale = 1;
        } catch {
          /* */
        }
      }, failsafeMs);
    }
  }

  slowMo(scale: number, durationMs: number): void {
    try {
      if (!this.scene.tweens) return;
      this.scene.tweens.timeScale = scale;
      this.scene.time.delayedCall(durationMs, () => {
        if (this.scene.tweens) this.scene.tweens.timeScale = 1;
      });
    } catch {
      /* */
    }
  }

  flashScreen(color: number, alpha: number, durationMs: number): void {
    try {
      if (!this.scene.add) return;
      const overlay = this.scene.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, alpha)
        .setDepth(9000)
        .setScrollFactor(0);
      this.scene.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: durationMs,
        ease: 'Quad.easeOut',
        onComplete: () => overlay.destroy()
      });
    } catch {
      /* */
    }
  }

  cameraFlash(color: number, durationMs: number): void {
    try {
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      this.scene.cameras?.main?.flash(durationMs, r, g, b);
    } catch {
      /* */
    }
  }

  shutdown(): void {
    try {
      if (this.hitPauseTimer) {
        this.hitPauseTimer.remove(false);
        this.hitPauseTimer = null;
      }
      if (this.scene.tweens) this.scene.tweens.timeScale = 1;
    } catch {
      /* */
    }
  }
}
