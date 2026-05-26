import { describe, it, expect } from 'vitest';
import {
  validateLayoutConstraints,
  suggestLayouts,
  rankSuggestions,
  applyLayoutSuggestion,
  createDesignBrief,
  formatConstraintReport,
  DEFAULT_SUGGESTION_WEIGHTS,
} from '../../src/engine/ai-assistant';
import type { LayoutConstraint, AiLayoutSuggestion } from '../../src/engine/ai-assistant';
import { cfg } from '../helpers';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseConfig = cfg({ width: 600, height: 720, depth: 580, shelfCount: 2, drawerCount: 0, doorCount: 1 });

function constraint(
  kind: LayoutConstraint['kind'],
  value: LayoutConstraint['value'],
  priority: LayoutConstraint['priority'] = 'required',
): LayoutConstraint {
  return { kind, value, priority };
}

// ─── validateLayoutConstraints ───────────────────────────────────────────────

describe('validateLayoutConstraints', () => {
  it('satisfied when all constraints match config', () => {
    const constraints = [
      constraint('min-width', 400),
      constraint('max-width', 900),
      constraint('min-height', 500),
      constraint('max-height', 900),
    ];
    const { satisfied, violated, partial } = validateLayoutConstraints(baseConfig, constraints);
    expect(satisfied).toHaveLength(4);
    expect(violated).toHaveLength(0);
    expect(partial).toHaveLength(0);
  });

  it('violated when dimension falls outside bounds', () => {
    const constraints = [constraint('min-height', 800), constraint('max-width', 500)];
    const { violated } = validateLayoutConstraints(baseConfig, constraints);
    expect(violated.map((c) => c.kind)).toEqual(['min-height', 'max-width']);
  });

  it('partial for material-match when material differs', () => {
    const constraints = [constraint('material-match', 'plywood-18')];
    const { partial } = validateLayoutConstraints(cfg({ carcassMaterial: 'melamine-16' }), constraints);
    expect(partial).toHaveLength(1);
  });

  it('satisfied for has-drawers when drawers are present', () => {
    const c = cfg({ drawerCount: 2 });
    const { satisfied } = validateLayoutConstraints(c, [constraint('has-drawers', true)]);
    expect(satisfied).toHaveLength(1);
  });

  it('violated for has-doors when no doors configured — always has doors, always satisfied', () => {
    // doorCount is 1|2 in CabinetConfig, so has-doors:true is always satisfied
    const c = cfg({ doorCount: 1 });
    const { satisfied } = validateLayoutConstraints(c, [constraint('has-doors', true)]);
    expect(satisfied).toHaveLength(1);
  });

  it('handles empty constraints array', () => {
    const result = validateLayoutConstraints(baseConfig, []);
    expect(result.satisfied).toHaveLength(0);
    expect(result.violated).toHaveLength(0);
  });
});

// ─── suggestLayouts ───────────────────────────────────────────────────────────

