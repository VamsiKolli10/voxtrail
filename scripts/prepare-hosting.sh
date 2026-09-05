#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${REPO_ROOT}/travel-app-fe/dist"
HOSTING_DIR="${REPO_ROOT}/travel-app-be/public"

if [[ ! -f "${BUILD_DIR}/index.html" ]]; then
  echo "Frontend build is missing. Run: npm run build" >&2
  exit 1
fi

# Vite content-hashes filenames, so a plain overlay copy never removes the
# previous deploy's chunks -- they accumulate in travel-app-be/public forever
# and Firebase Hosting ends up serving every historical build's JS/CSS.
# public/ is fully build-generated (see travel-app-be/.gitignore), so it is
# safe to clear before copying the fresh build in.
rm -rf "${HOSTING_DIR}"
mkdir -p "${HOSTING_DIR}"
cp -R "${BUILD_DIR}/." "${HOSTING_DIR}/"
echo "Prepared Firebase Hosting assets from travel-app-fe/dist."
