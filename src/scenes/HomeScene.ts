import Phaser from 'phaser';
import { getServices } from '../adapters';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { GameState } from '../data/GameState';
import { POWERUP_LIST } from '../data/PowerUpDefs';
import { Colors, Radii, Spacing, hex } from '../theme/colors';
import { Type } from '../theme/typography';
import { Button } from '../ui/Button';
import { Button3D } from '../ui/components/Button3D';
import { Card } from '../ui/components/Card';
import { CurrencyPill } from '../ui/components/CurrencyPill';
import { Modal } from '../ui/Modal';
import { SceneTransition } from '../ui/SceneTransition';
import { showToast } from '../ui/ToastNotification';
import { randPick } from '../utils/MathUtils';

interface NavSpec {
  icon: string;
  label: string;
  key: string;
}

/**
 * Tela inicial — implementação fiel ao design "Float Home Screen" do design system Anthropic.
 *
 * Camada visual:
 *   • Forest biome backdrop (parallax) com sun-disc + vignette
 *   • Logo HOLD ON (88px, rotacionado -3°)
 *   • Pill BEST (canto superior-esquerdo, sob o logo)
 *   • Pill COINS + DAILY badge (canto superior-direito)
 *   • Hero character com aura beams rotativos + halo pulsante
 *   • 3 slots de equipável (cyan rare, dashed empty, locked)
 *   • PLAY button 3D (climax visual, halo amarelo pulsando)
 *   • Bottom nav (5 círculos: Shop, Inventory, Missions, Leaderboard, Settings)
 *
 * Comportamento (state subscriptions e event hooks) — preservado intacto.
 */
export class HomeScene extends Phaser.Scene {
  private state = GameState.instance();
  private unsub?: () => void;

  // Parallax
  private parallax: Array<{ sprite: Phaser.GameObjects.TileSprite; speed: number }> = [];
  private parallaxOffsets = [0, 0, 0, 0];

