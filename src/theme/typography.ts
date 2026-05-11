/**
 * Tokens de tipografia. Sempre use `Type.<estilo>(overrides?)` para criar
 * Phaser.Types.GameObjects.Text.TextStyle — nunca strings mágicas.
 *
 * Família principal: Fredoka (Google Fonts, carregada em index.html).
 * Fallback: sans-serif do sistema enquanto não baixou.
 */

import Phaser from 'phaser';
import { Colors, hex } from './colors';

export const FONT_FAMILY = "'Fredoka', 'Baloo 2', 'Nunito', system-ui, sans-serif";

export type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

const baseStroke = (px: number) => ({ stroke: hex(Colors.bg.primary), strokeThickness: px });

const baseShadow = (offsetY: number, alpha = 0.6) => ({
  shadow: { offsetX: 0, offsetY, color: 'rgba(0,0,0,' + alpha + ')', blur: 0, fill: true, stroke: false }
});

export const Type = {
  /** Display: logo, títulos grandes. Tokens do design: 700 88px/0.95. */
  display(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '88px',
      fontStyle: '700',
      color: hex(Colors.text.primary),
      ...baseStroke(6),
      ...baseShadow(4),
      ...overrides
    };
  },

  /** Heading H1: títulos de tela. Tokens do design: 600 44px/1.05. */
  heading(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '44px',
      fontStyle: '600',
      color: hex(Colors.text.primary),
      ...baseStroke(4),
      ...baseShadow(3),
      ...overrides
    };
  },

  /** Subheading H2: seções dentro de telas. Tokens do design: 600 28px/1.15. */
  subheading(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '28px',
      fontStyle: '600',
      color: hex(Colors.text.primary),
      ...baseStroke(3),
      ...overrides
    };
  },

  /** Body: texto comum. Tokens do design: 500 20px/1.4. */
  body(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      fontStyle: '500',
      color: hex(Colors.text.secondary),
      ...overrides
    };
  },

  /** Caption: legendas. */
  caption(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      fontStyle: '500',
      color: hex(Colors.text.muted),
      ...overrides
    };
  },

  /** Numeric: contadores, score, moedas (tabular-nums no CSS). */
  numeric(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '28px',
      fontStyle: '700',
      color: hex(Colors.text.accent),
      ...baseStroke(3),
      ...baseShadow(2),
      ...overrides
    };
  },

  /** HUD distance: número grande, sempre legível em qualquer fundo. */
  hudDistance(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '48px',
      fontStyle: '700',
      color: hex(Colors.text.primary),
      ...baseStroke(5),
      ...baseShadow(4, 0.7),
      ...overrides
    };
  },

  /** Button label. */
  button(overrides: Partial<TextStyle> = {}): TextStyle {
    return {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      fontStyle: '700',
      color: hex(Colors.text.primary),
      ...baseStroke(3),
      ...overrides
    };
  }
};

/**
 * Aguarda as web fonts (Fredoka) carregarem antes de prosseguir.
 * Phaser não bloqueia em web fonts, então é responsabilidade do PreloadScene.
 */
export async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    // Timeout defensivo: 1.5s. Se demorar mais, segue com fallback sans-serif.
    await Promise.race([
      Promise.all([
        document.fonts.load('700 64px Fredoka'),
        document.fonts.load('500 18px Fredoka'),
        document.fonts.ready
      ]),
      new Promise((resolve) => setTimeout(resolve, 1500))
    ]);
  } catch {
    /* segue com fallback */
  }
}
