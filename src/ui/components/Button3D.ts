import Phaser from 'phaser';
import { getServices } from '../../adapters';
import { Colors, hex } from '../../theme/colors';
import { Type } from '../../theme/typography';

export type Button3DVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

export interface Button3DConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  /** Texto pequeno extra (ex: ícone como string). Posicionado à esquerda do label. */
  icon?: string;
  fontSize?: number;
  variant?: Button3DVariant;
  /** Raio dos cantos. Default = min(height/2, 28). */
  radius?: number;
  onClick: () => void;
  disabled?: boolean;
}

interface VariantSpec {
  bg: number;
  shadow: number;
  text: number;
  /** Cor do stroke do texto. */
  textStroke: number;
}

const VARIANTS: Record<Button3DVariant, VariantSpec> = {
  primary:   { bg: Colors.accent.yellow, shadow: Colors.accent.yellowDark, text: Colors.text.primary, textStroke: Colors.bg.primary },
  secondary: { bg: Colors.accent.cyan,   shadow: Colors.accent.cyanDark,   text: Colors.text.primary, textStroke: Colors.bg.primary },
  danger:    { bg: Colors.accent.coral,  shadow: Colors.accent.coralDark,  text: Colors.text.primary, textStroke: Colors.bg.primary },
  success:   { bg: Colors.accent.green,  shadow: Colors.accent.greenDark,  text: Colors.text.primary, textStroke: Colors.bg.primary },
  ghost:     { bg: 0x000000,             shadow: 0x000000,                 text: Colors.text.primary, textStroke: Colors.bg.primary }
};

/** Offset 3D no estado normal (px). */
export const BTN3D_PUSH = 6;
/** Offset 3D no estado pressionado (px). */
export const BTN3D_PUSH_PRESSED = 2;

/**
 * Botão 3D "pushed" — face frontal sobre uma sombra inferior plana.
 *
 * No estado de repouso a sombra fica deslocada `BTN3D_PUSH` (6px) abaixo da
 * face; ao pressionar, a face desce 4px e a sombra encolhe pra `BTN3D_PUSH_PRESSED`
 * (2px), criando o efeito de empurrar pra dentro.
 *
 * Variants: primary (amarelo), secondary (ciano), danger (coral), success (lima),
 * ghost (transparente com borda branca). Hapticless por padrão — usa
 * `getServices().haptics.trigger('selection')` quando disponível.
 */
export class Button3D extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hitZone: Phaser.GameObjects.Rectangle;
  private cfg: Button3DConfig;
  private spec: VariantSpec;
  private bw: number;
  private bh: number;
  private radius: number;
  private variant: Button3DVariant;
  private disabled = false;
  private pressed = false;

  constructor(cfg: Button3DConfig) {
    super(cfg.scene, cfg.x, cfg.y);
    this.cfg = cfg;
    cfg.scene.add.existing(this);

    this.bw = cfg.width ?? 240;
    this.bh = cfg.height ?? 64;
    this.radius = cfg.radius ?? Math.min(28, this.bh / 2);
    this.variant = cfg.variant ?? 'primary';
    this.spec = VARIANTS[this.variant];

    this.gfx = cfg.scene.add.graphics();
    this.add(this.gfx);

    const labelText = cfg.icon ? `${cfg.icon}  ${cfg.label}` : cfg.label;
    this.label = cfg.scene.add
      .text(
        0,
        0,
        labelText,
        Type.button({
          fontSize: `${cfg.fontSize ?? 22}px`,
          color: hex(this.spec.text),
          stroke: hex(this.spec.textStroke),
          strokeThickness: this.variant === 'ghost' ? 0 : 3
        })
      )
      .setOrigin(0.5);
    this.add(this.label);

    this.draw(false);

    // Hit zone cobre face + sombra inferior (área visual total).
    const hitH = this.bh + BTN3D_PUSH;
    this.hitZone = cfg.scene.add
      .rectangle(0, BTN3D_PUSH / 2, this.bw, hitH, 0xffffff, 0)
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

    if (this.variant === 'ghost') {
      const faceY = pressed ? 2 : 0;
      this.gfx.fillStyle(Colors.bg.overlay, 0.2);
      this.gfx.fillRoundedRect(-this.bw / 2, -this.bh / 2 + faceY, this.bw, this.bh, this.radius);
      this.gfx.lineStyle(2, Colors.text.primary, 0.85);
      this.gfx.strokeRoundedRect(-this.bw / 2, -this.bh / 2 + faceY, this.bw, this.bh, this.radius);
      this.label.y = faceY;
      return;
    }

    const shadowOffset = pressed ? BTN3D_PUSH_PRESSED : BTN3D_PUSH;
    const faceOffset = pressed ? 4 : 0;

    // Sombra inferior (face escura "embutida" embaixo).
    this.gfx.fillStyle(this.spec.shadow, 1);
    this.gfx.fillRoundedRect(
      -this.bw / 2,
      -this.bh / 2 + shadowOffset,
      this.bw,
      this.bh,
      this.radius
    );

    // Face frontal.
    this.gfx.fillStyle(this.spec.bg, 1);
    this.gfx.fillRoundedRect(
      -this.bw / 2,
      -this.bh / 2 + faceOffset,
      this.bw,
      this.bh,
      this.radius
    );

    // Highlight superior interno.
    this.gfx.fillStyle(0xffffff, 0.22);
    this.gfx.fillRoundedRect(
      -this.bw / 2 + 6,
      -this.bh / 2 + faceOffset + 4,
      this.bw - 12,
      Math.max(6, this.bh * 0.28),
      Math.max(4, this.radius - 6)
    );

    this.label.y = faceOffset;
  }

  setDisabled(d: boolean): this {
    this.disabled = d;
    this.setAlpha(d ? 0.45 : 1);
    if (d) this.hitZone.disableInteractive();
    else this.hitZone.setInteractive({ useHandCursor: true });
    return this;
  }

  setLabel(text: string): this {
    this.label.setText(this.cfg.icon ? `${this.cfg.icon}  ${text}` : text);
    return this;
  }

  private handleDown(): void {
    if (this.disabled) return;
    this.pressed = true;
    this.draw(true);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: 0.96, duration: 90, ease: 'Quad.easeOut' });
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
    this.scene.tweens.add({ targets: this, scale: 1, duration: 220, ease: 'Back.easeOut' });
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
}
