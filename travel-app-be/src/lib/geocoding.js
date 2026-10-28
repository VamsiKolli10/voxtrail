// City lookups through the Geocoding API (ADR-004): $5 per 1,000 with 10,000
// free a month, against $32 per 1,000 (5,000 free) for Places Text Search Pro.
//
// Caching follows the Google Maps Platform service terms: latitude/longitude
// may be cached for up to 30 days and place IDs indefinitely; other returned
// content (addresses, names) may not be stored. So the Firestore cache keeps
// only { lat, lng, placeId } and serves callers that need coordinates only.
const axios = require("axios");
const crypto = require("node:crypto");

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const CACHE_COLLECTION = "geocodeCache";
// Firestore TTL deletes expired documents within about a day, so expire at
// 29 days to stay inside the 30-day allowance.
const MAX_CACHE_DAYS = 29;

class GeocodeError extends Error {
  constructor(status, message) {
    super(message || `Geocoding failed: ${status}`);
    this.name = "GeocodeError";
    this.code = status;
  }
}

function toPlacesComponents(components = []) {
  return components.map((c) => ({
    longText: c.long_name,
    shortText: c.short_name,
    types: c.types || [],
  }));
}

async function geocodeAddress(
  query,
  language = "en",
  { apiKey = process.env.GOOGLE_PLACES_API_KEY, timeout = 8000 } = {}
) {
  if (!apiKey) {
    throw new GeocodeError("NOT_CONFIGURED", "GOOGLE_PLACES_API_KEY is missing");
  }
  const { data } = await axios.get(GEOCODE_URL, {
    params: { address: query, language, key: apiKey },
    timeout,
  });
  if (data?.status !== "OK" || !data.results?.length) {
    throw new GeocodeError(data?.status || "UNKNOWN_ERROR", data?.error_message);
  }
  const result = data.results[0];
  const lat = Number(result.geometry?.location?.lat);
  const lng = Number(result.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new GeocodeError("INVALID_RESULT", "Geocoding returned no coordinates");
  }
  return {
    lat,
    lng,
    placeId: result.place_id || null,
    formattedAddress: result.formatted_address || "",
    addressComponents: toPlacesComponents(result.address_components),
    types: result.types || [],
  };
}

function cacheTtlMs() {
  const days = Number(process.env.GEOCODE_CACHE_TTL_DAYS);
  const safeDays =
    Number.isFinite(days) && days > 0 ? Math.min(days, MAX_CACHE_DAYS) : MAX_CACHE_DAYS;
  return safeDays * 24 * 60 * 60 * 1000;
}

// The document ID is a hash, so the cache doesn't store what users typed.
function cacheKey(query, language) {
  const normalized = String(query || "").trim().toLowerCase().replace(/\s+/g, " ");
  return crypto
    .createHash("sha256")
    .update(`${String(language || "en").toLowerCase()}::${normalized}`)
    .digest("hex")
    .slice(0, 40);
}

async function readCachedCenter(db, query, language, now = Date.now()) {
  const snap = await db.collection(CACHE_COLLECTION).doc(cacheKey(query, language)).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const expireAt = data.expireAt?.toMillis?.() ?? new Date(data.expireAt).getTime();
  if (!Number.isFinite(expireAt) || expireAt <= now) return null;
  if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null;
  return { lat: data.lat, lng: data.lng, placeId: data.placeId || null };
}

async function writeCachedCenter(db, query, language, { lat, lng, placeId }, now = Date.now()) {
  await db
    .collection(CACHE_COLLECTION)
    .doc(cacheKey(query, language))
    .set({
      lat,
      lng,
      placeId: placeId || null,
      expireAt: new Date(now + cacheTtlMs()),
    });
}

module.exports = {
  geocodeAddress,
  GeocodeError,
  readCachedCenter,
  writeCachedCenter,
  cacheKey,
  CACHE_COLLECTION,
};
