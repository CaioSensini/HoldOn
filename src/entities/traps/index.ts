/**
 * Registry de armadilhas. Importa cada bioma e popula `TRAP_DEFS` + `BIOME_PALETTE`.
 *
 * Importar este arquivo (uma vez, em PreloadScene/HomeScene) é o que ativa
 * todo o sistema de traps. Importar `TRAP_DEFS` antes de `initializeTraps()`
 * resulta em registry vazio.
 */

import { registerForestTraps } from './ForestTraps';
import { registerCaveTraps } from './CaveTraps';
import { registerTempleTraps } from './TempleTraps';
import { registerSeaTraps } from './SeaTraps';
import { registerBeachTraps } from './BeachTraps';
import { registerVolcanoTraps } from './VolcanoTraps';
import { registerCitadelTraps } from './CitadelTraps';
import { registerSpaceTraps } from './SpaceTraps';
import { registerSpecialTraps } from './SpecialTraps';

let initialized = false;

/**
 * Idempotente — chama os registers de todos os biomas + special.
 * Pode ser invocado múltiplas vezes sem efeito colateral (evita
 * scenes que reload during dev tem palette duplicada).
 */
export function initializeTraps(): void {
  if (initialized) return;
  initialized = true;
  registerSpecialTraps();
  registerForestTraps();
  registerCaveTraps();
  registerTempleTraps();
  registerSeaTraps();
  registerBeachTraps();
  registerVolcanoTraps();
  registerCitadelTraps();
  registerSpaceTraps();
}

export {
  TRAP_DEFS,
  BIOME_PALETTE,
  type TrapCategory,
  type TrapDef,
  type TrapInstance,
  type TrapBuildOptions,
  type TrapHitbox,
  type BiomePalette
} from '../../data/TrapDefs';
