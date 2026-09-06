/**
 * Atzar reproduïble. Tot el generador el rep per paràmetre: la mateixa
 * llavor ha de donar sempre la mateixa cançó, i amb Math.random no es podria
 * ni provar ni compartir.
 */
export type Rng = () => number;

/** mulberry32: curt, ràpid i prou bo per a això. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function chance(rng: Rng, p: number): boolean {
  return rng() < p;
}

export function range(rng: Rng, [min, max]: [number, number]): number {
  return min + rng() * (max - min);
}

export function intRange(rng: Rng, [min, max]: [number, number]): number {
  return Math.floor(min + rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}

/** Barreja una còpia, sense tocar l'original. */
export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
