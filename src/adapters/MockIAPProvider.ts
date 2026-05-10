import type { IAPProduct, IAPPurchaseResult, IIAPProvider } from './IIAPProvider';

/** Catálogo mock — IDs estáveis pra usar em GameState. */
export const MOCK_PRODUCTS: IAPProduct[] = [
  {
    id: 'coins_small',
    title: 'Pacote pequeno',
    description: '+1.000 moedas',
    priceLabel: 'R$ 4,90',
    type: 'consumable'
  },
  {
    id: 'coins_medium',
    title: 'Pacote médio',
    description: '+3.000 moedas',
    priceLabel: 'R$ 9,90',
    type: 'consumable'
  },
  {
    id: 'coins_large',
    title: 'Pacote grande',
    description: '+8.000 moedas',
    priceLabel: 'R$ 19,90',
    type: 'consumable'
  },
  {
    id: 'coins_huge',
    title: 'Pacote gigante',
    description: '+25.000 moedas',
    priceLabel: 'R$ 49,90',
    type: 'consumable'
  },
  {
    id: 'remove_ads',
    title: 'Remover ads',
    description: 'Remove ads + 2.000 moedas + skin exclusiva',
    priceLabel: 'R$ 9,90',
    type: 'non_consumable'
  },
  {
    id: 'equippables_bundle',
    title: 'Pacote de equipáveis',
    description: 'Todos os equipáveis no Lv5',
    priceLabel: 'R$ 29,90',
    type: 'non_consumable'
  }
];

export class MockIAPProvider implements IIAPProvider {
  async init(): Promise<void> {
    return Promise.resolve();
  }

  getProducts(): IAPProduct[] {
    return MOCK_PRODUCTS;
  }

  async purchase(productId: string): Promise<IAPPurchaseResult> {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) return { success: false, productId, reason: 'unknown_product' };
    return new Promise<IAPPurchaseResult>((resolve) => {
      this.renderOverlay(product, resolve);
    });
  }

  async restore(): Promise<IAPPurchaseResult[]> {
    // Mock: nada a restaurar
    return [];
  }

  private renderOverlay(product: IAPProduct, resolve: (r: IAPPurchaseResult) => void): void {
    const root = document.createElement('div');
    root.style.cssText = [
      'position:fixed;inset:0;background:rgba(0,0,0,0.85);color:#fff;',
      'z-index:99999;display:flex;align-items:center;justify-content:center;',
      'font-family:sans-serif;'
    ].join('');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:#1c2638;padding:32px;border-radius:16px;',
      'max-width:380px;width:90%;text-align:center;',
      'border:1px solid #2c3a52;'
    ].join('');

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;color:#9aa3b2;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;';
    title.textContent = 'Compra simulada';

    const productTitle = document.createElement('div');
    productTitle.style.cssText = 'font-size:24px;font-weight:700;margin-bottom:8px;';
    productTitle.textContent = product.title;

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:15px;color:#b6c2d9;margin-bottom:16px;';
    desc.textContent = product.description;

    const price = document.createElement('div');
    price.style.cssText = 'font-size:32px;font-weight:700;color:#ffd166;margin-bottom:24px;';
    price.textContent = product.priceLabel;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;';

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancelar';
    cancel.style.cssText = [
      'flex:1;padding:14px;background:#2c3a52;color:#fff;border:0;',
      'border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;'
    ].join('');

    const confirm = document.createElement('button');
    confirm.textContent = 'Comprar';
    confirm.style.cssText = [
      'flex:1;padding:14px;background:#4dd6ff;color:#000;border:0;',
      'border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;'
    ].join('');

    btnRow.append(cancel, confirm);
    card.append(title, productTitle, desc, price, btnRow);
    root.append(card);
    document.body.appendChild(root);

    cancel.addEventListener('click', () => {
      document.body.removeChild(root);
      resolve({ success: false, productId: product.id, reason: 'user_cancelled' });
    });

    confirm.addEventListener('click', () => {
      document.body.removeChild(root);
      resolve({ success: true, productId: product.id });
    });
  }
}
