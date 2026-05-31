#!/usr/bin/env bash
set -euo pipefail

echo "[hook] Running quality gate..."
export NPM_CONFIG_CACHE="${TMPDIR:-/tmp}/WoodworkingShop/npm-cache"
mkdir -p "${NPM_CONFIG_CACHE}"

npm run quality:fast

echo "[hook] Running unit tests..."
npm run test

echo "[hook] Pre-commit checks passed."
