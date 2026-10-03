const axios = require("axios");
const { signPhotoUrl } = require("../../lib/photoUrls");
const {
  geocodeAddress,
  readCachedCenter,
  writeCachedCenter,
} = require("../../lib/geocoding");

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_BASE_URL = "https://places.googleapis.com/v1";

// Field masks decide the Places SKU (ADR-004). Keep Atmosphere fields
// (reviews, editorialSummary) out of default calls.
const DETAIL_FIELD_MASK =
  "id,displayName,shortFormattedAddress,formattedAddress,location,types,primaryType,priceLevel,rating,userRatingCount,photos,businessStatus,currentOpeningHours,regularOpeningHours,internationalPhoneNumber,nationalPhoneNumber,websiteUri,googleMapsUri,accessibilityOptions";
const SUMMARY_FIELD_MASK = "id,displayName,location";
const REVIEWS_FIELD_MASK = "id,reviews";

const warned = new Set();
function warnOnce(message) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

if (!GOOGLE_API_KEY) {
  console.warn(
    "[stays] Missing GOOGLE_PLACES_API_KEY. Google Places requests will fail until it is configured."
  );
}

function ensureKey() {
  if (!GOOGLE_API_KEY) {
    const err = new Error(
      "Google Places API key not configured (GOOGLE_PLACES_API_KEY)"
    );
    err.status = 500;
    throw err;
  }
}

