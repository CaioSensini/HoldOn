import Phaser from 'phaser';
import { EVENTS, GAME_WIDTH } from '../config';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';
import { GameEventBus } from '../systems/EventSystem';
import type { PowerUpId } from '../data/PowerUpDefs';
import { POWERUP_DEFS } from '../data/PowerUpDefs';

interface ActivePowerUpHUD {
  id: PowerUpId;
  endsAtMs: number;
  durationMs: number;
  container: Phaser.GameObjects.Container;
  arc: Phaser.GameObjects.Graphics;
}

/**
 * HUD em jogo. Estilo:
 *  - Distância: número grande no centro-superior, stroke escuro forte.
 *  - Coins: pílula no canto superior esquerdo.
 *  - Near miss: badge coral pulsante no centro-superior abaixo da distância.
 *  - Combo: caption verde abaixo das moedas.
 *  - Power-ups ativos: ícones circulares com timer radial no canto superior direito.
 *  - Pause: botão circular discreto.
 */
export class HUD {
  private scene: Phaser.Scene;
  private bus = GameEventBus.instance();

  private distText!: Phaser.GameObjects.Text;
  private distIcon!: Phaser.GameObjects.Text;

  /** Coin pill — gfx + texto. */
  private coinPillGfx!: Phaser.GameObjects.Graphics;
  private coinIcon!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;

  private nearMissBadge!: Phaser.GameObjects.Container;
  private nearMissBadgeText!: Phaser.GameObjects.Text;
  private nearMissBadgeBg!: Phaser.GameObjects.Graphics;

  private comboText!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Container;

  private onPause: () => void;

  private activePowerUps = new Map<PowerUpId, ActivePowerUpHUD>();

  constructor(scene: Phaser.Scene, onPause: () => void) {
    this.scene = scene;
    this.onPause = onPause;
    this.build();
    this.attachListeners();
  }

  private build(): void {
    // Distance — top center
    this.distText = this.scene.add
      .text(GAME_WIDTH / 2, 28, '0', Type.hudDistance())
      .setOrigin(0.5, 0)
      .setDepth(200)
      .setScrollFactor(0);
    this.distIcon = this.scene.add
      .text(GAME_WIDTH / 2, 86, 'm', Type.caption({ fontSize: '15px', color: hex(Colors.text.secondary) }))
      .setOrigin(0.5, 0)
      .setDepth(200)
      .setScrollFactor(0);

    // Coins pill — top left
    const pillW = 200;
    const pillH = 48;
    const pillX = 24;
    const pillY = 24;
    this.coinPillGfx = this.scene.add.graphics().setDepth(200).setScrollFactor(0);
    this.drawPill(this.coinPillGfx, pillX, pillY, pillW, pillH);
    this.coinIcon = this.scene.add
      .text(pillX + 24, pillY + pillH / 2, '◉', Type.numeric({ fontSize: '22px', color: hex(Colors.accent.yellow) }))
      .setOrigin(0.5)
      .setDepth(201)
      .setScrollFactor(0);
    this.coinText = this.scene.add
      .text(pillX + 46, pillY + pillH / 2, '0', Type.numeric({ fontSize: '20px', color: hex(Colors.text.primary) }))
      .setOrigin(0, 0.5)
      .setDepth(201)
      .setScrollFactor(0);

    // Combo
    this.comboText = this.scene.add
      .text(pillX + 6, pillY + pillH + 8, '', Type.caption({
        fontSize: '15px',
        color: hex(Colors.accent.yellow),
        fontStyle: '600'
      }))
      .setOrigin(0, 0)
      .setDepth(200)
      .setScrollFactor(0);

    // Near miss badge (escondido até primeiro near miss)
    this.nearMissBadge = this.scene.add.container(GAME_WIDTH / 2, 110).setDepth(200).setAlpha(0).setScrollFactor(0);
    this.nearMissBadgeBg = this.scene.add.graphics();
    this.nearMissBadge.add(this.nearMissBadgeBg);
    this.nearMissBadgeText = this.scene.add
      .text(0, 0, '', Type.numeric({ fontSize: '20px', color: hex(Colors.text.primary) }))
      .setOrigin(0.5);
    this.nearMissBadge.add(this.nearMissBadgeText);

    // Pause button (circular)
    this.pauseBtn = this.scene.add.container(GAME_WIDTH - 36, 36).setDepth(200).setScrollFactor(0);
    const pauseBg = this.scene.add.graphics();
    pauseBg.fillStyle(Colors.bg.secondary, 0.85);
    pauseBg.fillCircle(0, 0, 22);
    pauseBg.lineStyle(2, Colors.text.primary, 0.8);
    pauseBg.strokeCircle(0, 0, 22);
    const pauseIcon = this.scene.add
      .text(0, 0, '❚❚', Type.subheading({ fontSize: '20px', color: hex(Colors.text.primary) }))
      .setOrigin(0.5);
    this.pauseBtn.add([pauseBg, pauseIcon]);
    // Hit zone: Circle nativo invisível (origem centrada) — evita quirk
    // de hit-test do Graphics + custom hit area da Phaser 3.80 que faz
    // só o canto superior-esquerdo do botão registrar clique.
    const pauseHit = this.scene.add
      .circle(0, 0, 28, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    this.pauseBtn.add(pauseHit);
    pauseHit.on('pointerdown', () => this.onPause());
  }

  private drawPill(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    const r = h / 2;
    gfx.fillStyle(Colors.bg.overlay, 0.4);
    gfx.fillRoundedRect(x + 2, y + 3, w, h, r);
    gfx.fillStyle(Colors.bg.secondary, 0.95);
    gfx.fillRoundedRect(x, y, w, h, r);
    gfx.lineStyle(2, Colors.accent.yellow, 1);
    gfx.strokeRoundedRect(x, y, w, h, r);
  }

  private drawNearMissBadge(mult: number): void {
    this.nearMissBadgeBg.clear();
    const w = 220;
    const h = 44;
    const r = h / 2;
    this.nearMissBadgeBg.fillStyle(Colors.bg.overlay, 0.4);
    this.nearMissBadgeBg.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, r);
    this.nearMissBadgeBg.fillStyle(Colors.accent.coral, 0.95);
    this.nearMissBadgeBg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    this.nearMissBadgeBg.lineStyle(2, 0xffffff, 0.4);
    this.nearMissBadgeBg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    this.nearMissBadgeText.setText(`NEAR MISS × ${mult.toFixed(1)}`);
  }

