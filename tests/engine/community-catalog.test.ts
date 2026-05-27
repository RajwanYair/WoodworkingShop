import { describe, it, expect } from 'vitest';
import {
  parseCommunityMaterial,
  validateCommunityCatalog,
  CATALOG_SCHEMA_VERSION,
} from '../../src/engine/community-catalog';

// ── fixtures ──────────────────────────────────────────────────────────────

const validRaw = {
  id: 'birch-ply-18mm',
  name: 'Baltic Birch Plywood 18mm',
  pricePerSqM: 35.5,
  currency: 'USD',
  thickness: 18,
  hasGrain: true,
  submittedAt: '2026-01-01T00:00:00.000Z',
  votes: 12,
};

// ── parseCommunityMaterial ────────────────────────────────────────────────

describe('parseCommunityMaterial — valid input', () => {
  it('returns a CommunityMaterial for a fully valid object', () => {
    const m = parseCommunityMaterial(validRaw);
    expect(m).not.toBeNull();
    expect(m!.id).toBe('birch-ply-18mm');
    expect(m!.pricePerSqM).toBe(35.5);
    expect(m!.votes).toBe(12);
  });

  it('includes optional supplier when present', () => {
    const m = parseCommunityMaterial({ ...validRaw, supplier: 'Baltic Wood Co.' });
    expect(m!.supplier).toBe('Baltic Wood Co.');
  });

  it('includes optional color when present', () => {
    const m = parseCommunityMaterial({ ...validRaw, color: '#FAEBCD' });
    expect(m!.color).toBe('#FAEBCD');
  });

  it('includes optional url when present', () => {
    const m = parseCommunityMaterial({ ...validRaw, url: 'https://example.com/sheet' });
    expect(m!.url).toBe('https://example.com/sheet');
  });

  it('does not include optional fields when absent', () => {
    const m = parseCommunityMaterial(validRaw);
    expect(m!.supplier).toBeUndefined();
    expect(m!.color).toBeUndefined();
    expect(m!.url).toBeUndefined();
  });
});

describe('parseCommunityMaterial — invalid / null inputs', () => {
  it.each([[null], [undefined], ['string'], [42], [[]]])('returns null for non-object primitive %o', (input) => {
    expect(parseCommunityMaterial(input)).toBeNull();
  });

  it.each([
    { raw: { ...validRaw, id: '' }, label: 'empty id' },
    { raw: { ...validRaw, id: '   ' }, label: 'whitespace id' },
    { raw: { ...validRaw, name: '' }, label: 'empty name' },
    { raw: { ...validRaw, pricePerSqM: -1 }, label: 'negative price' },
    { raw: { ...validRaw, pricePerSqM: 'cheap' }, label: 'non-numeric price' },
    { raw: { ...validRaw, thickness: 0 }, label: 'zero thickness' },
    { raw: { ...validRaw, thickness: -5 }, label: 'negative thickness' },
    { raw: { ...validRaw, currency: '' }, label: 'empty currency' },
    { raw: { ...validRaw, hasGrain: 'yes' }, label: 'non-boolean hasGrain' },
    { raw: { ...validRaw, submittedAt: 123 }, label: 'non-string submittedAt' },
    { raw: { ...validRaw, votes: -1 }, label: 'negative votes' },
    { raw: { ...validRaw, votes: 'many' }, label: 'non-numeric votes' },
  ])('returns null when field is invalid: $label', ({ raw }) => {
    expect(parseCommunityMaterial(raw)).toBeNull();
  });
});

// ── validateCommunityCatalog ──────────────────────────────────────────────

describe('validateCommunityCatalog — valid input', () => {
  it('validates a well-formed catalog with one material', () => {
    const catalog = validateCommunityCatalog({
      schemaVersion: CATALOG_SCHEMA_VERSION,
      generatedAt: '2026-01-01T00:00:00.000Z',
      materials: [validRaw],
    });
    expect(catalog).not.toBeNull();
    expect(catalog!.materials).toHaveLength(1);
    expect(catalog!.schemaVersion).toBe(CATALOG_SCHEMA_VERSION);
  });

  it('accepts an empty materials array', () => {
    const catalog = validateCommunityCatalog({
      schemaVersion: '1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      materials: [],
    });
    expect(catalog).not.toBeNull();
    expect(catalog!.materials).toHaveLength(0);
  });

  it('accepts multiple materials', () => {
    const catalog = validateCommunityCatalog({
      schemaVersion: '1.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      materials: [validRaw, { ...validRaw, id: 'oak-18mm', name: 'Oak Veneer' }],
    });
    expect(catalog!.materials).toHaveLength(2);
  });
});

describe('validateCommunityCatalog — invalid input', () => {
  it('returns null for null input', () => {
    expect(validateCommunityCatalog(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(validateCommunityCatalog('not an object')).toBeNull();
  });

  it('returns null when schemaVersion is missing', () => {
    expect(validateCommunityCatalog({ generatedAt: '2026-01-01T00:00:00.000Z', materials: [] })).toBeNull();
  });

  it('returns null when generatedAt is missing', () => {
    expect(validateCommunityCatalog({ schemaVersion: '1.0', materials: [] })).toBeNull();
  });

  it('returns null when materials is not an array', () => {
    expect(
      validateCommunityCatalog({ schemaVersion: '1.0', generatedAt: '2026-01-01T00:00:00.000Z', materials: null }),
    ).toBeNull();
  });

  it('returns null when any material entry fails validation', () => {
    expect(
      validateCommunityCatalog({
        schemaVersion: '1.0',
        generatedAt: '2026-01-01T00:00:00.000Z',
        materials: [validRaw, { ...validRaw, id: '' }],
      }),
    ).toBeNull();
  });
});
