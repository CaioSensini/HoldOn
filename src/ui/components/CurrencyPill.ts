import Phaser from 'phaser';
import { Colors, Radii, Spacing, hex } from '../../theme/colors';
import { Type } from '../../theme/typography';

export type CurrencyPillSize = 'sm' | 'md';

export interface CurrencyPillConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** Texto/símbolo do ícone à esquerda (pode ser emoji ou char). */
  icon: string;
  /** Valor inicial. */
  value: string;
  /** Texto de prefixo opcional (ex: 'BEST'), em uppercase pequeno. */
  prefix?: string;
  /** Tamanho do pill — 'md' (default) ou 'sm'. */
  size?: CurrencyPillSize;
  /** Cor de fundo do pill. Default: bg.secondary. */
  bgColor?: number;
  /** Cor da borda. Default: accent.yellow. */
  borderColor?: number;
  /** Cor do número. Default: accent.yellow. */
  numberColor?: number;
  /** Cor do ícone (se for char/emoji). Default: accent.yellow. */
  iconColor?: number;
  /** Opcional: largura mínima (auto se omitido). */
  minWidth?: number;
}

/**
 * Pílula de currency / score — ícone à esquerda + número à direita.
 * Usado para coins (top-right) e best score (sob o logo).
 *
 * Layout: [icon] [prefix?] [value]
 *
 * Visual = pill arredondada com:
 *  - borda colorida (currency hint)
 *  - drop shadow inferior 4px (3D)
 *  - inner highlight superior (gloss)
 */
export class CurrencyPill extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private iconText: Phaser.GameObjects.Text;
  private prefixText?: Phaser.GameObjects.Text;
  private valueText: Phaser.GameObjects.Text;
  private pillWidth = 0;
  private pillHeight = 0;
  private cfg: CurrencyPillConfig;

  constructor(cfg: CurrencyPillConfig) {
    super(cfg.scene, cfg.x, cfg.y);
    this.cfg = cfg;
    cfg.scene.add.existing(this);

    const size: CurrencyPillSize = cfg.size ?? 'md';
    const iconSize = size === 'sm' ? 22 : 28;
    const numSize = size === 'sm' ? 18 : 22;
    const padX = size === 'sm' ? Spacing.s3 : Spacing.s4;
    const padY = size === 'sm' ? Spacing.s1 : Spacing.s2;

    this.gfx = cfg.scene.add.graphics();
    this.add(this.gfx);

    // ícone
    this.iconText = cfg.scene.add
      .text(0, 0, cfg.icon, {
        fontFamily: 'sans-serif',
        fontSize: `${iconSize}px`,
        color: hex(cfg.iconColor ?? Colors.accent.yellow)
      })
      .setOrigin(0.5);
    this.add(this.iconText);

    if (cfg.prefix) {
      this.prefixText = cfg.scene.add
        .text(
          0,
          0,
          cfg.prefix,
          Type.caption({
            fontSize: '13px',
            color: hex(Colors.text.secondary),
            fontStyle: '600'
          })
        )
        .setOrigin(0.5);
      this.add(this.prefixText);
    }

    this.valueText = cfg.scene.add
      .text(
        0,
        0,
        cfg.value,
        Type.numeric({
          fontSize: `${numSize}px`,
          color: hex(cfg.numberColor ?? Colors.accent.yellow),
          stroke: hex(Colors.bg.primary),
          strokeThickness: 3
        })
      )
      .setOrigin(0.5);
    this.add(this.valueText);

    this.layout(padX, padY, iconSize, cfg.minWidth);
  }

  private layout(padX: number, padY: number, iconSize: number, minWidth?: number): void {
    const gap = 8;
    const iconW = iconSize;
    const prefixW = this.prefixText ? this.prefixText.width + gap : 0;
    const numW = this.valueText.width;
    const contentW = iconW + gap + prefixW + numW;

    const w = Math.max(contentW + padX * 2, minWidth ?? 0);
    const h = Math.max(iconSize + padY * 2, 36);
    this.pillWidth = w;
    this.pillHeight = h;

    // Posiciona ícone à esquerda
    let cursorX = -w / 2 + padX + iconW / 2;
    this.iconText.setPosition(cursorX, 0);
    cursorX += iconW / 2 + gap;
    if (this.prefixText) {
      this.prefixText.setPosition(cursorX + this.prefixText.width / 2, 0);
      cursorX += this.prefixText.width + gap;
    }
    this.valueText.setPosition(cursorX + numW / 2, 0);

    this.draw();
  }

  private draw(): void {
    const w = this.pillWidth;
    const h = this.pillHeight;
    const r = Radii.pill; // pill / fully rounded
    const bg = this.cfg.bgColor ?? Colors.bg.secondary;
    const border = this.cfg.borderColor ?? Colors.accent.yellow;

    this.gfx.clear();

    // drop shadow inferior (3D)
    this.gfx.fillStyle(Colors.bg.overlay, 0.25);
    this.gfx.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);

    // body
    this.gfx.fillStyle(bg, 0.98);
    this.gfx.fillRoundedRect(-w / 2, -h / 2, w, h, r);

    // borda colorida
    this.gfx.lineStyle(2, border, 1);
    this.gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    // inner highlight superior (gloss)
    this.gfx.fillStyle(0xffffff, 0.08);
    this.gfx.fillRoundedRect(-w / 2 + 4, -h / 2 + 2, w - 8, Math.max(4, h * 0.25), r);
  }

  setValue(value: string): this {
    this.valueText.setText(value);
    // recalcula layout pois largura do número mudou
    const size: CurrencyPillSize = this.cfg.size ?? 'md';
    const iconSize = size === 'sm' ? 22 : 28;
    const padX = size === 'sm' ? Spacing.s3 : Spacing.s4;
    const padY = size === 'sm' ? Spacing.s1 : Spacing.s2;
    this.layout(padX, padY, iconSize, this.cfg.minWidth);
    return this;
  }

  getPillSize(): { width: number; height: number } {
    return { width: this.pillWidth, height: this.pillHeight };
  }
}
