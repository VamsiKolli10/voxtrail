#!/usr/bin/env bash
# Syncs values from a .env-style file into Firebase Functions secrets.
# Usage: ./scripts/set-firebase-secrets.sh [path/to/.env]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found at ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install via 'npm install -g firebase-tools'." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

# Allow supplying service account JSON via file envs.
if [[ -z "${SERVICE_ACCOUNT_CREDENTIALS:-}" ]]; then
  if [[ -n "${SERVICE_ACCOUNT_CREDENTIALS_FILE:-}" && -f "${SERVICE_ACCOUNT_CREDENTIALS_FILE}" ]]; then
    SERVICE_ACCOUNT_CREDENTIALS="$(<"${SERVICE_ACCOUNT_CREDENTIALS_FILE}")"
  elif [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" && -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]]; then
    SERVICE_ACCOUNT_CREDENTIALS="$(<"${GOOGLE_APPLICATION_CREDENTIALS}")"
  fi
fi

declare -a PROJECT_FLAG=()
if [[ -n "${FIREBASE_DEPLOY_PROJECT:-}" ]]; then
  PROJECT_FLAG+=(--project "${FIREBASE_DEPLOY_PROJECT}")
fi

SECRET_KEYS=(
  SERVICE_ACCOUNT_CREDENTIALS
  FBAPP_API_KEY
  FBAPP_AUTH_DOMAIN
  FBAPP_PROJECT_ID
  FBAPP_STORAGE_BUCKET
  FBAPP_MESSAGING_SENDER_ID
  FBAPP_APP_ID
  GOOGLE_PLACES_API_KEY
  OPENROUTER_API_KEY
  OPENROUTER_MODEL
  CORS_ALLOWED_ORIGINS
  OPENROUTER_MODEL_CHAIN
)

set_secret() {
  local secret_name="$1"
  local secret_value="$2"

  if [[ -z "${secret_value}" ]]; then
    echo "Skipping ${secret_name} (no value provided)."
    return
  fi

  printf "Setting %s..." "${secret_name}"
  cmd=(firebase functions:secrets:set "${secret_name}")
  if [[ "${#PROJECT_FLAG[@]}" -gt 0 ]]; then
    cmd+=("${PROJECT_FLAG[@]}")
  fi
  if printf "%s" "${secret_value}" | "${cmd[@]}" >/dev/null; then
    echo " done."
  else
    echo " failed." >&2
    exit 1
  fi
}

for key in "${SECRET_KEYS[@]}"; do
  set_secret "${key}" "${!key-}"
done

echo "Firebase secrets updated. Redeploy functions to use the latest versions."
