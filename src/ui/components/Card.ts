import Phaser from 'phaser';
import { Colors } from '../../theme/colors';

export interface CardConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Cor de fundo. Default: bg.secondary. */
  bgColor?: number;
  /** Alpha do fundo. Default 1. */
  bgAlpha?: number;
  /** Cor da borda. Default: nenhum (undefined). */
  borderColor?: number;
  /** Espessura da borda. Default 2. */
  borderWidth?: number;
  /** Raio dos cantos. Default 24. */
  radius?: number;
  /** Cor opcional do "glow" externo. Default: nenhum. */
  glowColor?: number;
  /** Espessura do glow (px ao redor do card). Default 16. */
  glowSize?: number;
  /** Alpha do glow. Default 0.5. */
  glowAlpha?: number;
  /** Sombra 3D inferior (px). Default 0 (sem sombra). */
  shadowOffset?: number;
}

/**
 * Card: container retangular com cantos arredondados, borda opcional e glow
 * opcional. Usado para painéis, hpills médios, etc. Não é interativo por
 * padrão — coloque hit zones por cima conforme o caso de uso.
 */
export class Card extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private cfg: CardConfig;
  private cardW: number;
  private cardH: number;
  private radius: number;

  constructor(cfg: CardConfig) {
    super(cfg.scene, cfg.x, cfg.y);
    this.cfg = cfg;
    cfg.scene.add.existing(this);

    this.cardW = cfg.width;
    this.cardH = cfg.height;
    this.radius = cfg.radius ?? 24;

    this.gfx = cfg.scene.add.graphics();
    this.add(this.gfx);
    this.draw();
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();

    const w = this.cardW;
    const h = this.cardH;
    const r = this.radius;

    // Glow externo (várias camadas de alpha baixo simulando halo).
    if (this.cfg.glowColor !== undefined) {
      const size = this.cfg.glowSize ?? 16;
      const alpha = this.cfg.glowAlpha ?? 0.5;
      // 3 anéis de alpha decrescente.
      for (let i = 3; i >= 1; i--) {
        const expand = (size * i) / 3;
        g.fillStyle(this.cfg.glowColor, alpha / (i * 1.5));
        g.fillRoundedRect(-w / 2 - expand, -h / 2 - expand, w + expand * 2, h + expand * 2, r + expand);
      }
    }

    // Sombra inferior plana.
    const shadowOffset = this.cfg.shadowOffset ?? 0;
    if (shadowOffset > 0) {
      g.fillStyle(Colors.bg.overlay, 0.45);
      g.fillRoundedRect(-w / 2, -h / 2 + shadowOffset, w, h, r);
    }

    // Body.
    g.fillStyle(this.cfg.bgColor ?? Colors.bg.secondary, this.cfg.bgAlpha ?? 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);

    // Borda opcional.
    if (this.cfg.borderColor !== undefined) {
      g.lineStyle(this.cfg.borderWidth ?? 2, this.cfg.borderColor, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }

    // Highlight superior interno.
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.min(8, h * 0.12), r);
  }

  /** Redesenha o card (útil se valores externos mudaram). */
  redraw(): this {
    this.draw();
    return this;
  }
}
