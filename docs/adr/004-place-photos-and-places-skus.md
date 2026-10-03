# ADR-004: Google Places — no Atmosphere by default, cached geocoding, signed photo URLs

**Status:** Accepted (console steps pending)
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

## Implementation notes

- **Geocoding.** `geocodeCity` (`stays/providers/googlePlaces.js`) calls the Geocoding API (`lib/geocoding.js`) and falls back to Places Text Search on `ZERO_RESULTS` (fuzzy or landmark queries) or `REQUEST_DENIED` (API not enabled for the key, logged once). Other errors such as `OVER_QUERY_LIMIT` are not retried on the pricier SKU. `GEOCODER=places` restores Text Search only.
- **What the cache can hold.** The terms allow caching lat/lng (≤ 30 days) and place IDs, not addresses or names. So the Firestore `geocodeCache` stores `{ lat, lng, placeId, expireAt }` under a hash of the query (29-day TTL, since TTL deletion can lag a day), and only callers that need coordinates use it (`geocodeCenter`, used by itineraries). Location resolve, stays and Explore searches still need city and country for the travel context, so they call Geocoding each time, behind the existing short in-memory caches. The saving there comes from the cheaper SKU ($5 vs $32 per 1,000; 10,000 vs 5,000 free).
- **Explore** now checks its result cache *before* geocoding.
- **Itinerary grounding** by place ID uses a name+location mask (Place Details Pro) instead of the full details call.
- **Details** drop `reviews` and `editorialSummary` (Enterprise instead of Enterprise + Atmosphere). Stays lose their "About" text; destinations keep theirs from Wikipedia. Explore cards lose `blurb`.
- **Reviews** load on demand from `GET /api/stays/:id/reviews` and `GET /api/poi/:id/reviews` (mask `id,reviews`, shared per-user quota `PLACE_REVIEWS_PER_HOUR`, 15-minute in-memory cache). The SPA shows a "Show reviews" button (`components/common/PlaceReviews.jsx`), with author links and "Reviews from Google" attribution.
- **Signed photo URLs** (`lib/photoUrls.js`): HMAC over name, size and expiry. The key is derived from `GOOGLE_PLACES_API_KEY` (already a server-only secret on every instance) unless `PHOTO_URL_SECRET` is set, so no new secret has to be created or bound. Expiry snaps to half-TTL steps so a photo keeps the same URL for a while and browser caching works; URLs live 3–6 hours by default. Size is capped at 1,600 px.
- **Caching:** photo responses are `Cache-Control: private, max-age ≤ 3600`. Images use `loading="lazy"`; the carousel already renders one photo at a time.
- **TTL policies** for `usageQuotas.expireAt` and `geocodeCache.expireAt` are declared in `firestore.indexes.json`, so they deploy with the indexes rather than as a console step.

## Action Items

1. [x] Geocoding API + `geocodeCache` (lat/lng and place ID only, see notes). [ ] *(you)* Enable the **Geocoding API** and allow it on the Places key.
2. [x] Remove Atmosphere fields from Explore search and details; add the on-demand reviews endpoints and "Show reviews".
3. [x] Signed, expiring photo URLs; unsigned or expired requests get 403. (Key derived from the Places key instead of a new `PHOTO_URL_SECRET`.)
4. [x] `Cache-Control: private`; `loading="lazy"` on the carousel and Explore cards.
5. [ ] *(you)* Record actual SKU usage for a week in the Google Cloud console and update the cost table in `ARCHITECTURE.md`.
6. [ ] *(you)* `firebase deploy --only firestore:indexes` to create the TTL policies.