function placesHeaders(fieldMask, contentType = "application/json") {
  ensureKey();
  // Field mask should be comma-separated for Places API New
  const fieldMaskValue = Array.isArray(fieldMask) 
    ? fieldMask.join(",") 
    : fieldMask;
  
  const headers = {
    "X-Goog-Api-Key": GOOGLE_API_KEY,
    "X-Goog-FieldMask": fieldMaskValue,
  };
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

const TYPE_ALIASES = {
  hotel: ["hotel"],
  hostel: ["hostel"],
  guesthouse: ["guest_house", "guesthouse", "bed_and_breakfast"],
  motel: ["motel"],
  apartment: ["apartment", "serviced_apartment"],
  resort: ["resort"],
};

const GENERIC_LODGING_TYPES = new Set(["lodging"]);

const AMENITY_TYPE_MAP = {
  spa: "spa",
  gym: "fitness",
  parking: "parking",
  bar: "bar",
  restaurant: "restaurant",
  swimming_pool: "pool",
  laundry: "laundry",
  airport_shuttle: "airport-shuttle",
  breakfast: "breakfast",
  store: "store",
  pet_friendly: "pet-friendly",
  wheelchair_accessible_entrance: "accessible",
};

const PRICE_LABEL_MAP = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

const KNOWN_FEATURES = new Set([
  "wifi",
  "parking",
  "pool",
  "restaurant",
  "bar",
  "fitness",
  "spa",
  "laundry",
  "airport-shuttle",
  "breakfast",
  "store",
  "pet-friendly",
  "accessible",
  "accessible-parking",
  "contactless-payment",
  "operational",
  "temporarily_closed",
  "closed_permanently",
  "open-now",
  "open-24h",
]);

function deg2rad(d) {
  return d * (Math.PI / 180);
}
function kmBetween(a, b) {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const s1 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(a.lat)) *
      Math.cos(deg2rad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
}

function classifyTypes({ types = [], primaryType } = {}) {
  const combined = [];
  if (primaryType) combined.push(primaryType);
  if (Array.isArray(types)) combined.push(...types);
  if (!combined.length) {
    return { primary: "lodging", tags: ["lodging"] };
  }

  const lower = combined.map((t) => t.toLowerCase());
  const tags = new Set();

  for (const [key, aliases] of Object.entries(TYPE_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      tags.add(key);
    }
  }

  if (lower.some((alias) => GENERIC_LODGING_TYPES.has(alias))) {
    tags.add("hotel");
    tags.add("lodging");
  }

  if (!tags.size) tags.add("lodging");

  return {
    primary: tags.values().next().value || "lodging",
    tags: Array.from(tags),
  };
}

function inferType(types = [], primaryType) {
  return classifyTypes({ types, primaryType }).primary;
}

function inferAmenitiesFromTypes(types = []) {
  if (!Array.isArray(types)) return [];
  const lower = types.map((t) => t.toLowerCase());
  const out = new Set();

  Object.entries(AMENITY_TYPE_MAP).forEach(([gType, label]) => {
    if (lower.includes(gType)) out.add(label);
  });

  if (lower.includes("parking") || lower.includes("car_rental")) {
    out.add("parking");
  }
  if (lower.includes("wifi") || lower.includes("internet_cafe")) {
    out.add("wifi");
  }

  return Array.from(out);
}

function collectPlaceFeatures(place = {}) {
  const features = new Set();

  inferAmenitiesFromTypes(place.types).forEach((a) => features.add(a));

  const status = place.businessStatus?.toLowerCase();
  if (status === "operational" || status === "temporarily_closed" || status === "closed_permanently") {
    features.add(status);
  }

  if (place.currentOpeningHours?.openNow) {
    features.add("open-now");
  }

  const weekdayDescriptions =
    place.currentOpeningHours?.weekdayDescriptions ||
    place.regularOpeningHours?.weekdayDescriptions ||
    [];
  if (weekdayDescriptions.some((line) => /24\s*hours/i.test(line || ""))) {
    features.add("open-24h");
  }

  const accessibility = place.accessibilityOptions || {};
  if (accessibility.wheelchairAccessibleEntrance) {
    features.add("accessible");
  }
  if (accessibility.wheelchairAccessibleParking) {
    features.add("accessible-parking");
  }
  if (accessibility.contactlessPayment) {
    features.add("contactless-payment");
  }

  const sorted = Array.from(features);
  sorted.sort((a, b) => {
    const aKnown = KNOWN_FEATURES.has(a) ? 0 : 1;
    const bKnown = KNOWN_FEATURES.has(b) ? 0 : 1;
    if (aKnown !== bKnown) return aKnown - bKnown;
    return a.localeCompare(b);
  });

  return sorted.slice(0, 6);
}

function pricePayload(priceLevel) {
  if (!priceLevel) return null;
  return {
    priceLevel: PRICE_LABEL_MAP[priceLevel] || priceLevel,
    raw: priceLevel,
  };
}

function encodePlacePath(name) {
  return String(name)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

// Photo URLs are signed and expire (ADR-004); see lib/photoUrls.js.
function buildPhotoProxy(name, { maxWidth, maxHeight } = {}) {
  return signPhotoUrl(name, { maxWidth, maxHeight });
}

function parseAddressComponents(components = [], fallbackCity = "") {
  if (!Array.isArray(components) || !components.length) {
    return null;
  }

  const findType = (types = [], target) =>
    Array.isArray(types) && types.some((t) => t.toLowerCase() === target);

  const countryComponent = components.find((c) =>
    findType(c.types, "country")
  );
  const stateComponent =
    components.find((c) =>
      findType(c.types, "administrative_area_level_1")
    ) ||
    components.find((c) =>
      findType(c.types, "administrative_area_level_2")
    );
  const cityComponent =
    components.find((c) => findType(c.types, "locality")) ||
    components.find((c) => findType(c.types, "postal_town")) ||
    components.find((c) =>
      findType(c.types, "administrative_area_level_3")
    );

  const city =
    (cityComponent?.longText || cityComponent?.shortText || "").trim() ||
    fallbackCity.trim();
  const state =
    (stateComponent?.longText || stateComponent?.shortText || "").trim();
  const country =
    (countryComponent?.longText || countryComponent?.shortText || "").trim();

  if (!city && !country) return null;
  return { city, state, country };
}

function parseCityStateCountry(address, fallbackCity = "") {
  if (!address || typeof address !== "string") {
    const label = (fallbackCity || "").trim();
    return { city: label, state: "", country: "" };
  }

  const parts = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!parts.length) {
    const label = (fallbackCity || "").trim();
    return { city: label, state: "", country: "" };
  }

  const country = parts.pop() || "";
  let state = "";
  if (parts.length >= 2) {
    state = parts.pop() || "";
  }

  let city = parts.join(", ");
  if (!city) {
    city = parts[0] || "";
  }
  if (!city && fallbackCity) {
    city = fallbackCity.trim();
  }

  const normalizedCity = city.trim();
  const normalizedCountry = country.trim();

  // If we only have a single segment (no commas) or the country matches the city/query,
  // treat it as a city-only match and leave country empty to avoid mislabeling (e.g., "Mount Rainier").
  const singleSegment = parts.length === 0; // because we popped the only element into country
  const countryEqualsCity =
    normalizedCountry &&
    normalizedCity &&
    normalizedCountry.toLowerCase() === normalizedCity.toLowerCase();
  const countryEqualsFallback =
    normalizedCountry &&
    fallbackCity &&
    normalizedCountry.toLowerCase() === fallbackCity.trim().toLowerCase();

  const safeCountry =
    singleSegment || countryEqualsCity || countryEqualsFallback
      ? ""
      : normalizedCountry;

  return { city: normalizedCity, state: state.trim(), country: safeCountry };
}

function mapPlaceToResult(place, center, language = "en") {
  const latitudeRaw = place.location?.latitude;
  const longitudeRaw = place.location?.longitude;
  const latitude =
    typeof latitudeRaw === "number" ? latitudeRaw : Number(latitudeRaw);
  const longitude =
    typeof longitudeRaw === "number" ? longitudeRaw : Number(longitudeRaw);
  const distanceKm =
    center && latitude != null && longitude != null
      ? Number(
          kmBetween(center, { lat: latitude, lng: longitude }).toFixed(2)
        )
      : null;

  const photos = Array.isArray(place.photos)
    ? place.photos.map((photo) => ({
        name: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
        url: buildPhotoProxy(photo.name, { maxWidth: 640 }),
      }))
    : [];

  const { primary: inferredType, tags: typeTags } = classifyTypes({
    types: place.types,
    primaryType: place.primaryType,
  });

  return {
    id: place.id,
    name: place.displayName?.text || place.displayName || "Accommodation",
    rating: place.rating ?? null,
    reviewsCount: place.userRatingCount ?? null,
    price: pricePayload(place.priceLevel),
    type: inferredType,
    typeTags,
    amenities: collectPlaceFeatures(place),
    location: {
      lat: latitude ?? null,
      lng: longitude ?? null,
      distanceKm,
      address:
        place.shortFormattedAddress ||
        place.formattedAddress ||
        place.displayName?.text ||
        null,
    },
    photos,
    thumbnail: photos[0]?.url || null,
    provider: {
      name: "Google Places",
      deeplink: place.googleMapsUri || null,
    },
    sourceLang: place.displayName?.languageCode || language,
  };
}

function mapPlaceToDetail(place, language = "en") {
  const latitudeRaw = place.location?.latitude;
  const longitudeRaw = place.location?.longitude;
  const latitude =
    typeof latitudeRaw === "number" ? latitudeRaw : Number(latitudeRaw);
  const longitude =
    typeof longitudeRaw === "number" ? longitudeRaw : Number(longitudeRaw);

  const photos = Array.isArray(place.photos)
    ? place.photos.map((photo) => ({
        name: photo.name,
        width: photo.widthPx,
        height: photo.heightPx,
        url: buildPhotoProxy(photo.name, { maxWidth: 1024 }),
      }))
    : [];

  const openingHours =
    place.currentOpeningHours?.weekdayDescriptions ||
    place.regularOpeningHours?.weekdayDescriptions ||
    [];

  const { primary: inferredType, tags: typeTags } = classifyTypes({
    types: place.types,
    primaryType: place.primaryType,
  });

  return {
    id: place.id,
    name: place.displayName?.text || place.displayName || "Accommodation",
    // editorialSummary is an Atmosphere field (ADR-004); POI details fill
    // this from Wikipedia instead.
    description: "",
    rating: place.rating ?? null,
    reviewsCount: place.userRatingCount ?? null,
    price: pricePayload(place.priceLevel),
    amenities: collectPlaceFeatures(place),
    // Loaded on demand from /:id/reviews (Atmosphere SKU, ADR-004).
    reviews: [],
    photos,
    location: {
      lat: latitude ?? null,
      lng: longitude ?? null,
      address:
        place.shortFormattedAddress ||
        place.formattedAddress ||
        place.displayName?.text ||
        null,
    },
    phone:
      place.internationalPhoneNumber ||
      place.nationalPhoneNumber ||
      null,
    website: place.websiteUri || null,
    openingHours,
    provider: {
      name: "Google Places",
      deeplink: place.googleMapsUri || null,
    },
    sourceLang: place.displayName?.languageCode || language,
    type: inferredType,
    typeTags,
    thumbnail: photos[0]?.url || null,
    raw: {
      businessStatus: place.businessStatus,
    },
  };
}

function mapReviews(place = {}) {
  return Array.isArray(place.reviews)
    ? place.reviews.slice(0, 5).map((review) => ({
        author_name:
          review.authorAttribution?.displayName || "Guest reviewer",
        author_uri: review.authorAttribution?.uri || null,
        rating: review.rating ?? null,
        text: review.text?.text || "",
        relative_time_description:
          review.relativePublishTimeDescription || "",
      }))
    : [];
}

// Text Search Pro: the fallback geocoder for queries the Geocoding API can't
// resolve (or when that API isn't enabled for the key).
async function geocodeCityWithTextSearch(cityQuery, language = "en") {
  ensureKey();
  const FIELD_MASK =
    "places.id,places.displayName,places.shortFormattedAddress,places.formattedAddress,places.location,places.addressComponents";
  try {
    const { data } = await axios.post(
      `${PLACES_BASE_URL}/places:searchText`,
      {
        textQuery: cityQuery,
        languageCode: language,
      },
      {
        headers: placesHeaders(FIELD_MASK),
      }
    );

    const place = data?.places?.[0];
    if (!place) throw new Error("Unable to geocode city");

    const lat = Number(place.location?.latitude);
    const lng = Number(place.location?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Unable to geocode city coordinates");
    }

    const displayName =
      place.displayName?.text ||
      place.displayName ||
      place.formattedAddress ||
      place.shortFormattedAddress ||
      cityQuery;
    const formattedAddress =
      place.shortFormattedAddress ||
      place.formattedAddress ||
      place.displayName?.text ||
      cityQuery;
    const parsedFromComponents =
      parseAddressComponents(place.addressComponents, cityQuery) || {};
    const { city, state, country } =
      parsedFromComponents.city || parsedFromComponents.country
        ? parsedFromComponents
        : parseCityStateCountry(
            formattedAddress,
            place.displayName?.text || cityQuery
          );

    return {
      lat,
      lng,
      placeId: place.id || null,
      display: displayName,
      address: formattedAddress,
      city,
      state,
      country,
      source: "places-text-search",
    };
  } catch (error) {
    console.error("Geocode error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      },
    });
    throw new Error(
      error.response?.data?.error?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to geocode city"
    );
  }
}

