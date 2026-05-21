/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected at build time by vite.config.ts — matches package.json `version`. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Phase 12 / Sprint 14 — set to 'true' to enable the WebGL 3D preview canvas. */
  readonly VITE_ENABLE_WEBGL?: string;
  /** Phase 12 / Sprint 15 — Cloudflare Web Analytics beacon token (injected at build time). */
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
}
