import Phaser from 'phaser';
import { Colors, hex } from '../theme/colors';
import { Type } from '../theme/typography';
import { GameState } from '../data/GameState';

/**
 * Pílula arredondada com ícone de moeda + valor. Atualiza automaticamente
 * em mudanças do GameState. Usada em Loja, Inventário, Missões.
 */
export class CurrencyDisplay extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private icon: Phaser.GameObjects.Text;
  private unsub?: () => void;
  private pw = 200;
  private ph = 48;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    this.icon = scene.add
      .text(-this.pw / 2 + 22, 0, '◉', { ...Type.numeric({ fontSize: '22px', color: hex(Colors.accent.yellow) }) })
      .setOrigin(0.5);
    this.add(this.icon);

    this.label = scene.add
      .text(-this.pw / 2 + 44, 0, '0', Type.numeric({ fontSize: '20px', color: hex(Colors.text.primary) }))
      .setOrigin(0, 0.5);
    this.add(this.label);

    this.drawPill();
    this.refresh();
    this.unsub = GameState.instance().subscribe(() => this.refresh());
    this.on('destroy', () => this.unsub?.());
  }

  private drawPill(): void {
    this.gfx.clear();
    const r = this.ph / 2;
    this.gfx.fillStyle(Colors.bg.overlay, 0.4);
    this.gfx.fillRoundedRect(-this.pw / 2 + 3, -this.ph / 2 + 4, this.pw, this.ph, r);
    this.gfx.fillStyle(Colors.bg.secondary, 1);
    this.gfx.fillRoundedRect(-this.pw / 2, -this.ph / 2, this.pw, this.ph, r);
    this.gfx.lineStyle(2, Colors.accent.yellow, 1);
    this.gfx.strokeRoundedRect(-this.pw / 2, -this.ph / 2, this.pw, this.ph, r);
  }

  private refresh(): void {
    if (!this.label.active) return;
    const c = GameState.instance().get().coins;
    this.label.setText(c.toLocaleString('pt-BR'));
  }
}
