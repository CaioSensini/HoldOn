import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI_COLORS } from '../config';
import { Colors } from '../theme/colors';
import { Type } from '../theme/typography';
import { SceneTransition } from '../ui/SceneTransition';
import {
  EQUIPPABLE_DEFS,
  EQUIPPABLE_LIST,
  upgradeCost,
  type EquippableId
} from '../data/EquippableDefs';
import { GameState } from '../data/GameState';
import { getSkinById, getTrailById } from '../data/SkinDefs';
import { Button } from '../ui/Button';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { Modal } from '../ui/Modal';
import { showToast } from '../ui/ToastNotification';

type Tab = 'equippables' | 'skins_trails';

/**
 * Inventário: 3 slots no topo, lista de equipáveis com upgrade,
 * aba para gerenciar skin/trail equipados.
 */
export class InventoryScene extends Phaser.Scene {
  private state = GameState.instance();
  private currentTab: Tab = 'equippables';
  private slotsContainer!: Phaser.GameObjects.Container;
  private listContainer!: Phaser.GameObjects.Container;
  private focusedSlot: number = 0;
  private unsub?: () => void;

  constructor() {
    super({ key: SCENES.INVENTORY });
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 1).setOrigin(0);
    SceneTransition.enter(this);

    this.add.text(40, 30, 'Inventário', Type.heading()).setOrigin(0, 0);

    new CurrencyDisplay(this, GAME_WIDTH - 200, 36);

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

    const data = (this.scene.settings.data as { tab?: Tab; slot?: number }) ?? {};
    if (data.tab) this.currentTab = data.tab;
    const focusFromRegistry = this.registry.get('slot_focus') as number | undefined;
    this.focusedSlot = data.slot ?? focusFromRegistry ?? 0;
    this.registry.remove('slot_focus');

    // Tabs
    const tabY = 100;
    const tabBtnW = 200;
    new Button({
      scene: this,
      x: GAME_WIDTH / 2 - tabBtnW / 2 - 12,
      y: tabY,
      width: tabBtnW,
      height: 44,
      label: 'Equipáveis',
      fontSize: 16,
      primary: this.currentTab === 'equippables',
      onClick: () => {
        this.currentTab = 'equippables';
        this.scene.restart({ slot: this.focusedSlot, tab: 'equippables' });
      }
    });
    new Button({
      scene: this,
      x: GAME_WIDTH / 2 + tabBtnW / 2 + 12,
      y: tabY,
      width: tabBtnW,
      height: 44,
      label: 'Skin / Trail',
      fontSize: 16,
      primary: this.currentTab === 'skins_trails',
      onClick: () => {
        this.currentTab = 'skins_trails';
        this.scene.restart({ tab: 'skins_trails' });
      }
    });

    if (this.currentTab === 'equippables') {
      this.renderSlots();
      this.renderEquippablesList();
    } else {
      this.renderSkinsTrails();
    }

