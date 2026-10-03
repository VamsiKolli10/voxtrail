# ADR-005: Frontend server state with TanStack Query; slim Redux to client state

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** Vamsi Kolli

## Context

The SPA has three state mechanisms that overlap:

- **Redux Toolkit + redux-persist** (`src/store/`). Six slices, but only two do anything: `travelContext` (126 lines, persisted) and `auth` (27 lines, mirrored from `AuthContext`). `app`, `translation`, `phrasebook` and `accommodation` are 11-line stubs that no component reads.
- **React contexts:** Auth, Appearance, FeatureFlags, Analytics, Notification.
- **Server data fetched by hand in each page.** 14 page files manage their own `loading`/`error` state with `useState`. Several pages add request-sequence guards (`latestSearch`, request IDs; 16 references) so slow responses don't overwrite newer ones; several of those guards were added in the Codex audit after real bugs. Nothing caches a response between pages, retries, or refetches stale data.

The agent docs (`CLAUDE.md`) claim "React Query: Server state management", but it isn't installed.

Constraints: solo maintainer; a learning/portfolio project where idiomatic patterns matter; real users soon (flaky mobile networks while travelling).

## Decision

Adopt **TanStack Query** for all server data. Wrap the existing `services/*.js` functions as `queryFn`/`mutationFn` without rewriting them. Keep Redux only for `travelContext` (client state shared across pages and persisted). Delete the four stub slices and read the user from `AuthContext` instead of the mirrored `auth` slice. Migrate one page at a time, starting with Explore and Stays.

## Options Considered

### Option A: Status quo
| Dimension | Assessment |
|-----------|------------|
| Complexity | Grows with each page: hand-rolled loading/error/race handling |
| Cost | None |
| Behavior | No caching across navigation; each fix (races, stale data) repeated per page |
| Team familiarity | High |

### Option B: RTK Query
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium: define an API slice and endpoints; custom `baseQuery` for the Axios client and token |
| Cost | No new dependency (RTK is installed) |
| Behavior | Caching, dedupe, invalidation by tags |
| Team familiarity | Medium |

**Pros:** no new library; fits the existing store.
**Cons:** every service must be re-declared as an endpoint; ties server state to Redux, the part of the stack that's shrinking.

### Option C: TanStack Query + slim Redux (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low per page: `useQuery({ queryKey, queryFn: () => service(...) })` |
| Cost | One dependency |
| Behavior | Caching, dedupe, retries, stale-while-revalidate, and out-of-order responses handled by query keys (the per-page race guards go away); optional persistence for offline |
| Team familiarity | Medium; the most widely used option, so good for a portfolio |

**Pros:** incremental (services unchanged); deletes code; makes the docs true.
**Cons:** two state tools during migration; query keys need a convention.

### Option D: SWR
Similar to C with a smaller API, but weaker mutation and offline-persistence support. TanStack's mutation and persistence features match planned needs (saved phrases, offline).

## Trade-off Analysis

The pain is server state: races, no caching, repeated loading code. Client state isn't the problem. C solves the server-state problem without touching the services layer and lets Redux shrink to one slice. B solves the same problem but needs more rewriting and couples it to Redux. A keeps paying the "fix it in every page" cost that the audit already ran into.

## Consequences

- **Easier:** going back to a page shows cached data instantly; retries on flaky networks; one pattern for loading/error states (pairs with `EmptyState` and skeletons from the design system); fewer race-condition bugs.
- **Harder:** cache invalidation must be thought through for mutations (save/delete phrase → invalidate `["savedPhrases"]`).
- **Revisit when:** `travelContext` is the only Redux slice left. Then consider moving it to a small context with `localStorage` and removing Redux and redux-persist.

## Implementation notes

- **Client:** `src/services/queryClient.js`, provided in `main.jsx`. Queries: `staleTime` 60 s, `gcTime` 10 min, retry twice except on 4xx, **no refetch on window focus** (most queries are billed Places/AI calls). Mutations **don't retry**: "save phrase" isn't idempotent, so a retry after a lost response could save twice (the ADR's `retry: 1` was dropped for that reason).
- **Keys:** `src/services/queryKeys.js` (`["poi", "search", params]`, `["stays", "detail", id, lang]`, `["savedPhrases", "list", uid]`, …). Services take `{ signal }` so abandoned requests are cancelled.
- **Explore and Stays search:** the page keeps the last submitted search in state; `useQuery` with that search as the key and `keepPreviousData`. The `latestSearch` request-ID guards are gone. Side effects of a finished search (travel context, recent activity, analytics) run once per search, not again for cache hits or background refetches. Re-running a failed search retries it; re-running a successful one uses the cache. Stays paging is derived from the cached result instead of copied into state.
- **Also migrated:** stay and destination details, on-demand reviews (`PlaceReviews`), and the Home profile greeting. Home used to `dispatch(setUser(profile))`, which replaced the signed-in user (dropping `emailVerified`) with the `/profile` payload; it now reads the profile from its own query.
- **Saved phrases:** `hooks/useSavedPhrases.js`: `useQuery` (`networkMode: "always"`; the query function falls back to the IndexedDB snapshot when offline or on error) plus `useMutation` for add/remove, which update the list immediately and invalidate `["savedPhrases"]`. Coming back online refetches. Translation's "save" invalidates the same key.
- **`persistQueryClient` evaluated, not adopted:** it would write every cached query to disk, including Google Places responses and their expiring signed photo URLs, which the Maps terms don't allow storing (ADR-004). The account-scoped saved-phrase snapshot stays.
- **Redux:** only `travelContext` remains. The four stub slices and `authSlice` are deleted; auth state lives in `AuthContext` (`useReducer`), and `Navbar`, `Home` and `LogoutButton` use `useAuth()`. Signing out or switching accounts clears the query cache.

## Action Items

1. [x] Add `@tanstack/react-query`; one `QueryClient` (see notes for the retry change).
2. [x] Query-key factories in `src/services/queryKeys.js`.
3. [x] Migrate Explore and Stays search; delete their sequence guards; tests green (plus race and cache tests).
4. [x] Saved phrases with `useQuery` + `useMutation`; `persistQueryClient` evaluated and rejected (see notes).
5. [x] Delete the stub slices and `authSlice`; use `useAuth()`.
6. [ ] Update `AGENTS.md` to describe the real state model (with the agent-docs cleanup).
7. [ ] Later: migrate the remaining hand-rolled fetches (culture guide, emergency, itinerary panel) as those pages are touched. Then reconsider replacing Redux + redux-persist for `travelContext` with a small context.
