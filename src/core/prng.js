/**
 * Mulberry32 — fast 32-bit seeded PRNG
 * Same seed always produces same sequence.
 */
export function createPRNG(seed) {
  let s = seed | 0;

  function next() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min, max) {
    return min + Math.floor(next() * (max - min + 1));
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Convert a string to a seed integer (djb2 hash)
   */
  function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  return { next, nextInt, shuffle, seed: s, hashString };
}

/**
 * Create a daily-seeded PRNG from today's date
 */
export function createDailyPRNG() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const seed = createPRNG(0).hashString(dateStr);
  return createPRNG(seed);
}