  // Refs (pra refresh sem recriar tudo)
  private coinsPill!: CurrencyPill;
  private bestPill!: CurrencyPill;
  private dailyBadge?: Phaser.GameObjects.Container;
  private slotsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: SCENES.HOME });
  }

  create(): void {
    this.buildBackdrop();

    this.buildLogo();
    this.buildBestPill();
    this.buildCoinsPill();
    this.buildDailyBadge();

    this.buildHeroCharacter();
    this.buildSlots();

    this.buildPlayButton();
    this.buildBottomNav();

    this.buildExtras();
    this.buildDevButton();

    SceneTransition.enter(this);

    this.unsub = this.state.subscribe(() => this.refresh());
    this.events.on('shutdown', () => this.unsub?.());

    this.refresh();
    this.handleDailyReward();
  }

  update(_t: number, dtMs: number): void {
    const speed = 30 * (dtMs / 1000);
    for (let i = 0; i < this.parallax.length; i++) {
      this.parallaxOffsets[i] += speed * this.parallax[i].speed;
      this.parallax[i].sprite.tilePositionX = this.parallaxOffsets[i];
    }
  }

  /* ============================================================
     BACKDROP — parallax forest + sun + vignette
     ============================================================ */
  private buildBackdrop(): void {
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

    // Sun glow (upper-left radial)
    const glow = this.add.graphics().setDepth(-60);
    glow.fillStyle(0xffeca0, 0.35);
    glow.fillCircle(-40, -40, 280);
    glow.fillStyle(0xffd23f, 0.18);
    glow.fillCircle(-40, -40, 220);

    // Sun disc
    const sun = this.add
      .circle(70, 90, 65, 0xffe98a, 1)
      .setStrokeStyle(0)
      .setDepth(-58);
    // Pulse leve no sol
    this.tweens.add({
      targets: sun,
      scale: { from: 1, to: 1.06 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Vignette / biome shade — escurece bordas, destaca o foreground
    const shade = this.add.graphics().setDepth(-50);
    shade.fillStyle(0x000000, 0.18);
    shade.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Gradient inferior mais escuro (linhas sobrepostas como aproximação)
    for (let i = 0; i < 18; i++) {
      const a = i / 17;
      shade.fillStyle(0x000000, a * 0.12);
      shade.fillRect(0, GAME_HEIGHT - (18 - i) * 12, GAME_WIDTH, 12);
    }
  }

  /* ============================================================
     LOGO — HOLD ON, 88px Fredoka, rotacionado -3°
     ============================================================ */
  private buildLogo(): void {
    const logo = this.add.container(80, 90).setDepth(15);

    const baseStyle = Type.display({
      fontSize: '88px',
      color: hex(Colors.text.primary),
      stroke: hex(Colors.bg.primary),
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 6, color: 'rgba(0,0,0,0.45)', blur: 0, fill: true, stroke: false }
    });

    const hold = this.add.text(0, 0, 'HOLD', baseStyle).setOrigin(0, 0);
    logo.add(hold);

    const on = this.add.text(60, 70, 'ON', baseStyle).setOrigin(0, 0);
    on.setAngle(2);
    logo.add(on);

    logo.setRotation(Phaser.Math.DegToRad(-3));

    // Entry: drop in with bounce
    logo.setY(-100);
    this.tweens.add({
      targets: logo,
      y: 90,
      duration: 600,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: logo,
          y: 86,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }

  /* ============================================================
     BEST score pill — abaixo do logo (top-left)
     ============================================================ */
  private buildBestPill(): void {
    this.bestPill = new CurrencyPill({
      scene: this,
      x: 130,
      y: 230,
      icon: '🏆',
      prefix: 'BEST',
      value: '0',
      size: 'sm',
      borderColor: Colors.accent.cyan,
      numberColor: Colors.text.primary,
      iconColor: Colors.accent.yellow
    });
    this.bestPill.setDepth(20);
  }

  /* ============================================================
     COINS pill — canto superior-direito
     ============================================================ */
  private buildCoinsPill(): void {
    this.coinsPill = new CurrencyPill({
      scene: this,
      x: GAME_WIDTH - 130,
      y: 50,
      icon: '◉',
      value: '0',
      size: 'md',
      borderColor: Colors.accent.yellow,
      numberColor: Colors.accent.yellow,
      iconColor: Colors.accent.yellow,
      minWidth: 180
    });
    this.coinsPill.setDepth(20);
  }

  /* ============================================================
     DAILY badge — coral pill animado (top-right, sob coins)
     Mostrado apenas enquanto recompensa diária não foi reclamada.
     ============================================================ */
  private buildDailyBadge(): void {
    const x = GAME_WIDTH - 130;
    const y = 105;
    const c = this.add.container(x, y).setDepth(20);

    const w = 140;
    const h = 38;
    const r = Radii.pill;
    const gfx = this.add.graphics();

    // sombra inferior (coral dark)
    gfx.fillStyle(Colors.accent.coralDark, 1);
    gfx.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);
    // body coral
    gfx.fillStyle(Colors.accent.coral, 1);
    gfx.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    // outline escuro
    gfx.lineStyle(2.5, Colors.bg.primary, 1);
    gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    // gloss superior
    gfx.fillStyle(0xffffff, 0.22);
    gfx.fillRoundedRect(-w / 2 + 4, -h / 2 + 2, w - 8, 10, r);
    c.add(gfx);

    // glow externo (radial atrás)
    const glow = this.add.graphics();
    glow.fillStyle(Colors.accent.coral, 0.28);
    glow.fillCircle(0, 0, w * 0.7);
    c.addAt(glow, 0);

    const icon = this.add
      .text(-w / 2 + 22, 0, '🎁', { fontFamily: 'sans-serif', fontSize: '22px' })
      .setOrigin(0.5);
    c.add(icon);

    const label = this.add
      .text(8, 0, 'DAILY!', Type.button({
        fontSize: '16px',
        color: hex(Colors.text.primary),
        stroke: hex(Colors.bg.primary),
        strokeThickness: 3
      }))
      .setOrigin(0.5);
    c.add(label);

    // bouncing animation (translateY + rotate)
    this.tweens.add({
      targets: c,
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: c,
      angle: { from: -3, to: 3 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hit zone — clicar reabre o modal de daily reward (caso ainda não claimed)
    const hit = this.add
      .rectangle(0, 0, w + 12, h + 12, 0xffffff, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    c.add(hit);
    hit.on('pointerdown', () => {
      if (!this.state.get().dailyClaimed) this.handleDailyReward();
    });

    this.dailyBadge = c;
  }

  /* ============================================================
     HERO CHARACTER — aura + beams + sprite com bob
     ============================================================ */
  private buildHeroCharacter(): void {
    const skinId = this.state.get().equippedSkin;
    const tex = this.textures.exists(`skin_${skinId}`) ? `skin_${skinId}` : 'skin_rock';

    const cx = 280;
    const cy = 360;

    // Aura: glow amarelo radial
    const aura = this.add.graphics().setDepth(2);
    aura.fillStyle(Colors.accent.yellow, 0.35);
    aura.fillCircle(cx, cy, 150);
    aura.fillStyle(0xffe98a, 0.5);
    aura.fillCircle(cx, cy, 95);
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.65, to: 1 },
      scale: { from: 0.95, to: 1.1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Aura beams — 8 triângulos rotacionando atrás do char
    const beams = this.add.graphics({ x: cx, y: cy }).setDepth(2);
    beams.fillStyle(Colors.accent.yellow, 0.55);
    const beamLen = 180;
    const beamHalfW = 14;
    for (let i = 0; i < 8; i++) {
      beams.save();
      beams.rotateCanvas((i / 8) * Math.PI * 2);
      beams.fillTriangle(0, -beamLen, beamHalfW, -40, -beamHalfW, -40);
      beams.restore();
    }
    this.tweens.add({
      targets: beams,
      rotation: Math.PI * 2,
      duration: 14000,
      repeat: -1
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
        // Idle bob (translate y + slight rotate)
        this.tweens.add({
          targets: sprite,
          y: cy - 14,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.tweens.add({
          targets: sprite,
          angle: { from: -4, to: 4 },
          duration: 1900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    // Shadow blob abaixo do char
    const blob = this.add
      .ellipse(cx, cy + 110, 180, 26, Colors.bg.primary, 0.45)
      .setDepth(3);
    this.tweens.add({
      targets: blob,
      scaleX: { from: 0.88, to: 1.04 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /* ============================================================
     SLOTS — 3 equipáveis sob o character
     ============================================================ */
  private buildSlots(): void {
    this.slotsContainer = this.add.container(0, 0).setDepth(15);

    const cx = 280;
    const baseY = 510;
    const slotR = 38;
    const gap = Spacing.s4;
    const total = 3 * (slotR * 2) + 2 * gap;
    const startX = cx - total / 2 + slotR;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotR * 2 + gap);
      const unlocked = this.state.isSlotUnlocked(i);
      const id = this.state.get().equippedSlots[i];
      const filled = !!id && unlocked;

      const slot = this.add.container(x, baseY);
      this.slotsContainer.add(slot);

      const gfx = this.add.graphics();
      if (filled) {
        // Rare slot: cyan border + glow + 3D shadow
        gfx.fillStyle(Colors.bg.primary, 1);
        gfx.fillCircle(0, 4, slotR); // shadow
        gfx.fillStyle(Colors.accent.cyan, 1);
        gfx.fillCircle(0, 0, slotR);
        gfx.lineStyle(3, Colors.bg.primary, 1);
        gfx.strokeCircle(0, 0, slotR);
        // glow halo
        gfx.lineStyle(4, Colors.accent.cyan, 0.4);
        gfx.strokeCircle(0, 0, slotR + 5);
        // inner highlight
        gfx.fillStyle(0xffffff, 0.3);
        gfx.fillCircle(-slotR * 0.3, -slotR * 0.35, slotR * 0.4);

        // Pulse animation
        this.tweens.add({
          targets: slot,
          scale: { from: 1, to: 1.05 },
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        // Empty/locked: dashed-look (we approximate with thin double stroke)
        gfx.fillStyle(Colors.bg.primary, 0.45);
        gfx.fillCircle(0, 0, slotR);
        gfx.lineStyle(3, Colors.text.primary, 0.85);
        gfx.strokeCircle(0, 0, slotR);
        // inner dashed effect — small dots around perimeter
        const dots = 12;
        for (let d = 0; d < dots; d++) {
          const a = (d / dots) * Math.PI * 2;
          gfx.fillStyle(Colors.bg.primary, 0.6);
          gfx.fillCircle(Math.cos(a) * slotR, Math.sin(a) * slotR, 2);
        }
      }
      slot.add(gfx);

      // Icon / placeholder
      let iconChar = '+';
      let iconColor = hex(Colors.text.primary);
      if (filled && id) {
        iconChar = this.iconForId(id);
        iconColor = hex(Colors.text.primary);
      } else if (!unlocked) {
        iconChar = '🔒';
      }
      const iconText = this.add
        .text(0, 0, iconChar, {
          fontFamily: 'sans-serif',
          fontSize: filled ? '32px' : '38px',
          color: iconColor,
          stroke: hex(Colors.bg.primary),
          strokeThickness: 2
        })
        .setOrigin(0.5);
      slot.add(iconText);

      // Hit zone
      const hit = this.add
        .circle(0, 0, slotR + 4, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      slot.add(hit);
      hit.on('pointerdown', () => {
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
      hit.on('pointerover', () => {
        this.tweens.add({ targets: slot, y: baseY - 4, duration: 120, ease: 'Back.easeOut' });
      });
      hit.on('pointerout', () => {
        this.tweens.add({ targets: slot, y: baseY, duration: 160 });
      });
    }

    // Caption "Tap to equip"
    const caption = this.add
      .text(cx, baseY + 56, 'TAP TO EQUIP', Type.caption({
        fontSize: '13px',
        color: hex(Colors.text.secondary),
        fontStyle: '600',
        stroke: hex(Colors.bg.primary),
        strokeThickness: 3
      }))
      .setOrigin(0.5)
      .setDepth(15);
    this.slotsContainer.add(caption);
  }

  /* ============================================================
     PLAY button — climax visual, halo amarelo pulsando
     ============================================================ */
  private buildPlayButton(): void {
    const cx = GAME_WIDTH * 0.7 + 50;
    const cy = 360;

    // Halo glow atrás
    const halo = this.add.graphics().setDepth(3);
    halo.fillStyle(Colors.accent.yellow, 0.35);
    halo.fillCircle(cx, cy, 240);
    halo.fillStyle(Colors.accent.yellow, 0.22);
    halo.fillCircle(cx, cy, 180);
    this.tweens.add({
      targets: halo,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 1, to: 1.08 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const btn = new Button3D({
      scene: this,
      x: cx,
      y: cy,
      width: 340,
      height: 110,
      label: 'PLAY',
      fontSize: 56,
      variant: 'primary',
      radius: Radii.card,
      onClick: () => {
        this.registry.remove('dev_start_meters');
        SceneTransition.fade(this, SCENES.GAME);
      }
    });
    btn.setDepth(4);

    // Entry anim
    btn.setScale(0).setAlpha(0);
    this.tweens.add({
      targets: btn,
      scale: 1,
      alpha: 1,
      duration: 380,
      ease: 'Back.easeOut',
      onComplete: () => btn.startIdlePulse()
    });

    // Caption "Tap to start" abaixo
    this.add
      .text(cx, cy + 100, 'TAP TO START', Type.caption({
        fontSize: '16px',
        color: hex(Colors.text.primary),
        fontStyle: '600',
        stroke: hex(Colors.bg.primary),
        strokeThickness: 2
      }))
      .setOrigin(0.5)
      .setDepth(4);
  }

  /* ============================================================
     BOTTOM NAV — 5 círculos com cyan ring
     ============================================================ */
  private buildBottomNav(): void {
    const items: NavSpec[] = [
      { icon: '🛒', label: 'SHOP', key: SCENES.SHOP },
      { icon: '🎒', label: 'INVENTORY', key: SCENES.INVENTORY },
      { icon: '🎯', label: 'MISSIONS', key: SCENES.MISSIONS },
      { icon: '🏅', label: 'RANKING', key: SCENES.LEADERBOARD },
      { icon: '⚙', label: 'SETTINGS', key: SCENES.SETTINGS }
    ];

    const circleR = 38;
    const itemW = circleR * 2;
    const gap = 28;
    const totalW = items.length * itemW + (items.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + circleR;
    const baseY = GAME_HEIGHT - 70;

    items.forEach((it, i) => {
      const x = startX + i * (itemW + gap);
      const c = this.makeNavCircle(x, baseY, it.icon, it.label, () => {
        SceneTransition.slide(this, it.key);
      });
      // Cascade entry
      c.setAlpha(0).setY(baseY + 30);
      this.tweens.add({
        targets: c,
        alpha: 1,
        y: baseY,
        duration: 320,
        delay: 50 * i,
        ease: 'Back.easeOut'
      });
    });
  }

  private makeNavCircle(
    x: number,
    y: number,
    icon: string,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(20);
    const r = 38;

    const bg = this.add.graphics();
    const drawBg = (pressed: boolean) => {
      bg.clear();
      const off = pressed ? 2 : 6;
      // bottom 3D shadow (dark)
      bg.fillStyle(0x0d0f1a, 1);
      bg.fillCircle(0, off, r);
      // body (secondary)
      bg.fillStyle(Colors.bg.secondary, 1);
      bg.fillCircle(0, pressed ? 4 : 0, r);
      // outline escuro (outer)
      bg.lineStyle(2, Colors.bg.primary, 1);
      bg.strokeCircle(0, pressed ? 4 : 0, r + 2);
      // cyan ring (inner accent border)
      bg.lineStyle(4, Colors.accent.cyan, 1);
      bg.strokeCircle(0, pressed ? 4 : 0, r);
      // top gloss highlight
      bg.fillStyle(0xffffff, 0.18);
      bg.fillCircle(-2, pressed ? -8 : -12, r * 0.4);
    };
    drawBg(false);
    c.add(bg);

    const iconText = this.add
      .text(0, 0, icon, { fontFamily: 'sans-serif', fontSize: '30px' })
      .setOrigin(0.5);
    c.add(iconText);

    const labelText = this.add
      .text(0, r + 18, label, Type.caption({
        fontSize: '13px',
        color: hex(Colors.text.primary),
        fontStyle: '700',
        stroke: hex(Colors.bg.primary),
        strokeThickness: 3
      }))
      .setOrigin(0.5);
    c.add(labelText);

    const hitZone = this.add
      .circle(0, 0, r + 4, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    c.add(hitZone);

    hitZone.on('pointerdown', () => {
      drawBg(true);
      this.tweens.add({ targets: c, scale: 0.93, duration: 80 });
      try {
        getServices().haptics.trigger('selection');
      } catch {
        /* */
      }
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
    return c;
  }

  /* ============================================================
     EXTRAS — Boost (ad) e Baú diário (ad)
     Mantém comportamento original; visualmente posicionados como
     "micro pílulas" no canto inferior pra não competir com PLAY/slots.
     ============================================================ */
  private buildExtras(): void {
    const today = this.state.currentDateKey();
    const adsRemoved = getServices().ads.isAdsRemoved();

    if (!adsRemoved) {
      // Boost (esquerda, acima do bottom nav)
      new Button({
        scene: this,
        x: 130,
        y: GAME_HEIGHT - 180,
        width: 168,
        height: 44,
        label: 'Boost',
        icon: '⚡',
        fontSize: 14,
        variant: 'success',
        onClick: () => this.startBoostAd()
      });
    }

    if (!this.state.hasClaimedDailyChest(today) && !adsRemoved) {
      // Baú (direita, acima do bottom nav)
      new Button({
        scene: this,
        x: GAME_WIDTH - 130,
        y: GAME_HEIGHT - 180,
        width: 168,
        height: 44,
        label: 'Baú',
        icon: '🎁',
        fontSize: 14,
        variant: 'secondary',
        onClick: () => this.openDailyChest(today)
      });
    }
  }

  /* ============================================================
     DEV button — preview de fases. APAGAR antes de release.
     Posicionado pequeno no canto superior-direito longe do design.
     ============================================================ */
  private buildDevButton(): void {
    new Button({
      scene: this,
      x: GAME_WIDTH - 30,
      y: GAME_HEIGHT - 20,
      width: 50,
      height: 28,
      label: 'DEV',
      fontSize: 11,
      variant: 'danger',
      onClick: () => this.openDevPhasePicker()
    });
  }

  private openDevPhasePicker(): void {
    const phases: Array<{ id: string; name: string; meters: number; emoji: string }> = [
      { id: 'forest', name: 'Forest', meters: 0, emoji: '🌲' },
      { id: 'cave', name: 'Cave', meters: 2000, emoji: '🦇' },
      { id: 'temple', name: 'Temple', meters: 4500, emoji: '🏛️' },
      { id: 'sea', name: 'Sea', meters: 7000, emoji: '🌊' },
      { id: 'beach', name: 'Beach', meters: 10000, emoji: '🏖️' },
      { id: 'volcano', name: 'Volcano', meters: 12500, emoji: '🌋' },
      { id: 'citadel', name: 'Citadel', meters: 15000, emoji: '🏰' },
      { id: 'space', name: 'Space', meters: 18000, emoji: '🌌' }
    ];

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 0.85)
      .setOrigin(0)
      .setDepth(2000)
      .setInteractive();

    const panelW = 760;
    const panelH = 520;
    const px = GAME_WIDTH / 2;
    const py = GAME_HEIGHT / 2;
    const panel = this.add.container(px, py).setDepth(2001);

    const card = new Card({
      scene: this,
      x: 0,
      y: 0,
      width: panelW,
      height: panelH,
      bgColor: Colors.bg.secondary,
      borderColor: Colors.accent.coral,
      borderWidth: 3,
      radius: 24
    });
    panel.add(card);

    const title = this.add
      .text(0, -panelH / 2 + 38, '🧪 DEV — Pular pra fase', Type.heading({
        fontSize: '26px',
        color: hex(Colors.accent.coral)
      }))
      .setOrigin(0.5);
    panel.add(title);
    const subtitle = this.add
      .text(0, -panelH / 2 + 70, 'Preview rápido — escolha uma fase pra começar', Type.caption({
        fontSize: '14px',
        color: hex(Colors.text.secondary)
      }))
      .setOrigin(0.5);
    panel.add(subtitle);

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
      const drawCell = (hover: boolean) => {
        bg.clear();
        bg.fillStyle(hover ? Colors.accent.cyan : Colors.bg.primary, hover ? 0.18 : 0.9);
        bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
        bg.lineStyle(hover ? 3 : 2, Colors.accent.cyan, hover ? 1 : 0.6);
        bg.strokeRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      };
      drawCell(false);
      phaseContainer.add(bg);

      const emoji = this.add
        .text(0, -28, phase.emoji, { fontFamily: 'sans-serif', fontSize: '36px' })
        .setOrigin(0.5);
      phaseContainer.add(emoji);

      const name = this.add
        .text(0, 14, phase.name, Type.button({
          fontSize: '18px',
          color: hex(Colors.text.primary)
        }))
        .setOrigin(0.5);
      phaseContainer.add(name);

      const meters = this.add
        .text(0, 38, `${phase.meters}m`, Type.caption({
          fontSize: '12px',
          color: hex(Colors.text.muted)
        }))
        .setOrigin(0.5);
      phaseContainer.add(meters);

      const hit = this.add
        .rectangle(0, 0, cellW, cellH, 0xffffff, 0)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      phaseContainer.add(hit);

      hit.on('pointerover', () => drawCell(true));
      hit.on('pointerout', () => drawCell(false));
      hit.on('pointerdown', () => {
        this.registry.set('dev_start_meters', phase.meters);
        this.registry.set('dev_start_biome', phase.id);
        SceneTransition.fade(this, SCENES.GAME);
      });

      panel.add(phaseContainer);
    });

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

    panel.setScale(0.9).setAlpha(0);
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut'
    });
  }

  /* ============================================================
     REFRESH — chamado em mudanças do state (subscribe)
     ============================================================ */
  private refresh(): void {
    const s = this.state.get();
    this.coinsPill.setValue(s.coins.toLocaleString('pt-BR'));
    this.bestPill.setValue(`${s.bestDistance.toLocaleString('pt-BR')}m`);

    // Esconde daily badge se já claimed
    if (this.dailyBadge) {
      this.dailyBadge.setVisible(!s.dailyClaimed);
    }

    if (this.slotsContainer) {
      this.slotsContainer.destroy();
      this.buildSlots();
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

  /* ============================================================
     DAILY REWARD MODAL — auto-popup ao entrar
     ============================================================ */
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
      showToast({
        scene: this,
        message: `+${reward} moedas do baú!`,
        icon: '🎁',
        color: Colors.accent.yellow
      });
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
      showToast({
        scene: this,
        message: `Próxima run terá ${id} ativo!`,
        icon: '⚡',
        color: Colors.accent.green
      });
    }
  }
}
