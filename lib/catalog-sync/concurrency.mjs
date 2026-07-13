import {SYNC} from './config.js';

/**
 * Run async work over items with bounded concurrency.
 * Results match input order. Fails fast on the first rejection.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, concurrency, fn) {
  if (!items.length) return [];

  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({length: Math.min(limit, items.length)}, () => worker()),
  );
  return results;
}

/** @returns {number} */
export function getSyncConcurrency() {
  return SYNC.concurrency;
}

/** @param {number} ms */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
