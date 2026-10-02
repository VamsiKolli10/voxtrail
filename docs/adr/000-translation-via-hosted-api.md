# ADR-000: Translate through a hosted API, not an in-function model

**Status:** Accepted (recorded retroactively, 2026-10-02)
**Date:** decided before 2026-10; recorded 2026-10-02
**Deciders:** Vamsi Kolli

> `translationController.js` cites this decision as "ADR-EVAL-1", but that document was never committed. This record captures the reasoning from that code comment.

## Context

An earlier version ran a local Hugging Face / Xenova translation model inside the Cloud Function, falling back to OpenRouter. Cloud Functions bill memory × duration and scale to zero. Loading the model added about 29 s to every cold start and used far more of the free tier than a short outbound API call.

## Decision

Translation is a stateless call to a hosted provider. There is no model inside the function.

## Options Considered

### Option A: In-function model (previous)
**Pros:** no per-call provider cost; works without network egress.
**Cons:** about 29 s cold starts; large memory setting; slow responses at low traffic, where instances are usually cold.

### Option B: Hosted API (chosen)
**Pros:** fast cold starts; small memory footprint; pay per use.
**Cons:** depends on a third-party provider and its limits.

## Trade-off Analysis

At low, bursty traffic most requests hit a cold instance, so cold-start cost dominates. A hosted call is both cheaper and faster in that regime.

## Consequences

- Translation quality, limits and cost now depend on the chosen provider. Which provider is decided in [ADR-003](003-ai-provider-strategy.md).
- Revisit only if traffic becomes high and steady enough to keep instances warm, *and* provider cost exceeds the cost of warm instances.

## Action Items

1. [x] Remove the in-function model (done).
2. [ ] Change the code comment in `translationController.js` from "ADR-EVAL-1" to `docs/adr/000-translation-via-hosted-api.md`.
