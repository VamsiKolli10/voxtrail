#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${REPO_ROOT}/travel-app-fe/dist"
HOSTING_DIR="${REPO_ROOT}/travel-app-be/public"

if [[ ! -f "${BUILD_DIR}/index.html" ]]; then
  echo "Frontend build is missing. Run: npm run build" >&2
  exit 1
fi

mkdir -p "${HOSTING_DIR}"
cp -R "${BUILD_DIR}/." "${HOSTING_DIR}/"
echo "Prepared Firebase Hosting assets from travel-app-fe/dist."
