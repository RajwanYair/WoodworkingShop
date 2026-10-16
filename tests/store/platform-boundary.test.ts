import { describe, expect, it } from 'vitest';
import { downloadBlob, downloadContent, downloadPng, downloadSvg } from '../../src/platform/files/index';
import { copyText, getBrowserHref, setBrowserQueryParam, shareLink } from '../../src/platform/share/index';
import { browserLocalStorage } from '../../src/platform/storage/index';
import {
  getWebGL2MaxTextureSize,
  isWebGLAvailable,
  isWebGPUSupported,
  probeWebGLTier,
} from '../../src/platform/device/index';
import {
  browserSessionStorage,
  cancelBrowserAnimationFrame,
  confirmBrowserAction,
  dispatchBrowserEvent,
  isMediaQueryMatched,
  isTouchPrimaryInput,
  listenToBrowserEvent,
  listenToKeyboardEvents,
  listenToMediaQuery,
  openPrintDocument,
  printBrowserDocument,
  requestBrowserAnimationFrame,
  reloadBrowserDocument,
  setBrowserDocumentTitle,
} from '../../src/platform/browser/index';
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
    expect(boundary.getWebGL2MaxTextureSize).toBe(getWebGL2MaxTextureSize);
    expect(boundary.isWebGPUSupported).toBe(isWebGPUSupported);
    expect(boundary.probeWebGLTier).toBe(probeWebGLTier);
    expect(boundary.browserSessionStorage).toBe(browserSessionStorage);
    expect(boundary.cancelBrowserAnimationFrame).toBe(cancelBrowserAnimationFrame);
    expect(boundary.confirmBrowserAction).toBe(confirmBrowserAction);
    expect(boundary.dispatchBrowserEvent).toBe(dispatchBrowserEvent);
    expect(boundary.getBrowserHref).toBe(getBrowserHref);
    expect(boundary.isMediaQueryMatched).toBe(isMediaQueryMatched);
    expect(boundary.isTouchPrimaryInput).toBe(isTouchPrimaryInput);
    expect(boundary.listenToBrowserEvent).toBe(listenToBrowserEvent);
    expect(boundary.listenToKeyboardEvents).toBe(listenToKeyboardEvents);
    expect(boundary.listenToMediaQuery).toBe(listenToMediaQuery);
    expect(boundary.openPrintDocument).toBe(openPrintDocument);
    expect(boundary.printBrowserDocument).toBe(printBrowserDocument);
    expect(boundary.requestBrowserAnimationFrame).toBe(requestBrowserAnimationFrame);
    expect(boundary.reloadBrowserDocument).toBe(reloadBrowserDocument);
    expect(boundary.setBrowserDocumentTitle).toBe(setBrowserDocumentTitle);
    expect(boundary.setBrowserQueryParam).toBe(setBrowserQueryParam);
  });
});
