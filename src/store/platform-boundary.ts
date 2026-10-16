/**
 * Store-facing platform boundary.
 * Feature modules may import this file. They must not import `src/platform/`.
 */
export { downloadBlob, downloadContent, downloadPng, downloadSvg } from '../platform/files/index';
export { copyText, shareLink } from '../platform/share/index';
export { getBrowserHref, setBrowserQueryParam } from '../platform/share/index';
export { browserLocalStorage } from '../platform/storage/index';
export { getWebGL2MaxTextureSize, isWebGLAvailable, isWebGPUSupported, probeWebGLTier } from '../platform/device/index';
export {
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
} from '../platform/browser/index';
