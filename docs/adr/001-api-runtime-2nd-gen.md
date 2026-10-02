# ADR-001: Run the API on Cloud Functions 2nd gen

**Status:** Proposed
**Date:** 2026-10-02
**Deciders:** Vamsi Kolli

## Context

The whole Express API is one HTTPS function, `api`, declared with `firebase-functions/v1` (`travel-app-be/index.js`): 2 GB memory, 120 s timeout, `minInstances: 0`, `maxInstances: 10`.

1st gen handles **one concurrent request per instance** ([Firebase version comparison](https://firebase.google.com/docs/functions/version-comparison)). With 10 instances, the app can run **10 requests at once, across all users**. Three things make that limit easy to hit:

- **Photos go through the function.** A stays results page triggers 5 photo requests, and each one holds an instance while it streams bytes from Google.
- **AI calls are slow.** OpenRouter calls allow 30 s per model attempt, with fallbacks, so one translation or itinerary can hold an instance for 30–90 s.
- **Cold starts.** Each new instance pays a cold start, and in-memory caches and rate limits are split across up to 10 separate copies.

Other forces: secrets are plain environment variables (`config/env.js`). Firebase recommends 2nd gen for new functions. The team is one person, so the fix must stay inside Firebase tooling.

## Decision

Redeploy the same Express app with `firebase-functions/v2/https` `onRequest` and these settings:

- `region: "us-central1"` (unchanged)
- `cpu: 1`, `concurrency: 80`
- `memory: "512MiB"` (measure, then tune)
- `timeoutSeconds: 120`
- `minInstances: 0`, `maxInstances: 5`
- API keys declared with `defineSecret`

Cut over with a new function name and a Hosting rewrite switch, so rollback is one config change.

## Options Considered

### Option A: Stay on 1st gen, raise `maxInstances`
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low (one env var) |
| Cost | Each concurrent request bills a whole 2 GB instance; more cold starts |
| Scalability | Linear in instances; still 1 request each |
| Team familiarity | High |

**Pros:** no code change.
**Cons:** treats the symptom. Spreads caches and rate limits across even more instances. No Secret Manager integration. Still one request per instance.

### Option B: Cloud Functions 2nd gen (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low: swap the wrapper in `index.js`, add `defineSecret`, deploy |
| Cost | Requests share an instance's CPU and memory; a smaller memory setting is likely enough; still scales to zero |
| Scalability | Up to 1000 concurrent requests per instance (80 is a safe start) |
| Team familiarity | High (same Firebase CLI, same Hosting rewrite shape) |

**Pros:** removes the concurrency ceiling; fewer instances means fewer cold starts and more effective in-memory caches; first-class secrets; longer timeouts available.
**Cons:** concurrent requests share module-level state (audit needed, see Consequences); the 2nd gen pricing model is different (Cloud Run based).

### Option C: Cloud Run service (container) behind Hosting
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium: Dockerfile, Artifact Registry, separate deploy |
| Cost | Same as B (2nd gen *is* Cloud Run underneath) |
| Scalability | Same as B |
| Team familiarity | Lower: adds a container toolchain |

**Pros:** full control of the runtime and portability.
**Cons:** more moving parts for no gain at this size.

## Trade-off Analysis

B and C have the same runtime characteristics. B keeps the Firebase CLI, emulator workflow and deploy script the project already has. A is the only option without code changes, but it keeps the root problem (one request per instance) and makes per-instance state worse. For a solo developer close to launch, B is the most improvement for the least operational change.

## Consequences

- **Easier:** handling bursts (a results page full of photos no longer queues other users); keeping provider keys in Secret Manager; reasoning about caches (fewer, longer-lived instances).
- **Harder:** concurrent requests share module-level mutable state. Before cutover, audit `src/` for request-specific data stored at module scope. The existing module-level structures are deliberately shared caches, counters and limiters (`utils/cache.js`, `utils/quota.js`, `utils/performance.js`, `express-rate-limit` stores), which is fine.
- **Revisit when:** sustained traffic needs warm instances (`minInstances: 1` costs money even when idle), or a second region is needed.

## Action Items

1. [ ] Change `index.js` to `const { onRequest } = require("firebase-functions/v2/https")` and export `apiV2 = onRequest({ region, cpu: 1, concurrency: 80, memory: "512MiB", timeoutSeconds: 120, minInstances: 0, maxInstances: 5, secrets: [...] }, app)`.
2. [ ] Move `OPENROUTER_API_KEY` and `GOOGLE_PLACES_API_KEY` to `defineSecret(...)` (`firebase functions:secrets:set ...`). Read them via `process.env` (secrets are injected as env vars), so `config/env.js` keeps working.
3. [ ] Audit module-level state for request-specific data; add a Supertest test that fires overlapping requests.
4. [ ] Deploy `apiV2` next to `api`; point the Hosting rewrite in `travel-app-be/firebase.json` at `apiV2`; run the emulator smoke test and a production smoke test.
5. [ ] After a day of clean logs, delete `api` (`firebase functions:delete api`) and update `ENVIRONMENT_VARIABLES.md` and `PRODUCTION_DEPLOYMENT.md`.
6. [ ] Delete the archived `travel-app-be/functions/` codebase so there's one obvious entry point.
