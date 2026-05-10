import type { IStorage } from './IStorage';

/**
 * Implementação web baseada em localStorage.
 * TODO: substituir por CapacitorStorageAdapter ao portar pra nativo.
 */
export class LocalStorageAdapter implements IStorage {
  private readonly prefix: string;

  constructor(prefix = 'float:') {
    this.prefix = prefix;
  }

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // quota cheia ou modo privado — ignora silenciosamente
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  }
}
