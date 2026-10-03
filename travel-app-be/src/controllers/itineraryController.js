const { chatComplete } = require("../lib/openrouterClient");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const {
  fetchById: fetchPlaceById,
  geocodeCity,
} = require("../stays/providers/googlePlaces");
const {
  searchNearbyPoi,
  mapPlaceToPoiCard,
  applySmartFilters,
} = require("../poi/providers/googlePlacesPoi");
const { enforceQuota } = require("../utils/quota");
const { trackExternalCall } = require("../utils/monitoring");

const itineraryLimit = Number(
  process.env.ITINERARY_MAX_REQUESTS_PER_HOUR || 20
);
const itineraryWindow = Number(
  process.env.ITINERARY_WINDOW_MS || 60 * 60 * 1000
);
const itineraryCacheTtlMs = Number(
  process.env.ITINERARY_CACHE_TTL_MS || 5 * 60 * 1000
);
const itineraryCacheMax = Number(process.env.ITINERARY_CACHE_MAX || 200);

// Simple in-memory LRU-ish cache to avoid repeated upstream calls for identical requests
const itineraryCache = new Map(); // key -> { value, expiresAt }

const makeCacheKey = ({
  placeId,
  dest,
  lat,
  lng,
  days,
  budget,
  pace,
  season,
  interests,
  lang,
  provider,
}) =>
  JSON.stringify({
    placeId: placeId || null,
    dest: dest || null,
    lat: Number.isFinite(lat) ? Number(lat.toFixed(4)) : null,
    lng: Number.isFinite(lng) ? Number(lng.toFixed(4)) : null,
    days,
    budget,
    pace,
    season,
    interests,
    lang,
    provider: provider || "openrouter",
  });

const getCachedItinerary = (key) => {
  if (!key) return null;
  const entry = itineraryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    itineraryCache.delete(key);
    return null;
  }
  // Refresh recency for simple LRU behaviour
  itineraryCache.delete(key);
  itineraryCache.set(key, entry);
  return entry.value;
};

const setCachedItinerary = (key, value) => {
  if (!key || !value) return;
  while (itineraryCache.size >= itineraryCacheMax) {
    const firstKey = itineraryCache.keys().next().value;
    itineraryCache.delete(firstKey);
  }
  itineraryCache.set(key, {
    value,
    expiresAt: Date.now() + itineraryCacheTtlMs,
  });
};

function sanitizeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function toInt(v, d = 1) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

