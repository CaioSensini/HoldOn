# Float

Endless runner mobile 2D de toque único, escrito em **TypeScript + Phaser 3 + Vite**.
Estruturado para ser empacotado depois como app nativo iOS/Android via **Capacitor**, sem reescrever a lógica de jogo.

> **Hold to fly. Release to fall.**

---

## Sumário

- [Como rodar em dev](#como-rodar-em-dev)
- [Como buildar para produção](#como-buildar-para-produção)
- [Arquitetura](#arquitetura)
- [Conteúdo do jogo](#conteúdo-do-jogo)
- [Como portar para iOS/Android com Capacitor](#como-portar-para-iosandroid-com-capacitor)
- [Substituir arte placeholder por arte final](#substituir-arte-placeholder-por-arte-final)
- [Roadmap pós-MVP](#roadmap-pós-mvp)

---

## Como rodar em dev

```bash
npm install
npm run dev
```

Abre em http://localhost:5173. O Vite serve com HMR.

> **Mobile no celular, mesmo Wi-Fi:** o servidor escuta em `0.0.0.0` (`host: true` em `vite.config.ts`); use o IP local da máquina (`http://192.168.x.x:5173`) no navegador do celular para testar gestos reais.

## Como buildar para produção

```bash
npm run build
```

Gera bundle estático em `dist/`. Tamanho atual: **~370 kB gzip** (Phaser inteiro incluído).

```bash
npm run preview
```

Serve o build de produção localmente para verificação.

## Type-check sem build

```bash
npm run typecheck
```

---

## Arquitetura

```
src/
├── main.ts                 # Entry point: inicializa adapters, GameState, Phaser.Game
├── config.ts               # Constantes globais (NUNCA hard-coded em outro lugar)
│
├── scenes/                 # Phaser.Scene — uma por tela
│   ├── BootScene.ts
│   ├── PreloadScene.ts     # Carrega imagens reais; cai em placeholders gerados
│   ├── HomeScene.ts        # Menu principal, daily login, baú diário
│   ├── GameScene.ts        # Loop principal — integra entities + systems
│   ├── GameOverScene.ts    # Stats + revive/2x ad + replay
│   ├── ShopScene.ts        # Skins, trails, IAP packs, remove ads
│   ├── InventoryScene.ts   # 3 slots de equipável + upgrade + skin/trail equip
│   ├── MissionsScene.ts    # 3 missões diárias com claim
│   ├── SettingsScene.ts    # Volume, vibração, idioma, reset
│   └── LeaderboardScene.ts # Top 10 local (online ready, ver TODO)
│
├── entities/               # Game objects com lógica/visual
│   ├── Player.ts           # FSM (takeoff/following/falling/prone/boosting/...)
│   ├── Obstacle.ts         # 10 tipos em uma classe parametrizada
│   ├── Coin.ts             # 5 tiers (bronze..legendary)
│   ├── PowerUp.ts          # 9 tipos
│   └── ParticleEffects.ts  # Helpers de partículas reutilizáveis
│
├── systems/                # Lógica desacoplada (Single-Responsibility)
│   ├── EventSystem.ts      # GameEventBus singleton (Phaser EventEmitter)
│   ├── BiomeManager.ts     # 5 biomas, crossfade, dificuldade
│   ├── RunDirector.ts      # Segmentos autorais: obstáculo + moedas + ritmo
│   ├── ObstacleSpawner.ts  # Pool e spawn posicionado de obstáculos
│   ├── CoinSpawner.ts      # Padrões roteirizados: arco, túnel, slide, recompensa
│   ├── PowerUpSpawner.ts   # Sorteio com Lucky Drop boost
│   ├── ScoreSystem.ts      # Distância × multipliers
│   ├── NearMissDetector.ts # AABB-distance < 30px sem colidir
│   ├── ComboSystem.ts      # Streak de moedas (1x..5x)
│   ├── MissionSystem.ts    # Adapter de missões diárias
│   ├── DailyLoginSystem.ts # Adapter de login streak
│   └── AudioSystem.ts      # Web Audio API procedural (placeholder de SFX)
│
├── data/                   # Catálogos e modelo persistido
│   ├── GameState.ts        # Singleton com save/load via IStorage
│   ├── PowerUpDefs.ts      # 9 power-ups
│   ├── EquippableDefs.ts   # 8 equipáveis × 10 níveis + getters de efeito
│   ├── SkinDefs.ts         # 15 skins (8 common, 4 rare, 2 epic, 1 legendary) + 5 trails
│   ├── BiomeDefs.ts        # 5 biomas + dificuldade pós-loop
│   └── MissionPool.ts      # Pool + RNG seeded por data
│
├── adapters/               # *** Camada de troca para nativo ***
│   ├── IStorage.ts / LocalStorageAdapter.ts
│   ├── IAdsProvider.ts / MockAdsProvider.ts
│   ├── IIAPProvider.ts / MockIAPProvider.ts
│   ├── IHaptics.ts / WebHaptics.ts
│   └── index.ts            # initServices() — único ponto de troca
│
├── ui/
│   ├── Button.ts           # Bounce + haptic + hover
│   ├── Modal.ts            # Slide-in com overlay
│   ├── ToastNotification.ts # Empilhável, top-right
│   ├── HUD.ts              # In-game: distância, coins, near miss, combo, power-ups
│   └── CurrencyDisplay.ts  # Reutilizável (Loja/Inventário/Missões)
│
└── utils/
    ├── EasingHelpers.ts
    ├── PlaceholderArt.ts   # Geração procedural de TODOS os assets visuais
    └── MathUtils.ts        # clamp, lerp, randPick, weightedPick, aabbDistance
```

### Princípios

1. **Adapters são a fronteira.** O jogo nunca chama `localStorage`, `navigator.vibrate`, `AdMob`, etc. diretamente. Sempre via interface em `src/adapters/`. Para portar pra Capacitor, basta trocar a implementação concreta em `adapters/index.ts`.
2. **Constantes vivem em `config.ts`.** Nada de números mágicos espalhados.
3. **Event bus desacopla.** `GameEventBus` (Phaser EventEmitter singleton) conecta sistemas sem que eles se conheçam diretamente — `ScoreSystem` emite `near_miss`, `HUD` escuta.
4. **TypeScript estrito.** `strict: true`. Sem `any` exceto em casos específicos comentados.
5. **Nenhum framework UI.** Phaser puro — sem React/Vue. Tela = Scene; widget = GameObject.

---

## Conteúdo do jogo

### Mecânica
- **Touch/mouse hold:** segue livremente a posição do dedo/mouse em X/Y.
- **Touch release:** gravidade puxa para o chão e o player fica deitado (`prone`).
- **Arrastar até embaixo:** continua em pé enquanto o dedo estiver segurando; só soltar ativa o deitado.
- **Velocidade do mundo:** 400 → 900 px/s, +0.5% a cada 100m
- **Dificuldade:** multiplica por bioma (1.0..1.8) e +10% por loop pós-Underworld

### Player — estados
`idle` · `takeoff` · `following` · `falling` · `prone` · `boosting` (Rocket) · `shielded` · `dead`

### 10 obstáculos
| Tipo | Como passar |
|---|---|
| `wall_high` | Voar |
| `beam_low` | Cair / passar rasteiro |
| `pit` | Voar |
| `moving_vertical` | Timing senoidal |
| `narrow_gap` | Altura precisa |
| `combo_seq` | Skill (sub-sequência) |
| `breakable` | Quebra durante Rocket |
| `slide_gate` | Soltar o dedo, cair e passar deitado |
| `bonus_hole` | Corte discreto na estrada: entrar deitado pelo chão para descer ao subsolo |
| `pipe_exit` | Subir pela abertura no teto do subsolo; seguir reto bate na parede |

O `RunDirector` monta segmentos com intenção: leitura, recompensa, subsolo bônus, precisão e variações de ritmo. O atalho subterrâneo aparece como parte física da rua, sem aviso textual ou preparação explícita.

### 9 power-ups
Rocket · Shield · Magnet · 2× Coins · Slow Motion · Phantom · Revive · Coin Rain · Mini.
Definidos em `data/PowerUpDefs.ts`. Lucky Drop equipável aumenta peso de spawn dos raros.

### 8 equipáveis (3 slots, 10 níveis cada)
Head Start · Coin Bonus · Power-up Duration · Magnet Range · Initial Shield · Score Multiplier · Near Miss Boost · Lucky Drop.
- Slot 1: grátis sempre.
- Slot 2: desbloqueia em 5.000m.
- Slot 3: desbloqueia em 10.000m **ou** via IAP `equippables_bundle`.
- Custo de upgrade Lv N → Lv N+1: `round(500 × N^1.8)` moedas.

### Score
- Base: 1 ponto/m × multiplicador near miss (1..3) × score multiplier base (equipável)
- Near miss: < 30px sem colidir → +0.1 mult, decay em 4s, capa em 3.0
- Combo de moedas: +0.5 a cada 3 coletadas em sequência, capa em 5.0, reseta ao perder uma

### 5 biomas
Forest (0m) · Cave (1.000m) · Temple (2.500m) · Space (5.000m) · Underworld (8.000m).
Cada bioma tem distribuição própria de moedas (Bronze 1, Silver 5, Gold 10, Diamond 25, Legendary 100) e dificuldade. Pós-Underworld faz loop com +10%/ciclo.

### Skins (15) + Trails (5)
Definidos em `data/SkinDefs.ts`. Sistema de pity preparado em `GameState.bumpChestCounter`.

### Telas
Home · Game · GameOver · Shop · Inventory · Missions · Settings · Leaderboard.

### Monetização (mock)
- **Interstitials** a cada 3 mortes
- **Rewarded — Revive** após morrer
- **Rewarded — Dobrar moedas** após morrer
- **Rewarded — Baú grátis** 1×/dia na Home
- **Rewarded — Power-up de start** opcional na Home
- **IAP packs:** coins_small/medium/large/huge, remove_ads, equippables_bundle

---

## Como portar para iOS/Android com Capacitor

A arquitetura foi desenhada pra esse port. Você só precisa **(a)** instalar Capacitor + plugins, **(b)** criar implementações nativas dos 4 adapters, **(c)** trocar a injeção em `adapters/index.ts`.

### 1. Instalação base

```bash
# Capacitor core + CLI
npm install @capacitor/core @capacitor/cli

# Plataformas
npm install @capacitor/ios @capacitor/android

# Plugins que vamos usar
npm install @capacitor/preferences      # storage
npm install @capacitor/haptics          # vibração nativa
# AdMob (third-party, mas oficial da comunidade Capacitor)
npm install @capacitor-community/admob
# IAP — escolher um:
npm install @capacitor-community/in-app-purchases
# (alternativa: RevenueCat com revenuecat-purchases-capacitor)

npx cap init float com.suaempresa.float
```

Em `capacitor.config.ts`:

```ts
import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.suaempresa.float',
  appName: 'Float',
  webDir: 'dist',
  bundledWebRuntime: false
};
export default config;
```

### 2. Build & sync

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios       # abre Xcode
npx cap open android   # abre Android Studio
```

### 3. Implementar os 4 adapters nativos

Crie 4 arquivos em `src/adapters/native/`:

**`CapacitorStorageAdapter.ts`**

```ts
import { Preferences } from '@capacitor/preferences';
import type { IStorage } from '../IStorage';

export class CapacitorStorageAdapter implements IStorage {
  // Atenção: Preferences é async; envolva com cache em memória pra manter
  // a API síncrona do IStorage. No init(), pré-carregue todas as chaves.
  private cache = new Map<string, unknown>();

  async preload(): Promise<void> {
    const { keys } = await Preferences.keys();
    for (const k of keys) {
      const { value } = await Preferences.get({ key: k });
      if (value) this.cache.set(k, JSON.parse(value));
    }
  }

  get<T>(key: string): T | null {
    return (this.cache.get(key) as T) ?? null;
  }
  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
    Preferences.set({ key, value: JSON.stringify(value) }); // fire-and-forget
  }
  remove(key: string): void {
    this.cache.delete(key);
    Preferences.remove({ key });
  }
  clear(): void {
    this.cache.clear();
    Preferences.clear();
  }
}
```

**`CapacitorHaptics.ts`**

```ts
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { HapticIntensity, IHaptics } from '../IHaptics';

export class CapacitorHaptics implements IHaptics {
  private enabled = true;
  trigger(intensity: HapticIntensity): void {
    if (!this.enabled) return;
    switch (intensity) {
      case 'light':
      case 'selection':
        Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'warning':
        Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  }
  enable(e: boolean): void { this.enabled = e; }
  isEnabled(): boolean { return this.enabled; }
}
```

**`AdMobAdsProvider.ts`** (esqueleto)

```ts
import { AdMob, AdMobRewardItem, RewardAdOptions, AdOptions } from '@capacitor-community/admob';
import type { AdResult, AdType, IAdsProvider } from '../IAdsProvider';

export class AdMobAdsProvider implements IAdsProvider {
  private removeAds = false;

  async init(): Promise<void> {
    await AdMob.initialize({
      // requestTrackingAuthorization: true,
      initializeForTesting: import.meta.env.DEV
    });
  }
  isReady(_t: AdType): boolean { return !this.removeAds; }
  async preload(t: AdType): Promise<void> {
    if (t === 'rewarded') await AdMob.prepareRewardVideoAd({ adId: 'YOUR_REWARDED_ID' });
    else await AdMob.prepareInterstitial({ adId: 'YOUR_INTERSTITIAL_ID' });
  }
  async show(t: AdType): Promise<AdResult> {
    if (t === 'rewarded') {
      try {
        const r = await AdMob.showRewardVideoAd();
        return { shown: true, rewarded: !!r };
      } catch (e) {
        return { shown: false, rewarded: false, reason: String(e) };
      }
    }
    if (this.removeAds) return { shown: false, rewarded: false, reason: 'ads_removed' };
    await AdMob.showInterstitial();
    return { shown: true, rewarded: false };
  }
  setRemoveAds(e: boolean): void { this.removeAds = e; }
  isAdsRemoved(): boolean { return this.removeAds; }
}
```

**`CapacitorIAPProvider.ts`** — análogo, adaptando `getProducts/purchase/restore` à API do plugin escolhido.

### 4. Trocar `adapters/index.ts`

```diff
 export function initServices(): Services {
   if (services) return services;
+  const isNative = Capacitor.isNativePlatform();
   services = {
-    storage: new LocalStorageAdapter('float:'),
-    ads: new MockAdsProvider(),
-    iap: new MockIAPProvider(),
-    haptics: new WebHaptics()
+    storage: isNative ? new CapacitorStorageAdapter() : new LocalStorageAdapter('float:'),
+    ads:     isNative ? new AdMobAdsProvider()       : new MockAdsProvider(),
+    iap:     isNative ? new CapacitorIAPProvider()   : new MockIAPProvider(),
+    haptics: isNative ? new CapacitorHaptics()       : new WebHaptics()
   };
   return services;
 }
```

> **Importante:** se usar `CapacitorStorageAdapter` (async), chame `await capacitorStorage.preload()` antes de `GameState.instance().init(...)` em `main.ts`. Mantém o resto do GameState 100% síncrono.

### 5. Permissões/configurações de loja

- **iOS:** App Store Connect — produtos IAP (mesmos IDs de `MockIAPProvider`), AdMob iOS App ID em `Info.plist`.
- **Android:** Play Console — produtos IAP, AdMob Android App ID em `AndroidManifest.xml`, ATT/UMP se publicar com ads.

### 6. Build final

```bash
npm run build
npx cap sync
# iOS:
npx cap open ios   # → Archive no Xcode
# Android:
cd android && ./gradlew assembleRelease
```

### Leaderboard online (pós-port)

`LeaderboardScene` está pronto pra trocar a fonte de dados. Sugestões:

- **Cross-platform**: Firebase Realtime Database / Firestore via `@capacitor-firebase/firestore`.
- **iOS nativo**: Game Center via plugin Capacitor de Game Center.
- **Android nativo**: Google Play Games via plugin equivalente.

Crie um `IRemoteLeaderboardProvider`, implemente o backend escolhido e plug-and-play.

---

## Substituir arte placeholder por arte final

Veja o catálogo completo em [`ASSETS.md`](./ASSETS.md). Resumo:

1. Coloque a imagem real no path indicado (ex: `public/assets/images/skins/rock.png`).
2. Recarregue. O `PreloadScene` tenta carregar primeiro a real; se falhar (404), gera o placeholder via Canvas. Sem mudanças de código.
3. Para áudio (futuro), substitua a chamada do `AudioSystem` por arquivos em `public/assets/audio/`.

---

## Roadmap pós-MVP

- Chest/egg system completo (com pity, skins drop)
- Localização EN (i18n já esquemado em `settings.language`)
- Conquistas
- Replay/share clip da run via `MediaRecorder` + Capacitor share
- Cloud save (Game Center / Play Games / Firebase Auth+Firestore)
- Eventos por temporada (skins limitadas)

---

## Decisões e racionais

- **Sem Arcade Physics.** Colisão manual via AABB-distance. Mais previsível para `narrow_gap` (2 hitboxes), `breakable` quebrável, e movimento controlado do `moving_vertical` sem efeitos colaterais físicos.
- **Adapters mesmo no início.** Custo zero pra trocar depois — o jogo nunca importa nada de fora dos adapters.
- **Placeholder via Canvas, não SVG.** Funciona idêntico em iOS WebView e desktop, sem dependência adicional.
- **Áudio via Web Audio API gerado.** Tons procedurais bons o suficiente pra dev. Substituir por arquivos depois é trivial: trocar internals do `AudioSystem`, manter mesma API.
- **GameState singleton + subscribe.** Bem mais simples que Redux/Zustand pro escopo, e zero dependência. Cada UI listener chama `subscribe()` no `create()` e libera no `shutdown`.
