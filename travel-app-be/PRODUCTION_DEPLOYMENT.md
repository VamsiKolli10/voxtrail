# VoxTrail Firebase deployment guide

Updated October 2, 2026. See [project audit](../PROJECT_AUDIT.md) and [readiness report](../PRODUCTION_READINESS_REPORT.md) for verified checks and remaining release conditions.

## Active topology

Firebase Hosting serves the frontend build from `travel-app-be/public`. `/api/**` rewrites to the exported Express function `api` in `us-central1`, codebase `backend`, runtime Node 22. The source is `travel-app-be/`; the nested `functions/` directory is archived and excluded. The API uses Firebase Admin, Google Places and OpenRouter. No local translation models or booking engine are deployed.

## Preparation

Use Node 22, npm >=10 and the repository-pinned Firebase CLI 15.28.2. Emulator checks require Java 21 or newer (CI uses 21). Configure Firebase Auth, Firestore and provider access in a staging project before production. Configure authorized Auth domains and email action URLs, frontend Firebase values and `VITE_API_URL=/api` for same-origin Hosting. Frontend variables are embedded at build time.

Use [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) and the two `.env.example` files. Functions use managed Application Default Credentials; do not ship service-account files. Supply backend provider/signing values using the deployment environment's supported secret configuration. This code reads environment variables, not legacy `functions.config()` values. Keep all local environment files out of Git. Verify that configured secrets reach the deployed function.

Production Firestore rules intentionally deny all browser access. Saved phrases and user records go through authenticated Admin-backed API endpoints. Do not replace these rules with owner-write examples; Firebase Admin bypasses rules, so API ownership checks are required. Emulator rules are only selected by the demo test runner.

From the repository root:

```bash
npm run install:all
npm run ci
npm audit --prefix travel-app-fe
npm audit --prefix travel-app-be
npm run test:emulators
```

## Deployment

After reviewing staging evidence and selecting the intended project, deploy Firestore rules/indexes separately because the application helper deploys only Hosting and Functions:

```bash
cd travel-app-be
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
cd ..
./scripts/firebase-deploy.sh --project YOUR_FIREBASE_PROJECT_ID
```

The helper runs tests, builds the frontend and synchronizes Hosting assets before deploying. A failed configured test suite aborts deployment, including with `--force`. Avoid skip-test/check flags for release validation. GitHub deployment configuration lives in `.github/workflows/deploy.yml`; a locally successful run does not prove repository secrets, environment protections or runner permissions.

## Verification and rollback

Check `https://YOUR_FIREBASE_PROJECT_ID.web.app/api/healthz` and `/api/readyz`. Readiness checks Firestore connectivity, not Places/OpenRouter billing or translation quality. Check Hosting security headers on the HTML response and test deep-link SPA routing, login/logout, revoked tokens, email verification/reset, owner-scoped saved phrases and each paid provider with a staging account.

Monitor function errors/latency, quota rejections, provider spend and Firestore usage. See [monitoring guide](../MONITORING_LOGGING.md); confirm the configured alerts actually fire. Preserve a known-good source revision and frontend build, exercise Firebase Hosting release rollback and redeployment of the known-good backend, and verify Firestore backup/restore independently. A Hosting rollback alone does not roll back API code or data.

## Operational constraints

Role, method and IP throttles are process-local; production paid APIs additionally use Firestore quotas. The app trusts one proxy hop, matching its Firebase topology. Confirm proxy trust before serving the API directly. Functions default to zero warm instances and ten maximum instances; adjust resource settings intentionally after measuring latency/cost. Current Hosting CSP is limited to object/base/frame restrictions; it is not a complete resource allowlist.