    this.unsub = this.state.subscribe(() => this.softRefresh());
    this.events.on('shutdown', () => this.unsub?.());
  }

  private softRefresh(): void {
    if (this.currentTab === 'equippables') {
      if (this.slotsContainer) this.slotsContainer.destroy();
      if (this.listContainer) this.listContainer.destroy();
      this.renderSlots();
      this.renderEquippablesList();
    } else {
      if (this.listContainer) this.listContainer.destroy();
      this.renderSkinsTrails();
    }
  }

  /* ---------- EQUIPÁVEIS TAB ---------- */

  private renderSlots(): void {
    this.slotsContainer = this.add.container(0, 0);
    const cy = 200;
    const slotW = 120;
    const gap = 24;
    const totalW = 3 * slotW + 2 * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + slotW / 2;
    const slotsContainer = this.slotsContainer;
    for (let i = 0; i < 3; i++) {
      const unlocked = this.state.isSlotUnlocked(i);
      const id = this.state.get().equippedSlots[i];
      const x = startX + i * (slotW + gap);
      const isFocused = i === this.focusedSlot;
      const stroke = isFocused ? UI_COLORS.ACCENT : unlocked ? UI_COLORS.PRIMARY : 0x444444;

      const bg = this.add
        .rectangle(x, cy, slotW, slotW, unlocked ? UI_COLORS.BG_PANEL_LIGHT : 0x1a1a1a, 1)
        .setStrokeStyle(3, stroke);
      slotsContainer.add(bg);

      if (!unlocked) {
        const lock = this.add
          .text(x, cy, '🔒', { fontFamily: 'sans-serif', fontSize: '40px' })
          .setOrigin(0.5);
        slotsContainer.add(lock);
        const note = this.add
          .text(x, cy + 70, i === 1 ? 'Recorde 5.000m' : 'Recorde 10.000m', {
            fontFamily: 'sans-serif',
            fontSize: '12px',
            color: '#9aa3b2'
          })
          .setOrigin(0.5);
        slotsContainer.add(note);
        continue;
      }

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.focusedSlot = i;
        this.softRefresh();
      });

      if (id) {
        const def = EQUIPPABLE_DEFS[id];
        const icon = this.add
          .text(x, cy - 8, def.icon, { fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff' })
          .setOrigin(0.5);
        slotsContainer.add(icon);
        const label = this.add
          .text(x, cy + 32, def.name, {
            fontFamily: 'sans-serif',
            fontSize: '13px',
            color: '#b6c2d9'
          })
          .setOrigin(0.5);
        slotsContainer.add(label);
        const removeBtn = this.add
          .text(x + slotW / 2 - 10, cy - slotW / 2 + 10, '✕', {
            fontFamily: 'sans-serif',
            fontSize: '18px',
            color: '#ff5b5b'
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        removeBtn.on('pointerdown', () => {
          this.state.setEquippedSlot(i, null);
        });
        slotsContainer.add(removeBtn);
      } else {
        const text = this.add
          .text(x, cy, '+', {
            fontFamily: 'sans-serif',
            fontSize: '46px',
            color: '#9aa3b2'
          })
          .setOrigin(0.5);
        slotsContainer.add(text);
        const sub = this.add
          .text(x, cy + 36, isFocused ? 'Selecionado' : 'Toque para focar', {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: isFocused ? '#ffd166' : '#9aa3b2'
          })
          .setOrigin(0.5);
        slotsContainer.add(sub);
      }
    }
  }

  private renderEquippablesList(): void {
    this.listContainer = this.add.container(0, 0);
    const startY = 320;
    const rowH = 76;
    const cardW = 1100;
    const startX = GAME_WIDTH / 2 - cardW / 2;
    const listContainer = this.listContainer;

    EQUIPPABLE_LIST.forEach((def, idx) => {
      const y = startY + idx * (rowH + 6);
      const level = this.state.getEquippableLevel(def.id);
      const owned = level > 0;

      const bg = this.add
        .rectangle(GAME_WIDTH / 2, y + rowH / 2, cardW, rowH, UI_COLORS.BG_PANEL_LIGHT, 1)
        .setStrokeStyle(2, owned ? def.color : 0x2a2a2a);
      listContainer.add(bg);

      const icon = this.add
        .text(startX + 36, y + rowH / 2, def.icon, {
          fontFamily: 'sans-serif',
          fontSize: '34px',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      listContainer.add(icon);

      const nameLabel = this.add
        .text(startX + 80, y + 12, def.name, {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0, 0);
      listContainer.add(nameLabel);

      const levelLabel = this.add
        .text(startX + 80, y + 36, `Lv ${level}/10`, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#9aa3b2'
        })
        .setOrigin(0, 0);
      listContainer.add(levelLabel);

      const descLabel = this.add
        .text(startX + 220, y + rowH / 2, def.description(level), {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#b6c2d9',
          wordWrap: { width: 480 }
        })
        .setOrigin(0, 0.5);
      listContainer.add(descLabel);

      // Botão upgrade
      const cost = upgradeCost(level);
      const canAfford = this.state.get().coins >= cost;
      const upgradeLabel = level >= 10 ? 'MAX' : `Up · ${cost}◉`;
      const upgradeBtn = new Button({
        scene: this,
        x: startX + cardW - 100,
        y: y + rowH / 2,
        width: 130,
        height: 44,
        label: upgradeLabel,
        fontSize: 13,
        primary: level < 10 && canAfford,
        bgColor: level >= 10 ? 0x444444 : canAfford ? UI_COLORS.PRIMARY : UI_COLORS.BG_PANEL,
        textColor: level >= 10 ? '#888' : canAfford ? '#0b0f1a' : '#ffffff',
        onClick: () => this.tryUpgrade(def.id, cost),
        disabled: level >= 10
      });
      listContainer.add(upgradeBtn);

      // Botão equipar (só pra owned, e só se slot disponível)
      const equipped = this.state.get().equippedSlots.includes(def.id);
      const equipBtn = new Button({
        scene: this,
        x: startX + cardW - 240,
        y: y + rowH / 2,
        width: 120,
        height: 44,
        label: equipped ? 'Equipado' : 'Equipar',
        fontSize: 13,
        bgColor: equipped ? UI_COLORS.SUCCESS : UI_COLORS.BG_PANEL,
        textColor: equipped ? '#0b0f1a' : '#ffffff',
        onClick: () => this.tryEquip(def.id),
        disabled: !owned
      });
      if (!owned) equipBtn.setAlpha(0.4);
      listContainer.add(equipBtn);
    });
  }

  private tryUpgrade(id: EquippableId, cost: number): void {
    const lvl = this.state.getEquippableLevel(id);
    if (lvl >= 10) return;
    if (this.state.get().coins < cost) {
      showToast({ scene: this, message: 'Moedas insuficientes', icon: '!', color: 0xff5b5b });
      return;
    }
    if (lvl === 0) {
      // primeira aquisição é "comprar Lv1" — ainda usa upgradeCost(0) que é 0;
      // forçamos um pequeno custo de unlock
      const unlockCost = 200;
      if (this.state.get().coins < unlockCost) {
        showToast({ scene: this, message: 'Moedas insuficientes', icon: '!', color: 0xff5b5b });
        return;
      }
      if (this.state.spendCoins(unlockCost)) {
        this.state.forceSetEquippableLevel(id, 1);
        showToast({ scene: this, message: `${EQUIPPABLE_DEFS[id].name} desbloqueado!`, icon: '★' });
      }
      return;
    }
    if (this.state.upgradeEquippable(id, cost)) {
      showToast({
        scene: this,
        message: `${EQUIPPABLE_DEFS[id].name} → Lv${lvl + 1}`,
        icon: '⬆',
        color: UI_COLORS.PRIMARY
      });
    }
  }

  private tryEquip(id: EquippableId): void {
    const slot = this.focusedSlot;
    if (!this.state.isSlotUnlocked(slot)) {
      showToast({ scene: this, message: 'Slot bloqueado', icon: '🔒' });
      return;
    }
    // se já está equipado neste slot, desequipar
    if (this.state.get().equippedSlots[slot] === id) {
      this.state.setEquippedSlot(slot, null);
      return;
    }
    this.state.setEquippedSlot(slot, id);
  }

  /* ---------- SKINS / TRAILS TAB ---------- */

  private renderSkinsTrails(): void {
    this.listContainer = this.add.container(0, 0);

    const skinId = this.state.get().equippedSkin;
    const trailId = this.state.get().equippedTrail;
    const skin = getSkinById(skinId);
    const trail = getTrailById(trailId);

    this.add
      .text(GAME_WIDTH / 2, 200, 'Skin equipada', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    if (skin) {
      this.add.image(GAME_WIDTH / 2 - 200, 280, skin.textureKey).setScale(2);
      this.add
        .text(GAME_WIDTH / 2 - 200, 360, skin.name, {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#ffffff'
        })
        .setOrigin(0.5);
    }

    this.add
      .text(GAME_WIDTH / 2, 420, 'Trail equipado', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    if (trail) {
      const t = this.add
        .image(GAME_WIDTH / 2 + 200, 280, trail.textureKey)
        .setScale(3)
        .setTint(trail.color);
      void t;
      this.add
        .text(GAME_WIDTH / 2 + 200, 360, trail.name, {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: '#ffffff'
        })
        .setOrigin(0.5);
    }

    new Button({
      scene: this,
      x: GAME_WIDTH / 2,
      y: 540,
      width: 280,
      height: 56,
      label: 'Trocar na Loja',
      fontSize: 18,
      primary: true,
      onClick: () => this.scene.start(SCENES.SHOP)
    });
  }
}
