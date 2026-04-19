#!/usr/bin/env bash
set -euo pipefail

npm test

rm -rf release
mkdir -p release/lister

timestamp="$(date +%Y%m%d-%H%M%S)"

cp -R dist release/lister/
cp -R openclaw release/lister/
cp package.json release/lister/
cp package-lock.json release/lister/
cp README.md release/lister/

(
  cd release
  if command -v zip >/dev/null 2>&1; then
    zip -r "${timestamp}-lister-openclaw-package.zip" lister
  else
    tar -czf "${timestamp}-lister-openclaw-package.tar.gz" lister
  fi
)
