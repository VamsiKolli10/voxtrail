# VoxTrail production readiness report

Assessment date: August 29, 2026  
Scope: React frontend, Express/Firebase backend, dependency security, CI/CD, emulator integration, translation runtime, and launch operations.

## Executive verdict

**GO for staging and a controlled internal beta. CONDITIONAL NO-GO for unrestricted public launch.**

The repository-level engineering gates now pass. The remaining launch conditions require evidence from the real Firebase project and external providers; they cannot be proven by local code changes alone.

## Verified release evidence

| Gate | Result |
|---|---|
| Root, frontend, and backend clean installs | Passed with Node.js 22 lockfiles |
| Frontend tests | Passed: 33 files, 115 tests |
| Backend tests | Passed: 26 suites, 102 tests |
| Frontend production build | Passed with Vite 8.2.2 |
| Full frontend dependency audit | Passed: 0 vulnerabilities |
| Full backend dependency audit | Passed: 0 vulnerabilities |
| Firebase Emulator integration | Passed: Hosting, Functions rewrite, Firestore readiness, Auth, and authenticated saved phrases |
| Translation runtime | Passed: real `Xenova/opus-mt-en-es` inference through `@huggingface/transformers` |
| Translation cold smoke time | Approximately 29 seconds on the local Node.js 22 host |
| Repository checks | JSON, YAML, JavaScript, shell syntax, and `git diff --check` passed |

## Completed hardening

- Moved work from `main` to `codex/prod-readiness-hardening`.
- Added a root lockfile and reliable root install/test/build/dev commands.
- Standardized local, CI, Functions, and deployment policy on Node.js 22.
- Consolidated frontend styling on Material UI and removed Tailwind.
- Added route-level lazy loading and vendor chunking. The app entry chunk fell from roughly 3.7 MB to roughly 181 KB; maps and emergency data remain isolated lazy chunks.
- Migrated translation from deprecated `@xenova/transformers` to `@huggingface/transformers`, with patched runtime overrides.
- Updated Firebase Admin and Functions SDKs and added Admin 13/14 compatibility handling.
- Added liveness and Firestore-backed readiness endpoints at root and `/api` paths.
- Added emulator-only credentials/rules that cannot weaken production Firestore rules or use real Google credentials.
- Added Firebase Emulator smoke tests for Hosting, Functions, Firestore, Auth, and an authenticated API route.
- Reduced the Functions upload surface by excluding archived Functions, tests, coverage, Hosting assets, and emulator rules.
- Removed tracked coverage output and generated artifacts.
- Pinned GitHub Actions, Firebase CLI 15.28.2, and Java 21 for emulators.
- Gated production deployment on a successful `CI` push run from `main`; manual production runs are restricted to `main`.
- Added post-deploy Firestore readiness verification.
- Hardened standalone API startup with port validation and explicit bind-error handling, including a clear `EADDRINUSE` message.
- Added an early Node.js 22 runtime guard so incompatible native translation dependencies cannot fail later as opaque `sharp` errors.
- Remediated all currently reported frontend and backend dependency advisories, including development/build dependencies.

## Remaining public-launch gates

These are operational gates, not known failing code:

1. Run the workflow from a clean GitHub-hosted runner and require it as a branch-protection check.
2. Configure the GitHub `production` Environment with required reviewers and least-privilege deployment secrets.
3. Deploy to staging and run authenticated smoke tests against the real Firebase project.
4. Benchmark translation cold starts and concurrency in Functions. Move translation to Cloud Run if p95 latency, memory, timeout reliability, or cost misses the agreed target.
5. Load-test Google Places and OpenRouter paths; verify quotas, retry behavior, provider budgets, cost alerts, and emergency kill switches.
6. Enable request/error/provider metrics, dashboards, uptime checks, and actionable alerts in staging.
7. Complete legal review for Terms, Privacy, location processing, AI/provider disclosure, data retention/deletion, and emergency/cultural disclaimers.
8. Execute and document deployment rollback, Firestore backup/restore, and incident-response drills.
9. Run accessibility and mobile Core Web Vitals checks on the deployed staging build.

## Known non-blocking follow-ups

- MapLibre and the emergency-location alias dataset remain large lazy chunks. They no longer affect the initial route, but the emergency dataset can be moved to a compressed on-demand asset later.
- Browser compatibility metadata emits age warnings during builds; schedule routine metadata updates.
- The historical `travel-app-be/functions/` directory is excluded from deployment but can be deleted in a dedicated cleanup change.

## Launch decision

The codebase is now suitable for staging and controlled beta validation. Do not open unrestricted public traffic until the real-environment, provider-cost, observability, legal, and rollback gates above have recorded owners and passing evidence.
