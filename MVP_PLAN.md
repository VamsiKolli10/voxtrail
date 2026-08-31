# VoxTrail MVP Plan

## Objective

Ship a reliable personal travel companion for a single traveler. The MVP should help a user prepare for a trip, translate common text, save useful phrases, and discover nearby places or stays. It should be easy to operate, inexpensive to run, and safe to use.

## MVP user journeys

1. **Prepare** — sign in, choose a destination and language pair, and see a useful home dashboard.
2. **Translate** — enter text, receive a translation, copy/share it, and save it to a phrasebook.
3. **Recall** — open saved phrases quickly, including a small set of common travel phrases.
4. **Discover** — search points of interest and stays, inspect details, and open the provider link.
5. **Stay safe** — access destination-specific emergency information and clear AI/provider disclaimers.

## Explicit non-goals for MVP

Do not build booking or payments, multi-user trip collaboration, a full itinerary planner, real-time alerts, social features, or a large offline map system. These add operational and product complexity without proving the core value.

## Current baseline

The codebase is a staging-ready release candidate: frontend/backend tests, build, dependency audits, emulator smoke tests, translation inference, CI, and deployment safeguards are documented in `PRODUCTION_READINESS_REPORT.md`. The remaining work is primarily product focus, real-environment validation, observability, and launch discipline.

## Milestones and exit criteria

### 0. Freeze the release contract — 1 day

- Pick one target persona and one initial destination/language pair.
- Define the first release success metrics: activation, successful translation rate, saved-phrase reuse, discovery click-through, crash-free sessions, and provider cost per active user.
- Create a P0/P1/P2 backlog and reject new P2 scope until launch.

**Exit:** one-page scope, owner, target date, and metric thresholds agreed.

### 1. Validate staging foundation — 1–2 days

- Confirm Firebase project, Auth, Firestore rules, Hosting, Functions, secrets, API quotas, and allowed origins.
- Run the existing emulator and smoke tests, then repeat the same flows against staging with a real test account.
- Verify deploy rollback and Firestore backup/restore procedure.

**Exit:** a clean staging deploy and a repeatable authenticated smoke checklist.

### 2. Finish the core experience — 4–7 days

- Polish the home dashboard around the five journeys above.
- Add consistent loading, empty, error, retry, and unauthorized states across translation, phrasebook, POI, and stays screens.
- Make translation behavior explicit: input limits, language labels, copy/share, timeout feedback, and graceful provider failure.
- Ensure saved phrases are fast to search and usable on a phone.
- Keep emergency information visible without implying professional or real-time safety coverage.
- Test narrow mobile widths and keyboard/screen-reader navigation.

**Exit:** a new user can complete all five journeys without developer help on a phone-sized viewport.

### 3. Control reliability and cost — 2–4 days

- Add request IDs and structured logs for auth, translation, POI, and stays calls.
- Track latency, error rate, provider fallback, rate-limit events, and model/API spend.
- Set provider timeouts, retries with limits, quotas, and kill switches for OpenRouter, Google, and translation models.
- Benchmark translation cold starts and concurrency; move translation to a dedicated service if Functions miss the agreed latency budget.

**Exit:** dashboards/alerts exist and a provider outage produces a useful user-facing fallback rather than a broken screen.

### 4. Release quality gate — 2–3 days

- Require CI checks and branch protection on the release branch.
- Run frontend/backend tests, build, audits, emulator tests, accessibility checks, and a production-like smoke test from a clean runner.
- Measure mobile Core Web Vitals and bundle regressions.
- Complete Terms, Privacy, location-data, AI-generated-content, and emergency-information review.

**Exit:** all P0 issues closed, no known critical security/dependency findings, and launch sign-off recorded.

### 5. Controlled beta — 5–7 days

- Invite 5–10 personal testers with one or two realistic trips.
- Capture task completion, confusing screens, failed searches, latency complaints, and actual provider cost.
- Fix only P0/P1 findings; keep a rollback-ready build deployed.

**Exit:** testers complete the core journeys, no data-loss/security incidents occur, and metrics meet the thresholds from milestone 0.

### 6. Personal MVP launch — 1 day

- Deploy the tagged release from the protected branch.
- Verify hosting, functions, auth, Firestore, provider credentials, alerts, and rollback immediately after deployment.
- Publish a short changelog and a known-limitations page.

**Exit:** release is tagged, monitored for 24 hours, and rollback ownership is clear.

## Suggested priority order

**P0:** staging validation, auth/data security, translation reliability, core mobile UX, error handling, observability, legal disclaimers, rollback.

**P1:** phrase search/favorites, better POI/stay filters, offline cache for saved phrases, analytics refinement, performance tuning.

**P2:** collaboration, booking, payments, itinerary automation, social features, broad offline maps, additional providers.

## Personal-project operating rhythm

- Work in vertical slices that can be demoed end-to-end.
- Keep one staging environment and one production environment; never test provider keys in production.
- Review costs and error dashboards weekly.
- Tag every deploy and write down the rollback command before changing production.
- Revisit deferred scope only after real usage supports it.

