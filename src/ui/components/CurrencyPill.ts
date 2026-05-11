import Phaser from 'phaser';
import { Colors, hex } from '../../theme/colors';
import { Type } from '../../theme/typography';

export interface CurrencyPillConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** Ícone (emoji ou char). */
  icon: string;
  /** Cor do ícone (default: amarelo). */
  iconColor?: number;
  /** Valor numérico inicial. */
  value: string | number;
  /** Cor do número (default: amarelo). */
  valueColor?: number;
  /** Cor da borda do pill (default: amarelo). */
  borderColor?: number;
  /** Tamanho do pill: 'small' | 'medium'. Default 'medium'. */
  size?: 'small' | 'medium';
  /** Prefixo opcional (ex: "BEST"). */
  prefix?: string;
  /** Sufixo opcional (ex: "m"). */
  suffix?: string;
}

/**
 * Pílula com ícone à esquerda e número à direita. Variante pequena (38px) e
 * média (50px). Borda accent destacada, sombra inferior plana.
 */
export class CurrencyPill extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private valueText: Phaser.GameObjects.Text;
  private cfg: CurrencyPillConfig;
  private pillW: number;
  private pillH: number;

  constructor(cfg: CurrencyPillConfig) {
    super(cfg.scene, cfg.x, cfg.y);
    this.cfg = cfg;
    cfg.scene.add.existing(this);

    const small = cfg.size === 'small';
    this.pillH = small ? 40 : 50;
    const valueStr = this.formatValue(cfg.value);
    const fontSize = small ? 18 : 22;

    // Pré-cria texto pra medir largura, depois ajusta pill.
    const iconColor = cfg.iconColor ?? Colors.accent.yellow;
    const valueColor = cfg.valueColor ?? Colors.accent.yellow;
    const borderColor = cfg.borderColor ?? Colors.accent.yellow;

    const icon = cfg.scene.add
      .text(0, 0, cfg.icon, {
        fontFamily: 'sans-serif',
        fontSize: small ? '24px' : '28px',
        color: hex(iconColor)
      })
      .setOrigin(0.5);

    this.valueText = cfg.scene.add
      .text(
        0,
        0,
        valueStr,
        Type.numeric({
          fontSize: `${fontSize}px`,
          color: hex(valueColor),
          stroke: hex(Colors.bg.primary),
          strokeThickness: 3
        })
      )
      .setOrigin(0, 0.5);

    const padX = small ? 12 : 14;
    const gap = small ? 6 : 10;
    const iconBoxW = small ? 26 : 32;
    this.pillW = padX + iconBoxW + gap + this.valueText.width + padX;

    this.gfx = cfg.scene.add.graphics();
    this.add(this.gfx);

    this.drawPill(borderColor);

    icon.setX(-this.pillW / 2 + padX + iconBoxW / 2);
    this.valueText.setX(-this.pillW / 2 + padX + iconBoxW + gap);
    this.add(icon);
    this.add(this.valueText);
  }

  /** Atualiza o valor e re-renderiza a pílula (não muda largura significativamente). */
  setValue(v: string | number): this {
    this.valueText.setText(this.formatValue(v));
    return this;
  }

  private formatValue(v: string | number): string {
    if (typeof v === 'number') {
      let s = v.toLocaleString('pt-BR');
      if (this.cfg.prefix) s = `${this.cfg.prefix} ${s}`;
      if (this.cfg.suffix) s = `${s}${this.cfg.suffix}`;
      return s;
    }
    return v;
  }

  private drawPill(borderColor: number): void {
    const r = this.pillH / 2;
    // Sombra inferior plana.
    this.gfx.fillStyle(Colors.bg.overlay, 0.25);
    this.gfx.fillRoundedRect(-this.pillW / 2, -this.pillH / 2 + 4, this.pillW, this.pillH, r);
    // Body.
    this.gfx.fillStyle(Colors.bg.secondary, 0.95);
    this.gfx.fillRoundedRect(-this.pillW / 2, -this.pillH / 2, this.pillW, this.pillH, r);
    // Borda accent.
    this.gfx.lineStyle(2, borderColor, 1);
    this.gfx.strokeRoundedRect(-this.pillW / 2, -this.pillH / 2, this.pillW, this.pillH, r);
    // Highlight superior interno sutil.
    this.gfx.fillStyle(0xffffff, 0.08);
    this.gfx.fillRoundedRect(-this.pillW / 2 + 4, -this.pillH / 2 + 3, this.pillW - 8, 6, r);
  }

  getPillWidth(): number {
    return this.pillW;
  }
}
