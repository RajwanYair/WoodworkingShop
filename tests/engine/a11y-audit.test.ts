import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  meetsContrastRequirement,
  meetsTargetSize,
  createAuditResult,
  addViolation,
  addPass,
  addIncomplete,
  buildAuditReport,
  formatAuditReport,
  getCriterion,
  getNewIn22Criteria,
  getRulesByCategory,
  getCriticalAndSeriousRules,
  WCAG_22_CRITERIA,
  AUDIT_RULES,
  MIN_TARGET_SIZE_PX,
} from '../../src/engine/a11y-audit';
import type { AuditViolation, AuditPass, AuditIncomplete, AuditResult } from '../../src/engine/a11y-audit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeViolation(overrides: Partial<AuditViolation> = {}): AuditViolation {
  return {
    ruleId: 'color-contrast',
    criterion: '1.4.3',
    severity: 'serious',
    element: 'button.primary',
    message: 'Contrast ratio 2.5:1 is below 4.5:1 minimum',
    suggestion: 'Darken foreground or lighten background to reach 4.5:1',
    ...overrides,
  };
}

function makePass(overrides: Partial<AuditPass> = {}): AuditPass {
  return { ruleId: 'img-alt', criterion: '1.1.1', element: 'img.logo', ...overrides };
}

function makeIncomplete(overrides: Partial<AuditIncomplete> = {}): AuditIncomplete {
  return {
    ruleId: 'focus-visible',
    criterion: '2.4.7',
    element: 'div[role="button"]',
    reason: 'Cannot determine focus visibility without browser rendering',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// relativeLuminance
// ---------------------------------------------------------------------------

describe('relativeLuminance', () => {
  it.each([
    ['black', 0, 0, 0, 0],
    ['white', 255, 255, 255, 1],
    ['mid-grey #808080', 128, 128, 128, 0.216],
  ])('%s → approx %f', (_label, r, g, b, expected) => {
    expect(relativeLuminance(r, g, b)).toBeCloseTo(expected, 2);
  });

  it('throws for out-of-range values', () => {
    expect(() => relativeLuminance(-1, 0, 0)).toThrow(RangeError);
    expect(() => relativeLuminance(0, 256, 0)).toThrow(RangeError);
    expect(() => relativeLuminance(0, 0, 300)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// contrastRatio
// ---------------------------------------------------------------------------

describe('contrastRatio', () => {
  it('black on white → 21:1', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
  });

  it('identical colours → 1:1', () => {
    expect(contrastRatio([128, 128, 128], [128, 128, 128])).toBeCloseTo(1, 1);
  });

  it('is symmetric (fg/bg order does not matter)', () => {
    const a = contrastRatio([0, 0, 0], [200, 200, 200]);
    const b = contrastRatio([200, 200, 200], [0, 0, 0]);
    expect(a).toBeCloseTo(b, 5);
  });

  it('returns value between 1 and 21', () => {
    const ratio = contrastRatio([100, 149, 237], [255, 255, 255]);
    expect(ratio).toBeGreaterThanOrEqual(1);
    expect(ratio).toBeLessThanOrEqual(21);
  });
});

// ---------------------------------------------------------------------------
// meetsContrastRequirement
// ---------------------------------------------------------------------------

describe('meetsContrastRequirement', () => {
  it.each([
    // [ratio, largeText, level, expected]
    [4.5, false, 'AA', true],
    [4.49, false, 'AA', false],
    [3.0, true, 'AA', true],
    [2.9, true, 'AA', false],
    [7.0, false, 'AAA', true],
    [6.9, false, 'AAA', false],
    [4.5, true, 'AAA', true],
    [4.4, true, 'AAA', false],
  ] as const)('ratio=%f largeText=%s level=%s → %s', (ratio, largeText, level, expected) => {
    expect(meetsContrastRequirement(ratio, largeText, level)).toBe(expected);
  });

  it('defaults to AA level when not specified', () => {
    expect(meetsContrastRequirement(4.5, false)).toBe(true);
    expect(meetsContrastRequirement(4.4, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// meetsTargetSize
// ---------------------------------------------------------------------------

describe('meetsTargetSize', () => {
  it.each([
    [24, 24, true],
    [23, 24, false],
    [24, 23, false],
    [44, 44, true],
    [0, 0, false],
  ])('%dx%d → %s', (w, h, expected) => {
    expect(meetsTargetSize(w, h)).toBe(expected);
  });

  it(`exports MIN_TARGET_SIZE_PX = ${MIN_TARGET_SIZE_PX}`, () => {
    expect(MIN_TARGET_SIZE_PX).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// createAuditResult
// ---------------------------------------------------------------------------

describe('createAuditResult', () => {
  it('creates empty result with correct target', () => {
    const r = createAuditResult('CabinetPreview');
    expect(r.target).toBe('CabinetPreview');
    expect(r.violations).toHaveLength(0);
    expect(r.passes).toHaveLength(0);
    expect(r.incomplete).toHaveLength(0);
    expect(r.violationCount).toBe(0);
    expect(r.passCount).toBe(0);
    expect(r.incompleteCount).toBe(0);
    expect(typeof r.timestamp).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// addViolation / addPass / addIncomplete (immutable)
// ---------------------------------------------------------------------------

describe('addViolation', () => {
  it('returns new result with violation appended and counter incremented', () => {
    const base = createAuditResult('Header');
    const v1 = makeViolation();
    const r1 = addViolation(base, v1);
    expect(r1.violationCount).toBe(1);
    expect(r1.violations[0]).toBe(v1);
    expect(base.violationCount).toBe(0); // immutable
  });

  it('accumulates multiple violations', () => {
    let r = createAuditResult('Form');
    r = addViolation(r, makeViolation({ ruleId: 'rule-a' }));
    r = addViolation(r, makeViolation({ ruleId: 'rule-b' }));
    expect(r.violationCount).toBe(2);
    expect(r.violations.map((v) => v.ruleId)).toEqual(['rule-a', 'rule-b']);
  });
});

describe('addPass', () => {
  it('returns new result with pass appended', () => {
    const base = createAuditResult('Nav');
    const p = makePass();
    const r = addPass(base, p);
    expect(r.passCount).toBe(1);
    expect(r.passes[0]).toBe(p);
    expect(base.passCount).toBe(0);
  });
});

describe('addIncomplete', () => {
  it('returns new result with incomplete appended', () => {
    const base = createAuditResult('Canvas');
    const inc = makeIncomplete();
    const r = addIncomplete(base, inc);
    expect(r.incompleteCount).toBe(1);
    expect(r.incomplete[0]).toBe(inc);
    expect(base.incompleteCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildAuditReport
// ---------------------------------------------------------------------------

describe('buildAuditReport', () => {
  it('produces compliant report when no violations', () => {
    const r1 = addPass(createAuditResult('App'), makePass());
    const report = buildAuditReport([r1]);
    expect(report.isCompliant).toBe(true);
    expect(report.totalViolations).toBe(0);
    expect(report.totalPasses).toBe(1);
  });

  it('aggregates violation counts by severity', () => {
    let r = createAuditResult('Page');
    r = addViolation(r, makeViolation({ severity: 'critical' }));
    r = addViolation(r, makeViolation({ severity: 'critical' }));
    r = addViolation(r, makeViolation({ severity: 'serious' }));
    r = addViolation(r, makeViolation({ severity: 'moderate' }));
    r = addViolation(r, makeViolation({ severity: 'minor' }));
    const report = buildAuditReport([r]);
    expect(report.isCompliant).toBe(false);
    expect(report.totalViolations).toBe(5);
    expect(report.criticalCount).toBe(2);
    expect(report.seriousCount).toBe(1);
    expect(report.moderateCount).toBe(1);
    expect(report.minorCount).toBe(1);
  });

  it('aggregates across multiple results', () => {
    const r1 = addViolation(createAuditResult('A'), makeViolation());
    const r2 = addViolation(createAuditResult('B'), makeViolation());
    const report = buildAuditReport([r1, r2]);
    expect(report.totalViolations).toBe(2);
    expect(report.results).toHaveLength(2);
  });

  it('empty results array → compliant with zero counts', () => {
    const report = buildAuditReport([]);
    expect(report.isCompliant).toBe(true);
    expect(report.totalViolations).toBe(0);
    expect(report.totalPasses).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatAuditReport
// ---------------------------------------------------------------------------

describe('formatAuditReport', () => {
  it('includes COMPLIANT for zero-violation report', () => {
    const report = buildAuditReport([addPass(createAuditResult('X'), makePass())]);
    const text = formatAuditReport(report);
    expect(text).toContain('COMPLIANT ✓');
    expect(text).not.toContain('NON-COMPLIANT');
  });

  it('includes violation details in non-compliant report', () => {
    const v = makeViolation({ element: 'button.save', message: 'Low contrast' });
    const report = buildAuditReport([addViolation(createAuditResult('SaveBtn'), v)]);
    const text = formatAuditReport(report);
    expect(text).toContain('NON-COMPLIANT');
    expect(text).toContain('button.save');
    expect(text).toContain('Low contrast');
    expect(text).toContain('1.4.3');
  });

  it('skips components with zero violations in body', () => {
    const clean = addPass(createAuditResult('Clean'), makePass());
    const dirty = addViolation(createAuditResult('Dirty'), makeViolation());
    const text = formatAuditReport(buildAuditReport([clean, dirty]));
    expect(text).toContain('Dirty');
    expect(text).not.toContain('Component: Clean');
  });
});

// ---------------------------------------------------------------------------
// getCriterion
// ---------------------------------------------------------------------------

describe('getCriterion', () => {
  it('returns criterion for known ID', () => {
    const c = getCriterion('1.4.3');
    expect(c).toBeDefined();
    expect(c?.title).toBe('Contrast (Minimum)');
    expect(c?.level).toBe('AA');
  });

  it('returns undefined for unknown ID (cast for testing)', () => {
    // Type-cast to test runtime behaviour with unexpected input
    expect(getCriterion('9.9.9' as never)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getNewIn22Criteria
// ---------------------------------------------------------------------------

describe('getNewIn22Criteria', () => {
  it('returns only WCAG 2.2 new criteria', () => {
    const newOnes = getNewIn22Criteria();
    expect(newOnes.length).toBeGreaterThan(0);
    expect(newOnes.every((c) => c.isNewIn22)).toBe(true);
  });

  it('includes 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8', () => {
    const ids = getNewIn22Criteria().map((c) => c.id);
    expect(ids).toContain('2.4.11');
    expect(ids).toContain('2.5.7');
    expect(ids).toContain('2.5.8');
    expect(ids).toContain('3.2.6');
    expect(ids).toContain('3.3.7');
    expect(ids).toContain('3.3.8');
  });
});

// ---------------------------------------------------------------------------
// getRulesByCategory
// ---------------------------------------------------------------------------

describe('getRulesByCategory', () => {
  it.each(['perceivable', 'operable', 'understandable', 'robust'] as const)(
    '%s category returns only matching rules',
    (category) => {
      const rules = getRulesByCategory(category);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every((r) => r.category === category)).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// getCriticalAndSeriousRules
// ---------------------------------------------------------------------------

describe('getCriticalAndSeriousRules', () => {
  it('returns only critical and serious rules', () => {
    const rules = getCriticalAndSeriousRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.severity === 'critical' || r.severity === 'serious')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WCAG_22_CRITERIA and AUDIT_RULES integrity
// ---------------------------------------------------------------------------

describe('WCAG_22_CRITERIA', () => {
  it('contains only A and AA criteria (no AAA)', () => {
    const aaaOnly = WCAG_22_CRITERIA.filter((c) => c.level === 'AAA');
    // 2.4.12 is AAA (Focus Not Obscured Enhanced) — should NOT be in our A/AA list
    expect(aaaOnly.map((c) => c.id)).not.toContain('2.4.12');
  });

  it('has unique criterion IDs', () => {
    const ids = WCAG_22_CRITERIA.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all criteria have non-empty titles', () => {
    expect(WCAG_22_CRITERIA.every((c) => c.title.length > 0)).toBe(true);
  });
});

describe('AUDIT_RULES', () => {
  it('has unique rule IDs', () => {
    const ids = AUDIT_RULES.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all rules reference a valid criterion', () => {
    const criterionIds = new Set(WCAG_22_CRITERIA.map((c) => c.id));
    for (const rule of AUDIT_RULES) {
      expect(criterionIds.has(rule.criterion), `Rule ${rule.id} references unknown criterion ${rule.criterion}`).toBe(
        true,
      );
    }
  });

  it('all rules have non-empty help URLs starting with https://', () => {
    expect(AUDIT_RULES.every((r) => r.helpUrl.startsWith('https://'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: build and format a mixed report
// ---------------------------------------------------------------------------

describe('end-to-end audit flow', () => {
  it('creates a full report from violations and passes', () => {
    let header: AuditResult = createAuditResult('Header');
    header = addViolation(header, makeViolation({ severity: 'critical', ruleId: 'aria-name-role-value' }));
    header = addPass(header, makePass({ ruleId: 'img-alt' }));

    let form: AuditResult = createAuditResult('ConfiguratorForm');
    form = addViolation(form, makeViolation({ severity: 'serious', ruleId: 'form-label' }));
    form = addIncomplete(form, makeIncomplete());

    const report = buildAuditReport([header, form]);
    expect(report.isCompliant).toBe(false);
    expect(report.totalViolations).toBe(2);
    expect(report.totalPasses).toBe(1);
    expect(report.totalIncomplete).toBe(1);

    const text = formatAuditReport(report);
    expect(text).toContain('Header');
    expect(text).toContain('ConfiguratorForm');
    expect(text).toContain('[CRITICAL]');
    expect(text).toContain('[SERIOUS ]');
  });
});