function parseInterests(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function sampleItinerary({ destination, days, budget, pace, season, interests }) {
  const blocksPerDay = pace === "packed" ? 5 : pace === "relaxed" ? 3 : 4;
  const interestsList = parseInterests(interests);

  const mkBlock = (idx) => ({
    title: `Activity ${idx + 1}`,
    description: `Suggested activity aligned with ${
      interestsList[ idx % Math.max(1, interestsList.length) ] || "sightseeing"
    }`,
    area: "Central",
    time: ["Morning", "Midday", "Afternoon", "Evening", "Night"][idx % 5],
    cost: budget,
    tags: interestsList.slice(0, 3),
    poiIds: [],
  });

  const daysArr = Array.from({ length: days }).map((_, d) => ({
    day: d + 1,
    blocks: Array.from({ length: blocksPerDay }).map((__, i) => mkBlock(i)),
  }));

  return {
    destination,
    params: { days, budget, pace, season, interests },
    days: daysArr,
    tips: [
      "Group nearby activities to reduce transit time",
      "Book popular attractions in advance",
      "Plan meals near POIs to save time",
    ],
  };
}

async function poiBackedItinerary({
  destination,
  days,
  budget,
  pace,
  season,
  interests,
  lang,
}) {
  const blocksPerDay = pace === "packed" ? 5 : pace === "relaxed" ? 3 : 4;
  const centerLat = destination?.location?.lat;
  const centerLng = destination?.location?.lng;
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
    return sampleItinerary({ destination, days, budget, pace, season, interests });
  }

  const categoriesWanted = parseInterests(interests);
  let items = [];
  try {
    const raw = await searchNearbyPoi({
      lat: centerLat,
      lng: centerLng,
      radiusMeters: 12000,
      language: lang,
      categories: categoriesWanted,
    });
    const mapped = raw.map((p) =>
      mapPlaceToPoiCard(p, { lat: centerLat, lng: centerLng }, lang)
    );
    // Deduplicate by id to improve variety across days
    const seen = new Set();
    items = mapped.filter((p) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    items = applySmartFilters(items, { categoriesWanted });
  } catch (e) {
    logError(e, { endpoint: "/api/itinerary/generate", note: "poi fallback fetch failed" });
  }

  if (!items.length) {
    return sampleItinerary({ destination, days, budget, pace, season, interests });
  }

  // Shuffle once to avoid same ordering on every day
  items = items
    .map((p) => ({ p, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ p }) => p);

  const slots = ["Morning", "Midday", "Afternoon", "Evening", "Night"];
  const categoryOrder =
    categoriesWanted.length > 0
      ? categoriesWanted
      : ["museum", "viewpoint", "hike", "food"];

  // Bucket items by primary category for better variety
  const hasCategory = (poi, c) => {
    const cats = (poi.categories || []).map((x) => x.toLowerCase());
    if (c === "food") return cats.includes("restaurant") || cats.includes("cafe");
    if (c === "museum") return cats.includes("museum") || cats.includes("art_gallery");
    if (c === "hike") return cats.includes("park") || cats.includes("natural_feature");
    if (c === "viewpoint") return cats.includes("tourist_attraction") || cats.includes("park") || cats.includes("natural_feature");
    return false;
  };

  const buckets = new Map();
  const pointers = new Map();
  categoryOrder.forEach((c) => buckets.set(c, []));
  buckets.set("other", []);
  items.forEach((poi) => {
    const bucketKey = categoryOrder.find((c) => hasCategory(poi, c)) || "other";
    buckets.get(bucketKey).push(poi);
  });
  buckets.forEach((arr, key) => pointers.set(key, 0));

  // Helper to rotate through a preferred bucket; if not available, fall back to any bucket.
  const takePoi = (preferredCat, dayUsedIds) => {
    const tryFromBucket = (cat) => {
      const arr = buckets.get(cat) || [];
      if (!arr.length) return null;
      let ptr = pointers.get(cat) || 0;
      const len = arr.length;
      for (let i = 0; i < len; i++) {
        const idx = (ptr + i) % len;
        const candidate = arr[idx];
        if (!candidate?.id || !dayUsedIds.has(candidate.id)) {
          pointers.set(cat, (idx + 1) % len);
          return candidate;
        }
      }
      return null;
    };

    let picked = tryFromBucket(preferredCat);
    if (picked) return picked;
    for (const cat of categoryOrder) {
      picked = tryFromBucket(cat);
      if (picked) return picked;
    }
    picked = tryFromBucket("other");
    return picked || items[0];
  };

  const step = Math.max(1, Math.floor(items.length / days) || 1);
  const dayPlans = Array.from({ length: days }).map((_, d) => {
    const dayUsedIds = new Set();
    const nonFoodCats = categoryOrder.filter((c) => c !== "food");
    const hasFood = categoryOrder.includes("food");
    const maxFoodPerDay =
      !hasFood || !nonFoodCats.length
        ? blocksPerDay
        : Math.max(1, Math.floor(blocksPerDay / 2));

    // Build a per-day preferred category sequence:
    // - If food + others: breakfast food, then rotate non-food, sprinkle food every 3rd slot up to maxFoodPerDay.
    // - If only one category: repeat it.
    // - Else: simple rotation of categoriesWanted.
    const preferredCats = [];
    if (hasFood && nonFoodCats.length) {
      let foodCount = 0;
      let nfIdx = d % nonFoodCats.length;
      for (let i = 0; i < blocksPerDay; i++) {
        if (i === 0 && foodCount < maxFoodPerDay) {
          preferredCats.push("food");
          foodCount++;
          continue;
        }
        // Prefer non-food rotation
        const cat = nonFoodCats[nfIdx % nonFoodCats.length];
        preferredCats.push(cat);
        nfIdx++;
        // Every 3rd slot, add a food slot if we still have room and space left
        if (
          preferredCats.length < blocksPerDay &&
          preferredCats.length % 3 === 0 &&
          foodCount < maxFoodPerDay
        ) {
          preferredCats.push("food");
          foodCount++;
        }
      }
      // If we still have capacity for food and not enough slots, replace last slot with food
      if (preferredCats.length === blocksPerDay && foodCount < maxFoodPerDay) {
        preferredCats[preferredCats.length - 1] = "food";
      }
    } else {
      for (let i = 0; i < blocksPerDay; i++) {
        preferredCats.push(categoryOrder[i % categoryOrder.length]);
      }
    }

    return {
      day: d + 1,
      blocks: Array.from({ length: blocksPerDay }).map((__, i) => {
        // Rotate categories across slots and days to improve diversity
        const cat = preferredCats[i] || categoryOrder[(d * blocksPerDay + i) % categoryOrder.length];
        const poi =
          takePoi(cat, dayUsedIds) ||
          takePoi(categoryOrder[(d + i) % categoryOrder.length], dayUsedIds) ||
          items[(d * step + i) % items.length];
        if (poi?.id) dayUsedIds.add(poi.id);
        const tags = (poi.categories || [])
          .slice(0, 3)
          .map((t) => t.replace(/_/g, " "))
          .map((t) => t.charAt(0).toUpperCase() + t.slice(1));
        return {
          title: poi.name,
          description:
            poi.blurb ||
            `Explore ${poi.name} for ${categoriesWanted[0] || "local highlights"}.`,
          area: poi.location?.address || destination?.name || "Nearby",
          time: slots[i % slots.length],
          cost: budget,
          tags,
          poiIds: poi.id ? [poi.id] : [],
        };
      }),
    };
  });

  return {
    destination,
    params: { days, budget, pace, season, interests },
    days: dayPlans,
    tips: [
      "Prioritize nearby spots to cut down travel time",
      "Check opening hours before heading out",
      "Book popular attractions in advance",
    ],
  };
}

async function generateItinerary(req, res) {
  try {
    const input = req.method === "POST" ? req.body || {} : req.query || {};
    const placeId = sanitizeStr(input.placeId);
    const dest = sanitizeStr(input.dest);
    const latQ = input.lat != null ? Number(input.lat) : undefined;
    const lngQ = input.lng != null ? Number(input.lng) : undefined;
    const days = toInt(input.days || 3, 3);
    const budget = sanitizeStr(input.budget || "mid");
    const pace = sanitizeStr(input.pace || "balanced");
    const season = sanitizeStr(input.season || "any");
    const interests = sanitizeStr(input.interests || "food, culture, landmarks");
    const lang = sanitizeStr(input.lang || "en");

    if (!placeId && !dest && !(Number.isFinite(latQ) && Number.isFinite(lngQ))) {
      return res
        .status(400)
        .json(
          createErrorResponse(400, ERROR_CODES.BAD_REQUEST, "Provide placeId or dest or lat/lng")
        );
    }

    // Fetch destination core info to ground output
    let destination;
    if (placeId) {
      let place = null;
      try {
        place = await fetchPlaceById(placeId, lang);
      } catch (_e) {}
      destination = place
        ? { id: place.id, name: place.name, location: place.location || null }
        : { id: placeId, name: "Destination", location: null };
    } else if (dest) {
      try {
        const ge = await geocodeCity(dest, lang);
        destination = {
          id: `text:${dest}`,
          name: ge.display || dest,
          location: { lat: ge.lat, lng: ge.lng },
        };
      } catch (_e) {
        destination = { id: `text:${dest}`, name: dest, location: null };
      }
    } else {
      destination = {
        id: `coords:${latQ},${lngQ}`,
        name: "Selected area",
        location: { lat: latQ, lng: lngQ },
      };
    }

    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

    const cacheKey = makeCacheKey({
      placeId,
      dest,
      lat: latQ,
      lng: lngQ,
      days,
      budget,
      pace,
      season,
      interests,
      lang,
      provider: hasOpenRouter ? "openrouter" : "offline",
    });
    const cached = getCachedItinerary(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    if (!hasOpenRouter) {
      // Fallback local sample for environments without AI key
      const payload = await poiBackedItinerary({
        destination,
        days,
        budget,
        pace,
        season,
        interests,
        lang,
      });
      setCachedItinerary(cacheKey, payload);
      return res.json(payload);
    }

    const system = [
      "You are a precise, friendly travel planner.",
      "Return STRICT JSON only, no extra text.",
      "Use only provided context; if something is unknown, keep it generic.",
      "Keep activities practical and geographically coherent.",
    ].join(" ");

    const user = JSON.stringify({
      instruction: "Create a structured itinerary for a traveler.",
      destination,
      params: { days, budget, pace, season, interests },
      outputSchema: {
        type: "object",
        properties: {
          destination: {
            type: "object",
            properties: { id: { type: "string" }, name: { type: "string" } },
            required: ["id", "name"],
          },
          params: {
            type: "object",
            properties: {
              days: { type: "number" },
              budget: { type: "string" },
              pace: { type: "string" },
              season: { type: "string" },
              interests: { type: "string" },
            },
            required: ["days", "budget", "pace"],
          },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      area: { type: "string" },
                      time: { type: "string" },
                      cost: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                      poiIds: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "description", "time"],
                  },
                },
              },
              required: ["day", "blocks"],
            },
          },
          tips: { type: "array", items: { type: "string" } },
        },
        required: ["destination", "params", "days"],
      },
    });

    const quotaResult = enforceQuota({
      identifier: req.user?.uid || req.ip,
      key: "itinerary:generate",
      limit: itineraryLimit,
      windowMs: itineraryWindow,
    });
    if (!quotaResult.allowed) {
      return res
        .status(429)
        .json(
          createErrorResponse(
            429,
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "Itinerary generation quota exceeded",
            { resetAt: quotaResult.resetAt }
          )
        );
    }

    let raw;
    try {
      raw = await chatComplete({
        system,
        user,
        temperature: 0.4,
        response_format: "json_object",
        max_tokens: 2500,
      });
      trackExternalCall({
        service: "openrouter-itinerary",
        userId: req.user?.uid || req.ip,
        metadata: { destination: destination?.name },
      });
    } catch (aiErr) {
      // Gracefully degrade when the AI provider is unavailable (e.g., 401/402/429/5xx)
      const status = aiErr?.response?.status;
      const shouldFallback =
        status === 401 ||
        status === 402 ||
        status === 403 ||
        status === 429 ||
        (status != null && status >= 500) ||
        aiErr.code === "ETIMEDOUT" ||
        aiErr.code === "AI_NOT_CONFIGURED";

      logError(aiErr, {
        endpoint: "/api/itinerary/generate",
        query: req.query,
        status,
      });

      if (shouldFallback) {
        const sample = await poiBackedItinerary({
          destination,
          days,
          budget,
          pace,
          season,
          interests,
          lang,
        });
        return res.json({
          ...sample,
          fallback: true,
          notice:
            "AI itinerary temporarily unavailable. Showing nearby places instead.",
        });
      }

      throw aiErr;
    }

    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      const match = raw?.match(/\{[\s\S]*\}$/);
      if (match) {
        try {
          payload = JSON.parse(match[0]);
        } catch (_parseErr) {
          payload = null;
        }
      }
    }

    if (!payload || !Array.isArray(payload.days)) {
      // Soft-fallback to POI-backed itinerary when AI response is malformed
      const sample = await poiBackedItinerary({
        destination,
        days,
        budget,
        pace,
        season,
        interests,
        lang,
      });
      const payload = {
        ...sample,
        fallback: true,
        notice: "AI itinerary returned an unexpected format. Showing POI-backed plan instead.",
      };
      setCachedItinerary(cacheKey, payload);
      return res.json(payload);
    }

    setCachedItinerary(cacheKey, payload);
    return res.json(payload);
  } catch (e) {
    // Gracefully handle OpenRouter billing errors by falling back to a POI-backed plan
    if (e?.response?.status === 402) {
      const sample = await poiBackedItinerary({
        destination,
        days,
        budget,
        pace,
        season,
        interests,
        lang,
      });
      logError(e, { endpoint: "/api/itinerary/generate", code: 402 });
      const payload = {
        ...sample,
        fallback: true,
        warning:
          "Itinerary generation requires OpenRouter credits. Showing a POI-backed plan instead.",
      };
      const cacheKey = makeCacheKey({
        placeId,
        dest,
        lat: latQ,
        lng: lngQ,
        days,
        budget,
        pace,
        season,
        interests,
        lang,
        provider: Boolean(process.env.OPENROUTER_API_KEY) ? "openrouter" : "offline",
      });
      setCachedItinerary(cacheKey, payload);
      return res.status(200).json(payload);
    }
    logError(e, { endpoint: "/api/itinerary/generate", query: req.query });
    return res
      .status(500)
      .json(
        createErrorResponse(
          500,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          e.message || "Failed to generate itinerary"
        )
      );
  }
}

module.exports = { generateItinerary };
