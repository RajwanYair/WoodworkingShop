import { describe, expect, it } from 'vitest';
import { downloadBlob, downloadContent, downloadPng, downloadSvg } from '../../src/platform/files/index';
import { copyText, shareLink } from '../../src/platform/share/index';
import { browserLocalStorage } from '../../src/platform/storage/index';
import { isWebGLAvailable, probeWebGLTier } from '../../src/platform/device/index';
import * as boundary from '../../src/store/platform-boundary';

describe('platform boundary', () => {
  it('re-exports the platform functions feature code is allowed to call', () => {
    expect(boundary.downloadBlob).toBe(downloadBlob);
    expect(boundary.downloadContent).toBe(downloadContent);
    expect(boundary.downloadPng).toBe(downloadPng);
    expect(boundary.downloadSvg).toBe(downloadSvg);
    expect(boundary.copyText).toBe(copyText);
    expect(boundary.shareLink).toBe(shareLink);
    expect(boundary.browserLocalStorage).toBe(browserLocalStorage);
    expect(boundary.isWebGLAvailable).toBe(isWebGLAvailable);
    expect(boundary.probeWebGLTier).toBe(probeWebGLTier);
  });
});
