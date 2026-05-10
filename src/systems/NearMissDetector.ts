import { EVENTS, SCORE } from '../config';
import type { Obstacle } from '../entities/Obstacle';
import { aabbDistance } from '../utils/MathUtils';
import { GameEventBus } from './EventSystem';

/**
 * Detecta quando o player passa rente (mas não colide) com um obstáculo.
 * Considera a borda direita do obstáculo: dispara uma única vez por obstáculo
 * quando ele "passa" do player.
 */
export class NearMissDetector {
  private bus = GameEventBus.instance();

  check(
    playerHB: { x: number; y: number; w: number; h: number },
    obstacle: Obstacle
  ): void {
    if (obstacle.nearMissCounted) return;
    // Só conta uma vez quando o obstáculo passou completamente do player
    const obsRight = obstacle.worldX() + 70;
    const playerLeft = playerHB.x;
    if (obsRight < playerLeft - 10) {
      // já passou; calcular menor distância contra todos os hitboxes
      let minDist = Infinity;
      for (const hb of obstacle.getWorldHitboxes()) {
        const d = aabbDistance(playerHB.x, playerHB.y, playerHB.w, playerHB.h, hb.x, hb.y, hb.w, hb.h);
        if (d < minDist) minDist = d;
      }
      if (minDist > 0 && minDist < SCORE.NEAR_MISS_DISTANCE) {
        obstacle.nearMissCounted = true;
        this.bus.emit(EVENTS.NEAR_MISS, { x: obstacle.worldX(), y: playerHB.y + playerHB.h / 2 });
      } else {
        // Marca como passada mesmo sem near miss para não checar de novo
        obstacle.nearMissCounted = true;
      }
    }
  }
}
