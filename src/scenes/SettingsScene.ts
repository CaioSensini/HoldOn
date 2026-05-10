import Phaser from 'phaser';
import { getServices } from '../adapters';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI_COLORS } from '../config';
import { Colors } from '../theme/colors';
import { Type } from '../theme/typography';
import { SceneTransition } from '../ui/SceneTransition';
import { GameState } from '../data/GameState';
import { AudioSystem } from '../systems/AudioSystem';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { showToast } from '../ui/ToastNotification';

/**
 * Settings: volume música/SFX, vibração, idioma, reset.
 * Sliders implementados como barra clicável (suficiente pra mobile).
 */
export class SettingsScene extends Phaser.Scene {
  private state = GameState.instance();

  constructor() {
    super({ key: SCENES.SETTINGS });
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 1).setOrigin(0);
    SceneTransition.enter(this);

    this.add.text(40, 30, 'Ajustes', Type.heading()).setOrigin(0, 0);

    new Button({
      scene: this,
      x: GAME_WIDTH - 80,
      y: 40,
      width: 120,
      height: 44,
      label: 'Voltar',
      fontSize: 16,
      onClick: () => this.scene.start(SCENES.HOME)
    });

    let y = 140;

    this.makeSlider('Volume da música', y, this.state.get().settings.musicVolume, (v) => {
      this.state.setMusicVolume(v);
      AudioSystem.instance().applyVolumes();
    });
    y += 80;

    this.makeSlider('Volume dos efeitos', y, this.state.get().settings.sfxVolume, (v) => {
      this.state.setSfxVolume(v);
      AudioSystem.instance().applyVolumes();
      AudioSystem.instance().playClick();
    });
    y += 80;

    this.makeToggle('Vibração', y, this.state.get().settings.hapticsEnabled, (v) => {
      this.state.setHaptics(v);
      getServices().haptics.enable(v);
      if (v) getServices().haptics.trigger('medium');
    });
    y += 80;

    this.makeLanguageSelector(y);
    y += 80;

    new Button({
      scene: this,
      x: GAME_WIDTH / 2,
      y,
      width: 320,
      height: 48,
      label: 'Restaurar compras',
      fontSize: 16,
      onClick: () => this.restorePurchases()
    });
    y += 70;

    new Button({
      scene: this,
      x: GAME_WIDTH / 2,
      y,
      width: 320,
      height: 48,
      label: 'Créditos',
      fontSize: 16,
      onClick: () => this.showCredits()
    });
    y += 70;

