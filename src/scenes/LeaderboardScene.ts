import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI_COLORS } from '../config';
import { Colors } from '../theme/colors';
import { Type } from '../theme/typography';
import { SceneTransition } from '../ui/SceneTransition';
import { GameState } from '../data/GameState';
import { Button } from '../ui/Button';

/**
 * Leaderboard local: top 10 do próprio jogador.
 *
 * TODO: para leaderboard online, integrar:
 *   - Firebase Realtime/Firestore (cross-platform)
 *   - Game Center (iOS) via Capacitor plugin
 *   - Google Play Games (Android) via Capacitor plugin
 * Trocar a fonte de dados aqui sem mudar o resto da scene.
 */
export class LeaderboardScene extends Phaser.Scene {
  private state = GameState.instance();

  constructor() {
    super({ key: SCENES.LEADERBOARD });
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 1).setOrigin(0);
    SceneTransition.enter(this);

    this.add.text(40, 30, 'Ranking pessoal', Type.heading()).setOrigin(0, 0);

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

    const scores = this.state.get().topScores;

    if (scores.length === 0) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Sem registros ainda.\nJogue para aparecer aqui!', {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#9aa3b2',
          align: 'center'
        })
        .setOrigin(0.5);
    } else {
      const startY = 140;
      const rowH = 50;
      const cardW = 800;
      scores.forEach((s, idx) => {
        const y = startY + idx * (rowH + 6);
        const x = GAME_WIDTH / 2;
        const isFirst = idx === 0;
        const card = this.add
          .rectangle(x, y + rowH / 2, cardW, rowH, isFirst ? 0x3a2a0a : UI_COLORS.BG_PANEL_LIGHT, 1)
          .setStrokeStyle(2, isFirst ? UI_COLORS.ACCENT : UI_COLORS.PRIMARY);
        void card;

        this.add
          .text(x - cardW / 2 + 24, y + rowH / 2, `#${idx + 1}`, {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: isFirst ? '#ffd166' : '#b6c2d9'
          })
          .setOrigin(0, 0.5);

        this.add
          .text(x - cardW / 2 + 100, y + rowH / 2, `Score ${s.score.toLocaleString('pt-BR')}`, {
            fontFamily: 'sans-serif',
            fontSize: '17px',
            color: '#ffffff'
          })
          .setOrigin(0, 0.5);

        this.add
          .text(x + cardW / 2 - 220, y + rowH / 2, `${s.distance.toLocaleString('pt-BR')}m`, {
            fontFamily: 'sans-serif',
            fontSize: '17px',
            color: '#4dd6ff'
          })
          .setOrigin(0, 0.5);

        this.add
          .text(x + cardW / 2 - 24, y + rowH / 2, s.date, {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            color: '#9aa3b2'
          })
          .setOrigin(1, 0.5);
      });
    }

    // Nota sobre online
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Ranking online em breve (Capacitor + Firebase/Game Center)', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#5a6a82'
      })
      .setOrigin(0.5);
  }
}
