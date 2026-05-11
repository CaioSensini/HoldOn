import Phaser from 'phaser';
import { getServices } from '../adapters';
import { SCENES } from '../config';
import { GameState } from '../data/GameState';
import { POWERUP_LIST } from '../data/PowerUpDefs';
import { Colors, hex } from '../theme/colors';
import { SceneTransition } from '../ui/SceneTransition';
import { randPick } from '../utils/MathUtils';

// Usa a versão standalone (single file ~1.3MB com React+Babel inline) em vez
// da versão CDN — uma requisição HTTP só, sem dependências externas. Mais
// rápido no primeiro load e funciona offline depois de cacheado.
const DESIGN_URL = '/designs/Float%20Home%20Screen%20(standalone).html';
const ROOT_ID = 'home-overlay-root';

/**
 * Tela inicial — renderiza o design original (`designs/screens/home/`) como
 * iframe overlay sobre o canvas Phaser. O Phaser fica responsável apenas pelo
 * estado/transições; toda a camada visual vem do HTML/CSS/SVG do design,
 * garantindo match pixel-perfect.
 *
 * Click handlers (PLAY, slots, nav, daily badge) são amarrados no DOM da iframe
 * via contentDocument depois do load. Estado (BEST distance, moedas) é
 * sincronizado escrevendo direto nos elementos `.hpill` correspondentes.
 *
 * DEV picker, BOOST e modal de daily reward são overlays HTML separados (não
 * iframe), renderizados no document principal e removidos no shutdown.
 */
export class HomeScene extends Phaser.Scene {
  private state = GameState.instance();
  private unsub?: () => void;

  private iframeEl?: HTMLIFrameElement;
  private overlayRoot?: HTMLDivElement;
  private resizeHandler?: () => void;
  private canvasObserver?: ResizeObserver;
  private iframeReady = false;
  private retryHandle?: number;
  /** Id da última skin injetada — evita reescrever DOM em toda mudança de state. */
  private lastInjectedSkin?: string;

  constructor() {
    super({ key: SCENES.HOME });
  }

  create(): void {
    // Phaser não desenha nada nesta tela — a iframe cobre o canvas inteiro.
    // Background bate com o sky color do design pra evitar flash durante o load.
    this.cameras.main.setBackgroundColor('#1f3a8a');

    this.ensureOverlayRoot();
    this.buildIframe();
    this.buildDevHtmlButtons();

    SceneTransition.enter(this);

    this.unsub = this.state.subscribe(() => this.syncStateToIframe());
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.on(Phaser.Scenes.Events.DESTROY, this.teardown, this);

    this.handleDailyReward();
  }

  /* ====================================================================== */
  /* OVERLAY ROOT — host único para iframe + HTML extras                      */
  /* ====================================================================== */