    new Button({
      scene: this,
      x: GAME_WIDTH / 2,
      y,
      width: 320,
      height: 48,
      label: 'Resetar progresso',
      fontSize: 16,
      bgColor: UI_COLORS.DANGER,
      textColor: '#ffffff',
      onClick: () => this.confirmReset()
    });
  }

  private makeSlider(label: string, y: number, initial: number, onChange: (v: number) => void): void {
    this.add
      .text(GAME_WIDTH / 2 - 320, y - 20, label, {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffffff'
      })
      .setOrigin(0, 0);

    const valueText = this.add
      .text(GAME_WIDTH / 2 + 320, y - 20, `${Math.round(initial * 100)}%`, {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#b6c2d9'
      })
      .setOrigin(1, 0);

    const barW = 640;
    const barH = 14;
    const barX = GAME_WIDTH / 2 - barW / 2;
    const barY = y + 14;
    const bg = this.add.rectangle(barX, barY, barW, barH, 0x2c3a52, 1).setOrigin(0, 0.5);
    const fill = this.add.rectangle(barX, barY, barW * initial, barH, UI_COLORS.PRIMARY, 1).setOrigin(0, 0.5);
    const knob = this.add.circle(barX + barW * initial, barY, 14, UI_COLORS.PRIMARY).setStrokeStyle(2, 0xffffff);

    bg.setInteractive(new Phaser.Geom.Rectangle(0, -20, barW, barH + 40), Phaser.Geom.Rectangle.Contains);
    const update = (px: number) => {
      const local = Math.max(0, Math.min(barW, px - barX));
      const v = local / barW;
      fill.width = local;
      knob.x = barX + local;
      valueText.setText(`${Math.round(v * 100)}%`);
      onChange(v);
    };
    bg.on('pointerdown', (p: Phaser.Input.Pointer) => update(p.x));
    bg.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) update(p.x);
    });
  }

  private makeToggle(label: string, y: number, initial: boolean, onChange: (v: boolean) => void): void {
    this.add
      .text(GAME_WIDTH / 2 - 320, y, label, {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffffff'
      })
      .setOrigin(0, 0.5);

    const w = 80;
    const h = 36;
    const x = GAME_WIDTH / 2 + 280;
    const bg = this.add
      .rectangle(x, y, w, h, initial ? UI_COLORS.SUCCESS : 0x444444, 1)
      .setStrokeStyle(2, 0x0b0f1a);
    const knob = this.add.circle(initial ? x + w / 4 : x - w / 4, y, h / 2 - 4, 0xffffff);
    bg.setInteractive({ useHandCursor: true });
    let on = initial;
    bg.on('pointerdown', () => {
      on = !on;
      onChange(on);
      this.tweens.add({
        targets: knob,
        x: on ? x + w / 4 : x - w / 4,
        duration: 180,
        ease: 'Quad.easeOut'
      });
      bg.fillColor = on ? UI_COLORS.SUCCESS : 0x444444;
    });
  }

  private makeLanguageSelector(y: number): void {
    this.add
      .text(GAME_WIDTH / 2 - 320, y, 'Idioma', {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: '#ffffff'
      })
      .setOrigin(0, 0.5);
    const current = this.state.get().settings.language;
    const langs: Array<{ id: 'pt-BR' | 'en'; label: string }> = [
      { id: 'pt-BR', label: 'PT-BR' },
      { id: 'en', label: 'EN' }
    ];
    langs.forEach((l, i) => {
      new Button({
        scene: this,
        x: GAME_WIDTH / 2 + 220 + i * 110,
        y,
        width: 100,
        height: 40,
        label: l.label,
        fontSize: 14,
        primary: current === l.id,
        onClick: () => {
          this.state.setLanguage(l.id);
          showToast({ scene: this, message: `Idioma: ${l.label}`, icon: '🌐' });
        }
      });
    });
  }

  private async restorePurchases(): Promise<void> {
    const restored = await getServices().iap.restore();
    if (restored.length === 0) {
      showToast({ scene: this, message: 'Nada para restaurar', icon: '!' });
    } else {
      restored.forEach((r) => r.success && this.state.applyIAPResult(r.productId));
      showToast({ scene: this, message: `${restored.length} compras restauradas`, icon: '✓' });
    }
  }

  private showCredits(): void {
    new Modal({
      scene: this,
      title: 'Créditos',
      message:
        'Float — endless runner\n\nDesenvolvimento: você + Claude\nEngine: Phaser 3\nFramework: Vite + TypeScript\n\nObrigado por jogar.',
      buttons: [{ label: 'Fechar', primary: true }]
    });
  }

  private confirmReset(): void {
    new Modal({
      scene: this,
      title: 'Resetar progresso?',
      message: 'Todos os dados (moedas, skins, recordes, missões) serão apagados. Tem certeza?',
      buttons: [
        { label: 'Cancelar' },
        {
          label: 'Resetar',
          onClick: () => this.confirmResetSecond()
        }
      ]
    });
  }

  private confirmResetSecond(): void {
    new Modal({
      scene: this,
      title: 'Confirmação final',
      message: 'Esta ação é IRREVERSÍVEL. Continuar?',
      panelColor: 0x3a1818,
      buttons: [
        { label: 'Não' },
        {
          label: 'Sim, resetar',
          onClick: () => {
            this.state.resetProgress();
            getServices().ads.setRemoveAds(false);
            showToast({ scene: this, message: 'Progresso apagado.', icon: '✓' });
            this.scene.start(SCENES.HOME);
          }
        }
      ]
    });
  }
}
