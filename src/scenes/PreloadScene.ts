import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config';
import { Colors, hex } from '../theme/colors';
import { Type, waitForFonts } from '../theme/typography';
import { generateAllPlaceholders } from '../utils/PlaceholderArt';

interface AssetEntry {
  key: string;
  path: string;
}

const IMAGE_ASSETS: AssetEntry[] = [
  // skins
  { key: 'skin_rock', path: 'assets/images/skins/rock.png' },
  { key: 'skin_arrow', path: 'assets/images/skins/arrow.png' },
  { key: 'skin_coin', path: 'assets/images/skins/coin.png' },
  { key: 'skin_donut', path: 'assets/images/skins/donut.png' },
  { key: 'skin_leaf', path: 'assets/images/skins/leaf.png' },
  { key: 'skin_drop', path: 'assets/images/skins/drop.png' },
  { key: 'skin_dice', path: 'assets/images/skins/dice.png' },
  { key: 'skin_heart', path: 'assets/images/skins/heart.png' },
  { key: 'skin_boomerang', path: 'assets/images/skins/boomerang.png' },
  { key: 'skin_kunai', path: 'assets/images/skins/kunai.png' },
  { key: 'skin_crystal', path: 'assets/images/skins/crystal.png' },
  { key: 'skin_lightning', path: 'assets/images/skins/lightning.png' },
  { key: 'skin_fireball', path: 'assets/images/skins/fireball.png' },
  { key: 'skin_star', path: 'assets/images/skins/star.png' },
  { key: 'skin_rainbow', path: 'assets/images/skins/rainbow_pulse.png' },

  // obstacles
  { key: 'obs_wall_high', path: 'assets/images/obstacles/wall_high.png' },
  { key: 'obs_beam_low', path: 'assets/images/obstacles/beam_low.png' },
  { key: 'obs_pit', path: 'assets/images/obstacles/pit.png' },
  { key: 'obs_moving', path: 'assets/images/obstacles/moving.png' },
  { key: 'obs_gap_top', path: 'assets/images/obstacles/gap_top.png' },
  { key: 'obs_gap_bot', path: 'assets/images/obstacles/gap_bot.png' },
  { key: 'obs_combo', path: 'assets/images/obstacles/combo.png' },
  { key: 'obs_breakable', path: 'assets/images/obstacles/breakable.png' },
  { key: 'obs_slide_gate', path: 'assets/images/obstacles/slide_gate.png' },
  { key: 'obs_bonus_hole', path: 'assets/images/obstacles/bonus_hole.png' },
  { key: 'obs_pipe_exit', path: 'assets/images/obstacles/pipe_exit.png' },

  // coins
  { key: 'coin_bronze', path: 'assets/images/coins/bronze.png' },
  { key: 'coin_silver', path: 'assets/images/coins/silver.png' },
  { key: 'coin_gold', path: 'assets/images/coins/gold.png' },
  { key: 'coin_diamond', path: 'assets/images/coins/diamond.png' },
  { key: 'coin_legendary', path: 'assets/images/coins/legendary.png' },

  // powerups
  { key: 'pu_rocket', path: 'assets/images/powerups/rocket.png' },
  { key: 'pu_shield', path: 'assets/images/powerups/shield.png' },
  { key: 'pu_magnet', path: 'assets/images/powerups/magnet.png' },
  { key: 'pu_coins2x', path: 'assets/images/powerups/coins2x.png' },
  { key: 'pu_slowmo', path: 'assets/images/powerups/slowmo.png' },
  { key: 'pu_phantom', path: 'assets/images/powerups/phantom.png' },
  { key: 'pu_revive', path: 'assets/images/powerups/revive.png' },
  { key: 'pu_coinrain', path: 'assets/images/powerups/coinrain.png' },
  { key: 'pu_mini', path: 'assets/images/powerups/mini.png' },

  // trails
  { key: 'trail_default', path: 'assets/images/trails/default.png' },
  { key: 'trail_fire', path: 'assets/images/trails/fire.png' },
  { key: 'trail_sparkle', path: 'assets/images/trails/sparkle.png' },
  { key: 'trail_rainbow', path: 'assets/images/trails/rainbow.png' },
  { key: 'trail_smoke', path: 'assets/images/trails/smoke.png' },

  // particles
  { key: 'spark', path: 'assets/images/particles/spark.png' },
  { key: 'pixel', path: 'assets/images/particles/pixel.png' },

  // biomas
  { key: 'bg_forest', path: 'assets/images/biomes/forest.png' },
  { key: 'bg_cave', path: 'assets/images/biomes/cave.png' },
  { key: 'bg_temple', path: 'assets/images/biomes/temple.png' },
  { key: 'bg_space', path: 'assets/images/biomes/space.png' },
  { key: 'bg_forest_sky', path: 'assets/images/biomes/forest_sky.png' },
  { key: 'bg_forest_far', path: 'assets/images/biomes/forest_far.png' },
  { key: 'bg_forest_mid', path: 'assets/images/biomes/forest_mid.png' },
  { key: 'bg_forest_fg', path: 'assets/images/biomes/forest_fg.png' },
  { key: 'bg_cave_sky', path: 'assets/images/biomes/cave_sky.png' },
  { key: 'bg_cave_far', path: 'assets/images/biomes/cave_far.png' },
  { key: 'bg_cave_mid', path: 'assets/images/biomes/cave_mid.png' },
  { key: 'bg_cave_fg', path: 'assets/images/biomes/cave_fg.png' },
  { key: 'bg_temple_sky', path: 'assets/images/biomes/temple_sky.png' },
  { key: 'bg_temple_far', path: 'assets/images/biomes/temple_far.png' },
  { key: 'bg_temple_mid', path: 'assets/images/biomes/temple_mid.png' },
  { key: 'bg_temple_fg', path: 'assets/images/biomes/temple_fg.png' },
  { key: 'bg_space_sky', path: 'assets/images/biomes/space_sky.png' },
  { key: 'bg_space_far', path: 'assets/images/biomes/space_far.png' },
  { key: 'bg_space_mid', path: 'assets/images/biomes/space_mid.png' },
  { key: 'bg_space_fg', path: 'assets/images/biomes/space_fg.png' },
  { key: 'bg_sea', path: 'assets/images/biomes/sea.png' },
  { key: 'bg_sea_sky', path: 'assets/images/biomes/sea_sky.png' },
  { key: 'bg_sea_far', path: 'assets/images/biomes/sea_far.png' },
  { key: 'bg_sea_mid', path: 'assets/images/biomes/sea_mid.png' },
  { key: 'bg_sea_fg', path: 'assets/images/biomes/sea_fg.png' },
  { key: 'bg_beach', path: 'assets/images/biomes/beach.png' },
  { key: 'bg_beach_sky', path: 'assets/images/biomes/beach_sky.png' },
  { key: 'bg_beach_far', path: 'assets/images/biomes/beach_far.png' },
  { key: 'bg_beach_mid', path: 'assets/images/biomes/beach_mid.png' },
  { key: 'bg_beach_fg', path: 'assets/images/biomes/beach_fg.png' },
  { key: 'bg_volcano', path: 'assets/images/biomes/volcano.png' },
  { key: 'bg_volcano_sky', path: 'assets/images/biomes/volcano_sky.png' },
  { key: 'bg_volcano_far', path: 'assets/images/biomes/volcano_far.png' },
  { key: 'bg_volcano_mid', path: 'assets/images/biomes/volcano_mid.png' },
  { key: 'bg_volcano_fg', path: 'assets/images/biomes/volcano_fg.png' },
  { key: 'bg_citadel', path: 'assets/images/biomes/citadel.png' },
  { key: 'bg_citadel_sky', path: 'assets/images/biomes/citadel_sky.png' },
  { key: 'bg_citadel_far', path: 'assets/images/biomes/citadel_far.png' },
  { key: 'bg_citadel_mid', path: 'assets/images/biomes/citadel_mid.png' },
  { key: 'bg_citadel_fg', path: 'assets/images/biomes/citadel_fg.png' },

  // ui
  { key: 'ui_btn', path: 'assets/images/ui/button.png' },
  { key: 'ui_panel', path: 'assets/images/ui/panel.png' }
];

