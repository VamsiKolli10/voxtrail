const axios = require("axios");

// Reuse common config from stays Google Places provider
const {
  ensureKey,
  buildPhotoProxy,
  GOOGLE_API_KEY,
  PLACES_BASE_URL,
} = require("../../stays/providers/googlePlaces");

function placesHeaders(fieldMask, contentType = "application/json") {
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

// Only allow types that are supported by Places API (New) includedTypes
const ALLOWED_TYPES = new Set([
  "tourist_attraction",
  "museum",
  "park",
  "art_gallery",
  "restaurant",
  "cafe",
]);

// Category → includedTypes (filtered to allowed)
const CATEGORY_MAP = {
  museum: ["museum", "art_gallery"],
  // Be strict for hike: only true parks to avoid museums and stadiums
  hike: ["park"],
  viewpoint: ["tourist_attraction"],
  food: ["restaurant", "cafe"],
};

const DEFAULT_TYPES = Array.from(ALLOWED_TYPES);

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

function mapPlaceToPoiCard(place, center, language = "en") {
  const latitudeRaw = place.location?.latitude;
  const longitudeRaw = place.location?.longitude;
  const lat = typeof latitudeRaw === "number" ? latitudeRaw : Number(latitudeRaw);
  const lng = typeof longitudeRaw === "number" ? longitudeRaw : Number(longitudeRaw);

  const distanceKm =
    center && Number.isFinite(lat) && Number.isFinite(lng)
      ? Number(kmBetween(center, { lat, lng }).toFixed(2))
      : null;

  const photos = Array.isArray(place.photos)
    ? place.photos.map((p) => ({
        name: p.name,
        width: p.widthPx,
        height: p.heightPx,
        url: buildPhotoProxy(p.name, { maxWidth: 640 }),
      }))
    : [];

  const categories = Array.isArray(place.types)
    ? place.types.map((t) => t.toLowerCase())
    : [];

  const openingNow = Boolean(place.currentOpeningHours?.openNow);

  const badges = [];
  const weekdayDescriptions =
    place.currentOpeningHours?.weekdayDescriptions ||
    place.regularOpeningHours?.weekdayDescriptions || [];
  if (weekdayDescriptions.some((line) => /mon(day)?\s*:\s*closed/i.test(String(line)))) {
    badges.push("Closed Mondays");
  }
  if (categories.includes("tourist_attraction") || categories.includes("natural_feature")) {
    badges.push("Best at sunset");
  }

  // Heuristic duration suggestion by category
  let suggestedDuration = "<2h";
  if (categories.includes("museum") || categories.includes("art_gallery")) {
    suggestedDuration = "half-day";
  } else if (categories.includes("park") || categories.includes("natural_feature")) {
    suggestedDuration = "half-day";
  }

  return {
    id: place.id,
    name: place.displayName?.text || place.displayName || "Attraction",
    blurb: place.editorialSummary?.text || place.editorialSummary?.overview || "",
    rating: place.rating ?? null,
    reviewsCount: place.userRatingCount ?? null,
    photos,
    thumbnail: photos[0]?.url || null,
    categories,
    openingHours: weekdayDescriptions,
    openNow: openingNow,
    wheelchairAccessibleEntrance: place.accessibilityOptions?.wheelchairAccessibleEntrance ?? null,
    suggestedDuration,
    badges,
    location: {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      distanceKm,
      address:
        place.shortFormattedAddress ||
        place.formattedAddress ||
        place.displayName?.text ||
        null,
    },
    provider: {
      name: "Google Places",
      deeplink: place.googleMapsUri || null,
    },
    sourceLang: place.displayName?.languageCode || language,
  };
}

async function geocodeText(text, language = "en") {
  ensureKey();
  const FIELD_MASK =
    "places.id,places.displayName,places.shortFormattedAddress,places.formattedAddress,places.location";
  const { data } = await axios.post(
    `${PLACES_BASE_URL}/places:searchText`,
    { textQuery: text, languageCode: language },
    { headers: placesHeaders(FIELD_MASK) }
  );
  const place = data?.places?.[0];
  if (!place) throw new Error("Unable to geocode text");
  const lat = Number(place.location?.latitude);
  const lng = Number(place.location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Unable to geocode coordinates");
  }
  return { lat, lng };
}

async function searchNearbyPoi({ lat, lng, radiusMeters = 5000, language = "en", categories = [] }) {
  ensureKey();
  const FIELD_MASK =
    "places.id,places.displayName,places.shortFormattedAddress,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos,places.googleMapsUri,places.currentOpeningHours,places.regularOpeningHours,places.editorialSummary,places.accessibilityOptions";

  let includedTypes = [];
  const wanted = Array.isArray(categories) ? categories : String(categories || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (wanted.length) {
    wanted.forEach((c) => (CATEGORY_MAP[c] || []).forEach((t) => includedTypes.push(t)));
  }
  // Filter to allowed types only (avoid provider errors like "Unsupported types: ...")
  includedTypes = includedTypes.filter((t) => ALLOWED_TYPES.has(t));
  if (!includedTypes.length) includedTypes.push(...DEFAULT_TYPES);

  const requestBody = {
    languageCode: language,
    includedTypes: Array.from(new Set(includedTypes)),
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusMeters, 50000),
      },
    },
    // Google Places (New) enforces 1..20 inclusive
    maxResultCount: 20,
  };

  const { data } = await axios.post(
    `${PLACES_BASE_URL}/places:searchNearby`,
    requestBody,
    { headers: placesHeaders(FIELD_MASK) }
  );
  return data?.places || [];
}

