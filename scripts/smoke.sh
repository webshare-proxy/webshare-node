#!/usr/bin/env bash
# Packs the library and installs the tarball into two tiny consumer projects
# (ESM + TypeScript, and CJS) to verify the published package shape.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

TARBALL="$PWD/$(npm pack --silent | tail -n 1)"
trap 'rm -f "$TARBALL"' EXIT

for dir in smoke/esm smoke/cjs; do
  rm -rf "$dir/node_modules" "$dir/package-lock.json"
  (cd "$dir" && npm install --no-save --no-audit --no-fund "$TARBALL")
done

echo "--- esm smoke (tsc --strict + run) ---"
(cd smoke/esm && rm -rf dist && npx tsc -p tsconfig.json && node dist/index.js)

echo "--- cjs smoke ---"
(cd smoke/cjs && node index.cjs)

echo "smoke tests passed"
