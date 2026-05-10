import { EVENTS, SCORE } from '../config';
import { GameEventBus } from './EventSystem';

/**
 * ComboSystem: combo de moedas. Cresce a cada moeda coletada,
 * reseta quando uma moeda sai da tela sem ser coletada.
 */
export class ComboSystem {
  private bus = GameEventBus.instance();
  /** Multiplicador atual (1, 1.5, 2, ...). */
  multiplier = 1.0;
  /** Streak (número de moedas em sequência). */
  streak = 0;

  reset(): void {
    if (this.multiplier !== 1 || this.streak !== 0) {
      this.multiplier = 1;
      this.streak = 0;
      this.bus.emit(EVENTS.COMBO_CHANGED, this.multiplier);
    }
  }

  registerCollect(): void {
    this.streak += 1;
    // Cresce a cada 3 moedas
    if (this.streak % 3 === 0) {
      this.multiplier = Math.min(SCORE.COIN_COMBO_CAP, this.multiplier + SCORE.COIN_COMBO_STEP);
      this.bus.emit(EVENTS.COMBO_CHANGED, this.multiplier);
    }
  }

  registerMiss(): void {
    if (this.multiplier > 1 || this.streak > 0) {
      this.multiplier = 1;
      this.streak = 0;
      this.bus.emit(EVENTS.COMBO_CHANGED, this.multiplier);
    }
  }
}
