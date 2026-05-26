import { describe, it, expect } from 'vitest';
import {
  validateIso7171,
  formatIso7171Report,
  filterViolations,
  ISO7171_MODULE_WIDTHS,
  ISO7171_BASE_HEIGHT,
  ISO7171_TOE_KICK,
  ISO7171_MIN_SHELF_GAP,
  ISO7171_DRAWER_HEIGHT,
  ISO7171_MAX_WIDTH_HEIGHT_RATIO,
} from '../../src/engine/iso7171';
import { cfg } from '../helpers';

// ─── Base compliant config ────────────────────────────────────────────────────

/** A fully compliant base-cabinet configuration. */
function compliantBase() {
  return cfg({ width: 600, height: 720, depth: 580, shelfCount: 2, drawerCount: 0, kickHeight: 100 });
}

/** A fully compliant wall-unit configuration. */
function compliantWall() {
  return cfg({ width: 600, height: 720, depth: 320, shelfCount: 2, drawerCount: 0, kickHeight: 0 });
}

// ─── validateIso7171 — compliant configurations ───────────────────────────────

describe('validateIso7171 — compliant configurations', () => {
  it('standard base cabinet (600×720×580, kick=100) is compliant', () => {
    const report = validateIso7171(compliantBase());
    expect(report.compliant).toBe(true);
    expect(report.failCount).toBe(0);
  });

  it('wall unit (600×720×320) is compliant', () => {
    const report = validateIso7171(compliantWall());
    expect(report.compliant).toBe(true);
    expect(report.failCount).toBe(0);
  });

  it.each(ISO7171_MODULE_WIDTHS as unknown as number[])('module width %d mm passes', (w) => {
    const report = validateIso7171(cfg({ width: w, height: 720, depth: 580, kickHeight: 100 }));
    const moduleViolation = report.violations.find((v) => v.ruleId === 'module-width');
    expect(moduleViolation).toBeUndefined();
  });
});

// ─── module-width ─────────────────────────────────────────────────────────────

describe('module-width rule', () => {
  it('width 550 mm (not a standard module) generates advisory', () => {
    const report = validateIso7171(cfg({ width: 550, height: 720, depth: 580, kickHeight: 100 }));
    const v = report.violations.find((v) => v.ruleId === 'module-width');
    expect(v).toBeDefined();
    expect(v?.level).toBe('advisory');
  });

  it('width within tolerance (595 mm near 600) passes module-width', () => {
    const report = validateIso7171(cfg({ width: 595, height: 720, depth: 580, kickHeight: 100 }));
    const v = report.violations.find((v) => v.ruleId === 'module-width');
    expect(v).toBeUndefined();
  });
});

// ─── base-height ──────────────────────────────────────────────────────────────

describe('base-height rule', () => {
  it(`height ${ISO7171_BASE_HEIGHT.min} mm passes`, () => {
    const report = validateIso7171(cfg({ width: 600, height: ISO7171_BASE_HEIGHT.min, depth: 580, kickHeight: 100 }));
    expect(report.violations.find((v) => v.ruleId === 'base-height')).toBeUndefined();
  });

  it('height 650 mm fails base-height rule', () => {
    const report = validateIso7171(cfg({ width: 600, height: 650, depth: 580, kickHeight: 100 }));
    const v = report.violations.find((v) => v.ruleId === 'base-height');
    expect(v?.level).toBe('fail');
  });

  it('height > 1000 mm skips base-height check', () => {
    const report = validateIso7171(cfg({ width: 600, height: 2000, depth: 580, kickHeight: 100 }));
    expect(report.violations.find((v) => v.ruleId === 'base-height')).toBeUndefined();
  });
});

// ─── toe-kick-height ──────────────────────────────────────────────────────────

describe('toe-kick-height rule', () => {
  it('kick 0 mm skips the check', () => {
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 320, kickHeight: 0 }));
    expect(report.violations.find((v) => v.ruleId === 'toe-kick-height')).toBeUndefined();
  });

  it(`kick ${ISO7171_TOE_KICK.min} mm passes`, () => {
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580, kickHeight: ISO7171_TOE_KICK.min }));
    expect(report.violations.find((v) => v.ruleId === 'toe-kick-height')).toBeUndefined();
  });

  it('kick 50 mm fails toe-kick-height rule', () => {
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580, kickHeight: 50 }));
    const v = report.violations.find((v) => v.ruleId === 'toe-kick-height');
    expect(v?.level).toBe('fail');
  });

  it('kick 200 mm fails toe-kick-height rule', () => {
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580, kickHeight: 200 }));
    const v = report.violations.find((v) => v.ruleId === 'toe-kick-height');
    expect(v?.level).toBe('fail');
  });
});

// ─── shelf-spacing-min ────────────────────────────────────────────────────────

describe('shelf-spacing-min rule', () => {
  it('zero shelves skips check', () => {
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580, shelfCount: 0 }));
    expect(report.violations.find((v) => v.ruleId === 'shelf-spacing-min')).toBeUndefined();
  });

  it('too many shelves in short cabinet fails shelf-spacing-min', () => {
    // height=400, kick=100 → internal=300; 10 shelves → gap ~27mm < 150
    const report = validateIso7171(cfg({ width: 600, height: 400, depth: 580, shelfCount: 10, kickHeight: 100 }));
    const v = report.violations.find((v) => v.ruleId === 'shelf-spacing-min');
    expect(v?.level).toBe('fail');
  });

  it(`${ISO7171_MIN_SHELF_GAP} mm average gap passes`, () => {
    // height=720, kick=100 → internal=620; 3 shelves → gap ~155mm
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580, shelfCount: 3, kickHeight: 100 }));
    expect(report.violations.find((v) => v.ruleId === 'shelf-spacing-min')).toBeUndefined();
  });
});

