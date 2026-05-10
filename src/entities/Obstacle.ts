import Phaser from 'phaser';
import type { Poolable } from '../systems/Pool';
import {
  TRAP_DEFS,
  type TrapBuildOptions,
  type TrapDef,
  type TrapHitbox,
  type TrapInstance
} from '../data/TrapDefs';

/**
 * Obstacle — runtime container POOLABLE para uma armadilha do registry.
 *
 * O fat switch antigo virou um registry: `Obstacle.reset(trapId, x, opts)`
 * busca o `TrapDef` correspondente e delega `build()` ao builder específico
 * do bioma. O `Obstacle` apenas:
 *
 *   • hospeda o container Phaser
 *   • integra com o Pool (acquire/release)
 *   • delega update / cleanup ao TrapInstance
 *   • expõe hitboxes em coords de mundo pra colisão
 *   • implementa break/smash (FX comuns a tudo)
 *
 * Builders são responsáveis por:
 *   • desenhar visual (Graphics anexado ao container)
 *   • declarar hitboxes (relativos ao container)
 *   • registrar tweens infinitos (e devolvê-los pra cleanup)
 */
export class Obstacle implements Poolable {
  readonly container: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private instance: TrapInstance | null = null;

  /** Id do trap atual no registry (TRAP_DEFS). */
  trapId: string = '';
  /** TrapDef cacheado — fonte de category, damageOnSlideOnly, etc. */
  def: TrapDef | null = null;

  hitboxes: TrapHitbox[] = [];
  triggerHitboxes: TrapHitbox[] = [];

  active = false;
  alive = false;
  broken = false;
  nearMissCounted = false;
  triggered = false;

  /**
   * Quando true, não scrolla com o mundo (usado em transições onde
   * obstáculos precisam ficar parados durante pan da câmera).
   */
  frozen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(40).setVisible(false);
  }

  /** Reinicializa o obstáculo para um novo spawn. */
  reset(trapId: string, x: number, options: TrapBuildOptions = {}): void {
    const def = TRAP_DEFS[trapId];
    if (!def) {
      console.error(`[Obstacle] TrapDef não encontrado: ${trapId}`);
      return;
    }

    this.alive = true;
    this.broken = false;
    this.nearMissCounted = false;
    this.triggered = false;
    this.frozen = false;
    this.trapId = trapId;
    this.def = def;
    this.hitboxes = [];
    this.triggerHitboxes = [];

    this.cleanupInstance();
    this.scene.tweens.killTweensOf(this.container);

    this.container
      .setPosition(x, 0)
      .setVisible(true)
      .setAlpha(1)
      .setAngle(0)
      .setScale(1);

    this.instance = def.build(this.scene, this.container, options);
    this.hitboxes = this.instance.hitboxes;
    this.triggerHitboxes = this.instance.triggerHitboxes;
  }

  /** Atualiza posição (mundo rola pra esquerda) + delega update do trap. */
  update(dx: number, time: number): void {
    if (!this.alive) return;
    if (!this.frozen) {
      this.container.x -= dx;
    }
    this.instance?.update?.(time);
  }

  worldX(): number {
    return this.container.x;
  }

  /** Retorna hitboxes em coords de MUNDO (somando container.x/y). */
  getWorldHitboxes(): TrapHitbox[] {
    const cx = this.container.x;
    const cy = this.container.y;
    return this.hitboxes.map((h) => ({ x: h.x + cx, y: h.y + cy, w: h.w, h: h.h }));
  }

  getWorldTriggerHitboxes(): TrapHitbox[] {
    const cx = this.container.x;
    const cy = this.container.y;
    return this.triggerHitboxes.map((h) => ({ x: h.x + cx, y: h.y + cy, w: h.w, h: h.h }));
  }

  /** Quebra suave — usado em break() de breakable. */
  break(onComplete?: () => void): void {
    if (this.broken) return;
    this.broken = true;
    this.alive = false;
    this.scene.tweens.add({
      targets: this.container,
      angle: 25,
      alpha: 0,
      scale: 1.2,
      duration: 220,
      onComplete: () => onComplete?.()
    });
  }

  /**
   * Smash dramático — usado pelo Rocket. Container inteiro rotaciona,
   * cai, esmaece. Hitboxes desligadas imediatamente pra evitar dupla colisão.
   */
  smash(onComplete?: () => void): void {
    if (this.broken) return;
    this.broken = true;
    this.alive = false;
    this.hitboxes = [];
    this.triggerHitboxes = [];

    const dir = Math.random() < 0.5 ? -1 : 1;
    this.scene.tweens.add({
      targets: this.container,
      y: this.container.y + 300,
      x: this.container.x + dir * 80,
      angle: dir * (360 + Math.random() * 270),
      alpha: 0,
      scale: 0.55,
      duration: 700,
      ease: 'Cubic.easeIn',
      onComplete: () => onComplete?.()
    });
  }

  /** Fade out + release — usado em transições. */
  fadeOutAndRelease(durationMs: number, onComplete?: () => void): void {
    this.alive = false;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => onComplete?.()
    });
  }

  /** Devolve ao pool: limpa instance + esconde container. */
  release(): void {
    this.alive = false;
    this.cleanupInstance();
    this.scene.tweens.killTweensOf(this.container);
    this.container.removeAll(true);
    this.container.setVisible(false);
    this.hitboxes = [];
    this.triggerHitboxes = [];
    this.def = null;
    this.trapId = '';
  }

  /** Destrói completamente — usado em pool.clear(). */
  destroy(): void {
    this.release();
    this.container.destroy();
  }

  private cleanupInstance(): void {
    if (this.instance) {
      try {
        this.instance.cleanup?.();
      } catch {
        /* */
      }
      this.instance = null;
    }
  }
}
