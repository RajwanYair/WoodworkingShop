import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, shareLink } from '../../../src/platform/share/share';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('platform share', () => {
  it('uses native sharing first and falls back to clipboard when dismissed', async () => {
    const share = vi.fn().mockRejectedValue(new Error('dismissed'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: { writeText } });

    await expect(shareLink('Plan', 'https://example.test')).resolves.toBe('copied');
    expect(share).toHaveBeenCalledWith({ title: 'Plan', url: 'https://example.test' });
    expect(writeText).toHaveBeenCalledWith('https://example.test');
  });

  it('returns failure when clipboard access is unavailable', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });

    await expect(copyText('diagnostic details')).resolves.toBe(false);
    await expect(shareLink('Plan', 'https://example.test')).resolves.toBe('failed');
  });
});
