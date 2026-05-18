/**
 * Lightweight JSON-keyed LRU memoisation for pure engine functions.
 *
 * The cache holds at most MAX_CACHE_SIZE entries; the oldest entry is
 * evicted when the limit is reached (Map preserves insertion order).
 *
 * Requirements: all arguments must be JSON-serialisable (plain objects,
 * primitives, arrays — no functions, class instances, or Symbols).
 */
const MAX_CACHE_SIZE = 8;

export function createJsonMemo<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>();

  return (...args: TArgs): TResult => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;

    const result = fn(...args);

    if (cache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry (Map iterates in insertion order)
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  };
}
