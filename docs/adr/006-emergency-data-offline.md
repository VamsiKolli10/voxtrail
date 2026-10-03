# ADR-006: Emergency data — split, lazy-load, and precache for offline use

**Status:** Accepted
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

## Results (2026-10-03)

| | Before | After |
|---|---:|---:|
| Emergency route chunk | 1.56 MB (269 kB gzip) | **50 kB (13 kB gzip)** |
| Place-name data | inside the chunk | `public/data/emergency-aliases.v1.json`, 694 kB (230 kB gzip), fetched on first city search |
| Offline | none | whole app shell after one online visit (map bundle excluded) |

## Implementation notes

- **Conversion:** a one-time script turned `src/data/emergencyLocationAliases.js` into `public/data/emergency-aliases.v1.json` (`{ version, countries, aliases: [name, countryIndex][] }`, 37,426 aliases, one case-insensitive duplicate dropped, order kept so partial matching behaves as before). The JSON is now the source of truth, so the 2.2 MB module is deleted and no build script is kept; `src/services/__tests__/emergencyAliasesData.test.js` checks the file's shape. Change it → bump the file name (`v2`), since it's served `immutable`.
- **Numbers first:** an exact country name, or the travel context's country, resolves from `emergencyNumbersByCountry` with no download. Otherwise `services/emergencyAliases.js` fetches the JSON once (memoized; a failure can be retried) and the original alias → partial alias → country matching runs. Focusing the search box starts the download early; the helper text says "Loading place names…". If the file can't be loaded, search falls back to country names and geocoding and says city search is limited.
- **Service worker:** `vite-plugin-pwa` (Workbox, `registerType: "prompt"`, `manifest: false`). It precaches 46 files (2.2 MB raw, roughly 700 kB over the wire) and excludes the 1 MB map bundle. The ADR planned to precache only the Emergency chunk; that was widened to the whole app shell because the Emergency route also needs the entry, vendor and shared chunks, and precaching one consistent version avoids missing old chunks after a deploy. **No runtime caching** at all; navigation fallback skips `/api/` and Firebase's reserved `/__/` paths (sign-in handlers). `components/common/UpdatePrompt.jsx` (production builds only) shows "A new version is available · Reload", and switches to the waiting version if a lazy chunk from the old one fails to load.
- **Offline sign-in:** `AuthContext` used to sign users out when `reload()`/`getIdToken(true)` failed, which happens whenever the device is offline, so the Emergency page was unreachable offline even with the page cached. Network errors (`auth/network-request-failed`, or `navigator.onLine === false`) now keep the saved session; other token errors still sign out.
- **Hosting headers** (`travel-app-be/firebase.json`): `/assets/**` and `/data/**` are `public, max-age=31536000, immutable`; `/sw.js` is `no-cache`.
- **Verified** with Playwright against the production build: the service worker installs and precaches 46 entries; offline, a reload serves the app, `/emergency` loads from cache, the alias JSON is served (37,426 entries), `/api/*` is not cached, and `/__/auth/handler` is not intercepted.
- **Option D spike:** with `Intl.DisplayNames` in 37 locales, 212 of 252 countries map to a region code, but only 2,576 of 37,426 aliases (7%) are browser-generated country names; the rest are cities and regions. The file would shrink from 230 to 212 kB gzip. Not worth the extra code; the aliases stay as data.

## Action Items

1. [x] Convert the aliases to `public/data/emergency-aliases.v1.json`; delete the 2.2 MB module (one-time conversion; see notes).
2. [x] Fetch aliases on first search (memoized, with a loading hint); numbers stay static.
3. [x] `vite-plugin-pwa` with the update prompt; no runtime caching for `/api/**`.
4. [x] Hosting `Cache-Control` for `/data/**` (and `/assets/**`, `/sw.js`).
5. [x] Offline reload of `/emergency` checked with Playwright against the production build (manual script; the e2e suite doesn't exist yet). Unit tests cover the lazy loading and offline sign-in.
6. [x] Option D spike (see notes): rejected.
7. [ ] Product decision: Emergency still requires sign-in. Consider making it a public route so travellers can reach numbers without an account.
8. [ ] Optional: add a web app manifest with PNG icons so the app can be installed.
