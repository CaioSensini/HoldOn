/**
 * Interface de haptic feedback.
 * TODO: substituir por @capacitor/haptics ao portar.
 */

export type HapticIntensity = 'light' | 'medium' | 'heavy' | 'selection' | 'warning';

export interface IHaptics {
  trigger(intensity: HapticIntensity): void;
  enable(enabled: boolean): void;
  isEnabled(): boolean;
}