/** SVG icons used by HomeScene (Claude Design source). */
const ICON_SVG_ASSETS: AssetEntry[] = [
  { key: 'icon-coin',      path: 'assets/images/icons/coin.svg' },
  { key: 'icon-trophy',    path: 'assets/images/icons/trophy.svg' },
  { key: 'icon-magnet',    path: 'assets/images/icons/magnet.svg' },
  { key: 'icon-play',      path: 'assets/images/icons/play.svg' },
  { key: 'icon-shop',      path: 'assets/images/icons/shop.svg' },
  { key: 'icon-backpack',  path: 'assets/images/icons/backpack.svg' },
  { key: 'icon-checklist', path: 'assets/images/icons/checklist.svg' },
  { key: 'icon-podium',    path: 'assets/images/icons/podium.svg' },
  { key: 'icon-settings',  path: 'assets/images/icons/settings.svg' },
  { key: 'icon-chest',     path: 'assets/images/icons/chest.svg' },
  { key: 'icon-gift',      path: 'assets/images/icons/gift.svg' },
  { key: 'icon-bolt',      path: 'assets/images/icons/bolt.svg' },
  { key: 'icon-check',     path: 'assets/images/icons/check.svg' },
  { key: 'icon-star',      path: 'assets/images/icons/star.svg' }
];

