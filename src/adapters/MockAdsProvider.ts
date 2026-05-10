import type { AdResult, AdType, IAdsProvider } from './IAdsProvider';

/**
 * Mock de ads: mostra um overlay preto com timer.
 *
 * **Lock global**: apenas um ad pode estar ativo por vez. Se outro `show()`
 * for chamado enquanto um ad está sendo exibido, retorna imediatamente sem
 * empilhar overlays. Isso evita o cenário de "3 ads em sequência" quando
 * o GameOverScene auto-agenda interstitial enquanto o usuário já está
 * vendo um rewarded ad.
 *
 * TODO: substituir por integração real (AdMob via Capacitor) ao portar.
 */
export class MockAdsProvider implements IAdsProvider {
  private removeAds = false;
  /** Lock — true enquanto qualquer ad estiver sendo mostrado. */
  private isShowing = false;

  isReady(_type: AdType): boolean {
    return !this.removeAds;
  }

  async preload(_type: AdType): Promise<void> {
    return Promise.resolve();
  }

  async show(type: AdType): Promise<AdResult> {
    if (this.removeAds && type === 'interstitial') {
      return { shown: false, rewarded: false, reason: 'ads_removed' };
    }
    if (this.isShowing) {
      // Já tem outro ad em tela. Não empilha.
      return { shown: false, rewarded: false, reason: 'already_showing' };
    }
    this.isShowing = true;
    try {
      return await new Promise<AdResult>((resolve) => {
        this.renderOverlay(type, resolve);
      });
    } finally {
      this.isShowing = false;
    }
  }

  setRemoveAds(enabled: boolean): void {
    this.removeAds = enabled;
  }

  isAdsRemoved(): boolean {
    return this.removeAds;
  }

  /** True se há um ad sendo exibido agora. Útil pra UI que precisa saber. */
  isCurrentlyShowing(): boolean {
    return this.isShowing;
  }

  private renderOverlay(type: AdType, resolve: (result: AdResult) => void): void {
    const root = document.createElement('div');
    root.style.cssText = [
      'position:fixed;inset:0;background:#000;color:#fff;',
      'z-index:99999;display:flex;flex-direction:column;',
      'align-items:center;justify-content:center;font-family:sans-serif;',
      'gap:24px;'
    ].join('');

    const label = document.createElement('div');
    label.style.cssText = 'font-size:18px;color:#9aa3b2;letter-spacing:2px;text-transform:uppercase;';
    label.textContent = type === 'rewarded' ? 'Rewarded ad (mock)' : 'Interstitial ad (mock)';

    const counter = document.createElement('div');
    counter.style.cssText = 'font-size:64px;font-weight:700;';

    const note = document.createElement('div');
    note.style.cssText = 'font-size:13px;color:#666;max-width:420px;text-align:center;';
    note.textContent = 'Substituir por AdMob real ao portar com Capacitor.';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar';
    closeBtn.disabled = true;
    closeBtn.style.cssText = [
      'padding:12px 28px;background:#4dd6ff;color:#000;border:0;',
      'border-radius:8px;font-size:18px;font-weight:600;cursor:pointer;',
      'opacity:0.5;'
    ].join('');

    root.append(label, counter, note, closeBtn);
    document.body.appendChild(root);

    let remaining = type === 'interstitial' ? 2 : 5;
    counter.textContent = String(remaining);
    let watched = false;
    let resolved = false;

    const finish = (rewarded: boolean, reason?: AdResult['reason']) => {
      if (resolved) return;
      resolved = true;
      window.clearInterval(tick);
      if (root.parentElement) document.body.removeChild(root);
      resolve({ shown: true, rewarded, reason });
    };

    const tick = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(tick);
        counter.textContent = '0';
        closeBtn.disabled = false;
        closeBtn.style.opacity = '1';
        watched = true;
        if (type === 'interstitial') {
          window.setTimeout(() => finish(false), 250);
        }
      } else {
        counter.textContent = String(remaining);
      }
    }, 1000);

    closeBtn.addEventListener('click', () => {
      finish(watched, watched ? undefined : 'closed_early');
    });
  }
}
