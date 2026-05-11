import { EVENTS } from '../config';
import { GameEventBus } from './EventSystem';

/**
 * ComboSystem — versão "bônus crescente por sequência".
 *
 * Regra:
 *   • Streak conta moedas consecutivas COLETADAS sem deixar nenhuma
 *     escapar para fora da tela pela esquerda.
 *   • A cada múltiplo de 10 moedas, ganha BÔNUS = tier (10→+1, 20→+2, ...).
 *     Sem teto.
 *   • Reset SÓ quando uma moeda passa pra esquerda sem ser coletada.
 *   • Colidir com obstáculo, dano, power-up — NÃO resetam.
 */
export class ComboSystem {
  private bus = GameEventBus.instance();
  streak = 0;

  reset(): void {
    if (this.streak !== 0) {
      this.streak = 0;
      this.bus.emit(EVENTS.COMBO_CHANGED, this.streak);
    }
  }

  /** Retorna bônus (>0) se cruzou múltiplo de 10. */
  registerCollect(): number {
    this.streak += 1;
    this.bus.emit(EVENTS.COMBO_CHANGED, this.streak);

    if (this.streak % 10 === 0) {
      const tier = this.streak / 10;
      const bonus = tier;
      this.bus.emit(EVENTS.COMBO_BONUS, { tier, bonus, streak: this.streak });
      return bonus;
    }
    return 0;
  }

  /** Chamado quando uma moeda saiu pela esquerda. ÚNICA condição de reset. */
  registerMiss(): void {
    if (this.streak > 0) {
      this.streak = 0;
      this.bus.emit(EVENTS.COMBO_CHANGED, this.streak);
      this.bus.emit(EVENTS.COMBO_BROKEN);
    }
  }
}
