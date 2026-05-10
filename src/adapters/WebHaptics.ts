import type { HapticIntensity, IHaptics } from './IHaptics';

/**
 * Implementação web baseada em navigator.vibrate (Android Chrome).
 * iOS Safari não suporta vibrate — vira no-op silencioso.
 * TODO: substituir por @capacitor/haptics no app nativo (suporta iOS).
 */
export class WebHaptics implements IHaptics {
  private enabled = true;

  trigger(intensity: HapticIntensity): void {
    if (!this.enabled) return;
    const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
    if (typeof nav.vibrate !== 'function') return;
    const pattern = this.getPattern(intensity);
    try {
      nav.vibrate(pattern);
    } catch {
      // ignore
    }
  }

  enable(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private getPattern(intensity: HapticIntensity): number | number[] {
    switch (intensity) {
      case 'light':
        return 8;
      case 'selection':
        return 12;
      case 'medium':
        return 20;
      case 'warning':
        return [10, 60, 10];
      case 'heavy':
        return 60;
    }
  }
}
