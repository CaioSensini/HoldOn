/**
 * GameState — singleton com toda a persistência do jogador.
 * Salva via IStorage adapter (web = localStorage, nativo = capacitor preferences).
 */

import type { IStorage } from '../adapters/IStorage';
import { EQUIPPABLE } from '../config';
import { ActiveMission, generateDailyMissions } from './MissionPool';
import type { EquippableId } from './EquippableDefs';

const SAVE_KEY = 'state.v1';
const SAVE_VERSION = 1;

export interface MissionsState {
  date: string; // yyyy-mm-dd
  missions: ActiveMission[];
  /** Contadores cumulativos do dia (para missões "total"). */
  dayCounters: {
    distanceTotal: number;
    coinsTotal: number;
    powerupsCollected: number;
    nearMisses: number;
    obstaclesBroken: number;
    playRuns: number;
  };
}

export interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  hapticsEnabled: boolean;
  language: 'pt-BR' | 'en';
}

export interface PersistedState {
  version: number;
  /** Total de moedas. */
  coins: number;
  /** Recorde de distância (m). */
  bestDistance: number;
  /** Recorde de score. */
  bestScore: number;
  /** Total de moedas coletadas em todas as runs (cumulative). */
  lifetimeCoins: number;
  /** Total de mortes (usado para trigger de interstitial a cada 3). */
  deathCount: number;
  /** Total de runs jogadas. */
  totalRuns: number;

  /** Skins desbloqueadas. */
  ownedSkins: string[];
  equippedSkin: string;

  /** Trails desbloqueadas. */
  ownedTrails: string[];
  equippedTrail: string;

  /** Equipáveis: id -> nível (1..10). 0/undefined = não possuído. */
  equippableLevels: Partial<Record<EquippableId, number>>;
  /** Equipáveis nos 3 slots (até 3 ids; null = vazio). */
  equippedSlots: (EquippableId | null)[];

  /** Login streak. */
  lastLoginDate: string; // yyyy-mm-dd
  loginStreak: number;
  /** Indica que a recompensa diária do dia atual já foi reivindicada. */
  dailyClaimed: boolean;
  dailyChestClaimedDate: string;

  missions: MissionsState;
  settings: SettingsState;

  /** IAP. */
  removeAds: boolean;
  ownedNonConsumables: string[];

  /** Leaderboard local: top scores. */
  topScores: Array<{ score: number; distance: number; date: string }>;

  /** Pity counter para sistema de baú/ovo. */
  chestOpensWithoutRare: number;
}