describe('suggestLayouts', () => {
  it('returns empty array when no constraints are violated', () => {
    const constraints = [constraint('min-width', 400), constraint('max-width', 900)];
    expect(suggestLayouts(baseConfig, constraints)).toHaveLength(0);
  });

  it('suggests height increase for min-height violation', () => {
    const suggestions = suggestLayouts(baseConfig, [constraint('min-height', 900)]);
    const s = suggestions[0];
    expect(s.kind).toBe('resize-height');
    expect(s.configDelta.height).toBe(900);
    expect(s.constraintsSatisfied).toContain('min-height');
  });

  it('suggests height reduction for max-height violation', () => {
    const suggestions = suggestLayouts(baseConfig, [constraint('max-height', 600)]);
    expect(suggestions[0].configDelta.height).toBe(600);
  });

  it('suggests width change for width constraints', () => {
    const widen = suggestLayouts(baseConfig, [constraint('min-width', 800)]);
    expect(widen[0].configDelta.width).toBe(800);

    const narrow = suggestLayouts(baseConfig, [constraint('max-width', 500)]);
    expect(narrow[0].configDelta.width).toBe(500);
  });

  it('suggests depth change for depth constraints', () => {
    const deeper = suggestLayouts(baseConfig, [constraint('min-depth', 620)]);
    expect(deeper[0].configDelta.depth).toBe(620);

    const shallower = suggestLayouts(baseConfig, [constraint('max-depth', 500)]);
    expect(shallower[0].configDelta.depth).toBe(500);
  });

  it('suggests add-drawers when has-drawers:true is violated', () => {
    const c = cfg({ drawerCount: 0 });
    const suggestions = suggestLayouts(c, [constraint('has-drawers', true)]);
    expect(suggestions[0].kind).toBe('add-drawers');
    expect(suggestions[0].configDelta.drawerCount).toBe(1);
  });

  it('suggests remove-drawers when has-drawers:false is violated', () => {
    const c = cfg({ drawerCount: 2 });
    const suggestions = suggestLayouts(c, [constraint('has-drawers', false)]);
    expect(suggestions[0].kind).toBe('remove-drawers');
    expect(suggestions[0].configDelta.drawerCount).toBe(0);
  });

  it('has-doors:false produces no suggestion (doorCount cannot be 0)', () => {
    const c = cfg({ doorCount: 1 });
    const suggestions = suggestLayouts(c, [constraint('has-doors', false)]);
    // has-doors:false is violated but no configurable fix — no suggestion emitted
    expect(suggestions).toHaveLength(0);
  });

  it('suggests shelf count adjustment', () => {
    const moreShelves = suggestLayouts(baseConfig, [constraint('min-shelves', 4)]);
    expect(moreShelves[0].configDelta.shelfCount).toBe(4);

    const lessShelves = suggestLayouts(baseConfig, [constraint('max-shelves', 1)]);
    expect(lessShelves[0].configDelta.shelfCount).toBe(1);
  });

  it('suggests material change for material-match — partial is not violated, no suggestion', () => {
    const suggestions = suggestLayouts(cfg({ carcassMaterial: 'melamine-16' }), [
      constraint('material-match', 'plywood-18'),
    ]);
    // material-match returns 'partial', not 'violated' → no suggestion generated
    expect(suggestions).toHaveLength(0);
  });

  it('suggests furniture-type change when violated', () => {
    const c = cfg({ furnitureType: 'cabinet' });
    const suggestions = suggestLayouts(c, [constraint('furniture-type', 'bookshelf')]);
    expect(suggestions[0].kind).toBe('change-furniture-type');
    expect(suggestions[0].configDelta.furnitureType).toBe('bookshelf');
  });

  it('produces unique suggestion ids', () => {
    const constraints = [constraint('min-height', 900), constraint('min-width', 800)];
    const suggestions = suggestLayouts(baseConfig, constraints);
    const ids = suggestions.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── rankSuggestions ──────────────────────────────────────────────────────────

describe('rankSuggestions', () => {
  const mockSuggestions: AiLayoutSuggestion[] = [
    {
      id: 's1',
      kind: 'resize-height',
      title: 'Increase height',
      rationale: '',
      configDelta: { height: 900 },
      constraintsSatisfied: ['min-height'],
      estimatedImprovementScore: 0.8,
    },
    {
      id: 's2',
      kind: 'change-material',
      title: 'Change material',
      rationale: '',
      configDelta: { carcassMaterial: 'plywood-18' },
      constraintsSatisfied: ['material-match'],
      estimatedImprovementScore: 0.5,
    },
  ];

  it('returns one ranked entry per suggestion', () => {
    const ranked = rankSuggestions(baseConfig, mockSuggestions);
    expect(ranked).toHaveLength(2);
  });

  it('assigns rank 1 to highest score', () => {
    const ranked = rankSuggestions(baseConfig, mockSuggestions);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('uses default weights when none supplied', () => {
    const ranked = rankSuggestions(baseConfig, mockSuggestions, DEFAULT_SUGGESTION_WEIGHTS);
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it('returns empty array for empty suggestions', () => {
    expect(rankSuggestions(baseConfig, [])).toHaveLength(0);
  });
});

// ─── applyLayoutSuggestion ────────────────────────────────────────────────────

describe('applyLayoutSuggestion', () => {
  it('merges configDelta into config without mutating original', () => {
    const s: AiLayoutSuggestion = {
      id: 's1',
      kind: 'resize-height',
      title: '',
      rationale: '',
      configDelta: { height: 950 },
      constraintsSatisfied: [],
      estimatedImprovementScore: 0.8,
    };
    const result = applyLayoutSuggestion(baseConfig, s);
    expect(result.height).toBe(950);
    expect(baseConfig.height).toBe(720);
  });

  it('preserves all other config fields', () => {
    const s: AiLayoutSuggestion = {
      id: 's2',
      kind: 'adjust-shelves',
      title: '',
      rationale: '',
      configDelta: { shelfCount: 4 },
      constraintsSatisfied: [],
      estimatedImprovementScore: 0.6,
    };
    const result = applyLayoutSuggestion(baseConfig, s);
    expect(result.width).toBe(baseConfig.width);
    expect(result.carcassMaterial).toBe(baseConfig.carcassMaterial);
    expect(result.shelfCount).toBe(4);
  });
});

// ─── createDesignBrief ────────────────────────────────────────────────────────

describe('createDesignBrief', () => {
  it('returns brief with correct furniture type and dimensions', () => {
    const brief = createDesignBrief(baseConfig, []);
    expect(brief.cabinetType).toBe(baseConfig.furnitureType);
    expect(brief.currentDimensions.width).toBe(600);
    expect(brief.currentDimensions.height).toBe(720);
  });

  it('counts satisfied and violated correctly', () => {
    const constraints = [constraint('min-height', 800), constraint('max-width', 900)];
    const brief = createDesignBrief(baseConfig, constraints);
    expect(brief.constraintsViolated).toBe(1);
    expect(brief.constraintsSatisfied).toBe(1);
  });

  it('limits suggestions to top 3', () => {
    const constraints = [
      constraint('min-height', 900),
      constraint('min-width', 800),
      constraint('min-depth', 620),
      constraint('min-shelves', 4),
    ];
    const brief = createDesignBrief(baseConfig, constraints);
    expect(brief.suggestions.length).toBeLessThanOrEqual(3);
  });

  it('overallScore is in range 0–100', () => {
    const brief = createDesignBrief(baseConfig, []);
    expect(brief.overallScore).toBeGreaterThanOrEqual(0);
    expect(brief.overallScore).toBeLessThanOrEqual(100);
  });

  it('lists feature highlights for configured drawers and doors', () => {
    const c = cfg({ drawerCount: 2, doorCount: 1, shelfCount: 3 });
    const brief = createDesignBrief(c, []);
    expect(brief.featureHighlights.some((h) => h.includes('drawer'))).toBe(true);
    expect(brief.featureHighlights.some((h) => h.includes('door'))).toBe(true);
  });
});

// ─── formatConstraintReport ───────────────────────────────────────────────────

describe('formatConstraintReport', () => {
  it('includes summary counts', () => {
    const constraints = [constraint('min-height', 800), constraint('max-width', 900)];
    const result = validateLayoutConstraints(baseConfig, constraints);
    const report = formatConstraintReport(result);
    expect(report).toContain('Satisfied');
    expect(report).toContain('Violated');
  });

  it('lists violations when present', () => {
    const constraints = [constraint('min-height', 900)];
    const result = validateLayoutConstraints(baseConfig, constraints);
    const report = formatConstraintReport(result);
    expect(report).toContain('min-height');
    expect(report).toContain('[!]');
  });

  it('contains no violation block when all satisfied', () => {
    const constraints = [constraint('min-width', 400)];
    const result = validateLayoutConstraints(baseConfig, constraints);
    const report = formatConstraintReport(result);
    expect(report).not.toContain('[!]');
  });
});
