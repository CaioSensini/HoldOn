/**
 * Tipos de ad e interface unificada.
 * TODO: substituir por AdMobAdsProvider (capacitor-community/admob) ao portar.
 */

export type AdType = 'interstitial' | 'rewarded';

export interface AdResult {
  shown: boolean;
  rewarded: boolean;
  /** Se o usuário fechou cedo, ou houve erro de rede, etc. */
  reason?: string;
}

export interface IAdsProvider {
  isReady(type: AdType): boolean;
  preload(type: AdType): Promise<void>;
  show(type: AdType): Promise<AdResult>;
  /** Indica se ads devem ser ocultados (ex: usuário comprou Remove Ads). */
  setRemoveAds(enabled: boolean): void;
  isAdsRemoved(): boolean;
  /** True se um ad está sendo exibido agora — pra UI evitar agendar outro. */
  isCurrentlyShowing(): boolean;
}