function defaultState(): PersistedState {
  return {
    version: SAVE_VERSION,
    coins: 0,
    bestDistance: 0,
    bestScore: 0,
    lifetimeCoins: 0,
    deathCount: 0,
    totalRuns: 0,
    ownedSkins: ['rock'],
    equippedSkin: 'rock',
    ownedTrails: ['default'],
    equippedTrail: 'default',
    equippableLevels: { head_start: 1 },
    equippedSlots: ['head_start', null, null],
    lastLoginDate: '',
    loginStreak: 0,
    dailyClaimed: false,
    dailyChestClaimedDate: '',
    missions: {
      date: '',
      missions: [],
      dayCounters: {
        distanceTotal: 0,
        coinsTotal: 0,
        powerupsCollected: 0,
        nearMisses: 0,
        obstaclesBroken: 0,
        playRuns: 0
      }
    },
    settings: {
      musicVolume: 0.55,
      sfxVolume: 0.8,
      hapticsEnabled: true,
      language: 'pt-BR'
    },
    removeAds: false,
    ownedNonConsumables: [],
    topScores: [],
    chestOpensWithoutRare: 0
  };
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  if (!a || !b) return 999;
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

export class GameState {
  private static _instance: GameState | null = null;
  private state: PersistedState;
  private storage!: IStorage;
  private listeners = new Set<() => void>();
  private deferredSaveHandle: number | null = null;

  private constructor() {
    this.state = defaultState();
  }

  static instance(): GameState {
    if (!this._instance) this._instance = new GameState();
    return this._instance;
  }

  init(storage: IStorage): void {
    this.storage = storage;
    const loaded = storage.get<PersistedState>(SAVE_KEY);
    if (loaded && loaded.version === SAVE_VERSION) {
      this.state = { ...defaultState(), ...loaded };
      // hidrata sub-objetos
      this.state.settings = { ...defaultState().settings, ...loaded.settings };
      this.state.missions = { ...defaultState().missions, ...loaded.missions };
    }
    // Garante missões/dia atualizados
    this.refreshDailyState();
    this.save();
  }

  private save(opts: { defer?: boolean } = {}): void {
    this.notify();
    if (opts.defer) {
      this.scheduleDeferredSave();
      return;
    }
    this.flushSave();
  }

  private scheduleDeferredSave(): void {
    if (!this.storage) return;
    if (typeof window === 'undefined') {
      this.flushSave();
      return;
    }
    if (this.deferredSaveHandle !== null) return;
    this.deferredSaveHandle = window.setTimeout(() => {
      this.deferredSaveHandle = null;
      this.storage?.set(SAVE_KEY, this.state);
    }, 250);
  }

  private flushSave(): void {
    if (this.deferredSaveHandle !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.deferredSaveHandle);
      this.deferredSaveHandle = null;
    }
    this.storage?.set(SAVE_KEY, this.state);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /* ------- daily refresh: rotaciona missões e login streak ------- */

  refreshDailyState(): { isNewDay: boolean; streakKept: boolean } {
    const today = todayKey();
    let isNewDay = false;
    let streakKept = false;

    if (this.state.missions.date !== today) {
      this.state.missions.date = today;
      this.state.missions.missions = generateDailyMissions(today);
      this.state.missions.dayCounters = {
        distanceTotal: 0,
        coinsTotal: 0,
        powerupsCollected: 0,
        nearMisses: 0,
        obstaclesBroken: 0,
        playRuns: 0
      };
    }

    if (this.state.lastLoginDate !== today) {
      const diff = dayDiff(this.state.lastLoginDate, today);
      if (diff === 1) {
        this.state.loginStreak += 1;
        streakKept = true;
      } else {
        this.state.loginStreak = 1;
      }
      this.state.lastLoginDate = today;
      this.state.dailyClaimed = false;
      isNewDay = true;
    }
    return { isNewDay, streakKept };
  }

  /* ------- getters ------- */

  get(): Readonly<PersistedState> {
    return this.state;
  }

  /* ------- mutations ------- */

  addCoins(amount: number, opts: { deferSave?: boolean } = {}): void {
    this.state.coins += amount;
    if (amount > 0) this.state.lifetimeCoins += amount;
    this.save({ defer: opts.deferSave });
  }

  spendCoins(amount: number): boolean {
    if (this.state.coins < amount) return false;
    this.state.coins -= amount;
    this.save();
    return true;
  }

  reportRun(stats: {
    distance: number;
    score: number;
    coinsCollected: number;
    powerupsCollected: number;
    nearMisses: number;
    obstaclesBroken: number;
    survivedSeconds: number;
  }): { newRecord: boolean } {
    const newRecord = stats.distance > this.state.bestDistance;
    if (newRecord) this.state.bestDistance = Math.floor(stats.distance);
    if (stats.score > this.state.bestScore) this.state.bestScore = Math.floor(stats.score);

    this.state.deathCount += 1;
    this.state.totalRuns += 1;

    // top scores (top 10)
    this.state.topScores.push({
      score: Math.floor(stats.score),
      distance: Math.floor(stats.distance),
      date: todayKey()
    });
    this.state.topScores.sort((a, b) => b.score - a.score);
    this.state.topScores = this.state.topScores.slice(0, 10);

    // missões / counters do dia
    const c = this.state.missions.dayCounters;
    c.distanceTotal += Math.floor(stats.distance);
    c.coinsTotal += stats.coinsCollected;
    c.powerupsCollected += stats.powerupsCollected;
    c.nearMisses += stats.nearMisses;
    c.obstaclesBroken += stats.obstaclesBroken;
    c.playRuns += 1;

    // atualiza progresso de cada missão
    for (const m of this.state.missions.missions) {
      if (m.completed) continue;
      switch (m.type) {
        case 'distance_total':
          m.progress = Math.min(m.target, c.distanceTotal);
          break;
        case 'distance_single':
          m.progress = Math.min(m.target, Math.max(m.progress, Math.floor(stats.distance)));
          break;
        case 'coins_total':
          m.progress = Math.min(m.target, c.coinsTotal);
          break;
        case 'powerups_collected':
          m.progress = Math.min(m.target, c.powerupsCollected);
          break;
        case 'near_misses':
          m.progress = Math.min(m.target, c.nearMisses);
          break;
        case 'obstacles_broken':
          m.progress = Math.min(m.target, c.obstaclesBroken);
          break;
        case 'play_runs':
          m.progress = Math.min(m.target, c.playRuns);
          break;
        case 'survive_seconds':
          m.progress = Math.min(m.target, Math.max(m.progress, Math.floor(stats.survivedSeconds)));
          break;
      }
      if (m.progress >= m.target) m.completed = true;
    }

    this.save();
    return { newRecord };
  }

  claimMissionReward(missionId: string): number {
    const m = this.state.missions.missions.find((x) => x.id === missionId);
    if (!m || !m.completed || m.rewardClaimed) return 0;
    m.rewardClaimed = true;
    this.addCoins(m.reward);
    return m.reward;
  }

  /* ------- skins / trails ------- */

  ownsSkin(id: string): boolean {
    return this.state.ownedSkins.includes(id);
  }
  buySkin(id: string, cost: number): boolean {
    if (this.ownsSkin(id)) return true;
    if (!this.spendCoins(cost)) return false;
    this.state.ownedSkins.push(id);
    this.save();
    return true;
  }
  unlockSkin(id: string): void {
    if (!this.ownsSkin(id)) {
      this.state.ownedSkins.push(id);
      this.save();
    }
  }
  equipSkin(id: string): void {
    if (!this.ownsSkin(id)) return;
    this.state.equippedSkin = id;
    this.save();
  }

  ownsTrail(id: string): boolean {
    return this.state.ownedTrails.includes(id);
  }
  buyTrail(id: string, cost: number): boolean {
    if (this.ownsTrail(id)) return true;
    if (!this.spendCoins(cost)) return false;
    this.state.ownedTrails.push(id);
    this.save();
    return true;
  }
  equipTrail(id: string): void {
    if (!this.ownsTrail(id)) return;
    this.state.equippedTrail = id;
    this.save();
  }

  /* ------- equippables ------- */

  getEquippableLevel(id: EquippableId): number {
    return this.state.equippableLevels[id] ?? 0;
  }

  upgradeEquippable(id: EquippableId, cost: number): boolean {
    const cur = this.getEquippableLevel(id);
    if (cur >= EQUIPPABLE.MAX_LEVEL) return false;
    if (!this.spendCoins(cost)) return false;
    this.state.equippableLevels[id] = cur + 1;
    this.save();
    return true;
  }

  forceSetEquippableLevel(id: EquippableId, level: number): void {
    this.state.equippableLevels[id] = Math.min(EQUIPPABLE.MAX_LEVEL, Math.max(0, level));
    this.save();
  }

  setEquippedSlot(slotIndex: number, id: EquippableId | null): void {
    if (slotIndex < 0 || slotIndex > 2) return;
    // remove duplicatas em outros slots
    if (id !== null) {
      for (let i = 0; i < 3; i++) {
        if (i !== slotIndex && this.state.equippedSlots[i] === id) {
          this.state.equippedSlots[i] = null;
        }
      }
    }
    this.state.equippedSlots[slotIndex] = id;
    this.save();
  }

  isSlotUnlocked(slotIndex: number): boolean {
    if (slotIndex === 0) return true;
    if (slotIndex === 1) return this.state.bestDistance >= EQUIPPABLE.SLOT_2_UNLOCK_METERS;
    if (slotIndex === 2)
      return (
        this.state.bestDistance >= EQUIPPABLE.SLOT_3_UNLOCK_METERS ||
        this.state.ownedNonConsumables.includes('slot_3_unlock')
      );
    return false;
  }

  /* ------- settings ------- */

  setMusicVolume(v: number): void {
    this.state.settings.musicVolume = Math.max(0, Math.min(1, v));
    this.save();
  }
  setSfxVolume(v: number): void {
    this.state.settings.sfxVolume = Math.max(0, Math.min(1, v));
    this.save();
  }
  setHaptics(v: boolean): void {
    this.state.settings.hapticsEnabled = v;
    this.save();
  }
  setLanguage(lang: 'pt-BR' | 'en'): void {
    this.state.settings.language = lang;
    this.save();
  }

  /* ------- IAP results ------- */

  applyIAPResult(productId: string): void {
    switch (productId) {
      case 'coins_small':
        this.addCoins(1000);
        break;
      case 'coins_medium':
        this.addCoins(3000);
        break;
      case 'coins_large':
        this.addCoins(8000);
        break;
      case 'coins_huge':
        this.addCoins(25000);
        break;
      case 'remove_ads':
        this.state.removeAds = true;
        this.addCoins(2000);
        this.unlockSkin('lightning');
        if (!this.state.ownedNonConsumables.includes('remove_ads')) {
          this.state.ownedNonConsumables.push('remove_ads');
        }
        break;
      case 'equippables_bundle':
        for (const k of [
          'head_start',
          'coin_bonus',
          'powerup_duration',
          'magnet_range',
          'shield_initial',
          'score_multiplier',
          'near_miss_boost',
          'lucky_drop'
        ] as EquippableId[]) {
          const cur = this.getEquippableLevel(k);
          if (cur < 5) this.state.equippableLevels[k] = 5;
        }
        if (!this.state.ownedNonConsumables.includes('equippables_bundle')) {
          this.state.ownedNonConsumables.push('equippables_bundle');
        }
        break;
    }
    this.save();
  }

  /* ------- ads counter ------- */

  shouldShowInterstitial(): boolean {
    return !this.state.removeAds && this.state.deathCount > 0 && this.state.deathCount % 3 === 0;
  }

  /* ------- daily reward ------- */

  getDailyReward(streak: number): number {
    const rewards = [50, 100, 150, 200, 300, 500, 1000];
    const idx = Math.min(rewards.length - 1, Math.max(0, streak - 1));
    return rewards[idx];
  }

  claimDailyReward(): number {
    if (this.state.dailyClaimed) return 0;
    const reward = this.getDailyReward(this.state.loginStreak);
    this.addCoins(reward);
    this.state.dailyClaimed = true;
    this.save();
    return reward;
  }

  currentDateKey(): string {
    return todayKey();
  }

  hasClaimedDailyChest(date = todayKey()): boolean {
    return this.state.dailyChestClaimedDate === date;
  }

  markDailyChestClaimed(date = todayKey()): void {
    this.state.dailyChestClaimedDate = date;
    this.save();
  }

  /* ------- chest pity (preparado pra futuro) ------- */

  bumpChestCounter(rare: boolean): boolean {
    const guaranteed = this.state.chestOpensWithoutRare >= 9;
    if (rare || guaranteed) {
      this.state.chestOpensWithoutRare = 0;
    } else {
      this.state.chestOpensWithoutRare += 1;
    }
    this.save();
    return guaranteed;
  }

  /* ------- reset ------- */

  resetProgress(): void {
    this.state = defaultState();
    this.refreshDailyState();
    this.save();
  }
}
