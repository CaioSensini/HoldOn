import Phaser from 'phaser';
import { SCENES } from '../config';

/**
 * BootScene: minimalista. Configura escala/input e segue para Preload.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.BOOT });
  }

  create(): void {
    this.scale.refresh();
    this.scene.start(SCENES.PRELOAD);
  }
}
