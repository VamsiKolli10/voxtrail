#!/usr/bin/env bash
# Builds the React frontend, syncs it into the Firebase Hosting directory, and
# deploys Hosting plus the single active backend Functions codebase.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/firebase-deploy.sh [options]

Automates the Firebase deployment for the VoxTrail stack by:
  1. Running pre-deployment checks
  2. Building the Vite frontend (travel-app-fe)
  3. Verifying build artifacts
  4. Copying the build artifacts into travel-app-be/public
  5. Running firebase deploy (hosting + backend functions)
  6. Verifying deployment

Options:
  -p, --project <id>      Override the Firebase project ID passed to the CLI.
      --skip-frontend     Reuse the existing travel-app-fe/dist folder instead of
                         running npm run build.
      --skip-tests        Skip running tests before deployment.
      --skip-backend-test Skip backend tests (only run frontend tests).
      --skip-checks       Skip all pre-deployment checks (Firebase login, etc.).
      --skip-deps         Skip dependency installation checks.
      --force             Skip confirmation prompts (useful for CI/CD).
      --dry-run           Show what would be deployed without actually deploying.
      --verbose           Enable verbose output for debugging.
  -h, --help              Show this message.

You can also set FIREBASE_DEPLOY_PROJECT or rely on the .firebaserc default.
EOF
}

PROJECT_ID="${FIREBASE_DEPLOY_PROJECT:-}"
SKIP_FRONTEND_BUILD=0
SKIP_TESTS=0
SKIP_BACKEND_TEST=0
SKIP_CHECKS=0
SKIP_DEPS=0
FORCE=0
DRY_RUN=0
VERBOSE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project)
      if [[ $# -lt 2 ]]; then
        echo "Missing project ID after $1" >&2
        exit 1
      fi
      PROJECT_ID="$2"
      shift 2
      ;;
    --skip-frontend)
      SKIP_FRONTEND_BUILD=1
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    --skip-backend-test)
      SKIP_BACKEND_TEST=1
      shift
      ;;
    --skip-checks)
      SKIP_CHECKS=1
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=1
      shift
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --verbose)
      VERBOSE=1
      set -x
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/travel-app-fe"
BACKEND_DIR="${REPO_ROOT}/travel-app-be"
HOSTING_DIR="${BACKEND_DIR}/public"
FRONTEND_BUILD_DIR="${FRONTEND_DIR}/dist"

# Logging helpers
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

log_error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ ERROR: $*" >&2
}

log_warn() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: $*" >&2
}

log_success() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $*"
}

log_info() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $*"
}

log_step() {
  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Timing helper
START_TIME=$(date +%s)
get_elapsed_time() {
  local end_time=$(date +%s)
  local elapsed=$((end_time - START_TIME))
  local minutes=$((elapsed / 60))
  local seconds=$((elapsed % 60))
  if [[ ${minutes} -gt 0 ]]; then
    echo "${minutes}m ${seconds}s"
  else
    echo "${seconds}s"
  fi
}

# Check for required commands
check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_error "$1 is required but was not found in PATH."
    if [[ "$1" == "firebase" ]]; then
      log_error "Install via: npm install -g firebase-tools@15.28.2"
    fi
    exit 1
  fi
}

check_command npm
check_command node
check_command firebase

# Check Firebase CLI version (require the pinned production major)
FIREBASE_VERSION=$(firebase --version 2>/dev/null | head -1 || echo "unknown")
if [[ "${FIREBASE_VERSION}" != "unknown" ]]; then
  if [[ "${FIREBASE_VERSION}" != "15.28.2" ]]; then
    log_error "Firebase CLI ${FIREBASE_VERSION} detected; install firebase-tools@15.28.2."
    exit 1
  fi
  if [[ ${VERBOSE} -eq 1 ]]; then
    log_info "Firebase CLI version: ${FIREBASE_VERSION}"
  fi
fi

# Get Firebase project ID from .firebaserc
get_firebase_project() {
  local firebaserc_file="${BACKEND_DIR}/.firebaserc"
  if [[ -f "${firebaserc_file}" ]]; then
    if command -v jq >/dev/null 2>&1; then
      jq -r '.projects.default // empty' "${firebaserc_file}" 2>/dev/null || echo ""
    else
      # Fallback: use grep/sed (less reliable but works without jq)
      grep -o '"default"[[:space:]]*:[[:space:]]*"[^"]*"' "${firebaserc_file}" 2>/dev/null | \
        sed -n 's/.*"default"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || echo ""
    fi
  else
    echo ""
  fi
}

