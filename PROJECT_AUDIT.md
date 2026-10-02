# VoxTrail project audit

Assessment: October 2, 2026. Branch: `codex/project-audit-fixes`.

## Scope and conclusion

Reviewed the React frontend, Express API, authentication and user storage, provider wrappers, dependencies, Firebase configuration, development scripts, tests, and release documentation. Fixed reproducible UI, UX, correctness, and security defects and added regression coverage. This is a local engineering assessment, not evidence that every production workflow or external provider works.

The frontend lockfile contained changes before this audit. Those changes were retained as the starting point for compatible dependency remediation. No production deployment or production data changes were performed.

## Current architecture

| Area | Implementation | Main files |
| --- | --- | --- |
| Browser app | React 18, MUI 7, React Router, Redux, Vite 8 | `travel-app-fe/src/App.jsx`, `theme.js` |
| Authentication | Firebase browser SDK; revoked ID tokens rejected by Admin SDK | `contexts/AuthContext.jsx`, backend `middleware/authenticate.js` |
| API | Express 5 on Node 22; validation, layered throttles, request IDs and standardized errors | `travel-app-be/src/app.js` |
| Persistence | Firestore through Firebase Admin; client rules deny direct access | backend `config/firebaseAdmin.js`, `firestore.rules` |
| AI | OpenRouter translation, phrasebooks, culture and itineraries | backend `lib/openrouterClient.js`, `controllers/` |
| Places | Google Places geocoding, nearby search, details and photos | backend `stays/providers/`, `poi/providers/` |
| Offline content | IndexedDB saved-phrase snapshots and localStorage activity scoped to Firebase UID | frontend `services/offlineCache.js`, `utils/recentActivity.js` |
| Deployment | Firebase Hosting `/api/**` rewrite to `api`, backend codebase, `us-central1`, Node 22 | `travel-app-be/firebase.json`, `index.js` |

The archived `travel-app-be/functions/` codebase is excluded from deployment. Translation calls OpenRouter; it does not load Hugging Face models. Speech input/playback use browser capabilities. Maps use MapLibre. Firestore stores saved phrases, users, culture briefs and durable production usage quotas; in-memory caches/throttles remain instance-local.

Authentication flow: Firebase signs in the browser user → Axios attaches an ID token → Admin verifies validity and revocation → route authorization and quotas → controller/provider → response. Request signatures do not replace required user authentication.

## Fixed findings

| Priority | Finding | Change and verification |
| --- | --- | --- |
| High | IP throttles used request objects, allowing bypass or coupling unrelated clients | Use `ipKeyGenerator(req.ip)`; real IPv4 isolation and IPv6 subnet tests cover custom, role and method limiters |
| High | Legacy culture brief route bypassed production authentication and generation quota | Share the modern brief middleware; both routes reject anonymous production requests |
| High | Token revocation was not checked by Firebase | `verifyIdToken(token, true)`; regression checks the verification arguments |
| High | Saved-phrase offline data and recent activity could appear for another account on a shared browser | UID-scoped storage; ignore legacy unscoped data; ownership and anonymous regressions |
| High | Dependency advisories, including critical test tooling and vulnerable gRPC transitives | Compatible updates, Vitest 4.1.11 minimum, gRPC 1.14.5 override; clean installs and full audits |
| Medium | Express 5 query getter discarded validated defaults/coercions | Replace query with parsed data using an own property; test trimming, defaults, stripped fields and typed values |
| Medium | Blank/repeated coordinates and string booleans were interpreted incorrectly; zero coordinates rejected | Explicit numeric/boolean conversion, finite coordinate checks; query and stays regressions |
| Medium | Location resolution crashed or accepted malformed repeated/oversized parameters | Validate scalar input and length before provider access |
| Medium | Search pagination cache mixed different page sizes | Include page size in cache key; regression covers separate results |
| Medium | POI accessibility filter had no effect | Request accessibility options and require confirmed wheelchair entrance; unknown/false results excluded |
| Medium | Generic server failures exposed internal messages | Hide server diagnostics in both middleware and controller response helpers; secret-redaction regressions |
| Medium | Translation timeout left the upstream request/fallbacks running | Pass an AbortSignal to Axios and stop fallback attempts on cancellation; exercise actual controller/client deadline and success paths |
| Medium | Translation errors were presented as translated text; stale responses and speech could outlive input changes | Separate error state, guard late requests, clear stale output, disable invalid actions, handle empty responses and clipboard failures |
| Medium | Discover/stays requests could overwrite newer searches; geolocation failure was silent | Request sequence guards and actionable geolocation feedback |
| Medium | Auth notifications were never rendered; verification effects could apply one-time codes twice | Global notification provider, dedicated action route ownership, StrictMode-safe verification and obsolete-session guards; regression tests |
| Medium | MUI 7 ignored obsolete Grid item/breakpoint props across pages | Migrate to `size` and remove conflicting culture column widths; production build and component suites |
| Medium | Mobile landing overflow and login padding/retained scroll clipped content | Contain decorative overflow, remove nested login padding, reset route scroll; browser confirms 320px document width and scroll position zero |
| Medium | Marketing metrics/testimonials and feature promises lacked implementation evidence | Replace with labeled example workflows and accurate features; repair destination/login CTAs and legal links |
| Medium | Wrapped registration legal links could toggle consent | Separate links from the consent label and keep each link in one hit area; browser and regression verification |
| Low | Navigation/cards were inconsistent for keyboard and screen-reader users | Focus main content, skip link, tabbable nav, page titles, action labels, prevent nested-button activation and dead button semantics |
| Low | Origin-only API URLs missed `/api`; requests had no timeout | Normalize URLs and use a 60-second client timeout; URL regressions |
| Low | Static Hosting HTML did not receive API Helmet protections | Add Hosting nosniff, frame denial, referrer policy and limited CSP directives; emulator checks headers |
| Low | Emulator smoke required CI-only configuration | Supply isolated demo signing configuration and disable paid provider keys |
| Low | Deployment helper could proceed after failed tests under `--force` | Fail closed whenever a configured test suite fails |

