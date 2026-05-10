import Phaser from 'phaser';
import { getServices } from '../adapters';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

export interface ButtonConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  fontSize?: number;
  variant?: ButtonVariant;
  /** Cor custom (override do variant). */
  bgColor?: number;
  textColor?: number | string;
  icon?: string;
  /** Border radius (px). */
  radius?: number;
  /** Habilita push 3D (sombra inferior). */
  push3d?: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** @deprecated Use `variant: 'primary'`. Mantido pra compat com cenas antigas. */
  primary?: boolean;
}

interface VariantSpec {
  bg: number;
  shadow: number;
  text: number;
}

const VARIANTS: Record<ButtonVariant, VariantSpec> = {
  primary: { bg: Colors.accent.yellow, shadow: Colors.accent.yellowDark, text: Colors.text.dark },
  secondary: { bg: Colors.accent.cyan, shadow: Colors.accent.cyanDark, text: Colors.text.dark },
  danger: { bg: Colors.accent.coral, shadow: Colors.accent.coralDark, text: Colors.text.primary },
  success: { bg: Colors.accent.green, shadow: Colors.accent.greenDark, text: Colors.text.dark },
  ghost: { bg: 0x000000, shadow: 0x000000, text: Colors.text.primary }
};

const PUSH_OFFSET = 6;

/**
 * Botão padrão Float: pílula arredondada + sombra inferior 3D + push tween + haptic.
 *
 * Implementado com `Graphics` para manter cantos arredondados em qualquer tamanho.
 */
export class Button extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  /**
   * Zona de hit invisível. Usar um Rectangle nativo (com origem 0.5)
   * em vez de hit area customizada no Container — o Container do Phaser
   * tem quirks de displayOrigin que deslocam o hit testing pro canto
   * superior-esquerdo. O Rectangle resolve isso porque a hit area default
   * dele é exatamente o seu retângulo centralizado.
   */
  private hitZone: Phaser.GameObjects.Rectangle;
  private cfg: ButtonConfig;
  private variantSpec: VariantSpec;
  private bw: number;
  private bh: number;
  private radius: number;
  private push3d: boolean;
  private disabled = false;
  private pressed = false;

  constructor(cfg: ButtonConfig) {
    super(cfg.scene, cfg.x, cfg.y);
    this.cfg = cfg;
    cfg.scene.add.existing(this);

    this.bw = cfg.width ?? 240;
    this.bh = cfg.height ?? 64;
    this.radius = cfg.radius ?? Math.min(28, this.bh / 2);
    this.push3d = cfg.push3d ?? cfg.variant !== 'ghost';

    // Compat: `primary: true` antigo equivale a variant 'primary'.
    const variant: ButtonVariant = cfg.variant ?? (cfg.primary ? 'primary' : 'secondary');
    const textColorNum =
      typeof cfg.textColor === 'string' ? parseInt(cfg.textColor.replace('#', ''), 16) : cfg.textColor;
    this.variantSpec = {
      bg: cfg.bgColor ?? VARIANTS[variant].bg,
      shadow: VARIANTS[variant].shadow,
      text: textColorNum ?? VARIANTS[variant].text
    };

    this.gfx = cfg.scene.add.graphics();
    this.add(this.gfx);

    const labelText = cfg.icon ? `${cfg.icon}  ${cfg.label}` : cfg.label;
    this.label = cfg.scene.add
      .text(
        0,
        0,
        labelText,
        Type.button({
          fontSize: `${cfg.fontSize ?? 20}px`,
          color: hex(this.variantSpec.text),
          stroke:
            variant === 'primary' || variant === 'success'
              ? hex(Colors.bg.primary)
              : hex(Colors.bg.primary),
          strokeThickness: variant === 'ghost' ? 0 : 3
        })
      )
      .setOrigin(0.5);
    this.add(this.label);

    this.draw(false);

    // Hit zone: Rectangle nativo no centro (origem 0.5), invisível,
    // cobrindo a área visual do botão + a sombra inferior (push3d).
    const hitOffsetY = this.push3d ? PUSH_OFFSET / 2 : 0;
    const hitH = this.bh + (this.push3d ? PUSH_OFFSET : 0);
    this.hitZone = cfg.scene.add
      .rectangle(0, hitOffsetY, this.bw, hitH, 0xffffff, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.add(this.hitZone);

    this.hitZone.on('pointerdown', this.handleDown, this);
    this.hitZone.on('pointerup', this.handleUp, this);
    this.hitZone.on('pointerout', this.handleOut, this);

    if (cfg.disabled) this.setDisabled(true);
  }

  private draw(pressed: boolean): void {
    this.gfx.clear();
    const offset = pressed ? PUSH_OFFSET - 4 : PUSH_OFFSET;
    const variant = this.cfg.variant ?? 'primary';

    if (variant === 'ghost') {
      // Borda apenas
      this.gfx.lineStyle(2, Colors.text.primary, 0.85);
      this.gfx.strokeRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, this.radius);
      this.gfx.fillStyle(Colors.bg.overlay, 0.15);
      this.gfx.fillRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, this.radius);
      return;
    }

    // Sombra inferior (3D push)
    if (this.push3d) {
      this.gfx.fillStyle(this.variantSpec.shadow, 1);
      this.gfx.fillRoundedRect(
        -this.bw / 2,
        -this.bh / 2 + offset,
        this.bw,
        this.bh,
        this.radius
      );
    }

    // Face frontal (translada quando pressed)
    const faceOffset = pressed ? 4 : 0;
    this.gfx.fillStyle(this.variantSpec.bg, 1);
    this.gfx.fillRoundedRect(
      -this.bw / 2,
      -this.bh / 2 + faceOffset,
      this.bw,
      this.bh,
      this.radius
    );

    // Highlight superior sutil
    this.gfx.fillStyle(0xffffff, 0.18);
    this.gfx.fillRoundedRect(
      -this.bw / 2 + 6,
      -this.bh / 2 + faceOffset + 4,
      this.bw - 12,
      Math.max(6, this.bh * 0.3),
      Math.max(4, this.radius - 6)
    );

    this.label.y = faceOffset;
  }

  setLabel(text: string): this {
    this.label.setText(this.cfg.icon ? `${this.cfg.icon}  ${text}` : text);
    return this;
  }

  setDisabled(d: boolean): this {
    this.disabled = d;
    this.setAlpha(d ? 0.45 : 1);
    if (d) this.hitZone.disableInteractive();
    else this.hitZone.setInteractive({ useHandCursor: true });
    return this;
  }

  isDisabled(): boolean {
    return this.disabled;
  }

  private handleDown(): void {
    if (this.disabled) return;
    this.pressed = true;
    this.draw(true);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: 0.94,
      duration: 90,
      ease: 'Quad.easeOut'
    });
    try {
      getServices().haptics.trigger('selection');
    } catch {
      /* services pode não estar pronto */
    }
  }

  private handleUp(): void {
    if (this.disabled || !this.pressed) {
      this.pressed = false;
      return;
    }
    this.pressed = false;
    this.draw(false);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut'
    });
    this.cfg.onClick();
  }

  private handleOut(): void {
    if (this.disabled) return;
    if (this.pressed) {
      this.pressed = false;
      this.draw(false);
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 180, ease: 'Quad.easeOut' });
  }

  /** Loop sutil de pulso — usar em CTAs principais. */
  startIdlePulse(): this {
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.04 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return this;
  }
}