/**
 * Verifica via HEAD request se um asset existe — evita os warnings
 * "Failed to process file" do Phaser quando o arquivo é placeholder ainda
 * não substituído por arte real.
 */
async function assetExists(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: 'HEAD', cache: 'force-cache' });
    return res.ok;
  } catch {
    return false;
  }
}

export class PreloadScene extends Phaser.Scene {
  /** Subset de assets que existem fisicamente — preenchido em init/create. */
  private existingAssets: AssetEntry[] = [];
  /** Subset de ícones SVG presentes — carregados via load.svg. */
  private existingIcons: AssetEntry[] = [];

  constructor() {
    super({ key: SCENES.PRELOAD });
  }

  /**
   * `init` é assíncrono no nosso fluxo: testamos cada asset via HEAD antes
   * de Phaser tentar carregar. Assim eliminamos os warnings vermelhos no
   * console enquanto a arte real não está disponível.
   */
  async init(): Promise<void> {
    this.drawLoadingBar();
    const checks = await Promise.all(
      IMAGE_ASSETS.map(async (a) => ({ asset: a, ok: await assetExists(a.path) }))
    );
    this.existingAssets = checks.filter((c) => c.ok).map((c) => c.asset);

    const iconChecks = await Promise.all(
      ICON_SVG_ASSETS.map(async (a) => ({ asset: a, ok: await assetExists(a.path) }))
    );
    this.existingIcons = iconChecks.filter((c) => c.ok).map((c) => c.asset);
  }

  preload(): void {
    // Suprime warnings de loaderror (só por garantia — se algo falhar mesmo).
    this.load.on('loaderror', (_file: Phaser.Loader.File) => {
      /* placeholder será gerado em create() */
    });
    for (const a of this.existingAssets) {
      this.load.image(a.key, a.path);
    }
    // SVGs do Home Screen — carregados como texture via load.svg
    // (vector → raster com tamanho razoável; 96px cobre todos os usos
    //  até 'play-icon' 56px e o 'btn-play' interno).
    for (const ic of this.existingIcons) {
      this.load.svg(ic.key, ic.path, { width: 96, height: 96 });
    }
  }

  async create(): Promise<void> {
    // Gera placeholders para CHAVES que não vieram de arquivo real.
    // PlaceholderArt.makeXxx checa se a textura já existe e pula.
    generateAllPlaceholders(this);
    await waitForFonts();
    this.scene.start(SCENES.HOME);
  }

  private drawLoadingBar(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const w = 480;
    const h = 10;

    const title = this.add
      .text(cx, cy - 40, 'FLOAT', Type.display({
        fontSize: '64px',
        color: hex(Colors.text.primary)
      }))
      .setOrigin(0.5);

    this.tweens.add({
      targets: title,
      alpha: { from: 0.4, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const bg = this.add.rectangle(cx, cy + 30, w, h, Colors.bg.tertiary).setOrigin(0.5);
    const fg = this.add.rectangle(cx - w / 2, cy + 30, 0, h, Colors.accent.yellow).setOrigin(0, 0.5);

    this.load.on('progress', (p: number) => {
      fg.width = w * p;
    });
    this.load.on('complete', () => {
      bg.destroy();
      fg.destroy();
    });
  }
}