const POLITICAL_TYPES = new Set([
  "locality",
  "postal_town",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "country",
  "colloquial_area",
  "sublocality",
  "neighborhood",
]);

async function geocodeCityWithGeocodingApi(cityQuery, language = "en") {
  const result = await geocodeAddress(cityQuery, language);
  const parsed =
    parseAddressComponents(result.addressComponents, cityQuery) ||
    parseCityStateCountry(result.formattedAddress, cityQuery);
  // Geocoding has no display name. For places (cities, regions) use the
  // matched name; for addresses and landmarks keep what the user typed.
  const isPlace = result.types.some((t) => POLITICAL_TYPES.has(t));
  const display = isPlace
    ? parsed.city || parsed.state || parsed.country || cityQuery
    : cityQuery;
  return {
    lat: result.lat,
    lng: result.lng,
    placeId: result.placeId,
    display,
    address: result.formattedAddress || display,
    city: parsed.city || "",
    state: parsed.state || "",
    country: parsed.country || "",
    source: "geocoding",
  };
}

// Statuses where Places Text Search may still succeed.
const TEXT_SEARCH_FALLBACK = new Set(["ZERO_RESULTS", "REQUEST_DENIED"]);

/**
 * Resolve a free-text city/place to coordinates and address parts.
 * GEOCODER=geocoding (default) uses the Geocoding API and falls back to Places
 * Text Search on ZERO_RESULTS or REQUEST_DENIED; GEOCODER=places uses Text
 * Search only.
 */
