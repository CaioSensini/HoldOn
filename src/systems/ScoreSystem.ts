import Phaser from 'phaser';
import { EVENTS, SCORE } from '../config';
import { GameEventBus } from './EventSystem';

/**
 * ScoreSystem agrega distância e multiplicadores em um score final.
 * Usa `scene.time.delayedCall` (não `window.setTimeout`) para que o decay
 * do near-miss seja automaticamente cancelado em scene shutdown.
 */
export class ScoreSystem {
  private bus = GameEventBus.instance();
  private scene: Phaser.Scene;

  rawScore = 0;
  nearMissMult = 1.0;
  baseMult = 1.0;
  nearMissBoostMult = 1.0;

  private decayEvent: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  reset(baseMult = 1.0, nearMissBoostMult = 1.0): void {
    this.rawScore = 0;
    this.nearMissMult = 1;
    this.baseMult = baseMult;
    this.nearMissBoostMult = nearMissBoostMult;
    this.cancelDecay();
  }

  addDistance(meters: number): void {
    this.rawScore += meters * SCORE.POINTS_PER_METER * this.nearMissMult * this.baseMult;
    this.bus.emit(EVENTS.SCORE_UPDATE, this.rawScore);
  }

  registerNearMiss(): void {
    const boost = this.nearMissBoostMult;
    this.nearMissMult = Math.min(SCORE.NEAR_MISS_CAP, this.nearMissMult + SCORE.NEAR_MISS_STEP * boost);
    this.bus.emit(EVENTS.NEAR_MISS_MULTIPLIER, this.nearMissMult);
    this.cancelDecay();
    this.decayEvent = this.scene.time.delayedCall(SCORE.NEAR_MISS_DECAY_MS, () => {
      this.decayEvent = null;
      this.resetNearMiss();
    });
  }

  resetNearMiss(): void {
    if (this.nearMissMult === 1) return;
    this.nearMissMult = 1;
    this.bus.emit(EVENTS.NEAR_MISS_MULTIPLIER, this.nearMissMult);
    this.cancelDecay();
  }

  finalScore(): number {
    return Math.floor(this.rawScore);
  }

  /** Cancela timer pendente — chamado no shutdown da scene. */
  shutdown(): void {
    this.cancelDecay();
  }

  private cancelDecay(): void {
    if (this.decayEvent) {
      this.decayEvent.remove(false);
      this.decayEvent = null;
    }
  }
}
