import Phaser from 'phaser';
import { Colors, Radii } from '../../theme/colors';

export interface CardConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Cor de fundo. Default: bg.secondary. */
  bgColor?: number;
  /** Cor de borda. Se omitido, sem borda. */
  borderColor?: number;
  /** Largura da borda (default 2). */
  borderWidth?: number;
  /** Border radius. Default: Radii.card (32). */
  radius?: number;
  /** Drop shadow inferior (default true). */
  shadow?: boolean;
  /** Offset Y do shadow (default 4). */
  shadowOffset?: number;
  /** Alpha do shadow (default 0.3). */
  shadowAlpha?: number;
  /** Highlight interno superior (gloss) — default true. */
  innerHighlight?: boolean;
}

/**
 * Card / painel arredondado do design system Float.
 *
 * Estrutura visual:
 *  - drop shadow inferior (3D pop)
 *  - body com border radius padrão (32)
 *  - borda colorida opcional
 *  - inner highlight (gloss) sutil superior
 *
 * Use como contêiner pra modais, slots, cards de loja, etc.
 * Os filhos devem ser adicionados ao container retornado.
 */
export class Card extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private cfg: CardConfig;
  private cardWidth: number;
  private cardHeight: number;
  private cardRadius: number;

  constructor(cfg: CardConfig) {
    super(cfg.scene, cfg.x, cfg.y);
    this.cfg = cfg;
    cfg.scene.add.existing(this);

    this.cardWidth = cfg.width;
    this.cardHeight = cfg.height;
    this.cardRadius = cfg.radius ?? Radii.card;

    this.gfx = cfg.scene.add.graphics();
    this.add(this.gfx);

    this.draw();
  }

  private draw(): void {
    const w = this.cardWidth;
    const h = this.cardHeight;
    const r = this.cardRadius;

    this.gfx.clear();

    // drop shadow inferior
    if (this.cfg.shadow !== false) {
      const off = this.cfg.shadowOffset ?? 4;
      const sa = this.cfg.shadowAlpha ?? 0.3;
      this.gfx.fillStyle(Colors.bg.overlay, sa);
      this.gfx.fillRoundedRect(-w / 2, -h / 2 + off, w, h, r);
    }

    // body
    const bg = this.cfg.bgColor ?? Colors.bg.secondary;
    this.gfx.fillStyle(bg, 1);
    this.gfx.fillRoundedRect(-w / 2, -h / 2, w, h, r);

    // borda colorida (opcional)
    if (this.cfg.borderColor !== undefined) {
      this.gfx.lineStyle(this.cfg.borderWidth ?? 2, this.cfg.borderColor, 1);
      this.gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }

    // inner highlight superior
    if (this.cfg.innerHighlight !== false) {
      this.gfx.fillStyle(0xffffff, 0.08);
      this.gfx.fillRoundedRect(
        -w / 2 + 4,
        -h / 2 + 2,
        w - 8,
        Math.max(6, h * 0.18),
        Math.max(4, r - 6)
      );
    }
  }

  getCardSize(): { width: number; height: number } {
    return { width: this.cardWidth, height: this.cardHeight };
  }

  /** Atualiza dimensões e redesenha. */
  setCardSize(width: number, height: number): this {
    this.cardWidth = width;
    this.cardHeight = height;
    this.draw();
    return this;
  }
}
