/** Pool de missões diárias. */

export type MissionType =
  | 'distance_total'
  | 'distance_single'
  | 'coins_total'
  | 'powerups_collected'
  | 'near_misses'
  | 'obstacles_broken'
  | 'play_runs'
  | 'survive_seconds';

export interface MissionTemplate {
  type: MissionType;
  description: string;
  /** Possíveis metas (sorteia uma). */
  targets: number[];
  /** Recompensa em moedas. */
  reward: number;
}

export const MISSION_POOL: MissionTemplate[] = [
  {
    type: 'distance_total',
    description: 'Acumule {target}m hoje.',
    targets: [1500, 3000, 5000, 8000],
    reward: 250
  },
  {
    type: 'distance_single',
    description: 'Alcance {target}m em uma única run.',
    targets: [800, 1500, 2500, 4000],
    reward: 200
  },
  {
    type: 'coins_total',
    description: 'Colete {target} moedas hoje.',
    targets: [200, 400, 700, 1200],
    reward: 200
  },
  {
    type: 'powerups_collected',
    description: 'Colete {target} power-ups.',
    targets: [5, 10, 15, 20],
    reward: 150
  },
  {
    type: 'near_misses',
    description: 'Faça {target} near misses.',
    targets: [10, 20, 35, 50],
    reward: 200
  },
  {
    type: 'obstacles_broken',
    description: 'Quebre {target} obstáculos com Rocket.',
    targets: [3, 6, 10, 15],
    reward: 180
  },
  {
    type: 'play_runs',
    description: 'Jogue {target} runs.',
    targets: [3, 5, 8, 12],
    reward: 120
  },
  {
    type: 'survive_seconds',
    description: 'Sobreviva {target}s em uma única run.',
    targets: [30, 60, 90, 120],
    reward: 180
  }
];

export interface ActiveMission {
  id: string;
  type: MissionType;
  description: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  rewardClaimed: boolean;
}

/** Gera 3 missões diárias determinísticas baseadas na data (yyyy-mm-dd). */
export function generateDailyMissions(dateKey: string): ActiveMission[] {
  // RNG simples seeded pela data
  let seed = 0;
  for (let i = 0; i < dateKey.length; i++) seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const pickN = <T>(arr: T[], n: number): T[] => {
    const copy = arr.slice();
    const out: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = Math.floor(rng() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  };
  const templates = pickN(MISSION_POOL, 3);
  return templates.map((t, i) => {
    const target = t.targets[Math.floor(rng() * t.targets.length)];
    return {
      id: `${dateKey}_${t.type}_${i}`,
      type: t.type,
      description: t.description.replace('{target}', String(target)),
      target,
      progress: 0,
      reward: t.reward,
      completed: false,
      rewardClaimed: false
    };
  });
}
