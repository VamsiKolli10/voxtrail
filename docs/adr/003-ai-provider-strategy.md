# ADR-003: AI provider strategy — machine translation for /translate, budgeted paid LLM for generation

**Status:** Accepted (console steps pending)
**Date:** 2026-10-02
**Deciders:** Vamsi Kolli

## Context

Every AI feature calls OpenRouter through `src/lib/openrouterClient.js`: translation, phrasebook generation, culture briefs and Q&A, and itineraries.

- **Default model is free.** `.env.example` sets `OPENROUTER_MODEL=x-ai/grok-4.1-fast:free`. OpenRouter limits free variants to **20 requests/min and 50 requests/day per account** (1,000/day after buying ≥ 10 credits) ([OpenRouter limits](https://openrouter.ai/docs/api-reference/limits)). That allowance is shared by *all* users. The per-user daily quotas (phrasebooks 20, itineraries 25, culture 30) assume far more capacity than the account has.
- **The fallback model ID looks invalid.** `FALLBACK_MODEL = "gpt-4o-mini"` (`openrouterClient.js:4`) is always appended to the chain, but OpenRouter model IDs are vendor-prefixed (`openai/gpt-4o-mini`). Because 404 counts as retryable, an exhausted free model probably ends in a failure, not a fallback. This needs a live check.
- **Translation is the most frequent call.** It's short (≤ 500 chars), has no durable quota ([ADR-002](002-abuse-and-cost-protection.md)), and only knows four language labels (`LANG_LABELS`: en/es/fr/de). Sending user text to an LLM as "text to translate" is also open to prompt injection ("ignore the above and …").
- Constraints: near-free budget, real users soon, solo maintainer. [ADR-000](000-translation-via-hosted-api.md) already rules out models inside the function.

## Decision

1. **`/api/translate` uses Google Cloud Translation (Basic, NMT).** It authenticates with the function's service account (no new key). The free tier is 500,000 characters/month as a $10 monthly credit, then $20 per million characters ([pricing](https://cloud.google.com/translate/pricing)).
2. **Generation stays on OpenRouter with a paid, low-cost default model** and a *valid* vendor-prefixed fallback. Cost is bounded by:
   - a credit limit on the OpenRouter key
   - existing per-user daily quotas
   - `max_tokens` on every call

   Free `:free` models remain allowed for local development only.

## Options Considered

### Option A: Free OpenRouter models for everything (status quo)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | $0 |
| Scalability | 50 requests/day for the whole app (1,000 with ≥ 10 credits); free variants can disappear without notice |
| Team familiarity | High |

**Pros:** free.
**Cons:** a handful of users exhausts the day; failures surface as broken features; fallback misconfigured.

### Option B: Paid low-cost LLM for everything, translation included
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low (config change plus fixing the fallback ID) |
| Cost | Low per call; bounded by the credit limit |
| Scalability | Paid-tier limits |
| Team familiarity | High |

**Pros:** one provider; the smallest change.
**Cons:** translation stays slow (seconds), non-deterministic and injectable; quality varies by model and language.

### Option C: Machine translation for /translate, paid LLM for generation (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low–Medium (one new provider module, behind the existing controller) |
| Cost | Translation: about 10,000 typical phrases/month free (~50 chars each), then $20 per million characters. Generation: low per call, capped by credit limit and quotas |
| Scalability | Cloud Translation is built for high QPS; LLM load drops to the features that need it |
| Team familiarity | Medium (Google Cloud client library; same GCP project) |

**Pros:** fast, deterministic translation in 100+ languages; immune to prompt injection; frees LLM budget for generation, where an LLM adds real value.
**Cons:** two providers to monitor; NMT won't add tone or usage notes (the phrasebook feature already covers that).

## Trade-off Analysis

Option A fails the "real users" constraint by design. B is the quickest fix, but keeps an LLM on the hottest path where a purpose-built service is cheaper per call, faster, and safer. C costs about a day and makes translation reliable inside a free tier sized for this project. Generation stays on OpenRouter, where the fallback chain and quotas already exist.

## Consequences

- **Easier:** adding languages to Translate (no prompt labels); predictable translation latency; an AI budget that is visible and capped.
- **Harder:** two provider integrations and two sets of limits to monitor.
- **Revisit when:** translation volume nears 500K chars/month; or a single LLM becomes cheap and fast enough that one provider beats two.

## Verification (2026-10-02)

Checked against OpenRouter's public model endpoints API (no key needed):

| Model ID | Result |
|----------|--------|
| `x-ai/grok-4.1-fast:free` (old `.env.example` default) | Listed, but **no endpoints**: every request fails |
| `gpt-4o-mini` (old implicit fallback) | **Not found**: IDs must be vendor-prefixed, so this always returned 404 |
| `openai/gpt-4o-mini` | Available; $0.15 input / $0.60 output per million tokens |
| `google/gemini-2.5-flash-lite` | Available; about $0.10 / $0.40 per million tokens; supports `response_format` |

So with the old defaults, every AI call in production most likely failed: the primary had no endpoints and the fallback did not exist. Prices change; check before choosing.

## Implementation notes

- `src/lib/openrouterClient.js`: no built-in model. `getModelChain()` reads `OPENROUTER_MODEL_CHAIN` (and legacy `OPENROUTER_MODEL` as the primary), drops IDs without a vendor prefix, and drops `:free` IDs outside development/test unless `OPENROUTER_ALLOW_FREE_MODELS=true`. An empty chain throws `AiNotConfiguredError`; routes answer **503 `SERVICE_UNAVAILABLE`** (itineraries fall back to the POI-backed plan, culture briefs to cache/static content), and the API logs one error at boot.
- The chain falls through only on 404/408/429/5xx and network errors; 400/401/402/403 stop it.
- `max_tokens` per feature: translation 400, quick culture Q&A and contextual tips 600, phrasebook 1,500, culture brief 2,000, itinerary 2,500 (default `OPENROUTER_MAX_TOKENS` 1,500).
- `src/lib/googleTranslate.js` calls the Cloud Translation v2 REST API with `google-auth-library` (already in the tree through `firebase-admin`) instead of `@google-cloud/translate`, which would add a gRPC stack for one call. `TRANSLATION_PROVIDER` (`google` default, or `openrouter`) and `TRANSLATION_FALLBACK` (`openrouter` default, or `none`) select the providers; responses report `provider: "google" | "openrouter" | "cache"`.
- The language list grew from 4 to 15 (every pair: 210), in `src/config/translationLanguages.js` and the SPA's `constants/languages.js`.

## Action Items

1. [x] **Verify** the fallback (see Verification above).
2. [x] Drop the implicit fallback and require `OPENROUTER_MODEL_CHAIN`; `:free` models are for development only.
3. [x] Add `max_tokens` per feature; stop treating 403 (bad key/permission) as retryable.
4. [ ] **Console:** set a credit limit on the OpenRouter key (see ADR-002 action 1).
5. [x] Add `lib/googleTranslate.js` used by `translationController`, with OpenRouter as a fallback behind `TRANSLATION_FALLBACK`.
6. [ ] **Console:** enable the Cloud Translation API and grant the function's service account `roles/cloudtranslate.user`. (The durable translation quota shipped with ADR-002.)
7. [x] Expand the language list in the SPA. Works before step 6 too: OpenRouter handles these languages while Cloud Translation is off.
8. [ ] After one release on Cloud Translation with no fallbacks logged, consider `TRANSLATION_FALLBACK=none`.
