/**
 * Interface de in-app purchases.
 * TODO: substituir por implementação Capacitor (RevenueCat, ou capacitor-community/in-app-purchases).
 */

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  /** Preço formatado para display (ex: "R$ 9,90"). */
  priceLabel: string;
  /** Tipo do produto. */
  type: 'consumable' | 'non_consumable';
}

export interface IAPPurchaseResult {
  success: boolean;
  productId: string;
  reason?: string;
}

export interface IIAPProvider {
  init(): Promise<void>;
  getProducts(): IAPProduct[];
  purchase(productId: string): Promise<IAPPurchaseResult>;
  restore(): Promise<IAPPurchaseResult[]>;
}