async function geocodeCity(cityQuery, language = "en") {
  ensureKey();
  if ((process.env.GEOCODER || "geocoding").toLowerCase() === "places") {
    return geocodeCityWithTextSearch(cityQuery, language);
  }
  try {
    return await geocodeCityWithGeocodingApi(cityQuery, language);
  } catch (error) {
    if (!TEXT_SEARCH_FALLBACK.has(error.code)) throw error;
    if (error.code === "REQUEST_DENIED") {
      warnOnce(
        `[geocode] Geocoding API denied the request (${error.message}). Enable the Geocoding API for this key; using Places Text Search meanwhile.`
      );
    }
    return geocodeCityWithTextSearch(cityQuery, language);
  }
}

function defaultDb() {
  return require("../../config/firebaseAdmin").db;
}

/**
 * Coordinates only, with a Firestore cache of up to 29 days (lat/lng and place
 * ID are the only content the terms allow us to store). For callers that don't
 * need the address, such as itinerary grounding.
 */
async function geocodeCenter(query, language = "en", { db = defaultDb() } = {}) {
  try {
    const hit = await readCachedCenter(db, query, language);
    if (hit) return { ...hit, display: query, cached: true };
  } catch (error) {
    console.warn("[geocode] cache read failed:", error.message);
  }
  const result = await geocodeCity(query, language);
  try {
    await writeCachedCenter(db, query, language, result);
  } catch (error) {
    console.warn("[geocode] cache write failed:", error.message);
  }
  return {
    lat: result.lat,
    lng: result.lng,
    placeId: result.placeId || null,
    display: result.display || query,
    cached: false,
  };
}