# Pre-deployment checks
if [[ ${SKIP_CHECKS} -eq 0 ]]; then
  log_step "[0/7] Running pre-deployment checks..."
  
  # Check Firebase login
  if ! firebase projects:list >/dev/null 2>&1; then
    log_error "Not logged into Firebase. Run 'firebase login' first."
    exit 1
  fi
  log_success "Firebase authentication verified"
  
  # Determine project ID
  if [[ -z "${PROJECT_ID}" ]]; then
    PROJECT_ID=$(get_firebase_project)
    if [[ -z "${PROJECT_ID}" ]]; then
      # Try firebase use command as fallback
      FIREBASE_USE_OUTPUT=$(firebase use 2>/dev/null || echo "")
      if [[ -n "${FIREBASE_USE_OUTPUT}" ]]; then
        PROJECT_ID=$(echo "${FIREBASE_USE_OUTPUT}" | sed -n 's/.*(\([^)]*\)).*/\1/p' | head -1)
      fi
    fi
  fi
  
  if [[ -n "${PROJECT_ID}" ]]; then
    log_info "Firebase project: ${PROJECT_ID}"
  else
    log_warn "Could not determine Firebase project ID. Using default from firebase use."
  fi
  
  # Check for uncommitted changes (warn only, unless in CI)
  if [[ -z "${CI:-}" ]] && command -v git >/dev/null 2>&1; then
    if [[ -d "${REPO_ROOT}/.git" ]]; then
      UNCOMMITTED=$(git -C "${REPO_ROOT}" status --porcelain 2>/dev/null || echo "")
      if [[ -n "${UNCOMMITTED}" ]]; then
        log_warn "Uncommitted changes detected in repository."
        if [[ ${VERBOSE} -eq 1 ]]; then
          echo "${UNCOMMITTED}" | head -5
          if [[ $(echo "${UNCOMMITTED}" | wc -l) -gt 5 ]]; then
            echo "... and more"
          fi
        fi
        if [[ ${FORCE} -eq 0 ]]; then
          read -p "Continue with deployment? (y/N) " -n 1 -r
          echo
          if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled."
            exit 1
          fi
        fi
      else
        log_success "Repository is clean"
      fi
    fi
  fi
  
  # Check Node.js version
  NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  NODE_FULL=$(node --version)
  if [[ ${NODE_VERSION} -ne 22 ]]; then
    log_error "Node.js version is ${NODE_FULL}. VoxTrail deployments require Node.js 22."
    exit 1
  else
    log_success "Node.js version: ${NODE_FULL}"
  fi
  
  # Check npm version
  NPM_VERSION=$(npm --version)
  log_info "npm version: ${NPM_VERSION}"
  
  # Check directory structure
  if [[ ! -d "${FRONTEND_DIR}" ]]; then
    log_error "Frontend directory not found: ${FRONTEND_DIR}"
    exit 1
  fi
  
  if [[ ! -d "${BACKEND_DIR}" ]]; then
    log_error "Backend directory not found: ${BACKEND_DIR}"
    exit 1
  fi
  
  log_success "Directory structure verified"
  
  # Check for required files
  if [[ ! -f "${BACKEND_DIR}/firebase.json" ]]; then
    log_error "firebase.json not found in ${BACKEND_DIR}"
    exit 1
  fi
  
  log_success "Pre-deployment checks passed"
else
  log_step "[0/7] Skipping pre-deployment checks (per flag)"
fi

# Check dependencies
if [[ ${SKIP_DEPS} -eq 0 ]]; then
  log_step "[1/7] Checking dependencies..."
  
  # Check frontend dependencies
  if [[ ! -d "${FRONTEND_DIR}/node_modules" ]]; then
    log_warn "Frontend node_modules not found. Installing dependencies..."
    if ! (cd "${FRONTEND_DIR}" && npm ci); then
      log_error "Failed to install frontend dependencies."
      exit 1
    fi
    log_success "Frontend dependencies installed"
  else
    log_success "Frontend dependencies found"
  fi
  
  # Check backend dependencies
  if [[ ! -d "${BACKEND_DIR}/node_modules" ]]; then
    log_warn "Backend node_modules not found. Installing dependencies..."
    if ! (cd "${BACKEND_DIR}" && npm ci); then
      log_error "Failed to install backend dependencies."
      exit 1
    fi
    log_success "Backend dependencies installed"
  else
    log_success "Backend dependencies found"
  fi
