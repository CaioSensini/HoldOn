/** Definições dos 9 power-ups in-game. */

export type PowerUpId =
  | 'rocket'
  | 'shield'
  | 'magnet'
  | 'coins2x'
  | 'slowmo'
  | 'phantom'
  | 'revive'
  | 'coinrain'
  | 'mini';

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  description: string;
  /** Duração em ms. 0 = uso único / até evento. */
  durationMs: number;
  /** Peso de spawn relativo (raros = peso baixo). */
  spawnWeight: number;
  textureKey: string;
  color: number;
  /** Marca como "raro" — Lucky Drop multiplica chance destes. */
  rare: boolean;
}

export const POWERUP_DEFS: Record<PowerUpId, PowerUpDef> = {
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    description: '7s invencível, +50% velocidade, quebra obstáculos.',
    durationMs: 7000,
    spawnWeight: 6,
    textureKey: 'pu_rocket',
    color: 0xff6b6b,
    rare: true
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    description: 'Absorve 1 hit.',
    durationMs: 0,
    spawnWeight: 14,
    textureKey: 'pu_shield',
    color: 0x4dd6ff,
    rare: false
  },
  magnet: {
    id: 'magnet',
    name: 'Magnet',
    description: '8s atraindo moedas em raio.',
    durationMs: 8000,
    spawnWeight: 14,
    textureKey: 'pu_magnet',
    color: 0xa66bff,
    rare: false
  },
  coins2x: {
    id: 'coins2x',
    name: '2× Coins',
    description: '10s dobrando o valor das moedas.',
    durationMs: 10000,
    spawnWeight: 10,
    textureKey: 'pu_coins2x',
    color: 0xffd166,
    rare: false
  },
  slowmo: {
    id: 'slowmo',
    name: 'Slow Motion',
    description: '5s com mundo a 60% da velocidade.',
    durationMs: 5000,
    spawnWeight: 8,
    textureKey: 'pu_slowmo',
    color: 0x66e08c,
    rare: false
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    description: '6s atravessando obstáculos do chão.',
    durationMs: 6000,
    spawnWeight: 6,
    textureKey: 'pu_phantom',
    color: 0xb0b8c8,
    rare: true
  },
  revive: {
    id: 'revive',
    name: 'Revive',
    description: '1 ressurreição grátis nesta run.',
    durationMs: 0,
    spawnWeight: 3,
    textureKey: 'pu_revive',
    color: 0xff8ad6,
    rare: true
  },
  coinrain: {
    id: 'coinrain',
    name: 'Coin Rain',
    description: '4s spawnando chuva de moedas.',
    durationMs: 4000,
    spawnWeight: 7,
    textureKey: 'pu_coinrain',
    color: 0xffe066,
    rare: false
  },
  mini: {
    id: 'mini',
    name: 'Mini',
    description: '7s com hitbox 50% menor.',
    durationMs: 7000,
    spawnWeight: 8,
    textureKey: 'pu_mini',
    color: 0x4ddba0,
    rare: false
  }
};

export const POWERUP_LIST: PowerUpDef[] = Object.values(POWERUP_DEFS);