async function nearbyLodging({
  lat,
  lng,
  radiusMeters = 5000,
  language = "en",
}) {
  ensureKey();
const FIELD_MASK =
    "places.id,places.displayName,places.shortFormattedAddress,places.formattedAddress,places.location,places.types,places.primaryType,places.priceLevel,places.rating,places.userRatingCount,places.photos,places.businessStatus,places.currentOpeningHours,places.regularOpeningHours,places.googleMapsUri,places.accessibilityOptions";

  try {
    // Google Places API New expects locationRestriction with circle structure
    // Based on API docs, the field should be "radius" not "radiusMeters"
    const requestBody = {
      languageCode: language,
      includedTypes: ["lodging"],
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius: Math.min(radiusMeters, 50000), // Use "radius" field (not radiusMeters)
        },
      },
      maxResultCount: 20, // Limit results per request
    };

    const { data } = await axios.post(
      `${PLACES_BASE_URL}/places:searchNearby`,
      requestBody,
      {
        headers: placesHeaders(FIELD_MASK),
      }
    );

    return data?.places || [];
  } catch (error) {
    console.error("Nearby lodging error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      request: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        headers: {
          "X-Goog-Api-Key": error.config?.headers?.["X-Goog-Api-Key"] ? "***" : "missing",
          "X-Goog-FieldMask": error.config?.headers?.["X-Goog-FieldMask"],
        },
      },
    });
    throw new Error(
      error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to search nearby lodging"
    );
  }
}

async function fetchById(placeId, language = "en") {
  ensureKey();
  // Ensure placeId has the 'places/' prefix if not already present
  let placePath = placeId;
  if (!placeId.startsWith("places/")) {
    placePath = `places/${placeId}`;
  }

  const FIELD_MASK = DETAIL_FIELD_MASK;

  try {
    const { data } = await axios.get(
      `${PLACES_BASE_URL}/${encodePlacePath(placePath)}`,
      {
        headers: placesHeaders(FIELD_MASK, null),
        params: {
          languageCode: language,
        },
      }
    );

    if (!data) return null;
    return mapPlaceToDetail(data, language);
  } catch (error) {
    console.error("Fetch by ID error:", {
      message: error.message,
      placeId,
      placePath,
      response: error.response?.data,
      status: error.response?.status,
      request: {
        url: error.config?.url,
        method: error.config?.method,
        headers: {
          "X-Goog-Api-Key": error.config?.headers?.["X-Goog-Api-Key"] ? "***" : "missing",
          "X-Goog-FieldMask": error.config?.headers?.["X-Goog-FieldMask"],
        },
      },
    });
    throw new Error(
      error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to fetch place details"
    );
  }
}

function toPlacePath(placeId) {
  const id = String(placeId);
  return encodePlacePath(id.startsWith("places/") ? id : `places/${id}`);
}

async function getPlace(placeId, fieldMask, language) {
  ensureKey();
  const { data } = await axios.get(`${PLACES_BASE_URL}/${toPlacePath(placeId)}`, {
    headers: placesHeaders(fieldMask, null),
    params: { languageCode: language },
  });
  return data || null;
}

// Name and coordinates only (Place Details Pro), e.g. to ground an itinerary.
async function fetchPlaceSummary(placeId, language = "en") {
  const place = await getPlace(placeId, SUMMARY_FIELD_MASK, language);
  if (!place) return null;
  const lat = Number(place.location?.latitude);
  const lng = Number(place.location?.longitude);
  return {
    id: place.id,
    name: place.displayName?.text || place.displayName || "Destination",
    location:
      Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
  };
}

// Reviews are an Atmosphere field, so they're fetched only when a user asks.
async function fetchReviewsById(placeId, language = "en") {
  const place = await getPlace(placeId, REVIEWS_FIELD_MASK, language);
  if (!place) return null;
  return { id: place.id, reviews: mapReviews(place) };
}

module.exports = {
  geocodeCity,
  geocodeCenter,
  fetchPlaceSummary,
  fetchReviewsById,
  DETAIL_FIELD_MASK,
  nearbyLodging,
  toResultItem: mapPlaceToResult,
  fetchById,
  ensureKey,
  buildPhotoProxy,
  GOOGLE_API_KEY,
  PLACES_BASE_URL,
};
