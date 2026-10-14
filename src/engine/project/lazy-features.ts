/**
 * Sprint 130 — Bundle performance: lazy feature registry (Phase 29)
 *
 * Pure engine module — no React, no DOM, no side effects.
 * Provides a feature-flag / lazy-chunk registry that describes which
 * application features are enabled and what dynamic import chunks they require.
 * Consumers (e.g. the Vite build and route-level lazy loading) can query this
 * registry to drive code-splitting decisions without touching the bundle at
 * engine test time.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Stable identifier for a lazily-loadable feature. */
export type FeatureFlag =
  | 'pdf-export'
  | 'dxf-export'
  | 'gcode-export'
  | 'cut-optimizer'
  | 'assembly-view'
  | 'plugin-marketplace'
  | 'mobile-sync'
  | 'analytics-dashboard';

/** Load priority hint for a lazy feature. */
export type FeaturePriority = 'critical' | 'high' | 'normal' | 'low';

/** A single lazily-loadable feature descriptor. */
export interface LazyFeature {
  /** Unique feature flag. */
  flag: FeatureFlag;
  /** Human-readable label (for debugging / dashboards). */
  label: string;
  /** Whether this feature is currently enabled. */
  enabled: boolean;
  /** Relative chunk paths that will be loaded when this feature activates. */
  chunks: string[];
  /** Combined estimated uncompressed bundle size of all chunks in bytes. */
  estimatedBytes: number;
  /** Load priority hint. */
  priority: FeaturePriority;
  /** ISO 8601 date when this feature was registered. */
  registeredAt: string;
}

/** The lazy feature registry (immutable value). */
export interface LazyFeatureRegistry {
  /** All registered features keyed by flag. */
  features: Record<FeatureFlag, LazyFeature>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create an empty lazy feature registry.
 */
export function createFeatureRegistry(): LazyFeatureRegistry {
  return { features: {} as Record<FeatureFlag, LazyFeature> };
}

/**
 * Register a feature in the registry.
 * Throws if a feature with the same flag is already registered.
 */
export function registerFeature(registry: LazyFeatureRegistry, feature: LazyFeature): LazyFeatureRegistry {
  if (!feature.flag.trim()) throw new RangeError('Feature flag must not be empty');
  if (!feature.label.trim()) throw new RangeError('Feature label must not be empty');
  if (registry.features[feature.flag]) throw new RangeError(`Feature already registered: ${feature.flag}`);
  return {
    ...registry,
    features: {
      ...registry.features,
      [feature.flag]: { ...feature, registeredAt: feature.registeredAt || now() },
    },
  };
}

/**
 * Return whether a feature is currently enabled.
 *
 * @throws RangeError if the feature is not registered.
 */
export function isFeatureEnabled(registry: LazyFeatureRegistry, flag: FeatureFlag): boolean {
  const feature = registry.features[flag];
  if (!feature) throw new RangeError(`Feature not registered: ${flag}`);
  return feature.enabled;
}

/**
 * Enable or disable a registered feature.
 *
 * @throws RangeError if the feature is not registered.
 */
export function setFeatureEnabled(
  registry: LazyFeatureRegistry,
  flag: FeatureFlag,
  enabled: boolean,
): LazyFeatureRegistry {
  const feature = registry.features[flag];
  if (!feature) throw new RangeError(`Feature not registered: ${flag}`);
  return {
    ...registry,
    features: { ...registry.features, [flag]: { ...feature, enabled } },
  };
}

/**
 * Return the list of chunk paths for a registered feature.
 *
 * @throws RangeError if the feature is not registered.
 */
export function getFeatureChunks(registry: LazyFeatureRegistry, flag: FeatureFlag): string[] {
  const feature = registry.features[flag];
  if (!feature) throw new RangeError(`Feature not registered: ${flag}`);
  return [...feature.chunks];
}

/**
 * Return features sorted by load order: critical → high → normal → low.
 * Within the same priority, sort by estimatedBytes ascending (smallest first).
 */
export function resolveLoadOrder(registry: LazyFeatureRegistry): LazyFeature[] {
  const priorityOrder: Record<FeaturePriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };
  return Object.values(registry.features).sort((a, b) => {
    const pa = priorityOrder[a.priority];
    const pb = priorityOrder[b.priority];
    if (pa !== pb) return pa - pb;
    return a.estimatedBytes - b.estimatedBytes;
  });
}

/**
 * Estimate the total bundle impact of all currently enabled features.
 */
export function estimateBundleImpact(registry: LazyFeatureRegistry): number {
  return Object.values(registry.features)
    .filter((f) => f.enabled)
    .reduce((sum, f) => sum + f.estimatedBytes, 0);
}

/**
 * Return all features with the given priority.
 */
export function getFeaturesByPriority(registry: LazyFeatureRegistry, priority: FeaturePriority): LazyFeature[] {
  return Object.values(registry.features).filter((f) => f.priority === priority);
}
