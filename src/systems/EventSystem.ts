/**
 * Event bus interno do jogo.
 * Singleton compartilhado por sistemas e cenas — desacopla score/HUD/audio.
 *
 * **Cuidado com leaks:** listeners adicionados via `.on()` direto NÃO são limpos
 * automaticamente em scene shutdown. Use `onScoped(scene, event, fn)` para que
 * o listener seja removido quando a scene shutdown disparar.
 */

import Phaser from 'phaser';

type AnyFn = (...args: unknown[]) => void;

export class GameEventBus extends Phaser.Events.EventEmitter {
  private static _instance: GameEventBus | null = null;

  static instance(): GameEventBus {
    if (!this._instance) this._instance = new GameEventBus();
    return this._instance;
  }

  /**
   * Adiciona um listener escopado à scene: ao receber `shutdown` ou `destroy`,
   * o listener é removido automaticamente. Use sempre que adicionar listeners
   * dentro de uma scene — evita leaks entre runs.
   *
   * Retorna a função (mesma referência) para que o caller possa removê-la
   * antes do shutdown se quiser.
   */
  onScoped<T extends AnyFn>(scene: Phaser.Scene, event: string, fn: T, ctx?: unknown): T {
    this.on(event, fn, ctx);
    const cleanup = () => this.off(event, fn, ctx);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    return fn;
  }
}
