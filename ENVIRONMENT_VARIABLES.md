# VoxTrail environment configuration

Updated October 2, 2026. Node 22 and npm >=10 are required. Copy `travel-app-fe/.env.example` and `travel-app-be/.env.example` for local development. Never commit populated environment files or service-account JSON. Vite values are public browser configuration; backend secrets must never use the `VITE_` prefix.

## Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL; recommend `http://localhost:8000/api` locally and `/api` for same-origin Firebase Hosting. Origin-only and trailing-slash inputs are normalized. Axios uses a fixed 60-second timeout. |
| `VITE_FIREBASE_API_KEY` | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase authorized auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase web app bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase web app sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase web app ID |

The previously documented `VITE_API_TIMEOUT`, generic offline/analytics/error-reporting environment flags are not consumed by the current service/context implementation. Feature flags are managed by `FeatureFlagsContext`; do not rely on unused environment variables to disable features.

## Backend credentials and server

| Variable | Default / behavior |
| --- | --- |
| `APP_PORT` | 8000 for standalone development |
| `NODE_ENV` | Set `development` locally; production/staging enable durable quotas and culture authentication. Only `test` and `development` bypass those production-specific gates. |
| `APP_CHECK_ENFORCE` | `false` (monitor mode: log missing/invalid App Check tokens). `true` rejects API requests without a valid `X-Firebase-AppCheck` token. See ADR-002 |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact origins; set explicitly for deployed environments |
| `REQUEST_BODY_LIMIT` | `256kb` |
| `READINESS_TIMEOUT_MS` | 3000, maximum 10000 |
| `FIRESTORE_PREFER_REST` | `true` |
| `FB_ADMIN_CREDENTIALS` | Local service-account JSON or base64 JSON; legacy `FIREBASE_ADMIN_CREDENTIALS` also accepted |
| `GOOGLE_APPLICATION_CREDENTIALS` | Alternative local path to a readable credential JSON file |

Managed Firebase Functions/Cloud Run uses Application Default Credentials when explicit credentials are absent. Local standalone startup requires credentials. Demo emulators use a process-local demo certificate and isolated signing configuration, and disable external provider keys. Do not point emulator tests at a real project.

## Providers and translation

| Variable | Default / purpose |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Required for live location/stays/POI/photo calls |
| `OPENROUTER_API_KEY` | Required for live translation, phrasebooks, culture and AI itineraries |
| `OPENROUTER_MODEL` | Optional primary model |
| `OPENROUTER_MODEL_CHAIN` | Comma-separated ordered fallback models; the configured primary is prepended and legacy `gpt-4o-mini` fallback is appended |
| `OPENROUTER_TIMEOUT_MS` | 30000 per request |
| `MAX_TRANSLATION_CHARS` | 500; UI/schema also cap text at 500 |
| `TRANSLATION_INFERENCE_TIMEOUT_MS` | 20000, total translation operation deadline; aborts upstream work |
| `TRANSLATION_CACHE_TTL_MS` | 600000 |
| `ITINERARY_MODEL` | Optional itinerary-specific model selection |
| `ITINERARY_ENABLE_FALLBACK` | `true`; allows sample/static fallback plans |
| `CULTURE_BRIEF_CACHE_VERSION` | `1`; increment to invalidate brief cache namespace |

Model availability/pricing depends on the provider. A primary model labeled free does not make fallback usage free. Review every configured fallback and provider spending cap. The historical Hugging Face model/warmup settings are not used by the current translation implementation.

## Throttles and quotas

| Variable | Default |
| --- | --- |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `RATE_LIMIT_ANONYMOUS_MAX` | 60000 / 120 per signed-in user / 30 per anonymous IP: the single API-wide flood guard |
| `TRANSLATION_DAILY_QUOTA` | 200 translations per user per day |
| `LOCATION_RESOLVE_PER_HOUR` | 60 city lookups per user per hour (sign-in required) |
| `STAYS_PER_USER_PER_HOUR` / `STAYS_PER_USER_WINDOW_MS` | 60 / 3600000 |
| `POI_PER_USER_PER_HOUR` / `POI_PER_USER_WINDOW_MS` | 120 / 3600000 |
| `PHRASEBOOK_MAX_REQUESTS_PER_HOUR` / `PHRASEBOOK_DAILY_QUOTA` | 25 / 20 |
| `ITINERARY_MAX_REQUESTS_PER_HOUR` / `ITINERARY_DAILY_QUOTA` | 20 / 25 |
| `CULTURE_DAILY_QUOTA` | 30 shared daily generations |
| `USAGE_ALERT_FALLBACK` | 500 external usage alert threshold |

Model (ADR-002): every route that calls a paid provider requires sign-in and has a **per-user quota** (`middleware/userQuota.js`). In production these are durable Firestore counters in `usageQuotas` (shared by all instances; each document has `expireAt` for a TTL policy); in development/test the same limits are kept in memory. On top, one in-memory flood guard per instance limits bursts. Photo requests (`/api/stays/photo`) use their own 300/min per-IP bucket. Phrasebook and itinerary controllers also keep short hourly in-memory limits. Cache hits are per process.

## Functions and CI

The API runs as the Cloud Functions **2nd gen** function `apiV2` (`travel-app-be/index.js`, options in `src/config/functionOptions.js`): `us-central1`, 1 vCPU, 512 MiB, concurrency 80, 120 s timeout. `FUNCTION_MIN_INSTANCES` (default 0) and `FUNCTION_MAX_INSTANCES` (default 5) are deploy-time params read from `.env` / `.env.<project>`. Region is fixed to `us-central1` to match the Hosting rewrite. The 1st gen `api` export remains only as a rollback target until it is deleted.

**Secrets.** `OPENROUTER_API_KEY` and `GOOGLE_PLACES_API_KEY` are bound with `defineSecret` and must exist in Secret Manager (`firebase functions:secrets:set NAME`, or `travel-app-be/scripts/set-firebase-secrets.sh`). Do **not** also put these names in a deployed `.env` file: the CLI rejects a name that is both an env var and a secret. Local emulator runs read them from `travel-app-be/.secret.local` (git-ignored); local `npm run dev` still reads `.env`.

CI uses dummy provider configuration for mocked tests. Deployment requires `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID` and the frontend variables named in `.github/workflows/deploy.yml`. Runtime backend secrets need separate configuration; successful frontend build/deploy does not prove they exist in Functions. Legacy `firebase functions:config:set` values are not read by this code.

Request signing (`REQUEST_SIGNING_SECRET`, `x-request-signature`) was removed in ADR-002: no client could hold the secret, and every covered route already required sign-in. ID tokens are checked for revocation on writes and admin routes; reads accept any valid, unexpired token.

Troubleshoot configuration with the current source contracts (`src/config/env.js`, `src/config/firebaseAdmin.js`, provider wrappers), health/readiness, request IDs and provider logs. Avoid printing tokens, signing secrets or credential JSON during diagnostics.
