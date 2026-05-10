import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';
import { Button } from './Button';

export interface ModalConfig {
  scene: Phaser.Scene;
  title: string;
  message: string;
  buttons: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
    /** @deprecated Use `variant: 'primary'`. */
    primary?: boolean;
    onClick?: () => void;
  }>;
  /** Cor de borda/destaque do painel. */
  accent?: number;
  /** @deprecated — pra compat com chamadas antigas; ignorado, use `accent`. */
  panelColor?: number;
}

/**
 * Modal central com slide+scale-in. Bloqueia input com overlay escuro.
 * Visual: card arredondado, borda accent, título + mensagem + linha de botões.
 */
export class Modal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(cfg: ModalConfig) {
    super(cfg.scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    cfg.scene.add.existing(this);
    this.setDepth(1000);

    this.overlay = cfg.scene.add
      .rectangle(0, 0, GAME_WIDTH * 1.5, GAME_HEIGHT * 1.5, Colors.bg.overlay, 0.7)
      .setInteractive();
    this.add(this.overlay);

    const w = 560;
    const h = 320;
    const r = 32;
    const accent = cfg.accent ?? Colors.accent.yellow;

    this.gfx = cfg.scene.add.graphics();
    // sombra
    this.gfx.fillStyle(Colors.bg.overlay, 0.5);
    this.gfx.fillRoundedRect(-w / 2 + 6, -h / 2 + 8, w, h, r);
    // card
    this.gfx.fillStyle(Colors.bg.secondary, 1);
    this.gfx.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    // borda accent
    this.gfx.lineStyle(3, accent, 1);
    this.gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    // highlight superior
    this.gfx.fillStyle(0xffffff, 0.05);
    this.gfx.fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, 60, r - 6);
    this.add(this.gfx);

    const title = cfg.scene.add
      .text(0, -h / 2 + 44, cfg.title, Type.heading({ fontSize: '28px', color: hex(Colors.text.primary) }))
      .setOrigin(0.5);
    this.add(title);

    const msg = cfg.scene.add
      .text(0, -20, cfg.message, Type.body({
        fontSize: '17px',
        color: hex(Colors.text.secondary),
        align: 'center',
        wordWrap: { width: w - 80 }
      }))
      .setOrigin(0.5);
    this.add(msg);

    const btnY = h / 2 - 56;
    const btnW = 200;
    const gap = 20;
    const totalW = cfg.buttons.length * btnW + Math.max(0, cfg.buttons.length - 1) * gap;
    const startX = -totalW / 2 + btnW / 2;

    cfg.buttons.forEach((b, i) => {
      const btn = new Button({
        scene: cfg.scene,
        x: startX + i * (btnW + gap),
        y: btnY,
        width: btnW,
        height: 56,
        label: b.label,
        variant: b.variant ?? (b.primary ? 'primary' : cfg.buttons.length === 1 ? 'primary' : 'ghost'),
        onClick: () => {
          b.onClick?.();
          this.close();
        }
      });
      this.add(btn);
    });

    this.setScale(0.85).setAlpha(0);
    cfg.scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 280,
      ease: 'Back.easeOut'
    });
  }

  close(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 0.9,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy()
    });
  }
}
