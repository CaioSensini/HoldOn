/**
 * Taxonomia central de armadilhas.
 *
 * Categorias:
 *  - `ground`  Sit no solo. Damage SÓ quando o player vem deslizando (prone).
 *              Pulo passa por cima sem dano. Ex: jatos de chama, espinhos,
 *              poças de lava — visual claro de perigo no chão.
 *  - `low`     Suspenso no ar a altura média (~y=200-300). Damage no ar.
 *              Player desliza por baixo pra evitar. Ex: galho baixo, laser
 *              horizontal, estalactite.
 *  - `high`    Parede sólida do chão até alto. Player JUMP por cima ou
 *              desvia (em fases com gap). Ex: tronco gigante, pedregulho.
 *  - `gap`     Abertura vertical entre teto e chão. Player thread pelo gap.
 *  - `dynamic` Move/oscila — exige timing. Ex: serra, pêndulo, jellyfish.
 *  - `special` Mecânicas únicas: bonus_hole (entrada cave), pipe_exit
 *              (saída cave), ceiling_hole (gate Citadel→Space), breakable
 *              (smashable pelo Rocket).
 *
 * Padrão de design: cada armadilha vive como `TrapDef` no registry. O
 * `Obstacle` runtime apenas hospeda o container e delega `build()` ao def.
 * Isso elimina o switch gigante e mantém builders isolados por bioma.
 */

import type Phaser from 'phaser';
import type { BiomeId } from './BiomeDefs';

export type TrapCategory = 'ground' | 'low' | 'high' | 'gap' | 'dynamic' | 'breakable' | 'special';

export interface TrapHitbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrapBuildOptions {
  /** Centro vertical da abertura (apenas para `gap`). */
  openingCenterY?: number;
  /** Índice 0..n-1 dentro de uma sequência combo (alterna alto/baixo). */
  comboIndex?: number;
}

/**
 * Resultado da construção de uma armadilha. Sprites/Graphics ficam ANEXADOS
 * ao container que o builder recebe — não precisam ser retornados aqui.
 * Apenas hitboxes e callbacks de runtime são expostos pra runtime.
 */
export interface TrapInstance {
  /** Hitboxes sólidos (causam dano em contato). */
  hitboxes: TrapHitbox[];
  /** Zonas de gatilho — não causam dano, apenas trigger (ex: bonus hole). */
  triggerHitboxes: TrapHitbox[];
  /**
   * Per-frame update opcional (movimento de serras, pulse de chamas).
   * Recebe `time` em ms (do scene.time.now) — usado pra sin/cos animations.
   */
  update?: (time: number) => void;
  /**
   * Cleanup opcional pra builders que criam tweens infinitos ou timers
   * fora do container. O cleanup NÃO precisa destruir children do container
   * (release() faz removeAll() automaticamente).
   */
  cleanup?: () => void;
}

export interface TrapDef {
  id: string;
  category: TrapCategory;
  /** Bioma "dono" da arte. `'any'` = neutro (special traps). */
  biome: BiomeId | 'any';
  /**
   * Quando true, damage só dispara se o player estiver deslizando (prone).
   * GameScene checa esse flag antes de aplicar dano. Pulo sempre passa
   * em segurança. Usado pra TODA `ground` category.
   */
  damageOnSlideOnly?: boolean;
  /**
   * Hint pro spawner: 1 = pode aparecer cedo (Forest), 2 = aparece a partir
   * de Cave, 3 = só Temple+, 4 = só Sea+, etc. Usado pra weighted pick.
   */
  difficulty?: number;
  /**
   * Distância mínima (m) pra essa trap ficar disponível. Útil pra introduzir
   * traps mais complexas (gap, dynamic) só depois de aquecimento.
   */
  fromMeters?: number;
  /**
   * Builds the visual + hitboxes diretamente no `container` recebido.
   * Retorna `TrapInstance` com hitboxes pra runtime usar em colisões.
   */
  build(scene: Phaser.Scene, container: Phaser.GameObjects.Container, options: TrapBuildOptions): TrapInstance;
}

/**
 * Registry global. Populado em `entities/traps/index.ts` (importa builders).
 * Mantido como `let` mutable pra permitir inicialização lazy sem circular dep.
 */
export const TRAP_DEFS: Record<string, TrapDef> = {};

export function registerTraps(defs: TrapDef[]): void {
  for (const def of defs) {
    TRAP_DEFS[def.id] = def;
  }
}

/**
 * Palette por bioma — quais variantes estão disponíveis em cada categoria.
 * Spawner consulta isto pra escolher uma trap aleatória que case com a
 * categoria pedida pelo RunDirector e o bioma corrente.
 */
export interface BiomePalette {
  ground: string[];
  low: string[];
  high: string[];
  gap: string[];
  dynamic: string[];
  breakable: string[];
}

export const BIOME_PALETTE: Record<BiomeId, BiomePalette> = {
  forest:  { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] },
  cave:    { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] },
  temple:  { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] },
  sea:     { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] },
  beach:   { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] },
  volcano: { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] },
  citadel: { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] },
  space:   { ground: [], low: [], high: [], gap: [], dynamic: [], breakable: [] }
};

/**
 * Adiciona um trap id à palette do bioma. Builders chamam isto após registrar.
 */
export function addToPalette(biome: BiomeId, category: keyof BiomePalette, id: string): void {
  if (!BIOME_PALETTE[biome][category].includes(id)) {
    BIOME_PALETTE[biome][category].push(id);
  }
}
