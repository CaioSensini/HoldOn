/** Definições dos 5 biomas. */

import { weightedPick } from '../utils/MathUtils';

export type BiomeId =
  | 'forest'
  | 'cave'
  | 'temple'
  | 'sea'
  | 'beach'
  | 'volcano'
  | 'citadel'
  | 'space';

export type CoinTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

export const COIN_VALUES: Record<CoinTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
  legendary: 5
};

export interface BiomeDef {
  id: BiomeId;
  name: string;
  /** Bioma ativo a partir desta distância (m). */
  fromMeters: number;
  /** Cores principais (top, bottom). */
  bgTop: number;
  bgBottom: number;
  /** Cor do chão. */
  groundColor: number;
  /** Cor do teto (limite superior visível). */
  ceilingColor: number;
  /**
   * Quando true, o teto FICA ESCONDIDO nesse bioma (ex: Space — você
   * acabou de furar o teto, está flutuando no cosmos sem limite visível).
   */
  ceilingHidden?: boolean;
  /** Multiplicador de dificuldade (1.0 = base). */
  difficulty: number;
  /** Distribuição de moedas (peso). */
  coinDistribution: Array<{ tier: CoinTier; weight: number }>;
  /** Chave da textura de fundo (gradient placeholder). */
  bgTextureKey: string;
}

/**
 * 8 fases (biomas) com progressão temática:
 *   Forest    0–2000m      dif 1.0   — floresta verde
 *   Cave      2000–4500    dif 1.15  — subterrâneo escuro
 *   Temple    4500–7000    dif 1.3   — ruínas douradas
 *   Sea       7000–10000   dif 1.45  — UNDERWATER (azul profundo)
 *   Beach    10000–12500   dif 1.6   — superfície de praia (areia, palmeiras)
 *   Volcano  12500–15000   dif 1.75  — vulcão ativo
 *   Citadel  15000–18000   dif 1.95  — torre de pedra (penúltima)
 *                                     → fim: parede + buraco no teto
 *   Space    18000m+       dif 2.2   — TERMINAL: cosmos, speed cap,
 *                                     acessível só pelo ceiling break.
 *                                     Ciclos +12% a cada 3km.
 */
export const BIOMES: BiomeDef[] = [
  {
    id: 'forest',
    name: 'Forest',
    fromMeters: 0,
    bgTop: 0x1f3a25,
    bgBottom: 0x3a6f43,
    groundColor: 0x244a2a,
    ceilingColor: 0x2a5a30,
    difficulty: 1.0,
    coinDistribution: [{ tier: 'bronze', weight: 100 }],
    bgTextureKey: 'bg_forest'
  },
  {
    id: 'cave',
    name: 'Cave',
    fromMeters: 2000,
    bgTop: 0x1a1622,
    bgBottom: 0x3d2645,
    groundColor: 0x2a1f33,
    ceilingColor: 0x1f1828,
    difficulty: 1.15,
    coinDistribution: [
      { tier: 'bronze', weight: 55 },
      { tier: 'silver', weight: 45 }
    ],
    bgTextureKey: 'bg_cave'
  },
  {
    id: 'temple',
    name: 'Temple',
    fromMeters: 4500,
    bgTop: 0x3a2b1a,
    bgBottom: 0xa07a3a,
    groundColor: 0x6a4a20,
    ceilingColor: 0x5a3a14,
    difficulty: 1.3,
    coinDistribution: [
      { tier: 'silver', weight: 45 },
      { tier: 'gold', weight: 55 }
    ],
    bgTextureKey: 'bg_temple'
  },
  {
    id: 'sea',
    name: 'Sea',
    fromMeters: 7000,
    bgTop: 0x062b4a,
    bgBottom: 0x0a4a7a,
    groundColor: 0x1a3a5a,
    ceilingColor: 0x0a3a6a,
    difficulty: 1.45,
    coinDistribution: [
      { tier: 'silver', weight: 35 },
      { tier: 'gold', weight: 55 },
      { tier: 'diamond', weight: 10 }
    ],
    bgTextureKey: 'bg_sea'
  },
  {
    id: 'beach',
    name: 'Beach',
    fromMeters: 10000,
    bgTop: 0x6ab8e0,
    bgBottom: 0xf0d9a0,
    groundColor: 0xd4b878,
    ceilingColor: 0x88c0e8,
    difficulty: 1.6,
    coinDistribution: [
      { tier: 'gold', weight: 60 },
      { tier: 'diamond', weight: 40 }
    ],
    bgTextureKey: 'bg_beach'
  },
  {
    id: 'volcano',
    name: 'Volcano',
    fromMeters: 12500,
    bgTop: 0x1a0606,
    bgBottom: 0xb83820,
    groundColor: 0x6a2010,
    ceilingColor: 0x4a1a08,
    difficulty: 1.75,
    coinDistribution: [
      { tier: 'gold', weight: 35 },
      { tier: 'diamond', weight: 55 },
      { tier: 'legendary', weight: 10 }
    ],
    bgTextureKey: 'bg_volcano'
  },
  {
    id: 'citadel',
    name: 'Citadel',
    fromMeters: 15000,
    bgTop: 0x14223a,
    bgBottom: 0x445a8a,
    groundColor: 0x3a4a6a,
    ceilingColor: 0x2a3a5a,
    difficulty: 1.95,
    coinDistribution: [
      { tier: 'diamond', weight: 60 },
      { tier: 'legendary', weight: 40 }
    ],
    bgTextureKey: 'bg_citadel'
  },
  {
    id: 'space',
    name: 'Space',
    fromMeters: 18000,
    bgTop: 0x0a0e2a,
    bgBottom: 0x3a1c5a,
    groundColor: 0x1a1c3a,
    ceilingColor: 0x14163a,
    ceilingHidden: true,
    difficulty: 2.2,
    coinDistribution: [
      { tier: 'diamond', weight: 50 },
      { tier: 'legendary', weight: 50 }
    ],
    bgTextureKey: 'bg_space'
  }
];

/** Retorna o bioma ativo para a distância dada (último cujo fromMeters <= distance). */
export function biomeForDistance(meters: number): BiomeDef {
  let active = BIOMES[0];
  for (const b of BIOMES) {
    if (meters >= b.fromMeters) active = b;
  }
  return active;
}

/** Sorteia um tier de moeda baseado no bioma. */
export function rollCoinTier(biome: BiomeDef): CoinTier {
  return weightedPick(biome.coinDistribution.map((c) => ({ value: c.tier, weight: c.weight })));
}

/**
 * Multiplicador de dificuldade. Underworld é a fase TERMINAL: a velocidade
 * fica capped em WORLD.MAX_SPEED, mas a dificuldade segue subindo +12% a
 * cada 3km, indefinidamente. Isso transforma o end-game em pure skill.
 */
export function difficultyForDistance(meters: number): number {
  const last = BIOMES[BIOMES.length - 1];
  const baseBiome = biomeForDistance(meters);
  const cycles = meters > last.fromMeters ? Math.floor((meters - last.fromMeters) / 3000) : 0;
  return baseBiome.difficulty * (1 + cycles * 0.12);
}
