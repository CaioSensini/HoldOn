/** Catálogo de skins e trails. */

export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface SkinDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  /** Custo em moedas. 0 = grátis (skin default ou unlock por evento). */
  cost: number;
  /** Se true, só pode ser adquirido via IAP / evento. */
  iapOnly?: boolean;
  textureKey: string;
}

export const SKIN_DEFS: SkinDef[] = [
  // commons
  { id: 'rock', name: 'Rock', rarity: 'common', cost: 0, textureKey: 'skin_rock' },
  { id: 'arrow', name: 'Arrow', rarity: 'common', cost: 300, textureKey: 'skin_arrow' },
  { id: 'coin', name: 'Coin', rarity: 'common', cost: 300, textureKey: 'skin_coin' },
  { id: 'donut', name: 'Donut', rarity: 'common', cost: 400, textureKey: 'skin_donut' },
  { id: 'leaf', name: 'Leaf', rarity: 'common', cost: 400, textureKey: 'skin_leaf' },
  { id: 'drop', name: 'Drop', rarity: 'common', cost: 500, textureKey: 'skin_drop' },
  { id: 'dice', name: 'Dice', rarity: 'common', cost: 500, textureKey: 'skin_dice' },
  { id: 'heart', name: 'Heart', rarity: 'common', cost: 600, textureKey: 'skin_heart' },
  // rares
  { id: 'boomerang', name: 'Boomerang', rarity: 'rare', cost: 1500, textureKey: 'skin_boomerang' },
  { id: 'kunai', name: 'Kunai', rarity: 'rare', cost: 1500, textureKey: 'skin_kunai' },
  { id: 'crystal', name: 'Crystal', rarity: 'rare', cost: 2000, textureKey: 'skin_crystal' },
  { id: 'lightning', name: 'Lightning', rarity: 'rare', cost: 2500, textureKey: 'skin_lightning' },
  // epics
  { id: 'fireball', name: 'Fireball', rarity: 'epic', cost: 5000, textureKey: 'skin_fireball' },
  { id: 'star', name: 'Star', rarity: 'epic', cost: 5000, textureKey: 'skin_star' },
  // legendary
  { id: 'rainbow_pulse', name: 'Rainbow Pulse', rarity: 'legendary', cost: 15000, textureKey: 'skin_rainbow' }
];

export const RARITY_COLORS: Record<SkinRarity, number> = {
  common: 0x9aa3b2,
  rare: 0x4dd6ff,
  epic: 0xa66bff,
  legendary: 0xffd166
};

export interface TrailDef {
  id: string;
  name: string;
  cost: number;
  textureKey: string;
  color: number;
}

export const TRAIL_DEFS: TrailDef[] = [
  { id: 'default', name: 'Default', cost: 0, textureKey: 'trail_default', color: 0xffffff },
  { id: 'fire', name: 'Fire', cost: 800, textureKey: 'trail_fire', color: 0xff6b00 },
  { id: 'sparkle', name: 'Sparkle', cost: 800, textureKey: 'trail_sparkle', color: 0xffe066 },
  { id: 'rainbow', name: 'Rainbow', cost: 2500, textureKey: 'trail_rainbow', color: 0xff66ff },
  { id: 'smoke', name: 'Smoke', cost: 600, textureKey: 'trail_smoke', color: 0x9aa3b2 }
];

export function getSkinById(id: string): SkinDef | undefined {
  return SKIN_DEFS.find((s) => s.id === id);
}

export function getTrailById(id: string): TrailDef | undefined {
  return TRAIL_DEFS.find((t) => t.id === id);
}
