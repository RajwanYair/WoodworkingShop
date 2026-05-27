import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Sprint 148 — Subresource Integrity (SRI) plugin for production builds.
 * Adds `integrity="sha384-..."` and `crossorigin="anonymous"` to all
 * `<script>` and `<link rel="stylesheet">` tags referencing local assets.
 *
 * Only active in production builds (`vite build`). No effect in dev mode.
 */
export function sriPlugin(): Plugin {
  return {
    name: 'vite-plugin-sri',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;

        const outputDir = ctx.path ? dirname(resolve('dist', ctx.path.slice(1))) : resolve('dist');

        return html.replace(
          /(<(?:script|link)[^>]*(?:src|href)="([^"]+)"[^>/]*)(\/?>)/g,
          (match, prefix: string, assetPath: string, suffix: string) => {
            // Skip external URLs and data URIs
            if (assetPath.startsWith('http') || assetPath.startsWith('data:')) return match;
            // Skip if integrity already present
            if (prefix.includes('integrity')) return match;

            // Resolve asset path relative to dist/
            const basePath = '/WoodworkingShop/';
            const relativePath = assetPath.startsWith(basePath)
              ? assetPath.slice(basePath.length)
              : assetPath.startsWith('/')
                ? assetPath.slice(1)
                : assetPath;

            try {
              const filePath = resolve(outputDir, '..', relativePath);
              const content = readFileSync(filePath);
              const hash = createHash('sha384').update(content).digest('base64');
              const integrity = `sha384-${hash}`;

              // Add crossorigin and integrity attributes
              const crossorigin = prefix.includes('crossorigin') ? '' : ' crossorigin="anonymous"';
              return `${prefix} integrity="${integrity}"${crossorigin}${suffix}`;
            } catch {
              // File not found in bundle — skip (e.g. manifest.json, external resources)
              return match;
            }
          },
        );
      },
    },
  };
}
