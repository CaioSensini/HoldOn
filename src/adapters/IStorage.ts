/**
 * Interface de persistência. O jogo nunca chama localStorage diretamente —
 * sempre via implementação desta interface.
 *
 * Para empacotar em Capacitor, criar `CapacitorStorageAdapter`
 * usando `@capacitor/preferences` e injetar no main.ts.
 */
export interface IStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}