  private attachListeners(): void {
    this.bus.onScoped(this.scene, EVENTS.DISTANCE_UPDATE, ((m: number) => {
      if (!this.distText.active) return;
      this.distText.setText(Math.floor(m).toLocaleString('pt-BR'));
    }) as (...args: unknown[]) => void);

    this.bus.onScoped(this.scene, EVENTS.COIN_COLLECTED, ((totalCoins: number) => {
      if (!this.coinText.active) return;
      this.coinText.setText(totalCoins.toLocaleString('pt-BR'));
      this.scene.tweens.add({
        targets: [this.coinText, this.coinIcon],
        scale: { from: 1.18, to: 1 },
        duration: 220,
        ease: 'Back.easeOut'
      });
    }) as (...args: unknown[]) => void);

    this.bus.onScoped(this.scene, EVENTS.NEAR_MISS_MULTIPLIER, ((m: number) => {
      if (!this.nearMissBadge.active) return;
      if (m <= 1.001) {
        this.scene.tweens.add({
          targets: this.nearMissBadge,
          alpha: 0,
          duration: 220
        });
        return;
      }
      this.drawNearMissBadge(m);
      this.scene.tweens.add({
        targets: this.nearMissBadge,
        alpha: 1,
        duration: 120
      });
      this.scene.tweens.add({
        targets: this.nearMissBadge,
        scale: { from: 1.4, to: 1 },
        duration: 240,
        ease: 'Back.easeOut'
      });
    }) as (...args: unknown[]) => void);

    this.bus.onScoped(this.scene, EVENTS.COMBO_CHANGED, ((streak: number) => {
      if (!this.comboText.active) return;
      if (streak <= 0) {
        this.comboText.setText('');
        return;
      }
      const nextMilestone = Math.ceil((streak + 1) / 10) * 10;
      const remaining = nextMilestone - streak;
      const nextBonus = nextMilestone / 10;
      this.comboText.setText(`Combo: ${streak}   ${remaining}→+${nextBonus}`);
      // Cor escala com a streak — feedback visual progressivo.
      let color: number = Colors.accent.yellow;
      if (streak >= 200) color = 0xff66ff; // legendary
      else if (streak >= 100) color = Colors.accent.coral;
      else if (streak >= 50) color = 0xff8a3a;
      this.comboText.setColor(hex(color));
      this.scene.tweens.add({
        targets: this.comboText,
        scale: { from: 1.18, to: 1 },
        duration: 200,
        ease: 'Back.easeOut'
      });
    }) as (...args: unknown[]) => void);

    this.bus.onScoped(this.scene, EVENTS.COMBO_BONUS, ((data: { tier: number; bonus: number; streak: number }) => {
      if (!this.comboText.active) return;
      this.scene.tweens.add({
        targets: this.comboText,
        scale: { from: 1.6, to: 1 },
        duration: 380,
        ease: 'Back.easeOut'
      });
      const original = this.comboText.style.color;
      this.comboText.setColor(hex(Colors.accent.coral));
      this.scene.time.delayedCall(360, () => {
        if (this.comboText.active) this.comboText.setColor(original);
      });
      void data;
    }) as (...args: unknown[]) => void);

    this.bus.onScoped(this.scene, EVENTS.COMBO_BROKEN, (() => {
      if (!this.comboText.active) return;
      const oldText = this.comboText.text;
      this.comboText.setText(oldText.length > 0 ? 'Combo perdido!' : '');
      this.comboText.setColor(hex(Colors.text.secondary));
      this.scene.tweens.add({
        targets: this.comboText,
        x: { from: this.comboText.x - 4, to: this.comboText.x + 4 },
        duration: 60,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!this.comboText.active) return;
          this.scene.time.delayedCall(700, () => {
            if (!this.comboText.active) return;
            this.comboText.setText('');
            this.comboText.setColor(hex(Colors.accent.yellow));
          });
        }
      });
    }) as (...args: unknown[]) => void);

    this.bus.onScoped(this.scene, EVENTS.POWERUP_COLLECTED, ((id: PowerUpId, durationMs: number) => {
      this.addPowerUpIcon(id, durationMs);
    }) as (...args: unknown[]) => void);

    this.bus.onScoped(this.scene, EVENTS.POWERUP_EXPIRED, ((id: PowerUpId) => {
      this.removePowerUpIcon(id);
    }) as (...args: unknown[]) => void);
  }

  private addPowerUpIcon(id: PowerUpId, durationMs: number): void {
    if (durationMs <= 0) return;
    const def = POWERUP_DEFS[id];
    const existing = this.activePowerUps.get(id);
    if (existing) {
      existing.durationMs = durationMs;
      existing.endsAtMs = this.scene.time.now + durationMs;
      return;
    }
    const slotIndex = this.activePowerUps.size;
    const x = GAME_WIDTH - 96 - slotIndex * 64;
    const y = 36;
    const c = this.scene.add.container(x, y).setDepth(200).setScrollFactor(0);
    const ringBg = this.scene.add.graphics();
    ringBg.fillStyle(Colors.bg.secondary, 0.9);
    ringBg.fillCircle(0, 0, 26);
    ringBg.lineStyle(2, def.color, 1);
    ringBg.strokeCircle(0, 0, 26);
    const icon = this.scene.add.image(0, 0, def.textureKey).setDisplaySize(36, 36);
    const arc = this.scene.add.graphics();
    c.add([ringBg, icon, arc]);
    this.activePowerUps.set(id, {
      id,
      endsAtMs: this.scene.time.now + durationMs,
      durationMs,
      container: c,
      arc
    });

    // Entrada com bounce
    c.setScale(0.4).setAlpha(0);
    this.scene.tweens.add({
      targets: c,
      scale: 1,
      alpha: 1,
      duration: 280,
      ease: 'Back.easeOut'
    });
  }

  private removePowerUpIcon(id: PowerUpId): void {
    const p = this.activePowerUps.get(id);
    if (!p) return;
    this.scene.tweens.add({
      targets: p.container,
      alpha: 0,
      scale: 0.6,
      duration: 220,
      onComplete: () => p.container.destroy()
    });
    this.activePowerUps.delete(id);
    Array.from(this.activePowerUps.values()).forEach((pu, i) => {
      this.scene.tweens.add({
        targets: pu.container,
        x: GAME_WIDTH - 96 - i * 64,
        duration: 220,
        ease: 'Quad.easeOut'
      });
    });
  }

  update(): void {
    const now = this.scene.time.now;
    for (const p of this.activePowerUps.values()) {
      const remain = Math.max(0, p.endsAtMs - now);
      const t = remain / p.durationMs;
      p.arc.clear();
      p.arc.lineStyle(4, POWERUP_DEFS[p.id].color, 1);
      p.arc.beginPath();
      p.arc.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2, false);
      p.arc.strokePath();
    }
  }

  destroy(): void {
    this.distText?.destroy();
    this.distIcon?.destroy();
    this.coinPillGfx?.destroy();
    this.coinIcon?.destroy();
    this.coinText?.destroy();
    this.nearMissBadge?.destroy();
    this.comboText?.destroy();
    this.pauseBtn?.destroy();
    for (const p of this.activePowerUps.values()) p.container.destroy();
    this.activePowerUps.clear();
  }
}