else
  log_step "[1/7] Skipping dependency checks (per flag)"
fi

# Run tests (optional)
if [[ ${SKIP_TESTS} -eq 0 ]]; then
  log_step "[2/7] Running tests..."
  
  # Frontend tests
  if [[ -f "${FRONTEND_DIR}/package.json" ]] && grep -q '"test"' "${FRONTEND_DIR}/package.json"; then
    log_info "Running frontend tests..."
    if (cd "${FRONTEND_DIR}" && npm test -- --run 2>&1); then
      log_success "Frontend tests passed"
    else
      log_warn "Frontend tests failed or not configured."
      if [[ -n "${CI:-}" ]]; then
        log_error "Frontend tests are required in CI; refusing deployment."
        exit 1
      fi
      if [[ ${FORCE} -eq 0 ]] && [[ -z "${CI:-}" ]]; then
        read -p "Continue with deployment anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
          log "Deployment cancelled."
          exit 1
        fi
      fi
    fi
  else
    log_info "Frontend tests not configured, skipping"
  fi
  
  # Backend tests
  if [[ ${SKIP_BACKEND_TEST} -eq 0 ]]; then
    if [[ -f "${BACKEND_DIR}/package.json" ]] && grep -q '"test"' "${BACKEND_DIR}/package.json"; then
      log_info "Running backend tests..."
      if (cd "${BACKEND_DIR}" && npm test 2>&1); then
        log_success "Backend tests passed"
      else
        log_warn "Backend tests failed or not configured."
        if [[ -n "${CI:-}" ]]; then
          log_error "Backend tests are required in CI; refusing deployment."
          exit 1
        fi
        if [[ ${FORCE} -eq 0 ]] && [[ -z "${CI:-}" ]]; then
          read -p "Continue with deployment anyway? (y/N) " -n 1 -r
          echo
          if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled."
            exit 1
          fi
        fi
      fi
    else
      log_info "Backend tests not configured, skipping"
    fi
  else
    log_info "Skipping backend tests (per flag)"
  fi
else
  log_step "[2/7] Skipping tests (per flag)"
fi

# Build frontend
if [[ ${SKIP_FRONTEND_BUILD} -eq 0 ]]; then
  log_step "[3/7] Building frontend..."
  BUILD_START=$(date +%s)
  
  if ! (cd "${FRONTEND_DIR}" && npm run build); then
    log_error "Frontend build failed."
    exit 1
  fi
  
  BUILD_END=$(date +%s)
  BUILD_DURATION=$((BUILD_END - BUILD_START))
  log_success "Frontend build completed in ${BUILD_DURATION}s"
else
  log_step "[3/7] Skipping frontend build (per flag)"
fi

# Verify build artifacts
log_step "[4/7] Verifying build artifacts..."
if [[ ! -d "${FRONTEND_BUILD_DIR}" ]]; then
  log_error "Frontend build output not found at ${FRONTEND_BUILD_DIR}."
  log_error "Make sure the build step succeeded or rerun without --skip-frontend."
  exit 1
fi

# Check for critical files
CRITICAL_FILES=("index.html")
MISSING_FILES=()

for file in "${CRITICAL_FILES[@]}"; do
  if [[ ! -f "${FRONTEND_BUILD_DIR}/${file}" ]]; then
    MISSING_FILES+=("${file}")
  fi
done

