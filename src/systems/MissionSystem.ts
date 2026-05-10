import { GameState } from '../data/GameState';
import { generateDailyMissions } from '../data/MissionPool';

/**
 * Adapter pra ler/escrever as missões diárias via GameState.
 * GameState já lida com o reset diário; aqui só expomos APIs convenientes.
 */
export class MissionSystem {
  private state = GameState.instance();

  refresh(): void {
    this.state.refreshDailyState();
  }

  list() {
    return this.state.get().missions.missions;
  }

  /** Re-rola missões manualmente (se quiser uma ação "Trocar missões" no futuro). */
  forceRegenerate(date: string): void {
    const fresh = generateDailyMissions(date);
    // Hack: usa private direto; em uma versão futura, expor método em GameState
    const s = this.state.get() as ReturnType<typeof this.state.get> & {
      missions: { missions: ReturnType<typeof generateDailyMissions> };
    };
    s.missions.missions = fresh;
  }

  /** Tenta reivindicar a recompensa de uma missão completa. */
  claim(id: string): number {
    return this.state.claimMissionReward(id);
  }
}
