/** Utilitários matemáticos compactos. */

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const inverseLerp = (a: number, b: number, v: number): number =>
  b === a ? 0 : (v - a) / (b - a);

export const mapRange = (v: number, inMin: number, inMax: number, outMin: number, outMax: number): number =>
  outMin + (outMax - outMin) * inverseLerp(inMin, inMax, v);

export const randRange = (min: number, max: number): number => min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1));

export const randPick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

/** Pick com pesos [{ value, weight }]. */
export function weightedPick<T>(items: ReadonlyArray<{ value: T; weight: number }>): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.value;
  }
  return items[items.length - 1].value;
}

/** Distância euclidiana entre dois pontos. */
export const distance = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.hypot(x2 - x1, y2 - y1);

/** AABB: distância mínima entre dois retângulos (0 se sobrepostos). */
export function aabbDistance(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): number {
  const dx = Math.max(0, Math.max(ax - (bx + bw), bx - (ax + aw)));
  const dy = Math.max(0, Math.max(ay - (by + bh), by - (ay + ah)));
  return Math.hypot(dx, dy);
}