  private ensureOverlayRoot(): void {
    let root = document.getElementById(ROOT_ID) as HTMLDivElement | null;
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100';
      document.body.appendChild(root);
    }
    this.overlayRoot = root;
  }

  /* ====================================================================== */
  /* IFRAME — design HTML standalone                                          */
  /* ====================================================================== */

  private buildIframe(): void {
    const iframe = document.createElement('iframe');
    iframe.src = DESIGN_URL;
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.style.cssText = [
      'position:fixed',
      'border:none',
      'background:transparent',
      'pointer-events:auto',
      'z-index:100'
    ].join(';');
    document.body.appendChild(iframe);
    this.iframeEl = iframe;

    this.positionIframe();
    this.resizeHandler = () => this.positionIframe();
    window.addEventListener('resize', this.resizeHandler);
    if (typeof ResizeObserver !== 'undefined') {
      this.canvasObserver = new ResizeObserver(() => this.positionIframe());
      this.canvasObserver.observe(this.game.canvas);
    }

    iframe.addEventListener('load', () => this.onIframeLoaded());
  }

  private positionIframe(): void {
    if (!this.iframeEl) return;
    const rect = this.game.canvas.getBoundingClientRect();
    this.iframeEl.style.left = `${rect.left}px`;
    this.iframeEl.style.top = `${rect.top}px`;
    this.iframeEl.style.width = `${rect.width}px`;
    this.iframeEl.style.height = `${rect.height}px`;
  }

  private onIframeLoaded(): void {
    // O HTML standalone tem React+Babel inline — Babel transpila o JSX no
    // navegador, leva ~300-1000ms. Espero o .stage existir antes de amarrar.
    const start = performance.now();
    const tick = (): void => {
      const doc = this.iframeEl?.contentDocument;
      const stage = doc?.querySelector('.stage');
      if (stage && doc) {
        this.iframeReady = true;
        this.wireIframeUI(doc);
        this.syncStateToIframe();
        this.injectEquippedSkin();
        return;
      }
      if (performance.now() - start > 8000) {
        // Desisto após 8s — algo deu errado no carregamento.
        console.warn('[HomeScene] iframe design não montou em 8s');
        return;
      }
      this.retryHandle = window.setTimeout(tick, 80);
    };
    tick();
  }

  /** Esconde o painel de tweaks (dev-only do design) e amarra clicks. */
  private wireIframeUI(doc: Document): void {
    // 1) Esconde tweaks panel.
    const style = doc.createElement('style');
    style.textContent = '.twk-panel{display:none !important;}';
    doc.head.appendChild(style);

    // 2) PLAY → GAME.
    doc.querySelector('.btn-play')?.addEventListener('click', () => {
      this.registry.remove('dev_start_meters');
      this.registry.remove('dev_start_biome');
      SceneTransition.fade(this, SCENES.GAME);
    });

    // 3) Bottom nav (ordem do design: Shop, Inventory, Missions, Leaderboard, Settings).
    const navScenes = [SCENES.SHOP, SCENES.INVENTORY, SCENES.MISSIONS, SCENES.LEADERBOARD, SCENES.SETTINGS];
    doc.querySelectorAll('.nav-item').forEach((item, i) => {
      const sceneKey = navScenes[i];
      if (!sceneKey) return;
      item.addEventListener('click', () => SceneTransition.slide(this, sceneKey));
    });

    // 4) Slots de equipável (3 slots).
    doc.querySelectorAll('.slot').forEach((slot, i) => {
      slot.addEventListener('click', () => {
        if (!this.state.isSlotUnlocked(i)) {
          this.showHtmlToast(i === 1 ? 'Desbloqueia em 5.000m' : 'Desbloqueia em 10.000m', '🔒');
          return;
        }
        this.registry.set('slot_focus', i);
        SceneTransition.slide(this, SCENES.INVENTORY);
      });
    });

    // 5) Daily badge — esconde se já claimou hoje ou ads removidos.
    const dailyBadge = doc.querySelector('.daily-badge') as HTMLElement | null;
    if (dailyBadge) {
      const today = this.state.currentDateKey();
      const claimed = this.state.hasClaimedDailyChest(today);
      const adsRemoved = getServices().ads.isAdsRemoved();
      if (claimed || adsRemoved) {
        dailyBadge.style.display = 'none';
      } else {
        dailyBadge.addEventListener('click', () => this.openDailyChest(today, dailyBadge));
      }
    }
  }

  /** Atualiza os números (BEST distance, coins) escrevendo direto no DOM.
   *  Também re-injeta a skin se o id equipado mudou desde a última injeção. */
  private syncStateToIframe(): void {
    if (!this.iframeReady) return;
    const doc = this.iframeEl?.contentDocument;
    if (!doc) return;
    const s = this.state.get();

    // Coin pill: .hpill que contém coin.svg → .num textContent = coins.
    const coinIcon = doc.querySelector('img[src*="coin.svg"]') as HTMLElement | null;
    const coinPill = coinIcon?.closest('.hpill');
    const coinNum = coinPill?.querySelector('.num');
    if (coinNum) coinNum.textContent = s.coins.toLocaleString('pt-BR');

    // BEST pill: .hpill.small que contém trophy.svg.
    // .num tem 3 filhos: <span>BEST</span> + textNode "12,450" + <span>m</span>.
    const trophyIcon = doc.querySelector('img[src*="trophy.svg"]') as HTMLElement | null;
    const bestPill = trophyIcon?.closest('.hpill');
    const bestNum = bestPill?.querySelector('.num');
    if (bestNum) {
      const distStr = s.bestDistance.toLocaleString('pt-BR');
      let replaced = false;
      bestNum.childNodes.forEach((node) => {
        if (replaced) return;
        if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0) {
          node.textContent = distStr;
          replaced = true;
        }
      });
    }

    // Re-injeta skin se mudou (evita rewrite do DOM em todo state change).
    if (s.equippedSkin !== this.lastInjectedSkin) {
      this.injectEquippedSkin();
    }
  }

  /** Substitui o `<RockChar/>` (SVG hardcoded do design) pelo PNG da skin
   *  atualmente equipada no GameState. Usa `textures.getBase64()` pra puxar
   *  a textura do TextureManager do Phaser (que pode ser PNG real OU placeholder
   *  gerado em runtime) como data URL. */
  private injectEquippedSkin(): void {
    const doc = this.iframeEl?.contentDocument;
    if (!doc) return;

    const skinId = this.state.get().equippedSkin;
    const skinKey = `skin_${skinId}`;
    let skinSrc: string | undefined;

    const tryGet = (key: string): string | undefined => {
      if (!this.textures.exists(key)) return undefined;
      try {
        return this.textures.getBase64(key);
      } catch {
        return undefined;
      }
    };

    skinSrc = tryGet(skinKey) ?? tryGet('skin_rock');
    if (!skinSrc) return;

    // .bob > div (wrapper do RockChar com filter:drop-shadow). Mantém o wrapper
    // e troca o conteúdo (SVG → img).
    const bob = doc.querySelector('.bob');
    const wrapper = bob?.firstElementChild as HTMLElement | null;
    if (!wrapper) return;

    while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    const img = doc.createElement('img');
    img.src = skinSrc;
    img.alt = skinId;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;image-rendering:auto';
    wrapper.appendChild(img);

    this.lastInjectedSkin = skinId;
  }

  /* ====================================================================== */
  /* DEV/BOOST — botões HTML overlay (dev-only)                              */
  /* ====================================================================== */

  private buildDevHtmlButtons(): void {
    if (import.meta.env.PROD) return;

    const devBtn = this.makeHtmlButton({
      text: '🧪 DEV',
      bg: '#ff6b6b',
      shadow: '#c94545',
      right: 20,
      bottom: 20,
      onClick: () => this.openDevPhasePicker()
    });
    this.overlayRoot?.appendChild(devBtn);

    if (!getServices().ads.isAdsRemoved()) {
      const boostBtn = this.makeHtmlButton({
        text: '⚡ BOOST',
        bg: hex(Colors.accent.green),
        shadow: hex(Colors.accent.greenDark),
        left: 20,
        bottom: 20,
        onClick: () => this.startBoostAd()
      });
      this.overlayRoot?.appendChild(boostBtn);
    }
  }

  private makeHtmlButton(opts: {
    text: string;
    bg: string;
    shadow: string;
    left?: number;
    right?: number;
    bottom: number;
    onClick: () => void;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = opts.text;
    const pos = opts.left !== undefined ? `left:${opts.left}px` : `right:${opts.right}px`;
    btn.style.cssText = [
      'position:fixed',
      pos,
      `bottom:${opts.bottom}px`,
      'z-index:200',
      'pointer-events:auto',
      'padding:8px 18px',
      "font-family:'Fredoka',sans-serif",
      'font-weight:700',
      'font-size:14px',
      'color:#fff',
      `background:${opts.bg}`,
      'border:2px solid #1a1d2e',
      'border-radius:18px',
      `box-shadow:0 4px 0 ${opts.shadow}`,
      'cursor:pointer'
    ].join(';');
    btn.addEventListener('click', opts.onClick);
    return btn;
  }

  /* ====================================================================== */
  /* MODAIS HTML — daily reward, dev phase picker, toasts                     */
  /* ====================================================================== */

  private handleDailyReward(): void {
    const s = this.state.get();
    if (s.dailyClaimed) return;
    const reward = this.state.getDailyReward(s.loginStreak);
    this.showDailyRewardModal(s.loginStreak, reward);
  }

  private showDailyRewardModal(day: number, reward: number): void {
    const modal = this.makeModalShell();
    const card = document.createElement('div');
    card.style.cssText = [
      'background:#2a2f4a',
      'border:3px solid #ffd23f',
      'border-radius:24px',
      'padding:32px 40px',
      'max-width:420px',
      'text-align:center',
      'color:#fff',
      "font-family:'Fredoka',sans-serif",
      'box-shadow:0 12px 36px rgba(0,0,0,0.6)'
    ].join(';');
    card.innerHTML = `
      <div style="font-size:22px;font-weight:700;margin-bottom:8px">Login diário · Dia ${day}</div>
      <div style="font-size:16px;color:#c4c8d8;margin-bottom:24px">Você ganhou ${reward} moedas pela visita de hoje!</div>
      <button class="claim-btn" style="background:#ffd23f;color:#1a1d2e;font-weight:700;font-size:18px;padding:12px 36px;border:none;border-radius:14px;cursor:pointer;box-shadow:0 4px 0 #e6a800;font-family:inherit">Receber</button>
    `;
    modal.appendChild(card);
    this.overlayRoot?.appendChild(modal);

    card.querySelector('.claim-btn')?.addEventListener('click', () => {
      const got = this.state.claimDailyReward();
      modal.remove();
      this.showHtmlToast(`+${got} moedas`, '◉');
    });
  }

  private async openDailyChest(today: string, badge: HTMLElement): Promise<void> {
    const r = await getServices().ads.show('rewarded');
    if (r.rewarded) {
      const reward = 200;
      this.state.addCoins(reward);
      this.state.markDailyChestClaimed(today);
      this.state.bumpChestCounter(false);
      badge.style.display = 'none';
      this.showHtmlToast(`+${reward} moedas do baú!`, '🎁');
    } else {
      this.showHtmlToast('Ad cancelado', '!');
    }
  }

  private async startBoostAd(): Promise<void> {
    const r = await getServices().ads.show('rewarded');
    if (r.rewarded) {
      const id = randPick(POWERUP_LIST.filter((p) => p.durationMs > 0)).id;
      this.registry.set('start_boost', id);
      this.showHtmlToast(`Próxima run terá ${id} ativo!`, '⚡');
    }
  }

  private openDevPhasePicker(): void {
    const phases: Array<{ id: string; name: string; meters: number; emoji: string }> = [
      { id: 'forest',  name: 'Forest',  meters: 0,     emoji: '🌲' },
      { id: 'cave',    name: 'Cave',    meters: 2000,  emoji: '🦇' },
      { id: 'temple',  name: 'Temple',  meters: 4500,  emoji: '🏛️' },
      { id: 'sea',     name: 'Sea',     meters: 7000,  emoji: '🌊' },
      { id: 'beach',   name: 'Beach',   meters: 10000, emoji: '🏖️' },
      { id: 'volcano', name: 'Volcano', meters: 12500, emoji: '🌋' },
      { id: 'citadel', name: 'Citadel', meters: 15000, emoji: '🏰' },
      { id: 'space',   name: 'Space',   meters: 18000, emoji: '🌌' }
    ];
    const modal = this.makeModalShell();
    const card = document.createElement('div');
    card.style.cssText = [
      'background:#2a2f4a',
      'border:3px solid #ff6b6b',
      'border-radius:24px',
      'padding:28px',
      'max-width:780px',
      'color:#fff',
      "font-family:'Fredoka',sans-serif",
      'box-shadow:0 12px 36px rgba(0,0,0,0.6)'
    ].join(';');
    card.innerHTML = `
      <div style="font-size:22px;font-weight:700;color:#ff6b6b;text-align:center;margin-bottom:6px">🧪 DEV — Pular pra fase</div>
      <div style="font-size:13px;color:#c4c8d8;text-align:center;margin-bottom:18px">Preview rápido — escolha uma fase pra começar</div>
      <div class="phase-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"></div>
      <div style="text-align:center;margin-top:18px">
        <button class="dev-close" style="background:transparent;color:#fff;border:2px solid #fff;border-radius:14px;padding:8px 28px;font-family:inherit;font-weight:700;cursor:pointer">Fechar</button>
      </div>
    `;
    const grid = card.querySelector('.phase-grid') as HTMLElement;
    phases.forEach((p) => {
      const btn = document.createElement('button');
      btn.style.cssText = [
        'background:#1a1d2e',
        'border:2px solid #4ecdc4',
        'border-radius:14px',
        'padding:12px 4px',
        'color:#fff',
        'font-family:inherit',
        'cursor:pointer'
      ].join(';');
      btn.innerHTML = `
        <div style="font-size:28px;line-height:1">${p.emoji}</div>
        <div style="font-weight:700;margin-top:6px">${p.name}</div>
        <div style="font-size:11px;color:#8a90a8;margin-top:2px">${p.meters}m</div>
      `;
      btn.addEventListener('click', () => {
        this.registry.set('dev_start_meters', p.meters);
        this.registry.set('dev_start_biome', p.id);
        modal.remove();
        SceneTransition.fade(this, SCENES.GAME);
      });
      grid.appendChild(btn);
    });
    card.querySelector('.dev-close')?.addEventListener('click', () => modal.remove());
    modal.appendChild(card);
    this.overlayRoot?.appendChild(modal);
  }

  private makeModalShell(): HTMLDivElement {
    const shell = document.createElement('div');
    shell.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.7)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'pointer-events:auto',
      'z-index:300'
    ].join(';');
    return shell;
  }

  private showHtmlToast(message: string, icon: string): void {
    const toast = document.createElement('div');
    toast.textContent = `${icon}  ${message}`;
    toast.style.cssText = [
      'position:fixed',
      'top:48%',
      'left:50%',
      'transform:translate(-50%,-50%)',
      'background:#2a2f4a',
      'color:#fff',
      'padding:14px 28px',
      'border:2px solid #ffd23f',
      'border-radius:14px',
      "font-family:'Fredoka',sans-serif",
      'font-weight:600',
      'font-size:16px',
      'pointer-events:none',
      'z-index:400',
      'box-shadow:0 8px 24px rgba(0,0,0,0.5)',
      'opacity:0',
      'transition:opacity 200ms'
    ].join(';');
    this.overlayRoot?.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 220);
    }, 2200);
  }

  /* ====================================================================== */
  /* TEARDOWN                                                                  */
  /* ====================================================================== */

  private teardown(): void {
    this.unsub?.();
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.canvasObserver?.disconnect();
    if (this.retryHandle !== undefined) clearTimeout(this.retryHandle);
    this.iframeEl?.remove();
    // Limpa filhos do overlay root mas mantém o root pra próxima entrada.
    if (this.overlayRoot) {
      while (this.overlayRoot.firstChild) {
        this.overlayRoot.removeChild(this.overlayRoot.firstChild);
      }
    }
    this.iframeEl = undefined;
    this.iframeReady = false;
    this.lastInjectedSkin = undefined;
  }
}
