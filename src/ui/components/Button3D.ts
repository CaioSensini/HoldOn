import Phaser from 'phaser';
import { getServices } from '../../adapters';
import { Colors, Push, Radii, hex } from '../../theme/colors';
import { Type } from '../../theme/typography';

export type Button3DVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'purple' | 'ghost';

export interface Button3DConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** Largura total da face frontal. */
  width: number;
  /** Altura da face frontal (sem contar a sombra inferior). */
  height: number;
  /** Texto principal. */
  label: string;
  /** Tamanho de fonte (default 28). */
  fontSize?: number;
  /** Cor / variante do botão. */
  variant?: Button3DVariant;
  /** Cor de bg custom (override do variant). */
  bgColor?: number;
  /** Cor da sombra inferior (push 3D). */
  shadowColor?: number;
  /** Border radius. Default = Radii.button (24). */
  radius?: number;
  /** Stroke escuro em volta do botão (default: ativo, usa bg.primary). */
  outline?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

interface VariantSpec {
  bg: number;
  shadow: number;
  text: number;
}

const VARIANTS: Record<Button3DVariant, VariantSpec> = {
  primary: { bg: Colors.accent.yellow, shadow: Colors.accent.yellowDark, text: Colors.text.primary },
  secondary: { bg: Colors.accent.cyan, shadow: Colors.accent.cyanDark, text: Colors.text.primary },
  danger: { bg: Colors.accent.coral, shadow: Colors.accent.coralDark, text: Colors.text.primary },
  success: { bg: Colors.accent.green, shadow: Colors.accent.greenDark, text: Colors.text.primary },
  purple: { bg: Colors.accent.purple, shadow: Colors.accent.purpleDark, text: Colors.text.primary },
  ghost: { bg: 0x000000, shadow: 0x000000, text: Colors.text.primary }
};

/**
 * Botão 3D "push" do design system Float:
 *  - face frontal arredondada
 *  - sombra inferior (cor escura do variant) que dá ilusão de profundidade
 *  - highlight superior interno (gloss)
 *  - shadow inner inferior (depth)
 *  - outline escuro (default: ativo)
 *  - press desce 4px (shadow encolhe), volta com bounce
 *  - haptic 'selection' no press
 *
 * Use para PLAY / CTAs grandes. Para botões médios/menores prefira o
 * Button antigo (compatibilidade com scenes legadas).
 */
export class Button3D extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private hitZone: Phaser.GameObjects.Rectangle;
  private cfg: Button3DConfig;
  private spec: VariantSpec;
  private bw: number;
  private bh: number;
  private radius: number;
  private outline: boolean;
  private pressed = false;
  private disabled = false;

  constructor(cfg: Button3DConfig) {
    super(cfg.scene, cfg.x, cfg.y);
    this.cfg = cfg;
    cfg.scene.add.existing(this);

    this.bw = cfg.width;
    this.bh = cfg.height;
    this.radius = cfg.radius ?? Radii.button;
    this.outline = cfg.outline ?? true;

    const variant: Button3DVariant = cfg.variant ?? 'primary';
    this.spec = {
      bg: cfg.bgColor ?? VARIANTS[variant].bg,
      shadow: cfg.shadowColor ?? VARIANTS[variant].shadow,
      text: VARIANTS[variant].text
    };

    this.gfx = cfg.scene.add.graphics();
    this.add(this.gfx);

    this.labelText = cfg.scene.add
      .text(
        0,
        0,
        cfg.label,
        Type.button({
          fontSize: `${cfg.fontSize ?? 28}px`,
          color: hex(this.spec.text),
          stroke: hex(Colors.bg.primary),
          strokeThickness: 4
        })
      )
      .setOrigin(0.5);
    this.add(this.labelText);

    this.draw(false);

    // Hit zone abrange face + sombra inferior pra mouse sentir o botão
    // mesmo no "degrau" inferior.
    this.hitZone = cfg.scene.add
      .rectangle(0, Push.rest / 2, this.bw, this.bh + Push.rest, 0xffffff, 0)
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
    const variant = this.cfg.variant ?? 'primary';

    if (variant === 'ghost') {
      this.gfx.lineStyle(2, Colors.text.primary, 0.85);
      this.gfx.strokeRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, this.radius);
      this.gfx.fillStyle(Colors.bg.overlay, 0.15);
      this.gfx.fillRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, this.radius);
      return;
    }

    // Sombra inferior — encolhe quando pressed (botão "afunda")
    const pushOff = pressed ? Push.pressed : Push.rest;
    this.gfx.fillStyle(this.spec.shadow, 1);
    this.gfx.fillRoundedRect(
      -this.bw / 2,
      -this.bh / 2 + pushOff,
      this.bw,
      this.bh,
      this.radius
    );

    // Face frontal (translada quando pressed pra coincidir com sombra)
    const faceOffset = pressed ? Push.rest - Push.pressed : 0;
    this.gfx.fillStyle(this.spec.bg, 1);
    this.gfx.fillRoundedRect(
      -this.bw / 2,
      -this.bh / 2 + faceOffset,
      this.bw,
      this.bh,
      this.radius
    );

    // Highlight superior (gloss) — fica mais sutil quando pressed
    const glossH = Math.max(8, Math.floor(this.bh * 0.28));
    this.gfx.fillStyle(0xffffff, pressed ? 0.32 : 0.55);
    this.gfx.fillRoundedRect(
      -this.bw / 2 + 8,
      -this.bh / 2 + faceOffset + 5,
      this.bw - 16,
      glossH,
      Math.max(4, this.radius - 8)
    );

    // Shadow interna inferior (depth)
    this.gfx.fillStyle(this.spec.shadow, 0.45);
    this.gfx.fillRoundedRect(
      -this.bw / 2 + 6,
      -this.bh / 2 + faceOffset + this.bh - glossH * 0.5,
      this.bw - 12,
      Math.max(4, glossH * 0.4),
      Math.max(4, this.radius - 8)
    );

    // Outline escuro
    if (this.outline) {
      this.gfx.lineStyle(4, Colors.bg.primary, 1);
      this.gfx.strokeRoundedRect(
        -this.bw / 2,
        -this.bh / 2 + faceOffset,
        this.bw,
        this.bh,
        this.radius
      );
    }

    this.labelText.y = faceOffset;
  }

  private handleDown(): void {
    if (this.disabled) return;
    this.pressed = true;
    this.draw(true);
    try {
      getServices().haptics.trigger('selection');
    } catch {
      /* */
    }
  }

  private handleUp(): void {
    if (this.disabled) return;
    if (!this.pressed) return;
    this.pressed = false;
    this.draw(false);
    this.cfg.onClick();
  }

  private handleOut(): void {
    if (!this.pressed) return;
    this.pressed = false;
    this.draw(false);
  }

  setLabel(text: string): this {
    this.labelText.setText(text);
    return this;
  }

  setDisabled(d: boolean): this {
    this.disabled = d;
    this.setAlpha(d ? 0.45 : 1);
    if (d) this.hitZone.disableInteractive();
    else this.hitZone.setInteractive({ useHandCursor: true });
    return this;
  }

  /** Inicia uma animação de pulse (halo) — útil para CTAs ociosos. */
  startIdlePulse(): this {
    this.scene.tweens.add({
      targets: this,
      scale: 1.04,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return this;
  }
}
