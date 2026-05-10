/**
 * Pool genérico de objetos. Reutiliza instâncias inativas em vez de
 * criar/destruir constantemente — alivia GC e reduz spikes de frame em mobile.
 *
 * Contrato esperado dos itens:
 *   - flag `active: boolean`
 *   - método `release()` — chamado ao devolver pro pool (esconde, mata tweens)
 *   - método `destroy()` — chamado ao limpar o pool inteiro
 */
export interface Poolable {
  active: boolean;
  release(): void;
  destroy(): void;
}

/**
 * Pool com fábrica injetada. `acquire(factory)` retorna um item inativo do pool
 * (já existente) ou cria um novo via factory.
 */
export class Pool<T extends Poolable> {
  private items: T[] = [];
  /** Limite duro de instâncias — evita explosão se algo der ruim em runtime. */
  private maxSize: number;

  constructor(maxSize = 256) {
    this.maxSize = maxSize;
  }

  /** Adquire um item: reusa um inativo, ou cria um novo via factory. */
  acquire(factory: () => T): T {
    for (const it of this.items) {
      if (!it.active) {
        it.active = true;
        return it;
      }
    }
    if (this.items.length >= this.maxSize) {
      // último recurso: força reuso do mais antigo
      const oldest = this.items[0];
      oldest.release();
      oldest.active = true;
      return oldest;
    }
    const fresh = factory();
    fresh.active = true;
    this.items.push(fresh);
    return fresh;
  }

  /** Devolve um item ao pool (ainda fica no array, mas marcado inativo). */
  release(item: T): void {
    if (!item.active) return;
    item.release();
    item.active = false;
  }

  /** Quantos estão ativos agora (para HUD de debug). */
  countActive(): number {
    let n = 0;
    for (const it of this.items) if (it.active) n++;
    return n;
  }

  /** Total de instâncias mantidas no pool (ativas + inativas). */
  countTotal(): number {
    return this.items.length;
  }

  /** Lista os ativos — útil pra iterar e atualizar. */
  forEachActive(fn: (item: T) => void): void {
    for (const it of this.items) {
      if (it.active) fn(it);
    }
  }

  /** Destrói todos os itens e zera o pool. Chamar em scene shutdown. */
  clear(): void {
    for (const it of this.items) it.destroy();
    this.items.length = 0;
  }
}
