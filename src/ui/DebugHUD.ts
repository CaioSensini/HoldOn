import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config';
import { Colors, hex } from '../theme/colors';

export interface DebugCounts {
  obstaclesActive: number;
  obstaclesTotal: number;
  coinsActive: number;
  coinsTotal: number;
  powerupsActive: number;
  powerupsTotal: number;
  particles: number;
  tweens: number;
}

/**
 * Overlay simples no canto inferior esquerdo com FPS e contagens de pool.
 * Ativado por DEBUG_MODE em config.ts. Em produção, o HUD nem é instanciado.
 *
 * Se algum dos números cresce LINEARMENTE durante o jogo, há leak —
 * "active" oscila normalmente, mas "total" deve estabilizar (pool não cresce
 * indefinidamente).
 */
export class DebugHUD {
  private text: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;
  private fpsHistory: number[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.text = scene.add
      .text(8, GAME_HEIGHT - 110, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '13px',
        color: hex(Colors.accent.green),
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: 8, y: 6 }
      })
      .setOrigin(0, 0)
      .setDepth(9999);
  }

  update(counts: DebugCounts): void {
    const fps = this.scene.game.loop.actualFps;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    const lines = [
      `FPS: ${fps.toFixed(0)}  avg: ${avgFps.toFixed(0)}`,
      `obstacles: ${counts.obstaclesActive}/${counts.obstaclesTotal}`,
      `coins:     ${counts.coinsActive}/${counts.coinsTotal}`,
      `powerups:  ${counts.powerupsActive}/${counts.powerupsTotal}`,
      `tweens:    ${counts.tweens}`,
      `particles: ${counts.particles}`
    ];
    this.text.setText(lines.join('\n'));
  }

  destroy(): void {
    this.text.destroy();
  }
}
