// Test-only helpers. Not imported by application code.

/** Deterministic PRNG (mulberry32) so a failing random case can be reproduced from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform integer in `[min, max]` drawn from `rnd`. */
export const randomInt = (rnd: () => number, min: number, max: number): number =>
  min + Math.floor(rnd() * (max - min + 1))
