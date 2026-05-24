import { describe, it, expect } from 'vitest';
import { sha256Hex, appendChecksumToDxf, appendChecksumToGcode } from '../../src/utils/checksum';

// ── Phase 13 / Sprint 19 — Export integrity checksums ─────────────────────
describe('sha256Hex', () => {
  it('returns a 64-character lowercase hex string', async () => {
    const hash = await sha256Hex('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input produces same hash', async () => {
    const a = await sha256Hex('cabinet-planner');
    const b = await sha256Hex('cabinet-planner');
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', async () => {
    const a = await sha256Hex('foo');
    const b = await sha256Hex('bar');
    expect(a).not.toBe(b);
  });

  it('produces the known SHA-256 hash of the empty string', async () => {
    // SHA-256('') = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const hash = await sha256Hex('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('appendChecksumToDxf', () => {
  const simpleDxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF';

  it('inserts a SHA-256 comment before 0\\nEOF', async () => {
    const result = await appendChecksumToDxf(simpleDxf);
    expect(result).toContain('; SHA-256:');
    expect(result).toMatch(/999\n; SHA-256: [0-9a-f]{64}\n0\nEOF$/);
  });

  it('SHA-256 value is the hash of the original DXF body', async () => {
    const result = await appendChecksumToDxf(simpleDxf);
    const hashInFile = result.match(/; SHA-256: ([0-9a-f]{64})/)?.[1] ?? '';
    const expected = await sha256Hex(simpleDxf);
    expect(hashInFile).toBe(expected);
  });

  it('still ends with 0\\nEOF after appending checksum', async () => {
    const result = await appendChecksumToDxf(simpleDxf);
    expect(result.endsWith('0\nEOF')).toBe(true);
  });

  it('does not alter content before the hash line', async () => {
    const result = await appendChecksumToDxf(simpleDxf);
    // Everything before the hash comment line should be identical to the original
    const beforeHash = result.split('\n999\n')[0];
    expect(simpleDxf.startsWith(beforeHash!)).toBe(true);
  });
});

describe('appendChecksumToGcode', () => {
  const simpleGcode = '; G-code\nG21\nG90\nM2 ; end';

  it('appends a SHA-256 comment line at the end', async () => {
    const result = await appendChecksumToGcode(simpleGcode);
    expect(result).toContain('; SHA-256:');
    expect(result).toMatch(/; SHA-256: [0-9a-f]{64}$/);
  });

  it('SHA-256 value is the hash of the original G-code body', async () => {
    const result = await appendChecksumToGcode(simpleGcode);
    const hashInFile = result.match(/; SHA-256: ([0-9a-f]{64})/)?.[1] ?? '';
    const expected = await sha256Hex(simpleGcode);
    expect(hashInFile).toBe(expected);
  });

  it('original content is preserved before the checksum line', async () => {
    const result = await appendChecksumToGcode(simpleGcode);
    const lines = result.split('\n');
    const checksumLineIdx = lines.findIndex((l) => l.startsWith('; SHA-256:'));
    const original = lines.slice(0, checksumLineIdx).join('\n');
    expect(original).toBe(simpleGcode);
  });
});
