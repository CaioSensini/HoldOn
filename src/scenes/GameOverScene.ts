import Phaser from 'phaser';
import { getServices } from '../adapters';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { GameState } from '../data/GameState';
import { ParticleEffects } from '../entities/ParticleEffects';
import { AudioSystem } from '../systems/AudioSystem';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';
import { Button } from '../ui/Button';
import { SceneTransition } from '../ui/SceneTransition';
import { showToast } from '../ui/ToastNotification';

interface RunStats {
  distance: number;
  score: number;
  coinsCollected: number;
  powerupsCollected: number;
  nearMisses: number;
  obstaclesBroken: number;
  survivedSeconds: number;
  newRecord: boolean;
  rewardedReviveUsed?: boolean;
}

/**
 * GameOver: card central com sombra + borda accent, contagem animada,
 * botões empilhados (revive, 2x, replay, menu), confete em recorde.
 */
export class GameOverScene extends Phaser.Scene {
  private state = GameState.instance();
  private services = getServices();
  private stats!: RunStats;
  private reviveBtn!: Button;
  private doubleBtn!: Button;
  private reviveUsed = false;
  private doubleUsed = false;
  private finalized = false;
  private leavingForRevive = false;
  /** Timer agendado pro interstitial automático — cancelado em qualquer ação do usuário. */
  private interstitialTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: SCENES.GAME_OVER });
  }

  create(data: RunStats): void {
    try {
      this.createInternal(data);
    } catch (err) {
      // Falha catastrófica em qualquer lugar do create — volta pro menu
      // pra evitar tela preta indefinida.
      console.error('[GameOverScene] erro fatal em create()', err);
      try {
        this.scene.start(SCENES.HOME);
      } catch (err2) {
        console.error('[GameOverScene] fallback HOME falhou', err2);
      }
    }
  }

  private createInternal(data: RunStats): void {
    // Defensiva: data pode chegar undefined em paths inesperados — não trava a tela.
    if (!data || typeof data !== 'object') {
      console.error('[GameOverScene] data inválido recebido, voltando ao menu', data);
      this.scene.start(SCENES.HOME);
      return;
    }
    this.stats = {
      distance: typeof data.distance === 'number' ? data.distance : 0,
      score: typeof data.score === 'number' ? data.score : 0,
      coinsCollected: typeof data.coinsCollected === 'number' ? data.coinsCollected : 0,
      powerupsCollected: typeof data.powerupsCollected === 'number' ? data.powerupsCollected : 0,
      nearMisses: typeof data.nearMisses === 'number' ? data.nearMisses : 0,
      obstaclesBroken: typeof data.obstaclesBroken === 'number' ? data.obstaclesBroken : 0,
      survivedSeconds: typeof data.survivedSeconds === 'number' ? data.survivedSeconds : 0,
      newRecord: !!data.newRecord,
      rewardedReviveUsed: !!data.rewardedReviveUsed
    };
    this.reviveUsed = false;
    this.doubleUsed = false;
    this.finalized = false;
    this.leavingForRevive = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (!this.leavingForRevive) this.finalizeRun();
    });

    // Overlay escuro com fade
    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.overlay, 0)
      .setOrigin(0)
      .setDepth(-1);
    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.7,
      duration: 360,
      ease: 'Quad.easeOut'
    });

    SceneTransition.enter(this, 250);

    // Card central
    const cardW = 620;
    const cardH = 540;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const accent = this.stats.newRecord ? Colors.accent.yellow : Colors.accent.coral;

    const card = this.add.container(cx, cy).setDepth(10);
    const gfx = this.add.graphics();
    // sombra
    gfx.fillStyle(Colors.bg.overlay, 0.55);
    gfx.fillRoundedRect(-cardW / 2 + 8, -cardH / 2 + 12, cardW, cardH, 32);
    // card
    gfx.fillStyle(Colors.bg.secondary, 1);
    gfx.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    // borda
    gfx.lineStyle(3, accent, 1);
    gfx.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    // highlight superior
    gfx.fillStyle(0xffffff, 0.05);
    gfx.fillRoundedRect(-cardW / 2 + 12, -cardH / 2 + 12, cardW - 24, 80, 24);
    card.add(gfx);

    // Título
    const titleLabel = this.stats.newRecord ? 'NOVO RECORDE!' : 'GAME OVER';
    const title = this.add
      .text(0, -cardH / 2 + 60, titleLabel, Type.heading({
        fontSize: this.stats.newRecord ? '44px' : '40px',
        color: hex(this.stats.newRecord ? Colors.accent.yellow : Colors.text.primary)
      }))
      .setOrigin(0.5);
    card.add(title);

    if (this.stats.newRecord) {
      // Confete + pulso no título
      this.time.delayedCall(180, () =>
        ParticleEffects.confetti(this, cx, cy - cardH / 2 + 60)
      );
      this.tweens.add({
        targets: title,
        scale: { from: 1.18, to: 1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      AudioSystem.instance().playPowerUp();
    }

    // Distância grande
    const distLabel = this.add
      .text(0, -cardH / 2 + 130, '0m', Type.numeric({
        fontSize: '60px',
        color: hex(Colors.accent.cyan)
      }))
      .setOrigin(0.5);
    card.add(distLabel);
    this.animateNumber(distLabel, 0, Math.floor(this.stats.distance), 800, 'm');

    // Score + Coins (2 colunas)
    const scoreCol = this.add.container(-cardW / 4, -cardH / 2 + 210);
    const scoreLabel = this.add.text(0, 0, 'Score', Type.caption({ color: hex(Colors.text.muted) })).setOrigin(0.5);
    const scoreValue = this.add
      .text(0, 28, '0', Type.numeric({ fontSize: '28px', color: hex(Colors.text.primary) }))
      .setOrigin(0.5);
    scoreCol.add([scoreLabel, scoreValue]);
    card.add(scoreCol);
    this.animateNumber(scoreValue, 0, Math.floor(this.stats.score), 800);

    const coinsCol = this.add.container(cardW / 4, -cardH / 2 + 210);
    const coinsLabel = this.add.text(0, 0, 'Moedas', Type.caption({ color: hex(Colors.text.muted) })).setOrigin(0.5);
    const coinsValue = this.add
      .text(0, 28, '0', Type.numeric({ fontSize: '28px', color: hex(Colors.accent.yellow) }))
      .setOrigin(0.5);
    coinsCol.add([coinsLabel, coinsValue]);
    card.add(coinsCol);
    this.animateNumber(coinsValue, 0, this.stats.coinsCollected, 800, '', '◉ ');

    // Stats secundários
    const otherStats = [
      `Near misses: ${this.stats.nearMisses}`,
      `Power-ups: ${this.stats.powerupsCollected}`,
      `Quebrados: ${this.stats.obstaclesBroken}`
    ];
    otherStats.forEach((line, i) => {
      const t = this.add
        .text(0, -cardH / 2 + 290 + i * 22, line, Type.caption({ color: hex(Colors.text.secondary), fontSize: '14px' }))
        .setOrigin(0.5);
      card.add(t);
    });

    // Botões
    const btnY1 = cardH / 2 - 130;
    const btnY2 = cardH / 2 - 60;
    const btnW = 240;
    const btnH = 56;

    this.reviveBtn = new Button({
      scene: this,
      x: -btnW / 2 - 12,
      y: btnY1,
      width: btnW,
      height: btnH,
      label: 'Reviver',
      icon: '▶',
      fontSize: 17,
      variant: 'primary',
      onClick: () => this.handleRevive()
    });
    card.add(this.reviveBtn);
    if (this.stats.rewardedReviveUsed) {
      this.reviveBtn.setLabel('Revive usado').setDisabled(true);
    }

    this.doubleBtn = new Button({
      scene: this,
      x: btnW / 2 + 12,
      y: btnY1,
      width: btnW,
      height: btnH,
      label: 'Dobrar moedas',
      icon: '◉',
      fontSize: 17,
      variant: 'secondary',
      onClick: () => this.handleDouble()
    });
    card.add(this.doubleBtn);

    const replayBtn = new Button({
      scene: this,
      x: -btnW / 2 - 12,
      y: btnY2,
      width: btnW,
      height: btnH,
      label: 'Jogar de novo',
      fontSize: 17,
      variant: 'success',
      onClick: () => {
        this.cancelPendingInterstitial();
        this.finalizeRun();
        SceneTransition.fade(this, SCENES.GAME);
      }
    });
    card.add(replayBtn);

    const menuBtn = new Button({
      scene: this,
      x: btnW / 2 + 12,
      y: btnY2,
      width: btnW,
      height: btnH,
      label: 'Menu',
      fontSize: 17,
      variant: 'ghost',
      onClick: () => {
        this.cancelPendingInterstitial();
        this.finalizeRun();
        SceneTransition.fade(this, SCENES.HOME);
      }
    });
    card.add(menuBtn);

    // Mini-cards de missões (lateral direita)
    this.renderMissionsSidebar();

    // Entry animation do card
    card.setScale(0.85).setAlpha(0);
    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 380,
      ease: 'Back.easeOut'
    });

    // Interstitial a cada 3 mortes — agendado, mas cancelado se o usuário
    // interagir com qualquer botão (evita ad-em-cima-de-ad).
    if (this.state.shouldShowInterstitial()) {
      this.interstitialTimer = this.time.delayedCall(900, () => {
        this.interstitialTimer = null;
        // Só mostra se nenhum outro ad estiver em tela.
        if (!this.services.ads.isCurrentlyShowing()) {
          this.services.ads.show('interstitial').catch(() => {});
        }
      });
    }
  }

  /** Cancela o timer auto-interstitial — chamado em toda interação do usuário. */
  private cancelPendingInterstitial(): void {
    if (this.interstitialTimer) {
      this.interstitialTimer.remove(false);
      this.interstitialTimer = null;
    }
  }

  private renderMissionsSidebar(): void {
    const missions = this.state.get().missions.missions.filter((m) => m.progress > 0);
    if (missions.length === 0) return;

    const x = GAME_WIDTH - 200;
    const startY = 140;
    missions.forEach((m, i) => {
      const y = startY + i * 96;
      const w = 180;
      const h = 80;
      const c = this.add.container(x, y).setDepth(20);

      const gfx = this.add.graphics();
      gfx.fillStyle(Colors.bg.overlay, 0.4);
      gfx.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 14);
      gfx.fillStyle(Colors.bg.secondary, 0.95);
      gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
      gfx.lineStyle(2, m.completed ? Colors.accent.green : Colors.accent.cyan, 1);
      gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
      c.add(gfx);

      const title = this.add
        .text(-w / 2 + 12, -h / 2 + 10, m.description, Type.caption({
          fontSize: '12px',
          color: hex(Colors.text.primary),
          wordWrap: { width: w - 24 }
        }))
        .setOrigin(0, 0);
      c.add(title);

      const ratio = Math.min(1, m.progress / m.target);
      const barW = w - 24;
      const barX = -w / 2 + 12;
      const barY = h / 2 - 18;
      const bg = this.add.rectangle(barX, barY, barW, 6, Colors.bg.tertiary).setOrigin(0, 0.5);
      const fg = this.add
        .rectangle(barX, barY, 0, 6, m.completed ? Colors.accent.green : Colors.accent.cyan)
        .setOrigin(0, 0.5);
      c.add([bg, fg]);
      this.tweens.add({
        targets: fg,
        width: barW * ratio,
        duration: 600,
        delay: 200 + i * 100,
        ease: 'Quad.easeOut'
      });

      // Entry slide
      c.setX(x + 200).setAlpha(0);
      this.tweens.add({
        targets: c,
        x,
        alpha: 1,
        duration: 320,
        delay: 80 * i,
        ease: 'Back.easeOut'
      });
    });
  }

  private async handleRevive(): Promise<void> {
    if (this.reviveUsed || this.stats.rewardedReviveUsed || this.finalized) return;
    this.cancelPendingInterstitial();
    this.reviveUsed = true;
    this.reviveBtn.setDisabled(true);
    // Desabilita também os outros botões enquanto o ad está rolando — evita
    // que o usuário dispare uma segunda transição em paralelo.
    this.doubleBtn.setDisabled(true);
    const r = await this.services.ads.show('rewarded');
    if (r.rewarded) {
      this.leavingForRevive = true;
      SceneTransition.fade(this, SCENES.GAME, {
        revive: true,
        resumeStats: {
          distance: this.stats.distance,
          score: this.stats.score,
          coinsCollected: this.stats.coinsCollected,
          powerupsCollected: this.stats.powerupsCollected,
          nearMisses: this.stats.nearMisses,
          obstaclesBroken: this.stats.obstaclesBroken,
          survivedSeconds: this.stats.survivedSeconds,
          rewardedReviveUsed: true
        }
      });
    } else {
      showToast({ scene: this, message: 'Ad interrompido — sem revive.', icon: '!' });
      this.doubleBtn.setDisabled(this.doubleUsed);
    }
  }

  private async handleDouble(): Promise<void> {
    if (this.doubleUsed) return;
    this.cancelPendingInterstitial();
    this.doubleUsed = true;
    this.doubleBtn.setDisabled(true);
    // Mesma proteção: trava revive enquanto o ad de double roda.
    const reviveWasDisabled = this.reviveBtn.isDisabled();
    if (!reviveWasDisabled) this.reviveBtn.setDisabled(true);
    const r = await this.services.ads.show('rewarded');
    if (r.rewarded) {
      this.finalizeRun();
      this.reviveBtn.setLabel('Finalizada').setDisabled(true);
      this.state.addCoins(this.stats.coinsCollected);
      showToast({
        scene: this,
        message: `+${this.stats.coinsCollected} moedas extras!`,
        icon: '◉',
        color: Colors.accent.yellow
      });
    } else {
      showToast({ scene: this, message: 'Ad interrompido — sem bônus.', icon: '!' });
      if (!reviveWasDisabled) this.reviveBtn.setDisabled(false);
    }
  }

  private finalizeRun(): void {
    if (this.finalized) return;
    this.finalized = true;
    this.state.reportRun({
      distance: this.stats.distance,
      score: this.stats.score,
      coinsCollected: this.stats.coinsCollected,
      powerupsCollected: this.stats.powerupsCollected,
      nearMisses: this.stats.nearMisses,
      obstaclesBroken: this.stats.obstaclesBroken,
      survivedSeconds: this.stats.survivedSeconds
    });
  }

  private animateNumber(
    label: Phaser.GameObjects.Text,
    from: number,
    to: number,
    durationMs: number,
    suffix = '',
    prefix = ''
  ): void {
    const start = this.time.now;
    const tick = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = Math.min(1, (this.time.now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.floor(from + (to - from) * eased);
        label.setText(`${prefix}${v.toLocaleString('pt-BR')}${suffix}`);
        if (t >= 1) tick.remove(false);
      }
    });
  }
}
