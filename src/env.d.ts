/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected at build time by vite.config.ts — matches package.json `version`. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Phase 12 / Sprint 14 — set to 'true' to enable the WebGL 3D preview canvas. */
  readonly VITE_ENABLE_WEBGL?: string;
  /** Phase 12 / Sprint 15 — Cloudflare Web Analytics beacon token (injected at build time). */
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
  /** Sprint 150 — Cloudflare Worker endpoint for privacy-first error reports. */
  readonly VITE_ERROR_ENDPOINT?: string;
}

// ── Phase 13 / Sprint 7 — File Handling API (not yet in TypeScript standard lib) ──

/** A file handle provided to the app via the File Handling API's launchQueue. */
interface FileSystemFileHandle {
  getFile(): Promise<File>;
}

/** Incoming launch parameters from the File Handling API. */
interface LaunchParams {
  readonly files: FileSystemFileHandle[];
  readonly targetURL?: string;
}

/** Callback for launchQueue.setConsumer. */
type LaunchConsumer = (params: LaunchParams) => void | Promise<void>;

/** The window.launchQueue object exposed by browsers that support the File Handling API. */
interface LaunchQueue {
  setConsumer(consumer: LaunchConsumer): void;
}

interface Window {
  readonly launchQueue?: LaunchQueue;
}