## Verification evidence

Use Node **22** and npm >=10. A binary's directory name is not proof of its version: the local Homebrew `node@22` path reported Node 25. Final checks used verified Node 22.23.2 from nvm.

| Check | Result |
| --- | --- |
| Frontend and backend `npm ci` | Passed under Node 22 |
| Frontend Vitest | 45 files, 147 tests passed |
| Backend Jest | 30 suites, 120 tests passed |
| Release script tests | Four passed: emulator isolation/restoration and failed-test deployment gates |
| Production Vite build | Passed; large lazy chunks still emit size warnings |
| Full frontend/backend `npm audit` | Zero reported vulnerabilities in each lockfile |
| Firebase demo emulators | Passed: Hosting headers, Functions rewrite, Firestore readiness, Auth and authenticated saved phrases |
| Browser review | Landing/login/register/legal pages at narrow mobile and desktop widths; protected flows covered by component/API tests |
| Repository whitespace check | `git diff --check` |

Reproduce from the repository root:

```bash
node --version                 # must be 22.x
npm run install:all
npm run ci
npm audit --prefix travel-app-fe
npm audit --prefix travel-app-be
npm run test:emulators          # Firebase CLI 15.28.2 and Java 21+; restores .env.local
git diff --check
```

Tests mock paid providers; passing them does not establish live translation quality, place availability, billing limits, email delivery, or production IAM.

## Remaining limitations and release checks

- Translation UI supports English, Spanish, French and German. Phrasebooks may offer additional languages; translation ignores unsupported context selections.
- Google Places stays are accommodation discovery with provider links, not reservations, inventory or verified nightly prices. Date/guest inputs are accepted for compatibility but do not establish availability. POI cost/time/family suitability include heuristics, not guarantees; wheelchair entrance is a narrow reported attribute.
- Itinerary generation can return sample/static fallback content when enabled. Disable `ITINERARY_ENABLE_FALLBACK` if production should fail instead of supplying fallback plans.
- Offline snapshots are account scoped, not encrypted or a full offline application. Shared browser profiles retain each account's cache until browser storage is cleared.
- Emergency data and map dependencies are large lazy chunks (approximately 1.56 MB and 1.04 MB raw). Measure device/network performance before setting a performance budget.
- Hosting CSP currently blocks objects, foreign base URLs and framing. It is not a complete script/connect allowlist; derive and test a full policy against Firebase, fonts, map tiles, images and speech/browser workflows before enforcing one.
- `trust proxy: 1` assumes the Firebase/one-proxy topology. Restrict direct standalone deployments appropriately; IP throttles are instance-local, with durable user quotas protecting paid generation/search across instances.
- Authenticated browser/device testing, real email action links, live paid-provider behavior, production quota concurrency, deployed Hosting headers/IAM and observability require staging verification.
- Confirm release workflow permissions, provider spending caps, terms/privacy content ownership, backup/restore and rollback procedures before unrestricted launch. Local tests do not validate those operations.

## Maintenance

Treat `src/routes/`, `src/utils/schemas.js` and `src/config/env.js` as the executable contracts. Update this report and the API/environment guides with behavior changes. Keep Firebase production rules deny-by-default and separate from emulator-only rules. Re-run audits after dependency updates and before releases.
