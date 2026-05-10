import Phaser from 'phaser';
import { getServices } from '../adapters';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI_COLORS } from '../config';
import { Colors } from '../theme/colors';
import { Type } from '../theme/typography';
import { SceneTransition } from '../ui/SceneTransition';
import { GameState } from '../data/GameState';
import {
  RARITY_COLORS,
  SKIN_DEFS,
  TRAIL_DEFS,
  type SkinDef,
  type TrailDef
} from '../data/SkinDefs';
import { Button } from '../ui/Button';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { showToast } from '../ui/ToastNotification';

type ShopTab = 'skins' | 'trails' | 'coins' | 'remove_ads';

export class ShopScene extends Phaser.Scene {
  private state = GameState.instance();
  private services = getServices();
  private currentTab: ShopTab = 'skins';
  private listContainer?: Phaser.GameObjects.Container;
  private rarityFilter: SkinDef['rarity'] | 'all' = 'all';
  private unsub?: () => void;

  constructor() {
    super({ key: SCENES.SHOP });
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.bg.primary, 1).setOrigin(0);
    SceneTransition.enter(this);

    this.add.text(40, 30, 'Loja', Type.heading()).setOrigin(0, 0);

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

    const data = (this.scene.settings.data as { tab?: ShopTab }) ?? {};
    if (data.tab) this.currentTab = data.tab;

    // Tabs
    const tabs: Array<{ id: ShopTab; label: string }> = [
      { id: 'skins', label: 'Skins' },
      { id: 'trails', label: 'Trails' },
      { id: 'coins', label: 'Pacotes' },
      { id: 'remove_ads', label: 'Remover Ads' }
    ];
    const tabW = 180;
    const tabGap = 12;
    const totalW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + tabW / 2;
    tabs.forEach((t, i) => {
      new Button({
        scene: this,
        x: startX + i * (tabW + tabGap),
        y: 100,
        width: tabW,
        height: 44,
        label: t.label,
        fontSize: 15,
        primary: this.currentTab === t.id,
        onClick: () => {
          this.currentTab = t.id;
          this.scene.restart({ tab: t.id });
        }
      });
    });

    this.renderCurrentTab();

