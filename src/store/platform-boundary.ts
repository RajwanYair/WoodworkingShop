/**
 * Store-facing platform boundary.
 * Feature modules may import this file. They must not import `src/platform/`.
 */
export { downloadBlob, downloadContent, downloadPng, downloadSvg } from '../platform/files/index';
export { copyText, shareLink } from '../platform/share/index';
export { browserLocalStorage } from '../platform/storage/index';
export { isWebGLAvailable, probeWebGLTier } from '../platform/device/index';
