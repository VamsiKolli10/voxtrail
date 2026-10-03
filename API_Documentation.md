# VoxTrail API reference

Updated October 2, 2026. Base URL: `/api` on Firebase Hosting or `http://localhost:8000/api` locally. This describes current source behavior; [PROJECT_AUDIT.md](PROJECT_AUDIT.md) records validation and limitations.

## Authentication, validation and errors

Protected routes require `Authorization: Bearer <Firebase ID token>`. Tokens are verified for expiry on every request and for revocation on writes and admin routes. `/location/resolve` and `/translate` require sign-in and have per-user quotas (429 `RATE_LIMIT_EXCEEDED` when exhausted). Users need the `user` or `admin` role for travel tools; `/profile` accepts any authenticated role and user administration requires `admin`.

Optional header: `X-Firebase-AppCheck` (Firebase App Check token). The API logs requests without a valid token and rejects them only when `APP_CHECK_ENFORCE=true`. Request signatures (`x-request-signature`) are no longer used.

JSON bodies use `Content-Type: application/json`. Query validation applies parsed types/defaults and strips unknown fields. Numeric latitude/longitude may be zero; blank or repeated numeric parameters are rejected. Boolean filters accept the strings `true` and `false` (or JSON booleans). Validation failures return 400.

Errors use:

```json
{
  "status": "error",
  "error": { "code": "BAD_REQUEST", "message": "Provide a location query" }
}
```

Validation errors may include `error.details`. Server errors hide internal diagnostic details outside development. Responses carry request IDs for diagnostics. A 401 requires reauthentication, 403 indicates forbidden access, 429 indicates throttling/quota exhaustion, and 502/503 commonly indicate unavailable providers.

## Throttles

Limits layer: global role limits (anonymous 20, user 60, admin 120 per minute), method limits (GET 100, POST 50, PUT 30, PATCH 20, DELETE 10 per minute), endpoint IP limits and production durable user quotas. IP limits use the client address and IPv6 subnet grouping; they are per process. The first exhausted limit wins, so a larger endpoint allowance does not override a smaller global allowance. Photo requests bypass role/method limits but retain their endpoint/global controls.

Standard `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` and `RateLimit-Policy` headers are emitted by limiters; minute-limit rejections include `Retry-After`. Legacy `X-RateLimit-*` headers are disabled. Headers describe the emitting limiter, not all durable quota windows.

| Operation | Endpoint allowance per minute | Additional route IP allowance |
| --- | --- | --- |
| Translation | 30 | — |
| Phrasebook generation | 10 | — |
| Stays search | 40 | 15 |
| Stays details | — | 30 |
| Photo proxy | 300 | — |
| POI search | 60 | 30 |
| POI details | — | 60 |
| Itinerary generation | 12 | — |
| Culture brief / legacy brief | — | 20 anonymous / 40 user / 80 admin |
| Culture Q&A / contextual tips | — | 10 / 60 |
| Location resolution | 60 | — |
| User administration | 20 | — |

Production also enforces durable Firestore quotas, including phrasebooks 20/day, itineraries 25/day, culture generation 30/day shared across routes, stays search 60/hour and POI search 120/hour by default. Details have separate quotas. See [environment configuration](ENVIRONMENT_VARIABLES.md) for overrides.

## Public infrastructure and location endpoints

| Method / path | Behavior |
| --- | --- |
| `GET /healthz`, `/api/healthz` | Liveness: `{ "status": "ok" }`; outside travel API throttles |
| `GET /readyz`, `/api/readyz` | Firestore readiness, cached briefly; 200 ready or 503 unready |
| `GET /api/translate/health` | Translation configuration status; does not exercise live inference |
| `GET /api/location/resolve` | Text destination geocoding; query aliases `query`, `q`, `dest` (1–200 characters), optional `lang` (max 12) |
| `GET /api/stays/photo` | Places photo proxy. Serves only the signed, expiring URLs (`name`, `maxWidth`/`maxHeight`, `exp`, `sig`) returned in search/details responses; anything else gets 403 `FORBIDDEN`. `Cache-Control: private` (ADR-004) |

Location response includes `query`, `display`, `lat`, `lng`, address/city/state/country and optional `cached`. Repeated/non-string query or language parameters are rejected. The photo proxy requires a configured provider key. Photo URLs expire after 3–6 hours; a page left open longer needs a reload to show images. There is no translation warmup route in the current API.

## Protected travel endpoints

### Translation

`POST /api/translate`

```json
{ "text": "Hello, how are you?", "langPair": "en-es" }
```

`text`: nonempty, maximum 500 characters. `langPair`: two distinct codes separated by a hyphen, from `en`, `es`, `fr`, `de`, `it`, `pt`, `hi`, `zh`, `ja`, `ko`, `ar`, `ru`, `tr`, `th`, `id` (all 210 directed pairs). Google Cloud Translation supplies translations, with OpenRouter as a fallback (ADR-003). Response:

```json
{ "translation": "Hola, ¿cómo estás?", "provider": "google" }
```

`provider` is `google`, `openrouter` (fallback) or `cache`. A total operation timeout aborts upstream translation requests. Unsupported pairs return 400; provider failure returns a structured error, not translated text.

