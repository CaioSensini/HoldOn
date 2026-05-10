import { GameState } from '../data/GameState';

/**
 * Adapter para login diário. Lógica vive em GameState, aqui ficam helpers.
 */
export class DailyLoginSystem {
  private state = GameState.instance();

  /** Chame quando a tela inicial abrir. */
  checkAndUpdate(): { isNewDay: boolean; streakKept: boolean } {
    return this.state.refreshDailyState();
  }

  rewardForToday(): number {
    return this.state.getDailyReward(this.state.get().loginStreak);
  }

  claim(): number {
    return this.state.claimDailyReward();
  }

  alreadyClaimed(): boolean {
    return this.state.get().dailyClaimed;
  }
}