function applySmartFilters(items, { kidFriendly, accessibility, openNow, timeNeeded, cost, categoriesWanted }) {
  let result = items;
  // Category refinement: keep only items matching selected categories
  const wanted = Array.isArray(categoriesWanted)
    ? categoriesWanted.filter(Boolean)
    : String(categoriesWanted || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (wanted.length) {
    const matchesCategory = (item) => {
      const t = new Set((item.categories || []).map((x) => x.toLowerCase()));
      // museum: only museum or art_gallery
      if (wanted.includes("museum") && (t.has("museum") || t.has("art_gallery"))) return true;
      // food: restaurant or cafe
      if (wanted.includes("food") && (t.has("restaurant") || t.has("cafe"))) return true;
      // hike: require park
      if (wanted.includes("hike") && t.has("park")) return true;
      // viewpoint: allow broader scenic categories
      if (wanted.includes("viewpoint")) {
        if (t.has("tourist_attraction") || t.has("park") || t.has("natural_feature")) return true;
      }
      return false;
    };
    result = result.filter(matchesCategory);
  }
  if (openNow === "true" || openNow === true) {
    result = result.filter((i) => i.openNow);
  }
  if (accessibility === "true" || accessibility === true) {
    result = result.filter((i) => i.wheelchairAccessibleEntrance === true);
  }
  if (kidFriendly === "true" || kidFriendly === true) {
    result = result.filter((i) => !i.categories.includes("bar") && !i.categories.includes("night_club"));
  }
  if (timeNeeded) {
    const wanted = String(timeNeeded);
    result = result.filter((i) => i.suggestedDuration === wanted);
  }
  if (cost) {
    // Heuristic: treat museums as paid, parks/natural_feature as free
    const isFree = (i) => i.categories.includes("park") || i.categories.includes("natural_feature");
    if (String(cost).toLowerCase() === "free") result = result.filter(isFree);
    if (String(cost).toLowerCase() === "paid") result = result.filter((i) => !isFree(i));
  }
  return result;
}

module.exports = {
  geocodeText,
  searchNearbyPoi,
  mapPlaceToPoiCard,
  applySmartFilters,
};
