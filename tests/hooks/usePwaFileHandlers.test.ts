/**
 * Tests for Phase 13 / Sprint 7 — PWA File Handling API
 * Covers parseCabinetPlanFile() (pure function, no DOM required).
 */
import { describe, it, expect } from 'vitest';
import { parseCabinetPlanFile } from '../../src/hooks/usePwaFileHandlers';

const VALID_PROJECT = JSON.stringify({
  id: 'proj-test',
  name: 'My Kitchen',
  savedAt: '2025-01-01T00:00:00.000Z',
  schemaVersion: '1.0',
  cabinets: [],
});

describe('parseCabinetPlanFile — Phase 13 Sprint 7', () => {
  it('returns a SavedProject for valid JSON', () => {
    const result = parseCabinetPlanFile(VALID_PROJECT);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('My Kitchen');
    expect(result?.id).toBe('proj-test');
  });

  it('returns an array-backed cabinets field', () => {
    const result = parseCabinetPlanFile(VALID_PROJECT);
    expect(Array.isArray(result?.cabinets)).toBe(true);
  });

  it('returns null for malformed JSON', () => {
    expect(parseCabinetPlanFile('not json {')).toBeNull();
  });

  it('returns null for JSON without cabinets array', () => {
    const badPayload = JSON.stringify({ id: 'x', name: 'Bad', savedAt: '2025-01-01T00:00:00Z' });
    expect(parseCabinetPlanFile(badPayload)).toBeNull();
  });

  it('returns null for non-object JSON (array)', () => {
    expect(parseCabinetPlanFile('[1, 2, 3]')).toBeNull();
  });

  it('returns null for non-object JSON (null)', () => {
    expect(parseCabinetPlanFile('null')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCabinetPlanFile('')).toBeNull();
  });

  it('auto-assigns an id when missing from payload', () => {
    const noId = JSON.stringify({ name: 'NoID', savedAt: '2025-01-01T00:00:00Z', cabinets: [] });
    const result = parseCabinetPlanFile(noId);
    expect(result?.id).toMatch(/^proj-\d+$/);
  });

  it('defaults name to Untitled when missing or empty', () => {
    const noName = JSON.stringify({ id: 'x', savedAt: '2025-01-01T00:00:00Z', cabinets: [] });
    const result = parseCabinetPlanFile(noName);
    expect(result?.name).toBe('Untitled');
  });

  it('preserves schemaVersion in the migrated project', () => {
    const result = parseCabinetPlanFile(VALID_PROJECT);
    expect(result?.schemaVersion).toBe('1.0');
  });
});