### Phrasebooks and saved phrases

`POST /api/phrasebook/generate`: `topic` (1–160 characters), distinct `sourceLang` and `targetLang` (language code or name), optional numeric `count` (1–25). Returns phrases with `phrase`, `transliteration`, `meaning` and `usageExample`.

| Method / path | Contract |
| --- | --- |
| `GET /api/saved-phrases` | Current owner's collection as `{ "items": [...] }`, default limit 200 |
| `POST /api/saved-phrases` | Required `phrase` (max 160), `meaning` (280), `usageExample` (360), `targetLang`; optional `transliteration` (160), `topic` (120), `sourceLang`; returns `{ "id": "..." }` |
| `DELETE /api/saved-phrases/:id` | Delete only the current owner's phrase; returns `{ "ok": true }` |

Persistence uses `users/{uid}/saved_phrases`. Browser clients use the API instead of direct Firestore access.

### Stays

`GET /api/stays/search`: supply `dest` (max 200 characters) or both `lat` (-90 to 90) and `lng` (-180 to 180). Optional `distance` (positive km, max 500), `rating` (0–5), `type`, `amenities`, `lang`, `page` (1–200, default 1), `pageSize` (1–50), `checkInDate`, `checkOutDate`, `adults` (1–12).

Returns `items`, pagination metadata and, when destination text is resolved, `resolvedDestination`. Items include ID/name, provider rating/photos, location and provider links. `GET /api/stays/:id` returns provider details; `reviews` is always empty and `description` is empty (both are Atmosphere-tier fields, ADR-004). `GET /api/stays/:id/reviews?lang=en` returns `{ id, reviews }` (up to 5, each with `author_name`, `author_uri`, `rating`, `text`, `relative_time_description`) and shares a per-user quota (`PLACE_REVIEWS_PER_HOUR`, default 30) with the POI version.

Google Places supplies accommodation discovery, not real-time inventory or bookings. Dates/guest count do not establish availability; price level is not a verified nightly price. Radius may be clamped by the provider. Page size is part of the result cache key.

### Points of interest

`GET /api/poi/search`: same destination/coordinate requirement, optional `distance` (max 200 km), `category` (comma-separated museum, hike, viewpoint, food), `kidFriendly`, `accessibility`, `openNow`, `timeNeeded`, `cost`, `lang`, `page` (default 1).

Returns `items`, pagination metadata and optional `resolvedDestination`. Cards include `name`, `blurb` (currently always empty: editorial summaries cost an extra Places tier), `rating`, `reviewsCount`, `categories`, `photos`, `openingHours`, `openNow`, `suggestedDuration`, `badges`, `location`, `provider`, `sourceLang` and nullable `wheelchairAccessibleEntrance`.

`accessibility=true` selects only confirmed wheelchair-accessible entrances; false/unknown values are excluded. It does not certify full venue accessibility. `kidFriendly` excludes bars/nightclubs; cost and suggested duration are heuristics. `openNow=true` selects reported open places. `GET /api/poi/:id?lang=en` returns details (description from Wikipedia when available). `GET /api/poi/:id/reviews?lang=en` returns reviews on demand, as for stays.

### Itineraries

`POST /api/itinerary/generate` is preferred; `GET` with query parameters remains supported. Supply `placeId`, `dest`, or `lat`/`lng`. Optional `days` (1–30), `budget`, `pace`, `season`, comma-separated `interests` and `lang`. Controllers normalize planning preferences. Returns destination/parameters, day blocks and tips; fallback content can be returned when `ITINERARY_ENABLE_FALLBACK` is enabled. Provider-generated plans require traveler review.

## Culture endpoints

Authentication is required outside `test`/`development` for all these endpoints. Legacy and modern brief routes share throttles/authentication/durable quota.

| Method / path | Input |
| --- | --- |
| `GET /api/culture/brief` | Required `destination`; optional `culture`, `language`, `refresh`/`forceRefresh` |
| `GET /api/cultural-etiquette` | Legacy brief alias; same access protections |
| `POST /api/culture/qa` | Required `question` (max 500), optional `destination` (200), `language` |
| `POST /api/culture/contextual` | Required `contextType`: translation, phrasebook, poi or stay; optional destination/language plus context fields |

Briefs return destination/culture/language, category lists and generated time, cached in `cultureIntelligenceBriefs` for 24 hours by namespace version. Q&A returns answer/highlights. Current Q&A validation does not retain `history` or `culture`; clients must not rely on them. Contextual input supports `text`, language pair, `topic`, up to ten phrase strings, structured `poi`/`stay` and `metadata`, and returns tips/severity.

## Profile and administration

`GET /api/profile` returns the authenticated profile. `GET /api/users`, `POST /api/users`, and `GET /api/metrics/perf` require admin access. User writes validate email, optional uid/name/roles/settings and reject unknown fields. Performance metrics represent the current API instance.

## Example client

```javascript
const response = await fetch('/api/stays/search?dest=Paris&distance=3', {
  headers: { Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
});
const body = await response.json();
if (!response.ok) throw new Error(body.error?.message || 'Search failed');
```

Apply the same bearer header to translation, phrasebooks, saved phrases, POI, itineraries and production culture calls. Keep real tokens out of logs and source files.
