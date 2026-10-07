const JAVASCRIPT_FILE_PATTERN = /\.(?:js|mjs)$/i;

export function getInitialRouteFiles(manifest, entryKey = 'index.html') {
  if (!manifest[entryKey]) {
    throw new Error(`Bundle manifest is missing entry "${entryKey}".`);
  }

  const visited = new Set();
  const javascript = new Set();
  const stylesheets = new Set();
  const assets = new Set();

  function visit(key) {
    if (visited.has(key)) return;

    const chunk = manifest[key];
    if (!chunk) {
      throw new Error(`Bundle manifest import "${key}" is missing.`);
    }

    visited.add(key);
    if (chunk.file && JAVASCRIPT_FILE_PATTERN.test(chunk.file)) javascript.add(chunk.file);
    for (const stylesheet of chunk.css ?? []) stylesheets.add(stylesheet);
    for (const asset of chunk.assets ?? []) {
      if (!/\.worker-[^/]+\.js$/i.test(asset)) assets.add(asset);
    }
    for (const importedKey of chunk.imports ?? []) visit(importedKey);
  }

  visit(entryKey);

  return {
    javascript: [...javascript],
    stylesheets: [...stylesheets],
    assets: [...assets],
  };
}
