#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS=()

cleanup() {
  trap - EXIT INT TERM
  if ((${#PIDS[@]})); then
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -d "${REPO_ROOT}/travel-app-fe/node_modules" || ! -d "${REPO_ROOT}/travel-app-be/node_modules" ]]; then
  echo "Dependencies are missing. Run: npm run install:all" >&2
  exit 1
fi

(cd "${REPO_ROOT}/travel-app-be" && npm run dev) &
PIDS+=("$!")
(cd "${REPO_ROOT}/travel-app-fe" && npm run dev) &
PIDS+=("$!")

echo "VoxTrail development servers started (frontend: http://localhost:5173, API: http://localhost:8000)."

# Bash 3.2 (the default macOS Bash) does not provide `wait -n`. Poll both
# processes instead so the first server failure still shuts down the other.
while true; do
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "${pid}" 2>/dev/null; then
      exit 1
    fi
  done
  sleep 1
done
