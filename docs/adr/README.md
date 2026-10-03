# Architecture Decision Records

Short records of significant technical decisions: the context, the options considered, what was chosen, and the consequences. The overall picture lives in [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).

| # | Decision | Status | Date |
|---|----------|--------|------|
| [000](000-translation-via-hosted-api.md) | Translate through a hosted API, not an in-function model | Accepted (retroactive) | 2026-10-02 |
| [001](001-api-runtime-2nd-gen.md) | Run the API on Cloud Functions 2nd gen | Accepted (cutover pending) | 2026-10-02 |
| [002](002-abuse-and-cost-protection.md) | Abuse & cost protection: auth + durable quotas + App Check + provider caps | Accepted (console steps pending) | 2026-10-02 |
| [003](003-ai-provider-strategy.md) | AI provider strategy: paid low-cost default with a budget | Accepted (console steps pending) | 2026-10-02 |
| [004](004-place-photos-and-places-skus.md) | Google Places: no Atmosphere by default, cached geocoding, signed photo URLs | Accepted (console steps pending) | 2026-10-02 |
| [005](005-frontend-server-state.md) | Frontend server state with TanStack Query | Accepted | 2026-10-02 |
| [006](006-emergency-data-offline.md) | Emergency data: split, lazy-load, precache offline | Accepted | 2026-10-02 |

## Process

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to `NNN-short-title.md` with the next number.
2. Open it as **Proposed**. Change it to **Accepted** once the implementing PR merges (or **Rejected**, keeping the file).
3. Never rewrite an accepted ADR. Supersede it with a new one and link both ways.

Statuses: Proposed · Accepted · Rejected · Deprecated · Superseded by NNN
