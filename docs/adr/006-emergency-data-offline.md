# ADR-006: Emergency data — split, lazy-load, and precache for offline use

**Status:** Proposed
**Date:** 2026-10-02
**Deciders:** Vamsi Kolli

## Context

The Emergency page imports two data modules (`Emergency.jsx:27-28`):

| Module | Size | Contents |
|--------|-----:|----------|
| `emergencyNumbersByCountry.js` | 53 kB | Police/ambulance/fire numbers per country, which is what the page is for |
| `emergencyLocationAliases.js` | **2.2 MB** | 37,427 aliases (multilingual country and city names) → 252 countries, used to match free-text searches |

Both are bundled into the route chunk: **1.56 MB minified, 269 kB gzip**, the largest asset in the app. A traveller on a weak roaming connection, possibly in an emergency, downloads and parses all of it before seeing a single phone number. The page also has no offline support: if the network drops, it can't load at all, though the numbers rarely change. The app has no service worker today; offline support exists only for saved phrases (IndexedDB).

Constraints: near-free budget (static assets on Hosting are effectively free); solo maintainer; real users soon.

## Decision

1. **Show the numbers first.** `emergencyNumbersByCountry` stays in the route chunk, and the country for the current travel context resolves without aliases.
2. **Load aliases lazily as compact JSON.** Convert them to `{ countries: [...], aliases: [[name, countryIndex], ...] }` (measured: 653 kB raw / **231 kB gzip / 192 kB brotli**). Serve it as a static, long-cached file and `fetch` it only when the user types in the search box.
3. **Precache for offline use** with a service worker (`vite-plugin-pwa`, Workbox). Include the Emergency route chunk, the numbers, and the alias JSON, so the page works offline after one online visit. Use `registerType: "prompt"` so users choose when to reload into a new version.

## Options Considered

### Option A: Status quo
| Dimension | Assessment |
|-----------|------------|
| Complexity | None |
| Performance | 269 kB gzip + parsing 1.56 MB of JS before first paint of the page |
| Offline | None |

### Option B: Server-side alias lookup (`/api/emergency/resolve`)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low–Medium |
| Performance | Tiny client payload |
| Offline | **Worse**: search needs the network, which is exactly what may be missing |
| Cost | A function call per search |

### Option C: Split + lazy JSON + service-worker precache (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium (build script for the JSON; PWA plugin and update prompt) |
| Performance | Numbers visible right after the small route chunk; aliases load in the background or on first keystroke |
| Offline | Full Emergency page after the first visit |
| Cost | Static Hosting bandwidth only |

### Option D: Replace country aliases with `Intl.DisplayNames`
Browsers can name countries in many languages (`new Intl.DisplayNames([lang], { type: "region" })`), which could replace most of the multilingual *country* aliases at 0 kB. City aliases would still need data, and coverage depends on the browser. Worth a follow-up spike to shrink the JSON, but not a replacement on its own.

## Trade-off Analysis

The Emergency page should be fastest when the network is worst, so B moves in the wrong direction. A ships the cost to every visitor. C makes the critical information (numbers) immediate, defers the convenience data (aliases), and adds offline support, at the cost of maintaining a service worker. That cost is acceptable because the plugin handles precache manifests and the update prompt avoids stale-version surprises.

## Consequences

- **Easier:** the Emergency page loads quickly and works offline; other routes can opt in to offline later (saved phrases, phrasebook) with the same service worker.
- **Harder:** releases now involve cache versioning. Test the "new version available" flow, and never cache `/api/*` responses in the service worker without an explicit decision (auth and user data).
- **Revisit when:** alias data changes often (then version the JSON by hash); or Option D's spike shows aliases can shrink below ~50 kB gzip, making precache-everything trivial.

## Action Items

1. [ ] Add `scripts/build-emergency-aliases.mjs` that writes `public/data/emergency-aliases.v1.json` from the current module; delete the 2.2 MB JS module.
2. [ ] In `Emergency.jsx`, `fetch` the aliases on first search input (memoize; show "Loading place names…" if a search starts before they arrive); keep numbers imported statically.
3. [ ] Add `vite-plugin-pwa` (`registerType: "prompt"`, precache the Emergency chunk and `data/emergency-aliases.*.json`; no runtime caching for `/api/**`); add an "Update available" toast using the existing `NotificationProvider`.
4. [ ] Add a Hosting header for `/data/**`: `Cache-Control: public, max-age=31536000, immutable` (file names are versioned).
5. [ ] Test: offline reload of `/emergency` after one visit (Playwright `context.setOffline(true)`).
6. [ ] Spike Option D and record the result here.
