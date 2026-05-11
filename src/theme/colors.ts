/**
 * Tokens centrais de cor. Toda UI/jogo deve referenciar estes tokens —
 * não usar hex hard-coded em scenes/components.
 *
 * Convenção: valores como número (formato Phaser, 0xRRGGBB).
 * Use `Colors.css(token)` para obter string CSS quando precisar
 * (ex: text style, dom-elements).
 */

export const Colors = {
  bg: {
    /** Azul-escuro profundo — fundo principal de menus. */
    primary: 0x1a1d2e,
    /** Azul-escuro médio — cards, modais, painéis. */
    secondary: 0x2a2f4a,
    /** Variante mais clara para layering. */
    tertiary: 0x3a4060,
    /** Preto puro — overlays escuros (combinar com alpha). */
    overlay: 0x000000
  },

  accent: {
    /** Amarelo dourado vibrante — CTA principal, moedas. */
    yellow: 0xffd23f,
    /** Sombra do amarelo (botão 3D push). */
    yellowDark: 0xe6a800,
    /** Coral — alertas, perigo, missões. */
    coral: 0xff6b6b,
    coralDark: 0xc94545,
    /** Ciano — power-ups, progressão, secundário. */
    cyan: 0x4ecdc4,
    cyanDark: 0x2ea49b,
    /** Roxo — lendárias, especiais. */
    purple: 0xa06cd5,
    purpleDark: 0x7344a8,
    /** Verde-limão — sucesso. */
    green: 0x6bcb77,
    greenDark: 0x429a4d,
    /** Laranja — variações em chamas/aviso. */
    orange: 0xffb84e
  },

  text: {
    primary: 0xffffff,
    secondary: 0xc4c8d8,
    /** Texto em fundos claros (mesmo do bg.primary). */
    dark: 0x1a1d2e,
    /** Cor de números importantes (score, moedas). */
    accent: 0xffd23f,
    muted: 0x8a90a8
  },

  rarity: {
    common: 0xb8b8b8,
    rare: 0x4ecdc4,
    epic: 0xa06cd5,
    legendary: 0xffd23f
  },

  biomes: {
    forest: { sky: 0x87ceeb, ground: 0x4a7c3a, accent: 0x6bcb77, mid: 0x3d6b2e, far: 0x6ea860 },
    cave: { sky: 0x2c3e50, ground: 0x5d4e6d, accent: 0x9b6bcb, mid: 0x4a3d5d, far: 0x6e5b80 },
    temple: { sky: 0xe8a547, ground: 0xa67c3d, accent: 0xffd23f, mid: 0x8b6530, far: 0xc99350 },
    sea: { sky: 0x103a6a, ground: 0x1a3a5a, accent: 0x4ecdc4, mid: 0x0e3258, far: 0x1e5288 },
    beach: { sky: 0x88c8e8, ground: 0xd4b878, accent: 0xffd166, mid: 0xa8d8ee, far: 0xe0c890 },
    volcano: { sky: 0x2a0808, ground: 0xa83820, accent: 0xff8a3a, mid: 0x6a1810, far: 0xc04830 },
    citadel: { sky: 0x14223a, ground: 0x445a8a, accent: 0x9ec4ff, mid: 0x2a3a5a, far: 0x6e8aaa },
    space: { sky: 0x1a0d3d, ground: 0x3d2d6b, accent: 0x4ecdc4, mid: 0x2a1d4e, far: 0x4d3a80 }
  },

  powerups: {
    rocket: 0xff6b6b,
    shield: 0x4ecdc4,
    magnet: 0xa06cd5,
    coins2x: 0xffd23f,
    slowmo: 0x6bcb77,
    phantom: 0xc4c8d8,
    revive: 0xff9eb5,
    coinrain: 0xffb84e,
    mini: 0x87ceeb
  }
} as const;

/** Converte cor numérica em string CSS (#rrggbb). */
export function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

/** Converte cor numérica + alpha em rgba. */
export function rgba(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Mistura linear entre duas cores (0..1). */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
