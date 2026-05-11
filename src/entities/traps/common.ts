/**
 * Helpers compartilhados pelos builders de armadilhas.
 * Mantém aritmética visual repetitiva fora dos arquivos de bioma.
 */

import type Phaser from 'phaser';
import { PLAYER, WORLD } from '../../config';
import type { TrapHitbox } from '../../data/TrapDefs';

/** Y do chão jogável (coincide com PLAYER.Y_MAX). */
export const GROUND_Y = WORLD.GROUND_Y;

/** Y do "topo do solo" — usado pra desenhar coisas grudadas no piso. */
export const ROAD_TOP_Y = WORLD.ROAD_TOP_Y;

/**
 * Faixa segura de slide — qualquer hitbox abaixo desta linha só é tocado
 * pelo player quando ele está na posição prone (deslizando no chão).
 *
 * GROUND_Y - PRONE_HEIGHT/2 ≈ 620 - 14 = 606 (centro do hitbox prone).
 *
 * Se a hitbox da armadilha de chão fica em y >= 600 com altura ≤ 30, o
 * pulo já passa por cima naturalmente. O flag `damageOnSlideOnly` é uma
 * camada extra de segurança garantindo que pulos curtos também não pegam.
 */
export const SLIDE_DANGER_Y = 596;

/** Altura padrão para hitboxes de armadilhas de chão. */
export const GROUND_TRAP_HITBOX_HEIGHT = 24;

/** Helper: cria uma hitbox de chão centralizada em (offsetX, GROUND_Y). */
export function groundHitbox(width: number): TrapHitbox {
  return {
    x: -width / 2,
    y: GROUND_Y - GROUND_TRAP_HITBOX_HEIGHT,
    w: width,
    h: GROUND_TRAP_HITBOX_HEIGHT
  };
}

/** Helper: hitbox de altura total no chão (paredes / pillars). */
export function wallHitbox(width: number, height: number): TrapHitbox {
  return {
    x: -width / 2,
    y: GROUND_Y - height,
    w: width,
    h: height
  };
}

/** Helper: hitbox suspensa no ar (low / beam). */
export function airHitbox(width: number, height: number, centerY: number): TrapHitbox {
  return {
    x: -width / 2,
    y: centerY - height / 2,
    w: width,
    h: height
  };
}

/**
 * Cortina vertical do teto até o topo visual do obstáculo, cobrindo toda a
 * largura do corpo. Usada em obstáculos `low` para fechar o gap entre o teto
 * jogável (PLAYER.Y_MIN) e o topo do corpo — sem ela, o player pode passar
 * grudado no teto por cima da armadilha.
 *
 * Deve ser acrescentada ao lado do `airHitbox` do corpo, não substituí-lo.
 */
export function ceilingCurtainHitbox(bodyWidth: number, bodyTopY: number): TrapHitbox {
  const top = PLAYER.Y_MIN - 4;
  const h = Math.max(0, bodyTopY - top);
  return {
    x: -bodyWidth / 2,
    y: top,
    w: bodyWidth,
    h
  };
}

/** Anexa um pulse infinito e devolve o tween pra cleanup posterior. */
export function pulseAlpha(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  from: number,
  to: number,
  duration = 600
): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    alpha: { from, to },
    duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}

/** Bobbing vertical infinito — usado pra coisas flutuando (jellyfish, satélite). */
export function bobY(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { y: number },
  amplitude: number,
  duration = 1100
): Phaser.Tweens.Tween {
  const baseY = target.y;
  return scene.tweens.add({
    targets: target,
    y: baseY - amplitude,
    duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}
