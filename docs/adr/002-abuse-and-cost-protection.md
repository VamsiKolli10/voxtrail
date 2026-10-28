# ADR-002: Abuse and cost protection — identity, durable quotas, provider caps

**Status:** Accepted — code implemented on branch `css-variables-theme`; console steps (action 1, TTL policy) pending
**Date:** 2026-10-02
**Deciders:** Vamsi Kolli

## Context

Most API routes end in a paid provider call (OpenRouter tokens, Google Places SKUs). Today every request passes through six protective layers (`src/app.js`, see [ARCHITECTURE §3](../architecture/ARCHITECTURE.md#3-request-lifecycle)):

| Layer | Holds up? | Why |
|-------|-----------|-----|
| Role, endpoint and method rate limiters (`express-rate-limit`, memory store) | Partly | Counters are per instance and reset on cold start; with up to 10 instances the real limit is 1–10× the configured one |
| HMAC request signing (`validateRequestSignature`) | No | The SPA never signs. A browser can't keep a signing secret anyway. Every covered route already requires a Bearer token, which bypasses the check. But the API **refuses to boot** without `REQUEST_SIGNING_SECRET` |
| User-agent / header heuristics (`security.js:442`) | No | Any client can send a browser user-agent string |
| `requireAuth` (Firebase ID token, revocation checked) | **Yes** | Every request is tied to an account |
| Durable Firestore quotas (`middleware/durableQuota.js`) | **Yes** | Correct across instances; per user, per day or per window |
| Provider-side caps / budgets | **Missing** | Nothing stops a bug or a compromised account from running up a bill |

Gaps: translation (an LLM call) has no durable quota. `/api/location/resolve` (Text Search Pro, $32/1,000 after the free cap) and `/api/stays/photo` ($7/1,000 photos) are public. Revocation is checked on *every* request, which adds an Auth round-trip even to cheap reads.

Constraints: near-free-tier budget, solo maintainer, real users soon.

## Decision

Rely on **three layers that hold up**, and delete the ones that don't:

1. **Identity.** Every route that costs money requires a signed-in user. `location/resolve` becomes authenticated. The photo proxy only serves signed, expiring URLs, which are handed out in authenticated responses ([ADR-004](004-place-photos-and-places-skus.md)).
2. **Durable per-user quotas** on every billable route: add `translation` (daily) and `location-resolve` (windowed); keep the existing ones. Give quota documents an `expireAt` with a Firestore TTL policy.
3. **Provider-side hard caps and alerts** that work even if the code is wrong:
   - Google Cloud budget alerts
   - Per-day request quotas on Places API (New)
   - A credit limit on the OpenRouter key

Then:

- Keep **one** coarse per-IP limiter as a flood guard.
- Remove HMAC signing, the user-agent/header heuristics, and the role- and method-based limiters.
- Check token revocation only on sensitive writes (saved phrases, user admin).
- **Firebase App Check** (reCAPTCHA) is phase 2: turn it on in monitor mode before public launch, and enforce it if scripted traffic shows up.

## Options Considered

### Option A: Keep the current layers
| Dimension | Assessment |
|-----------|------------|
| Complexity | High (six layers, a boot-time secret) |
| Cost | Free to run, but doesn't cap spend |
| Effectiveness | Low for the in-memory and heuristic layers |
| Team familiarity | High |

**Pros:** no work.
**Cons:** looks protected but isn't; translation and public endpoints stay uncapped; every request pays the revocation round-trip.

### Option B: Shared rate-limit store (Redis / Memorystore) for all limiters
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium–High (new service, networking, VPC connector) |
| Cost | Memorystore has no free tier: a monthly bill from day one |
| Effectiveness | Accurate per-minute limits across instances |
| Team familiarity | Low |

**Pros:** precise, fast limits.
**Cons:** breaks the near-free budget; one more service for one person to run; still doesn't cap provider spend.

### Option C: Identity + durable quotas + provider caps; App Check later (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low (removes code; quota middleware already exists) |
| Cost | One Firestore read + one write per billable call (well inside 50K reads / 20K writes a day); App Check's reCAPTCHA provider has a free tier (check current limits before enforcing) |
| Effectiveness | High: per-account limits that hold across instances, plus hard provider ceilings |
| Team familiarity | High (same patterns already in `durableQuota.js`) |

**Pros:** less code, real limits, a bill that can't run away.
**Cons:** a determined abuser can make many accounts (App Check and provider caps are the backstop); per-minute burst control becomes coarse.

## Trade-off Analysis

The question is "what stops a surprise bill or a scripted user?" Only identity, durable quotas and provider-side caps answer that across instances, and they're cheap. B buys precision you don't need at a price that breaks the budget. A keeps complexity that doesn't protect anything. Removing the signing layer also removes a required secret that has confused setup (`ENVIRONMENT_VARIABLES.md` marks it required).

## Consequences

- **Easier:** reasoning about limits (one place per route); onboarding (one fewer required secret); cheaper authenticated reads (no revocation round-trip).
- **Harder:** any future anonymous feature needs App Check or its own durable quota. A revoked session can keep making *reads* until the ID token expires (about 1 hour).
- **Revisit when:** abuse patterns appear in logs (enforce App Check); traffic needs per-second fairness (re-evaluate a shared store).

## Action Items

1. [ ] *(you)* **Console, 15 min:** add a Google Cloud budget with alerts at, say, $5 / $20 / $50; set per-day request quotas for Places API (New) in Google Cloud quotas; set a credit limit on the OpenRouter API key.
2. [x] Add a translation daily quota (`TRANSLATION_DAILY_QUOTA`, default 200) to `routes/translationRoutes.js`.
3. [x] Require auth plus a per-user hourly quota on `routes/locationRoutes.js` (`LOCATION_RESOLVE_PER_HOUR`, default 60).
4. [x] Add `expireAt` to quota docs in `middleware/durableQuota.js`. [x] TTL policy declared in `firestore.indexes.json` (ADR-004). [ ] *(you)* `firebase deploy --only firestore:indexes`.
5. [x] Delete `validateRequestSignature` usage and the `REQUEST_SIGNING_SECRET` requirement (`app.js`, `config/env.js`, docs, emulator config).
6. [x] Delete `enhancedAuthorization` UA/header heuristics, the role- and method-based limiters, per-route IP limiters, and the in-memory `enforceQuota` duplicates in stays and POI. One flood guard remains (`createApiLimiter`: per user when signed in, per IP otherwise), plus a separate photo bucket until ADR-004. `middleware/userQuota.js` gives each paid route one quota: durable in production, in-memory in dev/test. *Kept on purpose:* the short hourly in-memory limits inside the phrasebook and itinerary controllers (burst control in addition to their daily durable quotas).
7. [x] Change `attachUserContext` to `verifyIdToken(token)` and use `checkRevoked: true` only in `requireAuth` for write and admin routes.
8. [x] Phase 2 code: App Check in the SPA (`services/appCheck.js`, lazy, off unless `VITE_APPCHECK_RECAPTCHA_SITE_KEY` is set) and `middleware/appCheck.js` (monitor mode; `APP_CHECK_ENFORCE=true` to enforce). [ ] *(you)* Register the web app for App Check, then flip enforce once logs are clean.