// ─── shelf-count-base ─────────────────────────────────────────────────────────

describe('shelf-count-base rule', () => {
  it('5 shelves in base cabinet generates advisory', () => {
    const report = validateIso7171(cfg({ width: 600, height: 800, depth: 580, shelfCount: 5 }));
    const v = report.violations.find((v) => v.ruleId === 'shelf-count-base');
    expect(v?.level).toBe('advisory');
  });

  it('4 shelves in base cabinet passes', () => {
    const report = validateIso7171(cfg({ width: 600, height: 800, depth: 580, shelfCount: 4 }));
    expect(report.violations.find((v) => v.ruleId === 'shelf-count-base')).toBeUndefined();
  });
});

// ─── shelf-count-tall ─────────────────────────────────────────────────────────

describe('shelf-count-tall rule', () => {
  it('7 shelves in tall (2000 mm) cabinet generates advisory', () => {
    const report = validateIso7171(cfg({ width: 600, height: 2000, depth: 580, shelfCount: 7 }));
    const v = report.violations.find((v) => v.ruleId === 'shelf-count-tall');
    expect(v?.level).toBe('advisory');
  });
});

// ─── drawer-clearance ─────────────────────────────────────────────────────────

describe('drawer-clearance rule', () => {
  it('no drawers skips check', () => {
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580, drawerCount: 0 }));
    expect(report.violations.find((v) => v.ruleId === 'drawer-clearance')).toBeUndefined();
  });

  it('3 drawers in 400 mm height fails drawer-clearance', () => {
    // required = 3 × 160 = 480 mm, but height = 400
    const report = validateIso7171(cfg({ width: 600, height: 400, depth: 580, drawerCount: 3 }));
    const v = report.violations.find((v) => v.ruleId === 'drawer-clearance');
    expect(v?.level).toBe('fail');
    expect(v?.actual).toBe(400);
  });

  it(`drawer clearance: 1 drawer in ${ISO7171_DRAWER_HEIGHT * 2} mm cabinet passes`, () => {
    const report = validateIso7171(cfg({ width: 600, height: ISO7171_DRAWER_HEIGHT * 2, depth: 580, drawerCount: 1 }));
    expect(report.violations.find((v) => v.ruleId === 'drawer-clearance')).toBeUndefined();
  });
});

// ─── width-height-ratio ───────────────────────────────────────────────────────

describe('width-height-ratio rule', () => {
  it(`ratio above ${ISO7171_MAX_WIDTH_HEIGHT_RATIO} generates advisory`, () => {
    // width=1500, height=500 → ratio=3.0
    const report = validateIso7171(cfg({ width: 1500, height: 500, depth: 580 }));
    const v = report.violations.find((v) => v.ruleId === 'width-height-ratio');
    expect(v?.level).toBe('advisory');
  });

  it('ratio at or below limit passes', () => {
    // width=600, height=720 → ratio=0.83
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580 }));
    expect(report.violations.find((v) => v.ruleId === 'width-height-ratio')).toBeUndefined();
  });
});

// ─── report helpers ───────────────────────────────────────────────────────────

describe('formatIso7171Report', () => {
  it('returns "No violations found" for clean config', () => {
    const report = validateIso7171(compliantBase());
    const text = formatIso7171Report(report);
    expect(text).toContain('No violations');
  });

  it('includes [FAIL] tag for fail violations', () => {
    // kick 50 mm is a fail
    const report = validateIso7171(cfg({ width: 600, height: 720, depth: 580, kickHeight: 50 }));
    const text = formatIso7171Report(report);
    expect(text).toContain('[FAIL]');
  });

  it('includes [ADVISORY] tag for advisory violations', () => {
    // non-standard width 550 mm
    const report = validateIso7171(cfg({ width: 550, height: 720, depth: 580, kickHeight: 100 }));
    const text = formatIso7171Report(report);
    expect(text).toContain('[ADVISORY]');
  });
});

describe('filterViolations', () => {
  it('filters to only fail violations', () => {
    const report = validateIso7171(cfg({ width: 600, height: 650, depth: 580, kickHeight: 50 }));
    const fails = filterViolations(report, 'fail');
    expect(fails.every((v) => v.level === 'fail')).toBe(true);
  });

  it('returns empty array when no violations match level', () => {
    const report = validateIso7171(compliantBase());
    expect(filterViolations(report, 'fail')).toHaveLength(0);
  });
});

describe('validateIso7171 summary', () => {
  it('summary says "Fully ISO 7171 compliant" for clean config', () => {
    const report = validateIso7171(compliantBase());
    expect(report.summary).toContain('Fully ISO 7171 compliant');
  });

  it('summary includes failure count for non-compliant', () => {
    const report = validateIso7171(cfg({ width: 600, height: 650, depth: 580, kickHeight: 50 }));
    expect(report.summary).toMatch(/\d+ ISO 7171 failure/);
  });
});
