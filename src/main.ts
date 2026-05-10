import Phaser from 'phaser';
import { initServices } from './adapters';
import { BG_COLOR, GAME_HEIGHT, GAME_WIDTH } from './config';
import { GameState } from './data/GameState';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { InventoryScene } from './scenes/InventoryScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { MissionsScene } from './scenes/MissionsScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';

// 1) Inicializa adapters (storage, ads, iap, haptics).
//    Para portar pra Capacitor, troque as instâncias em `adapters/index.ts`.
const services = initServices();

// 2) Hidrata GameState a partir do storage e atualiza dia/streak.
GameState.instance().init(services.storage);

// 3) Aplica volume das configurações salvas em haptics
services.haptics.enable(GameState.instance().get().settings.hapticsEnabled);
services.ads.setRemoveAds(GameState.instance().get().removeAds);

// 4) Cria o jogo Phaser.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BG_COLOR,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  input: {
    activePointers: 3
  },
  // Sem física aretee — usamos lógica manual em GameScene.
  // (Mais previsível e leve do que o Arcade physics pra esse tipo de runner.)
  scene: [
    BootScene,
    PreloadScene,
    HomeScene,
    GameScene,
    GameOverScene,
    ShopScene,
    InventoryScene,
    MissionsScene,
    SettingsScene,
    LeaderboardScene
  ],
  audio: {
    disableWebAudio: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

new Phaser.Game(config);