    this.unsub = this.state.subscribe(() => this.renderCurrentTab());
    this.events.on('shutdown', () => this.unsub?.());
  }

  private renderCurrentTab(): void {
    if (this.listContainer) this.listContainer.destroy();
    this.listContainer = this.add.container(0, 0);

    switch (this.currentTab) {
      case 'skins':
        this.renderSkins();
        break;
      case 'trails':
        this.renderTrails();
        break;
      case 'coins':
        this.renderCoinPacks();
        break;
      case 'remove_ads':
        this.renderRemoveAds();
        break;
    }
  }

  private renderSkins(): void {
    // Filtro de raridade
    const rarities: Array<SkinDef['rarity'] | 'all'> = ['all', 'common', 'rare', 'epic', 'legendary'];
    const labels: Record<string, string> = {
      all: 'Todas',
      common: 'Comuns',
      rare: 'Raras',
      epic: 'Épicas',
      legendary: 'Lendárias'
    };
    rarities.forEach((r, i) => {
      const x = 80 + i * 110;
      new Button({
        scene: this,
        x,
        y: 170,
        width: 100,
        height: 36,
        label: labels[r],
        fontSize: 13,
        primary: this.rarityFilter === r,
        onClick: () => {
          this.rarityFilter = r;
          this.renderCurrentTab();
        }
      });
    });

    // Grid de skins
    const items = this.rarityFilter === 'all' ? SKIN_DEFS : SKIN_DEFS.filter((s) => s.rarity === this.rarityFilter);
    const cols = 5;
    const cardW = 200;
    const cardH = 220;
    const gap = 16;
    const startX = GAME_WIDTH / 2 - (cols * cardW + (cols - 1) * gap) / 2 + cardW / 2;
    const startY = 240;

    items.forEach((skin, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const owned = this.state.ownsSkin(skin.id);
      const equipped = this.state.get().equippedSkin === skin.id;
      const rarityColor = RARITY_COLORS[skin.rarity];

      const card = this.add
        .rectangle(x, y, cardW, cardH, UI_COLORS.BG_PANEL_LIGHT, 1)
        .setStrokeStyle(3, rarityColor);
      this.listContainer!.add(card);

      const img = this.add.image(x, y - 40, skin.textureKey).setScale(1.3);
      this.listContainer!.add(img);

      const name = this.add
        .text(x, y + 20, skin.name, {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      this.listContainer!.add(name);

      const rarityText = this.add
        .text(x, y + 40, skin.rarity.toUpperCase(), {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: Phaser.Display.Color.IntegerToColor(rarityColor).rgba
        })
        .setOrigin(0.5);
      this.listContainer!.add(rarityText);

      let btnLabel = '';
      let btnColor: number = UI_COLORS.PRIMARY;
      let onClick: () => void = () => {};
      if (equipped) {
        btnLabel = 'Equipado';
        btnColor = UI_COLORS.SUCCESS;
      } else if (owned) {
        btnLabel = 'Equipar';
        btnColor = UI_COLORS.PRIMARY;
        onClick = () => {
          this.state.equipSkin(skin.id);
          showToast({ scene: this, message: `${skin.name} equipada`, icon: '✓' });
        };
      } else {
        btnLabel = `${skin.cost.toLocaleString('pt-BR')}◉`;
        btnColor = UI_COLORS.ACCENT;
        onClick = () => this.tryBuySkin(skin);
      }

      const btn = new Button({
        scene: this,
        x,
        y: y + 80,
        width: cardW - 40,
        height: 36,
        label: btnLabel,
        fontSize: 13,
        bgColor: btnColor,
        textColor: '#0b0f1a',
        onClick,
        disabled: equipped
      });
      this.listContainer!.add(btn);
    });
  }

  private tryBuySkin(skin: SkinDef): void {
    if (this.state.get().coins < skin.cost) {
      showToast({ scene: this, message: 'Moedas insuficientes', icon: '!', color: UI_COLORS.DANGER });
      return;
    }
    if (this.state.buySkin(skin.id, skin.cost)) {
      this.state.equipSkin(skin.id);
      showToast({ scene: this, message: `${skin.name} desbloqueada!`, icon: '★', color: 0x66e08c });
    }
  }

  private renderTrails(): void {
    const cardW = 240;
    const cardH = 200;
    const gap = 16;
    const cols = TRAIL_DEFS.length;
    const startX = GAME_WIDTH / 2 - (cols * cardW + (cols - 1) * gap) / 2 + cardW / 2;
    const startY = 280;

    TRAIL_DEFS.forEach((trail: TrailDef, idx) => {
      const x = startX + idx * (cardW + gap);
      const y = startY;

      const owned = this.state.ownsTrail(trail.id);
      const equipped = this.state.get().equippedTrail === trail.id;

      const card = this.add
        .rectangle(x, y, cardW, cardH, UI_COLORS.BG_PANEL_LIGHT, 1)
        .setStrokeStyle(3, trail.color);
      this.listContainer!.add(card);

      const img = this.add.image(x, y - 30, trail.textureKey).setScale(2.5).setTint(trail.color);
      this.listContainer!.add(img);

      const name = this.add
        .text(x, y + 20, trail.name, {
          fontFamily: 'sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      this.listContainer!.add(name);

      let btnLabel = '';
      let onClick: () => void = () => {};
      let bgColor: number = UI_COLORS.PRIMARY;
      if (equipped) {
        btnLabel = 'Equipado';
        bgColor = UI_COLORS.SUCCESS;
      } else if (owned) {
        btnLabel = 'Equipar';
        onClick = () => {
          this.state.equipTrail(trail.id);
          showToast({ scene: this, message: `${trail.name} equipado`, icon: '✓' });
        };
      } else {
        btnLabel = `${trail.cost}◉`;
        bgColor = UI_COLORS.ACCENT;
        onClick = () => this.tryBuyTrail(trail);
      }

      const btn = new Button({
        scene: this,
        x,
        y: y + 70,
        width: cardW - 40,
        height: 36,
        label: btnLabel,
        fontSize: 13,
        bgColor,
        textColor: '#0b0f1a',
        onClick,
        disabled: equipped
      });
      this.listContainer!.add(btn);
    });
  }

  private tryBuyTrail(trail: TrailDef): void {
    if (this.state.get().coins < trail.cost) {
      showToast({ scene: this, message: 'Moedas insuficientes', icon: '!' });
      return;
    }
    if (this.state.buyTrail(trail.id, trail.cost)) {
      this.state.equipTrail(trail.id);
      showToast({ scene: this, message: `${trail.name} adquirido!`, icon: '★' });
    }
  }

  private renderCoinPacks(): void {
    const products = this.services.iap.getProducts().filter((p) => p.id.startsWith('coins_'));
    const cardW = 260;
    const cardH = 220;
    const gap = 20;
    const cols = products.length;
    const startX = GAME_WIDTH / 2 - (cols * cardW + (cols - 1) * gap) / 2 + cardW / 2;
    const startY = 320;

    products.forEach((p, idx) => {
      const x = startX + idx * (cardW + gap);
      const y = startY;
      const card = this.add
        .rectangle(x, y, cardW, cardH, UI_COLORS.BG_PANEL_LIGHT, 1)
        .setStrokeStyle(3, UI_COLORS.ACCENT);
      this.listContainer!.add(card);

      const title = this.add
        .text(x, y - 60, p.title, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      this.listContainer!.add(title);

      const desc = this.add
        .text(x, y - 20, p.description, {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#ffd166'
        })
        .setOrigin(0.5);
      this.listContainer!.add(desc);

      const price = this.add
        .text(x, y + 24, p.priceLabel, {
          fontFamily: 'sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      this.listContainer!.add(price);

      const btn = new Button({
        scene: this,
        x,
        y: y + 70,
        width: cardW - 40,
        height: 40,
        label: 'Comprar',
        fontSize: 15,
        primary: true,
        onClick: () => this.purchaseProduct(p.id)
      });
      this.listContainer!.add(btn);
    });
  }

  private renderRemoveAds(): void {
    const products = this.services.iap.getProducts();
    const removeAds = products.find((p) => p.id === 'remove_ads');
    const bundle = products.find((p) => p.id === 'equippables_bundle');

    let y = 280;
    [removeAds, bundle].forEach((p) => {
      if (!p) return;
      const w = 600;
      const h = 140;
      const x = GAME_WIDTH / 2;
      const owned = this.state.get().ownedNonConsumables.includes(p.id);
      const card = this.add
        .rectangle(x, y, w, h, UI_COLORS.BG_PANEL_LIGHT, 1)
        .setStrokeStyle(3, UI_COLORS.ACCENT);
      this.listContainer!.add(card);

      const title = this.add
        .text(x - w / 2 + 24, y - 38, p.title, {
          fontFamily: 'sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffffff'
        })
        .setOrigin(0, 0);
      this.listContainer!.add(title);
      const desc = this.add
        .text(x - w / 2 + 24, y, p.description, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#b6c2d9'
        })
        .setOrigin(0, 0);
      this.listContainer!.add(desc);

      const price = this.add
        .text(x + w / 2 - 24, y - 28, owned ? 'Comprado' : p.priceLabel, {
          fontFamily: 'sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: owned ? '#66e08c' : '#ffd166'
        })
        .setOrigin(1, 0);
      this.listContainer!.add(price);

      if (!owned) {
        const btn = new Button({
          scene: this,
          x: x + w / 2 - 100,
          y: y + 36,
          width: 160,
          height: 40,
          label: 'Comprar',
          fontSize: 15,
          primary: true,
          onClick: () => this.purchaseProduct(p.id)
        });
        this.listContainer!.add(btn);
      }
      y += h + 20;
    });
  }

  private async purchaseProduct(productId: string): Promise<void> {
    const r = await this.services.iap.purchase(productId);
    if (r.success) {
      this.state.applyIAPResult(productId);
      if (productId === 'remove_ads') this.services.ads.setRemoveAds(true);
      showToast({ scene: this, message: 'Compra concluída!', icon: '✓', color: 0x66e08c });
    } else {
      showToast({ scene: this, message: 'Compra cancelada', icon: '!' });
    }
  }
}
