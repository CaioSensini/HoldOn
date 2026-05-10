import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI_COLORS } from '../config';
import { Colors } from '../theme/colors';
import { Type } from '../theme/typography';
import { SceneTransition } from '../ui/SceneTransition';
import { GameState } from '../data/GameState';
import { Button } from '../ui/Button';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { showToast } from '../ui/ToastNotification';

export class MissionsScene extends Phaser.Scene {
  private state = GameState.instance();
  private resetText!: Phaser.GameObjects.Text;
  private listContainer?: Phaser.GameObjects.Container;
  private unsub?: () => void;

  constructor() {
    super({ key: SCENES.MISSIONS });
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 1).setOrigin(0);
    SceneTransition.enter(this);

    this.add.text(40, 30, 'Missões diárias', Type.heading()).setOrigin(0, 0);

    new CurrencyDisplay(this, GAME_WIDTH - 220, 36);
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

    // Reset timer
    this.resetText = this.add
      .text(GAME_WIDTH / 2, 110, '', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#9aa3b2'
      })
      .setOrigin(0.5);

    this.renderMissions();
    this.updateResetTimer();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.updateResetTimer() });

    this.unsub = this.state.subscribe(() => this.renderMissions());
    this.events.on('shutdown', () => this.unsub?.());

    // Login streak
    const s = this.state.get();
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, `🔥 Login streak: ${s.loginStreak} ${s.loginStreak !== 1 ? 'dias' : 'dia'}`, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#ffd166'
      })
      .setOrigin(0.5);
  }

  private updateResetTimer(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const remainSec = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
    const h = String(Math.floor(remainSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((remainSec % 3600) / 60)).padStart(2, '0');
    const s = String(remainSec % 60).padStart(2, '0');
    this.resetText.setText(`Reset em ${h}:${m}:${s}`);
  }

  private renderMissions(): void {
    if (this.listContainer) this.listContainer.destroy();
    this.listContainer = this.add.container(0, 0);

    const missions = this.state.get().missions.missions;
    const cardW = 800;
    const cardH = 110;
    const startY = 180;

    missions.forEach((m, idx) => {
      const y = startY + idx * (cardH + 18);
      const x = GAME_WIDTH / 2;
      const ratio = Math.min(1, m.progress / m.target);

      const card = this.add
        .rectangle(x, y, cardW, cardH, UI_COLORS.BG_PANEL_LIGHT, 1)
        .setStrokeStyle(3, m.completed ? UI_COLORS.SUCCESS : UI_COLORS.PRIMARY);
      this.listContainer!.add(card);

      const desc = this.add
        .text(x - cardW / 2 + 24, y - 30, m.description, {
          fontFamily: 'sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0, 0);
      this.listContainer!.add(desc);

      const progressLabel = this.add
        .text(x - cardW / 2 + 24, y + 4, `${m.progress.toLocaleString('pt-BR')} / ${m.target.toLocaleString('pt-BR')}`, {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#b6c2d9'
        })
        .setOrigin(0, 0);
      this.listContainer!.add(progressLabel);

      // Barra de progresso
      const barW = cardW - 240;
      const barH = 12;
      const barX = x - cardW / 2 + 24;
      const barY = y + 32;
      const barBg = this.add.rectangle(barX, barY, barW, barH, 0x2c3a52, 1).setOrigin(0, 0.5);
      const barFg = this.add
        .rectangle(barX, barY, barW * ratio, barH, m.completed ? UI_COLORS.SUCCESS : UI_COLORS.PRIMARY, 1)
        .setOrigin(0, 0.5);
      this.listContainer!.add([barBg, barFg]);

      // Recompensa / claim
      const rewardText = this.add
        .text(x + cardW / 2 - 180, y - 18, `+${m.reward}◉`, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffd166'
        })
        .setOrigin(0.5);
      this.listContainer!.add(rewardText);

      let btnLabel = '';
      let btnDisabled = false;
      let btnColor: number = UI_COLORS.BG_PANEL;
      if (m.rewardClaimed) {
        btnLabel = 'Recebido';
        btnDisabled = true;
        btnColor = 0x444444;
      } else if (m.completed) {
        btnLabel = 'Receber';
        btnColor = UI_COLORS.SUCCESS;
      } else {
        btnLabel = 'Em progresso';
        btnDisabled = true;
        btnColor = UI_COLORS.BG_PANEL;
      }
      const btn = new Button({
        scene: this,
        x: x + cardW / 2 - 70,
        y,
        width: 120,
        height: 44,
        label: btnLabel,
        fontSize: 13,
        bgColor: btnColor,
        textColor: m.completed && !m.rewardClaimed ? '#0b0f1a' : '#ffffff',
        onClick: () => this.claim(m.id),
        disabled: btnDisabled
      });
      this.listContainer!.add(btn);
    });
  }

  private claim(id: string): void {
    const got = this.state.claimMissionReward(id);
    if (got > 0) {
      showToast({ scene: this, message: `+${got} moedas!`, icon: '◉', color: UI_COLORS.SUCCESS });
    }
  }
}
