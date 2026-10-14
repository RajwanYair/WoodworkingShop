/**
 * Sprint 37 — Assembly step timer estimates engine.
 *
 * Assigns estimated time (in minutes) to each type of assembly action so
 * the assembly guide can show a "time remaining" indicator and the project
 * view can show a total build-time estimate.
 *
 * Time estimates are based on reasonable DIY workshop averages:
 *   - Basic tasks scale with part count or joint count.
 *   - Complex power-tool tasks carry a fixed setup overhead.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssemblyActionType =
  | 'dry-fit'
  | 'glue-up'
  | 'screw'
  | 'pocket-screw'
  | 'dado-route'
  | 'dowel-drill'
  | 'biscuit-slot'
  | 'edge-band'
  | 'sand-face'
  | 'install-hinge'
  | 'install-drawer-runner'
  | 'install-shelf-pin';

export interface TimerStep {
  id: string;
  action: AssemblyActionType;
  /** Number of operations for this step (joints, parts, hinges, etc.). */
  count: number;
  /** Optional description override (bilingual). */
  description?: { en: string; he: string };
}

export interface TimedStep extends TimerStep {
  /** Estimated minutes for this step. */
  estimatedMinutes: number;
  label: { en: string; he: string };
}

export interface AssemblyTimeEstimate {
  steps: TimedStep[];
  totalMinutes: number;
  /** Convenience: total formatted as "Xh Ym". */
  totalFormatted: string;
}

// ─── Time catalogue ───────────────────────────────────────────────────────────

/** Minutes per single operation for each action type. */
const MINUTES_PER_OPERATION: Record<AssemblyActionType, number> = {
  'dry-fit': 3,
  'glue-up': 5,
  screw: 1,
  'pocket-screw': 2,
  'dado-route': 4,
  'dowel-drill': 3,
  'biscuit-slot': 2,
  'edge-band': 3,
  'sand-face': 4,
  'install-hinge': 5,
  'install-drawer-runner': 8,
  'install-shelf-pin': 1,
};

/** Fixed setup overhead (minutes) for power-tool steps. */
const SETUP_OVERHEAD: Partial<Record<AssemblyActionType, number>> = {
  'dado-route': 10,
  'dowel-drill': 5,
  'biscuit-slot': 5,
  'pocket-screw': 5,
};

/** Default English labels for each action type. */
const ACTION_LABELS: Record<AssemblyActionType, { en: string; he: string }> = {
  'dry-fit': { en: 'Dry fit assembly', he: 'הרכבה יבשה' },
  'glue-up': { en: 'Glue-up', he: 'הדבקה' },
  screw: { en: 'Screw joints', he: 'ברגים' },
  'pocket-screw': { en: 'Pocket-screw joints', he: 'ברגי כיס' },
  'dado-route': { en: 'Route dado grooves', he: 'ניתוב דאדו' },
  'dowel-drill': { en: 'Drill dowel holes', he: 'קדיחת חורי דיבל' },
  'biscuit-slot': { en: 'Cut biscuit slots', he: 'חריצי ביסקוויט' },
  'edge-band': { en: 'Apply edge banding', he: 'הדבקת סרט שפה' },
  'sand-face': { en: 'Sand face panels', he: 'שיוף פנלים' },
  'install-hinge': { en: 'Install hinges', he: 'התקנת ציריות' },
  'install-drawer-runner': { en: 'Install drawer runners', he: 'התקנת מסילות מגירה' },
  'install-shelf-pin': { en: 'Install shelf pins', he: 'התקנת סיכות מדף' },
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/** Estimate the time for a single assembly step. */
export function estimateStepTime(step: TimerStep): TimedStep {
  const perOp = MINUTES_PER_OPERATION[step.action];
  const overhead = SETUP_OVERHEAD[step.action] ?? 0;
  const estimatedMinutes = overhead + perOp * Math.max(1, step.count);
  const defaultLabel = ACTION_LABELS[step.action];
  return {
    ...step,
    estimatedMinutes,
    label: step.description ?? defaultLabel,
  };
}

/**
 * Estimate total assembly time for a list of steps.
 * Steps are processed in order; total time is summed.
 */
export function estimateAssemblyTime(steps: TimerStep[]): AssemblyTimeEstimate {
  const timedSteps = steps.map(estimateStepTime);
  const totalMinutes = timedSteps.reduce((s, st) => s + st.estimatedMinutes, 0);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const totalFormatted = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { steps: timedSteps, totalMinutes, totalFormatted };
}

/** Return the per-operation rate (minutes) for a given action type. */
export function getActionRate(action: AssemblyActionType): number {
  return MINUTES_PER_OPERATION[action];
}