if [[ ${#MISSING_FILES[@]} -gt 0 ]]; then
  log_error "Build appears to have failed. Missing files: ${MISSING_FILES[*]}"
  exit 1
fi

# Check build size (sanity check - warn if suspiciously small)
BUILD_SIZE=$(du -sm "${FRONTEND_BUILD_DIR}" 2>/dev/null | cut -f1 || echo "0")
BUILD_SIZE_BYTES=$(du -sb "${FRONTEND_BUILD_DIR}" 2>/dev/null | cut -f1 || echo "0")

if [[ ${BUILD_SIZE} -lt 1 ]]; then
  log_warn "Build size is suspiciously small (${BUILD_SIZE}MB / ${BUILD_SIZE_BYTES} bytes)."
  if [[ ${FORCE} -eq 0 ]] && [[ -z "${CI:-}" ]]; then
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log "Deployment cancelled."
      exit 1
    fi
  fi
fi

# Count files in build
FILE_COUNT=$(find "${FRONTEND_BUILD_DIR}" -type f | wc -l | tr -d ' ')
log_success "Build artifacts verified"
log_info "Build size: ${BUILD_SIZE}MB (${FILE_COUNT} files)"

# Sync to hosting directory
log_step "[5/7] Syncing frontend build to hosting directory..."
SYNC_START=$(date +%s)

# Backup existing hosting directory if it exists and is not empty
if [[ -d "${HOSTING_DIR}" ]] && [[ -n "$(ls -A "${HOSTING_DIR}" 2>/dev/null || true)" ]]; then
  BACKUP_DIR="${HOSTING_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
  if [[ ${VERBOSE} -eq 1 ]]; then
    log_info "Backing up existing hosting directory to ${BACKUP_DIR}"
  fi
  mv "${HOSTING_DIR}" "${BACKUP_DIR}" || true
fi

mkdir -p "${HOSTING_DIR}"
if ! cp -R "${FRONTEND_BUILD_DIR}/." "${HOSTING_DIR}/"; then
  log_error "Failed to copy build artifacts to hosting directory."
  exit 1
fi

SYNC_END=$(date +%s)
SYNC_DURATION=$((SYNC_END - SYNC_START))
log_success "Build artifacts synced in ${SYNC_DURATION}s"

# Deploy to Firebase
log_step "[6/7] Deploying to Firebase..."
DEPLOY_START=$(date +%s)

if [[ ${DRY_RUN} -eq 1 ]]; then
  log_info "DRY RUN: Would deploy Firebase Hosting + Functions..."
  CMD=(firebase deploy --only hosting,functions:backend --dry-run)
  if [[ -n "${PROJECT_ID}" ]]; then
    CMD+=(--project "${PROJECT_ID}")
  fi
  if (cd "${BACKEND_DIR}" && "${CMD[@]}"); then
    log_success "Dry run completed (no changes made)"
  else
    log_error "Dry run failed."
    exit 1
  fi
else
  # Confirmation prompt for production (unless forced or in CI)
  if [[ ${FORCE} -eq 0 ]] && [[ -z "${CI:-}" ]]; then
    # Use PROJECT_ID if set, otherwise try to get from firebase use
    if [[ -z "${PROJECT_ID}" ]]; then
      FIREBASE_USE_OUTPUT=$(firebase use 2>/dev/null || echo "")
      if [[ -n "${FIREBASE_USE_OUTPUT}" ]]; then
        DEPLOY_PROJECT=$(echo "${FIREBASE_USE_OUTPUT}" | sed -n 's/.*(\([^)]*\)).*/\1/p' | head -1)
      fi
      DEPLOY_PROJECT="${DEPLOY_PROJECT:-default}"
    else
      DEPLOY_PROJECT="${PROJECT_ID}"
    fi
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Ready to deploy to Firebase project: ${DEPLOY_PROJECT}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    read -p "Continue with deployment? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log "Deployment cancelled."
      exit 1
    fi
  fi
  
  CMD=(firebase deploy --only hosting,functions:backend)
  if [[ -n "${PROJECT_ID}" ]]; then
    CMD+=(--project "${PROJECT_ID}")
  fi
  
  if [[ ${VERBOSE} -eq 1 ]]; then
    log_info "Running: ${CMD[*]}"
  fi
  
  if (cd "${BACKEND_DIR}" && "${CMD[@]}"); then
    DEPLOY_END=$(date +%s)
    DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))
    log_success "Firebase deployment completed in ${DEPLOY_DURATION}s"
  else
    log_error "Firebase deployment failed."
    exit 1
  fi
fi

# Post-deployment verification
if [[ ${DRY_RUN} -eq 0 ]]; then
  log_step "[7/7] Verifying deployment..."
  
  # Determine final project ID
  if [[ -z "${PROJECT_ID}" ]]; then
    FINAL_PROJECT=$(get_firebase_project)
    if [[ -z "${FINAL_PROJECT}" ]]; then
      FIREBASE_USE_OUTPUT=$(firebase use 2>/dev/null || echo "")
      if [[ -n "${FIREBASE_USE_OUTPUT}" ]]; then
        FINAL_PROJECT=$(echo "${FIREBASE_USE_OUTPUT}" | sed -n 's/.*(\([^)]*\)).*/\1/p' | head -1)
      fi
    fi
  else
    FINAL_PROJECT="${PROJECT_ID}"
  fi
  
  if [[ -n "${FINAL_PROJECT}" ]] && [[ "${FINAL_PROJECT}" != "default" ]]; then
    DEPLOYED_URL="https://${FINAL_PROJECT}.web.app"
    DEPLOYED_URL_ALT="https://${FINAL_PROJECT}.firebaseapp.com"
    
    log_info "Checking deployment at ${DEPLOYED_URL}..."
    
    # Try multiple verification methods
    VERIFICATION_PASSED=0
    
    # Method 1: HTTP status check
    if command -v curl >/dev/null 2>&1; then
      HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${DEPLOYED_URL}/api/healthz" 2>/dev/null || echo "000")
      if [[ "${HTTP_CODE}" == "200" ]] || [[ "${HTTP_CODE}" == "301" ]] || [[ "${HTTP_CODE}" == "302" ]]; then
        log_success "Deployment verified: ${DEPLOYED_URL} (HTTP ${HTTP_CODE})"
        VERIFICATION_PASSED=1
      else
        # Try alternate URL
        HTTP_CODE_ALT=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${DEPLOYED_URL_ALT}/api/healthz" 2>/dev/null || echo "000")
        if [[ "${HTTP_CODE_ALT}" == "200" ]] || [[ "${HTTP_CODE_ALT}" == "301" ]] || [[ "${HTTP_CODE_ALT}" == "302" ]]; then
          log_success "Deployment verified: ${DEPLOYED_URL_ALT} (HTTP ${HTTP_CODE_ALT})"
          VERIFICATION_PASSED=1
        fi
      fi
    fi
    
    if [[ ${VERIFICATION_PASSED} -eq 0 ]]; then
      log_warn "Could not immediately verify deployment (site may still be deploying)"
      log_info "Primary URL: ${DEPLOYED_URL}"
      log_info "Alternate URL: ${DEPLOYED_URL_ALT}"
      log_info "Deployment may take a few minutes to propagate. Check Firebase Console for status."
    fi

    # A successful Hosting response is not enough: require the API to reach
    # Firestore before considering the deployment healthy.
    READINESS_PASSED=0
    if command -v curl >/dev/null 2>&1; then
      for attempt in 1 2 3 4 5 6; do
        for candidate in "${DEPLOYED_URL}" "${DEPLOYED_URL_ALT}"; do
          READY_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${candidate}/api/readyz" 2>/dev/null || echo "000")
          if [[ "${READY_CODE}" == "200" ]]; then
            log_success "API readiness verified: ${candidate}/api/readyz"
            READINESS_PASSED=1
            break 2
          fi
        done
        if [[ ${attempt} -lt 6 ]]; then
          log_info "API is not ready yet (attempt ${attempt}/6); retrying in 5 seconds..."
          sleep 5
        fi
      done
    fi

    if [[ ${READINESS_PASSED} -eq 0 ]]; then
      log_error "Deployment completed, but /api/readyz did not confirm Firestore readiness."
      exit 1
    fi
    
    # Display deployment info
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Deployment Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Project ID:     ${FINAL_PROJECT}"
    echo "Primary URL:   ${DEPLOYED_URL}"
    echo "Alternate URL: ${DEPLOYED_URL_ALT}"
    echo "Build Size:    ${BUILD_SIZE}MB (${FILE_COUNT} files)"
    echo "Total Time:    $(get_elapsed_time)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  else
    log_success "Deployment completed"
    log_info "Total deployment time: $(get_elapsed_time)"
  fi
else
  log_step "[7/7] Skipping verification (dry run)"
fi

echo
log_success "Firebase deployment finished successfully in $(get_elapsed_time)"
