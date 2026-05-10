import Phaser from 'phaser';
import { getServices } from '../adapters';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { GameState } from '../data/GameState';
import { POWERUP_LIST } from '../data/PowerUpDefs';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SceneTransition } from '../ui/SceneTransition';
import { showToast } from '../ui/ToastNotification';
import { randPick } from '../utils/MathUtils';

interface CircleNavButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
}

/**
 * Tela inicial: parallax animado, personagem central com idle bobbing+rotation,
 * logo com bobbing, botão PLAY com pulso, atalhos circulares com label embaixo.
 */
export class HomeScene extends Phaser.Scene {
  private state = GameState.instance();
  private unsub?: () => void;

  // Parallax
  private parallax: Array<{ sprite: Phaser.GameObjects.TileSprite; speed: number }> = [];
  private parallaxOffsets = [0, 0, 0, 0];

  // Refs (pra refresh sem recriar)
  private coinsLabel!: Phaser.GameObjects.Text;
  private bestLabel!: Phaser.GameObjects.Text;
  private slotsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENES.HOME });
  }

  create(): void {
    this.buildParallax();
    // Overlay leve pra escurecer e melhorar contraste do UI
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 0.25).setOrigin(0).setDepth(-50);

    this.buildLogo();
    this.buildCharacter();
    this.buildPlayButton();
    this.buildDevButton();
    this.buildTopBar();
    this.buildBottomNav();
    this.buildExtraButtons();
    this.buildSlots();

    SceneTransition.enter(this);

    this.unsub = this.state.subscribe(() => this.refresh());
    this.events.on('shutdown', () => this.unsub?.());

    this.refresh();
    this.handleDailyReward();
  }

  update(_t: number, dtMs: number): void {
    // Parallax suave (loop infinito)
    const speed = 30 * (dtMs / 1000); // 30 px/s no nível mais lento
    for (let i = 0; i < this.parallax.length; i++) {
      this.parallaxOffsets[i] += speed * this.parallax[i].speed;
      this.parallax[i].sprite.tilePositionX = this.parallaxOffsets[i];
    }
  }

  /* -------- BUILD -------- */

  private buildParallax(): void {
    const layers: Array<{ key: string; y: number; h: number; speed: number; depth: number }> = [
      { key: 'bg_forest_sky', y: GAME_HEIGHT / 2, h: GAME_HEIGHT, speed: 0.1, depth: -100 },
      { key: 'bg_forest_far', y: 380, h: 320, speed: 0.4, depth: -90 },
      { key: 'bg_forest_mid', y: 510, h: 260, speed: 1.0, depth: -80 },
      { key: 'bg_forest_fg', y: 600, h: 180, speed: 2.4, depth: -70 }
    ];
    for (const l of layers) {
      const ts = this.add
        .tileSprite(GAME_WIDTH / 2, l.y, GAME_WIDTH, l.h, l.key)
        .setDepth(l.depth);
      this.parallax.push({ sprite: ts, speed: l.speed });
    }
  }

  private buildLogo(): void {
    const logo = this.add
      .text(GAME_WIDTH / 2, 90, 'FLOAT', Type.display({
        fontSize: '88px',
        color: hex(Colors.text.primary),
        stroke: hex(Colors.bg.primary),
        strokeThickness: 8
      }))
      .setOrigin(0.5)
      .setDepth(10);
    logo.setY(-100);
    this.tweens.add({
      targets: logo,
      y: 90,
      duration: 600,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        // Idle bobbing
        this.tweens.add({
          targets: logo,
          y: 86,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    this.add
      .text(GAME_WIDTH / 2, 152, 'Hold to fly. Release to fall.', Type.body({
        fontSize: '17px',
        color: hex(Colors.text.secondary),
        fontStyle: '500'
      }))
      .setOrigin(0.5)
      .setDepth(10);
  }

  private buildCharacter(): void {
    const skinId = this.state.get().equippedSkin;
    const tex = this.textures.exists(`skin_${skinId}`) ? `skin_${skinId}` : 'skin_rock';
    const cx = GAME_WIDTH * 0.32;
    const cy = GAME_HEIGHT / 2 + 20;

    // Trail circular ao redor (halo)
    const halo = this.add.graphics().setDepth(2);
    halo.fillStyle(Colors.accent.cyan, 0.18);
    halo.fillCircle(cx, cy, 130);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.4, to: 0.85 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Personagem
    const sprite = this.add.image(cx, cy, tex).setScale(2.6).setDepth(5).setAlpha(0);
    this.tweens.add({
      targets: sprite,
      alpha: 1,
      scale: { from: 1.8, to: 2.6 },
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Idle bobbing + rotation
        this.tweens.add({
          targets: sprite,
          y: cy - 18,
          duration: 1300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.tweens.add({
          targets: sprite,
          angle: { from: -6, to: 6 },
          duration: 1700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    // Plataforma sutil sob o personagem
    const platform = this.add.ellipse(cx, cy + 100, 160, 18, Colors.bg.primary, 0.4).setDepth(3);
    this.tweens.add({
      targets: platform,
      scaleX: { from: 0.85, to: 1 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private buildPlayButton(): void {
    const btn = new Button({
      scene: this,
      x: GAME_WIDTH * 0.7,
      y: GAME_HEIGHT / 2 + 20,
      width: 320,
      height: 96,
      label: 'PLAY',
      icon: '▶',
      fontSize: 32,
      variant: 'primary',
      onClick: () => {
        // Limpa qualquer dev_start_meters pra rodar normal
        this.registry.remove('dev_start_meters');
        SceneTransition.fade(this, SCENES.GAME);
      }
    });
    btn.setScale(0).setAlpha(0);
    this.tweens.add({
      targets: btn,
      scale: 1,
      alpha: 1,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => btn.startIdlePulse()
    });
  }

  /**
   * Botão DEV (preview de fases) — abre painel com 8 botões, um por fase.
   * Click em qualquer fase: salva `dev_start_meters` no registry e inicia
   * o GameScene direto naquela fase (com phaseYOffset correto se for Sea/Space).
   * APAGAR antes de release.
   */
  private buildDevButton(): void {
    new Button({
      scene: this,
      x: GAME_WIDTH * 0.7 + 240,
      y: GAME_HEIGHT / 2 + 20,
      width: 130,
      height: 96,
      label: 'DEV',
      icon: '🧪',
      fontSize: 22,
      variant: 'danger',
      onClick: () => this.openDevPhasePicker()
    });
  }

  private openDevPhasePicker(): void {
    const phases: Array<{ id: string; name: string; meters: number; emoji: string }> = [
      { id: 'forest',     name: 'Forest',     meters: 0,     emoji: '🌲' },
      { id: 'cave',       name: 'Cave',       meters: 2000,  emoji: '🦇' },
      { id: 'temple',     name: 'Temple',     meters: 4500,  emoji: '🏛️' },
      { id: 'sea',        name: 'Sea',        meters: 7000,  emoji: '🌊' },
      { id: 'beach',      name: 'Beach',      meters: 10000, emoji: '🏖️' },
      { id: 'volcano',    name: 'Volcano',    meters: 12500, emoji: '🌋' },
      { id: 'citadel',    name: 'Citadel',    meters: 15000, emoji: '🏰' },
      { id: 'space',      name: 'Space',      meters: 18000, emoji: '🌌' }
    ];

    // Overlay escurecedor bloqueando o resto da tela
    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 0.85)
      .setOrigin(0)
      .setDepth(2000)
      .setInteractive();

    // Container central
    const panelW = 760;
    const panelH = 520;
    const px = GAME_WIDTH / 2;
    const py = GAME_HEIGHT / 2;
    const panel = this.add.container(px, py).setDepth(2001);

    // Fundo do panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(Colors.bg.secondary, 0.98);
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 24);
    panelBg.lineStyle(3, Colors.accent.coral, 1);
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 24);
    panel.add(panelBg);

    // Título
    const title = this.add
      .text(0, -panelH / 2 + 38, '🧪 DEV — Pular pra fase', Type.heading({ fontSize: '26px', color: hex(Colors.accent.coral) }))
      .setOrigin(0.5);
    panel.add(title);
    const subtitle = this.add
      .text(0, -panelH / 2 + 70, 'Preview rápido — escolha uma fase pra começar', Type.caption({ fontSize: '14px', color: hex(Colors.text.secondary) }))
      .setOrigin(0.5);
    panel.add(subtitle);

    // Grid 4×2 de botões
    const cols = 4;
    const rows = 2;
    const cellW = 170;
    const cellH = 130;
    const gridW = cols * cellW + (cols - 1) * 12;
    const gridH = rows * cellH + (rows - 1) * 12;
    const startX = -gridW / 2 + cellW / 2;
    const startY = -gridH / 2 + cellH / 2 + 20;

    phases.forEach((phase, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cellW + 12);
      const cy = startY + row * (cellH + 12);
      const phaseContainer = this.add.container(cx, cy);

      const bg = this.add.graphics();
      bg.fillStyle(Colors.bg.primary, 0.9);
      bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      bg.lineStyle(2, Colors.accent.cyan, 0.6);
      bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      phaseContainer.add(bg);

      const emoji = this.add
        .text(0, -28, phase.emoji, { fontFamily: 'sans-serif', fontSize: '36px' })
        .setOrigin(0.5);
      phaseContainer.add(emoji);

      const name = this.add
        .text(0, 14, phase.name, Type.button({ fontSize: '18px', color: hex(Colors.text.primary) }))
        .setOrigin(0.5);
      phaseContainer.add(name);

      const meters = this.add
        .text(0, 38, `${phase.meters}m`, Type.caption({ fontSize: '12px', color: hex(Colors.text.muted) }))
        .setOrigin(0.5);
      phaseContainer.add(meters);

      // Hit zone clicável
      const hit = this.add
        .rectangle(0, 0, cellW, cellH, 0xffffff, 0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      phaseContainer.add(hit);

      hit.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(Colors.accent.cyan, 0.18);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
        bg.lineStyle(3, Colors.accent.cyan, 1);
        bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      });
      hit.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(Colors.bg.primary, 0.9);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
        bg.lineStyle(2, Colors.accent.cyan, 0.6);
        bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      });
      hit.on('pointerdown', () => {
        // Salva no registry e inicia GameScene
        this.registry.set('dev_start_meters', phase.meters);
        this.registry.set('dev_start_biome', phase.id);
        SceneTransition.fade(this, SCENES.GAME);
      });

      panel.add(phaseContainer);
    });

    // Botão fechar
    const closeBtn = new Button({
      scene: this,
      x: 0,
      y: panelH / 2 - 44,
      width: 200,
      height: 56,
      label: 'Fechar',
      variant: 'ghost',
      onClick: () => {
        try {
          panel.destroy();
          overlay.destroy();
        } catch {
          /* */
        }
      }
    });
    panel.add(closeBtn);

    // Entry anim
    panel.setScale(0.9).setAlpha(0);
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut'
    });
  }

  private buildTopBar(): void {
    // Pílula de moedas (top-right)
    const pillW = 220;
    const pillH = 50;
    const pillX = GAME_WIDTH - 24 - pillW / 2;
    const pillY = 36;

    const gfx = this.add.graphics().setDepth(20);
    const r = pillH / 2;
    gfx.fillStyle(Colors.bg.overlay, 0.4);
    gfx.fillRoundedRect(pillX - pillW / 2 + 3, pillY - pillH / 2 + 4, pillW, pillH, r);
    gfx.fillStyle(Colors.bg.secondary, 0.95);
    gfx.fillRoundedRect(pillX - pillW / 2, pillY - pillH / 2, pillW, pillH, r);
    gfx.lineStyle(2, Colors.accent.yellow, 1);
    gfx.strokeRoundedRect(pillX - pillW / 2, pillY - pillH / 2, pillW, pillH, r);

    this.add
      .text(pillX - pillW / 2 + 26, pillY, '◉', Type.numeric({ fontSize: '24px', color: hex(Colors.accent.yellow) }))
      .setOrigin(0.5)
      .setDepth(21);

    this.coinsLabel = this.add
      .text(pillX - pillW / 2 + 50, pillY, '0', Type.numeric({ fontSize: '22px', color: hex(Colors.text.primary) }))
      .setOrigin(0, 0.5)
      .setDepth(21);

    // Card do recorde (canto superior esquerdo, abaixo do logo)
    const trophyW = 240;
    const trophyH = 56;
    const trophyX = 24 + trophyW / 2;
    const trophyY = 200;
    const tgfx = this.add.graphics().setDepth(20);
    tgfx.fillStyle(Colors.bg.overlay, 0.4);
    tgfx.fillRoundedRect(trophyX - trophyW / 2 + 3, trophyY - trophyH / 2 + 4, trophyW, trophyH, 16);
    tgfx.fillStyle(Colors.bg.secondary, 0.95);
    tgfx.fillRoundedRect(trophyX - trophyW / 2, trophyY - trophyH / 2, trophyW, trophyH, 16);
    tgfx.lineStyle(2, Colors.accent.cyan, 1);
    tgfx.strokeRoundedRect(trophyX - trophyW / 2, trophyY - trophyH / 2, trophyW, trophyH, 16);

    this.add
      .text(trophyX - trophyW / 2 + 24, trophyY, '🏆', { fontFamily: 'sans-serif', fontSize: '24px' })
      .setOrigin(0.5)
      .setDepth(21);
    this.bestLabel = this.add
      .text(trophyX - trophyW / 2 + 50, trophyY, '', Type.numeric({ fontSize: '20px', color: hex(Colors.text.primary) }))
      .setOrigin(0, 0.5)
      .setDepth(21);
  }

  private buildBottomNav(): void {
    const items: Array<{ icon: string; label: string; key: string; color: number }> = [
      { icon: '🛒', label: 'Loja', key: SCENES.SHOP, color: Colors.accent.cyan },
      { icon: '🎒', label: 'Inventário', key: SCENES.INVENTORY, color: Colors.accent.purple },
      { icon: '🎯', label: 'Missões', key: SCENES.MISSIONS, color: Colors.accent.coral },
      { icon: '🏅', label: 'Ranking', key: SCENES.LEADERBOARD, color: Colors.accent.green },
      { icon: '⚙', label: 'Ajustes', key: SCENES.SETTINGS, color: Colors.text.secondary }
    ];
    const itemW = 100;
    const gap = 16;
    const totalW = items.length * itemW + (items.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + itemW / 2;
    const baseY = GAME_HEIGHT - 70;

    items.forEach((it, i) => {
      const x = startX + i * (itemW + gap);
      const c = this.makeCircleButton(x, baseY, it.icon, it.label, it.color, () => {
        SceneTransition.slide(this, it.key);
      });
      // Cascade entry
      c.container.setAlpha(0).setY(baseY + 30);
      this.tweens.add({
        targets: c.container,
        alpha: 1,
        y: baseY,
        duration: 320,
        delay: 50 * i,
        ease: 'Back.easeOut'
      });
    });
  }

  private makeCircleButton(
    x: number,
    y: number,
    icon: string,
    label: string,
    color: number,
    onClick: () => void
  ): CircleNavButton {
    const c = this.add.container(x, y).setDepth(20);
    const bg = this.add.graphics();
    const drawBg = (pressed: boolean) => {
      bg.clear();
      const off = pressed ? 2 : 6;
      bg.fillStyle(Colors.bg.overlay, 0.5);
      bg.fillCircle(0, off, 32);
      bg.fillStyle(color, 1);
      bg.fillCircle(0, pressed ? 4 : 0, 32);
      bg.fillStyle(0xffffff, 0.22);
      bg.fillCircle(-2, pressed ? -4 : -8, 18);
    };
    drawBg(false);
    c.add(bg);

    const iconText = this.add
      .text(0, 0, icon, { fontFamily: 'sans-serif', fontSize: '26px' })
      .setOrigin(0.5);
    c.add(iconText);

    const labelText = this.add
      .text(0, 46, label, Type.caption({
        fontSize: '13px',
        color: hex(Colors.text.primary),
        stroke: hex(Colors.bg.primary),
        strokeThickness: 3,
        fontStyle: '600'
      }))
      .setOrigin(0.5);
    c.add(labelText);

    // Hit zone: Circle nativo invisível com origem centrada — evita o
    // bug de hit-test do Graphics + custom hit area da Phaser 3.80
    // (que faz só o canto superior-esquerdo do botão funcionar).
    const hitZone = this.add
      .circle(0, 0, 36, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    c.add(hitZone);

    hitZone.on('pointerdown', () => {
      drawBg(true);
      this.tweens.add({ targets: c, scale: 0.92, duration: 80 });
      try {
        getServices().haptics.trigger('selection');
      } catch {}
    });
    hitZone.on('pointerup', () => {
      drawBg(false);
      this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.easeOut' });
      onClick();
    });
    hitZone.on('pointerout', () => {
      drawBg(false);
      this.tweens.add({ targets: c, scale: 1, duration: 180 });
    });
    return { container: c, bg };
  }

  private buildExtraButtons(): void {
    // Boost no start (esquerda) — só aparece se tiver ad
    if (!getServices().ads.isAdsRemoved()) {
      new Button({
        scene: this,
        x: 130,
        y: GAME_HEIGHT / 2 + 220,
        width: 200,
        height: 56,
        label: 'Boost',
        icon: '⚡',
        fontSize: 16,
        variant: 'success',
        onClick: () => this.startBoostAd()
      });
    }

    // Baú diário (direita)
    const today = this.state.currentDateKey();
    if (!this.state.hasClaimedDailyChest(today) && !getServices().ads.isAdsRemoved()) {
      new Button({
        scene: this,
        x: GAME_WIDTH - 130,
        y: GAME_HEIGHT / 2 + 220,
        width: 200,
        height: 56,
        label: 'Baú',
        icon: '🎁',
        fontSize: 16,
        variant: 'secondary',
        onClick: () => this.openDailyChest(today)
      });
    }
  }

  private buildSlots(): void {
    this.slotsContainer = this.add.container(0, 0).setDepth(15);
    const baseY = GAME_HEIGHT - 200;
    const slotW = 64;
    const gap = 14;
    const total = 3 * slotW + 2 * gap;
    const startX = GAME_WIDTH / 2 - total / 2 + slotW / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotW + gap);
      const unlocked = this.state.isSlotUnlocked(i);
      const id = this.state.get().equippedSlots[i];
      const gfx = this.add.graphics();
      gfx.fillStyle(Colors.bg.overlay, 0.4);
      gfx.fillRoundedRect(x - slotW / 2 + 2, baseY - slotW / 2 + 3, slotW, slotW, 14);
      gfx.fillStyle(unlocked ? Colors.bg.secondary : Colors.bg.primary, 0.95);
      gfx.fillRoundedRect(x - slotW / 2, baseY - slotW / 2, slotW, slotW, 14);
      gfx.lineStyle(2, unlocked ? Colors.accent.yellow : Colors.text.muted, 1);
      gfx.strokeRoundedRect(x - slotW / 2, baseY - slotW / 2, slotW, slotW, 14);
      this.slotsContainer.add(gfx);

      let txt = '+';
      if (!unlocked) txt = '🔒';
      else if (id) txt = this.iconForId(id);
      const t = this.add
        .text(x, baseY, txt, {
          fontFamily: 'sans-serif',
          fontSize: id ? '24px' : '24px',
          color: unlocked ? hex(Colors.text.primary) : hex(Colors.text.muted)
        })
        .setOrigin(0.5);
      this.slotsContainer.add(t);

      // Hit zone: Rectangle nativo (origem 0.5) — evita o quirk de
      // hit-test do Graphics + custom hit area da Phaser 3.80.
      const hitZone = this.add
        .rectangle(x, baseY, slotW, slotW, 0xffffff, 0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.slotsContainer.add(hitZone);
      hitZone.on('pointerdown', () => {
        if (!unlocked) {
          showToast({
            scene: this,
            message: i === 1 ? 'Desbloqueia em 5.000m' : 'Desbloqueia em 10.000m',
            icon: '🔒'
          });
          return;
        }
        this.registry.set('slot_focus', i);
        SceneTransition.slide(this, SCENES.INVENTORY);
      });
    }
  }

  private iconForId(id: string): string {
    const map: Record<string, string> = {
      head_start: '⚡',
      coin_bonus: '◉',
      powerup_duration: '⌛',
      magnet_range: 'U',
      shield_initial: '◈',
      score_multiplier: '×',
      near_miss_boost: '⟿',
      lucky_drop: '☘'
    };
    return map[id] ?? '?';
  }

  private refresh(): void {
    const s = this.state.get();
    this.coinsLabel.setText(s.coins.toLocaleString('pt-BR'));
    this.bestLabel.setText(`${s.bestDistance.toLocaleString('pt-BR')}m`);
    if (this.slotsContainer) {
      this.slotsContainer.destroy();
      this.buildSlots();
    }
  }

  private handleDailyReward(): void {
    const s = this.state.get();
    if (s.dailyClaimed) return;
    const reward = this.state.getDailyReward(s.loginStreak);
    new Modal({
      scene: this,
      title: `Login diário · Dia ${s.loginStreak}`,
      message: `Você ganhou ${reward} moedas pela visita de hoje!`,
      accent: Colors.accent.yellow,
      buttons: [
        {
          label: 'Receber',
          variant: 'primary',
          onClick: () => {
            const got = this.state.claimDailyReward();
            showToast({
              scene: this,
              message: `+${got} moedas`,
              icon: '◉',
              color: Colors.accent.yellow
            });
          }
        }
      ]
    });
  }

  private async openDailyChest(today: string): Promise<void> {
    const r = await getServices().ads.show('rewarded');
    if (r.rewarded) {
      const reward = 200;
      this.state.addCoins(reward);
      this.state.markDailyChestClaimed(today);
      this.state.bumpChestCounter(false);
      showToast({ scene: this, message: `+${reward} moedas do baú!`, icon: '🎁', color: Colors.accent.yellow });
      this.scene.restart();
    } else {
      showToast({ scene: this, message: 'Ad cancelado', icon: '!' });
    }
  }

  private async startBoostAd(): Promise<void> {
    const r = await getServices().ads.show('rewarded');
    if (r.rewarded) {
      const id = randPick(POWERUP_LIST.filter((p) => p.durationMs > 0)).id;
      this.registry.set('start_boost', id);
      showToast({ scene: this, message: `Próxima run terá ${id} ativo!`, icon: '⚡', color: Colors.accent.green });
    }
  }
}
