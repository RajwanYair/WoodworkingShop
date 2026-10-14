export interface StorageEstimate {
  usedBytes: number;
  quotaBytes: number;
  usedKb: number;
  quotaMb: number;
  percentUsed: number;
  nearLimit: boolean;
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const fallback: StorageEstimate = {
    usedBytes: 0,
    quotaBytes: 0,
    usedKb: 0,
    quotaMb: 0,
    percentUsed: 0,
    nearLimit: false,
  };
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return fallback;
  try {
    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;
    const quotaBytes = estimate.quota ?? 0;
    const percentUsed = quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0;
    return {
      usedBytes,
      quotaBytes,
      usedKb: Math.round(usedBytes / 1024),
      quotaMb: Math.round(quotaBytes / (1024 * 1024)),
      percentUsed,
      nearLimit: percentUsed >= 80,
    };
  } catch {
    return fallback;
  }
}
