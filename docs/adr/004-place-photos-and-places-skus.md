# ADR-004: Google Places — no Atmosphere by default, cached geocoding, signed photo URLs

**Status:** Proposed
**Date:** 2026-10-02
**Deciders:** Vamsi Kolli

## Context

Google Places API (New) bills per call. The **SKU is set by the fields you request**, so the same endpoint can cost very different amounts ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing), [field → SKU map](https://developers.google.com/maps/documentation/places/web-service/nearby-search)). Today:

| Call | Code | Fields that set the SKU | SKU | Free / mo | Per 1,000 |
|------|------|-------------------------|-----|---------:|---------:|
| City lookup | `geocodeCity` → `places:searchText` (`googlePlaces.js:457`) | displayName, formattedAddress, location | Text Search Pro | 5,000 | $32 |
| Stays search | `places:searchNearby` (`googlePlaces.js:539`) | rating, userRatingCount, priceLevel, opening hours | Nearby Search Enterprise | 1,000 | $35 |
| Explore search | `searchNearbyPoi` (`googlePlacesPoi.js:159`) | rating + **editorialSummary** | Nearby Search Enterprise + Atmosphere | 1,000 | $40 |
| Stay details | place details (`googlePlaces.js:601`) | **reviews**, **editorialSummary** | Place Details Enterprise + Atmosphere | 1,000 | $25 |
| Each photo | public proxy `/api/stays/photo` (`staysRoutes.js:79`) | — | Place Details Photos | 1,000 | $7 |

Problems:
- **Photos.** They're the first free cap to run out (5 per results page), and the proxy is **public**. Anyone with a photo name can make the API fetch photos at the project's cost; the per-IP limit is 300/min per instance and is exempt from the other limiters. Every photo also takes up a function instance while streaming ([ADR-001](001-api-runtime-2nd-gen.md)).
- **Caching may not be allowed.** Photo responses are marked `public, max-age=3600`, so the Hosting CDN may cache them. Google's [service terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) explicitly allow only caching lat/lng (up to 30 days) and place IDs; caching photo bytes isn't one of the listed allowances.

Constraints: near-free budget, real users soon. Ratings and price level matter when choosing lodging.

## Decision

1. **City lookup uses the Geocoding API** ($5, 10,000 free), with lat/lng cached in Firestore for up to 30 days (allowed by §6.3.1 of the terms). Repeat lookups for the same city then cost nothing.
2. **No Atmosphere fields in default calls.** Remove `editorialSummary` from Explore search and `reviews`/`editorialSummary` from stay details. Load reviews only when the user opens a "Reviews" section, as a separate call.
3. **Keep Enterprise fields on stays search.** Rating and price stay on stay cards: the UX value is worth $3/1,000 more than Pro, and it's a deliberate choice.
4. **Signed, expiring photo URLs.** Search and details responses (already authenticated) return photo URLs carrying an HMAC signature and an expiry, made with a server-only secret. The photo endpoint rejects unsigned or expired URLs. Responses are `Cache-Control: private` (browser only) until the caching terms are confirmed. Images use `loading="lazy"`, and details pages load only the first photo until the user advances the carousel.

## Options Considered

### Option A: Status quo
| Dimension | Assessment |
|-----------|------------|
| Complexity | None |
| Cost | ~$0.15 per stays session past free caps; public photo endpoint open to abuse |
| Risk | Photo caching may breach the terms |

### Option B: Pro-only fields everywhere (no rating/price on lists)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | Lowest: Nearby Search Pro has 5,000 free / $32 |
| UX | Worse: lodging lists without rating or price |

**Pros:** biggest free allowance. **Cons:** removes the information people use to choose a stay.

### Option C: Targeted trims + cached geocoding + signed photo URLs (chosen)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low–Medium (field masks, a geocode cache collection, sign/verify helpers; `utils/security.js` already has `createSignature`/`verifySignature`) |
| Cost | ~$0.10 per stays session past free caps (vs ~$0.15); repeat city lookups free for 30 days |
| Risk | Closes the open photo proxy; caching stays within the terms |
| Team familiarity | High |

### Option D: Client loads Google's `photoUri` directly (`skipHttpRedirect=true`)
**Pros:** no bytes through the function.
**Cons:** the browser still needs an authenticated call per photo to get the URI; the URIs are short-lived; the Places call is billed the same. It saves instance time but not money, and adds a round-trip per image.

## Trade-off Analysis

C removes the cost that adds nothing (Atmosphere fields nobody sees until they ask, Text Search where Geocoding is enough, and open photo access). It keeps the cost that pays for itself (ratings on stays). B saves a little more money at a real UX cost. D optimizes compute, which ADR-001 already fixes, not spend. Signing the photo URLs reuses the existing HMAC helpers for something they actually suit: the secret never leaves the server.

## Consequences

- **Easier:** predicting Places spend (a fixed set of SKUs per user action); no anonymous photo traffic.
- **Harder:** photo URLs expire, so a page left open for hours needs a refresh to reload images (pick an expiry of about 1–6 hours). Reviews cost an extra call when opened.
- **Revisit when:** monthly volume passes the free caps (then compare a lodging-specific data provider); or Google changes field → SKU mapping.

## Action Items

1. [ ] Add `providers/geocoding.js` (Geocoding API) and a `geocodeCache` Firestore collection keyed by normalized query + language, with `expireAt` (TTL ≤ 30 days) storing lat/lng and place ID only. Switch `geocodeCity` callers to it.
2. [ ] Remove `places.editorialSummary` from `googlePlacesPoi.js:159` and `reviews*`/`editorialSummary` from `googlePlaces.js:601`; add `GET /api/stays/:id/reviews` (authenticated, durable quota) and a "Show reviews" control on stay details.
3. [ ] Add `signPhotoUrl(name, { maxWidth, expiresAt })` / `verifyPhotoUrl(query)` using a new `PHOTO_URL_SECRET` (Secret Manager, ADR-001). Build signed URLs in `googlePlaces.js` and `googlePlacesPoi.js`; reject unsigned or expired requests in `staysRoutes.js:79`.
4. [ ] Change the photo response to `Cache-Control: private, max-age=3600` until caching terms are confirmed; add `loading="lazy"` to `PhotoCarousel` and Explore card images.
5. [ ] Record actual SKU usage for a week in the Google Cloud console and update the cost table in `ARCHITECTURE.md`.
