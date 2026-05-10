/** Definições dos 8 equipáveis pré-partida (escala 1-10). */

import { EQUIPPABLE } from '../config';

export type EquippableId =
  | 'head_start'
  | 'coin_bonus'
  | 'powerup_duration'
  | 'magnet_range'
  | 'shield_initial'
  | 'score_multiplier'
  | 'near_miss_boost'
  | 'lucky_drop';

export interface EquippableDef {
  id: EquippableId;
  name: string;
  description: (level: number) => string;
  icon: string;
  color: number;
}

export const EQUIPPABLE_DEFS: Record<EquippableId, EquippableDef> = {
  head_start: {
    id: 'head_start',
    name: 'Head Start',
    description: (lvl) => `Comece ${100 + 100 * lvl}m à frente.`,
    icon: '⚡',
    color: 0xffd166
  },
  coin_bonus: {
    id: 'coin_bonus',
    name: 'Coin Bonus',
    description: (lvl) => `+${(5 + 5 * lvl).toFixed(0)}% moedas coletadas.`,
    icon: '◉',
    color: 0xffd700
  },
  powerup_duration: {
    id: 'powerup_duration',
    name: 'Power-up Duration',
    description: (lvl) => `+${(5 + 5 * lvl).toFixed(0)}% duração de power-ups.`,
    icon: '⌛',
    color: 0xa66bff
  },
  magnet_range: {
    id: 'magnet_range',
    name: 'Magnet Range',
    description: (lvl) => `+${(10 + 10 * lvl).toFixed(0)}% raio do Magnet.`,
    icon: 'U',
    color: 0x6ee0ff
  },
  shield_initial: {
    id: 'shield_initial',
    name: 'Initial Shield',
    description: (lvl) =>
      lvl >= 5
        ? 'Começa com Shield + Magnet inicial 5s.'
        : lvl >= 1
          ? 'Começa com Shield ativo.'
          : 'Sem efeito.',
    icon: '◈',
    color: 0x4dd6ff
  },
  score_multiplier: {
    id: 'score_multiplier',
    name: 'Score Multiplier',
    description: (lvl) => `+${(3 + 2 * lvl).toFixed(0)}% score total.`,
    icon: '×',
    color: 0xff6b6b
  },
  near_miss_boost: {
    id: 'near_miss_boost',
    name: 'Near Miss Boost',
    description: (lvl) => `Near miss vale +${(10 + 10 * lvl).toFixed(0)}% extra.`,
    icon: '⟿',
    color: 0xff8ad6
  },
  lucky_drop: {
    id: 'lucky_drop',
    name: 'Lucky Drop',
    description: (lvl) => `+${(5 + 5 * lvl).toFixed(0)}% chance de power-ups raros.`,
    icon: '☘',
    color: 0x66e08c
  }
};

export const EQUIPPABLE_LIST: EquippableDef[] = Object.values(EQUIPPABLE_DEFS);

/** Custo do upgrade do nível N para N+1. */
export function upgradeCost(currentLevel: number): number {
  if (currentLevel <= 0 || currentLevel >= EQUIPPABLE.MAX_LEVEL) return 0;
  return Math.round(EQUIPPABLE.UPGRADE_COST_BASE * Math.pow(currentLevel, EQUIPPABLE.UPGRADE_COST_EXP));
}

/* --------- Computed effect getters (consumidos por sistemas) --------- */

export interface EquippedEffectInputs {
  /** Map id->level (0 = não possuído). */
  levels: Partial<Record<EquippableId, number>>;
  /** Quais ids estão atualmente equipados (subset). */
  equipped: EquippableId[];
}

function lvl(eff: EquippedEffectInputs, id: EquippableId): number {
  if (!eff.equipped.includes(id)) return 0;
  return eff.levels[id] ?? 0;
}

export const EquipEffects = {
  headStartMeters(eff: EquippedEffectInputs): number {
    const l = lvl(eff, 'head_start');
    return l > 0 ? 100 + 100 * l : 0;
  },
  coinMultiplier(eff: EquippedEffectInputs): number {
    const l = lvl(eff, 'coin_bonus');
    return 1 + (l > 0 ? (5 + 5 * l) / 100 : 0);
  },
  powerUpDurationMultiplier(eff: EquippedEffectInputs): number {
    const l = lvl(eff, 'powerup_duration');
    return 1 + (l > 0 ? (5 + 5 * l) / 100 : 0);
  },
  magnetRangeMultiplier(eff: EquippedEffectInputs): number {
    const l = lvl(eff, 'magnet_range');
    return 1 + (l > 0 ? (10 + 10 * l) / 100 : 0);
  },
  startsWithShield(eff: EquippedEffectInputs): boolean {
    return lvl(eff, 'shield_initial') >= 1;
  },
  startsWithMagnetMs(eff: EquippedEffectInputs): number {
    return lvl(eff, 'shield_initial') >= 5 ? 5000 : 0;
  },
  scoreMultiplier(eff: EquippedEffectInputs): number {
    const l = lvl(eff, 'score_multiplier');
    return 1 + (l > 0 ? (3 + 2 * l) / 100 : 0);
  },
  nearMissBoostMultiplier(eff: EquippedEffectInputs): number {
    const l = lvl(eff, 'near_miss_boost');
    return 1 + (l > 0 ? (10 + 10 * l) / 100 : 0);
  },
  luckyDropChance(eff: EquippedEffectInputs): number {
    const l = lvl(eff, 'lucky_drop');
    return l > 0 ? (5 + 5 * l) / 100 : 0;
  }
};
