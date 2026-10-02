const axios = require("axios");
const {
  searchNearbyPoi,
  mapPlaceToPoiCard,
  applySmartFilters,
} = require("../poi/providers/googlePlacesPoi");
const {
  fetchById: fetchPlaceById,
  geocodeCity,
} = require("../stays/providers/googlePlaces");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { getCached, setCached } = require("../utils/cache");
const { getCacheStats } = require("../utils/cache");
const { enforceQuota } = require("../utils/quota");
const { trackExternalCall } = require("../utils/monitoring");

const poiSearchLimit = Number(process.env.POI_PER_USER_PER_HOUR || 120);
const poiWindow = Number(process.env.POI_PER_USER_WINDOW_MS || 60 * 60 * 1000);
const poiDetailLimit = Math.max(40, Math.floor(poiSearchLimit / 2));
const poiSearchCacheTtl = Number(
  process.env.POI_SEARCH_CACHE_TTL_MS || 2 * 60 * 1000
);
const poiDetailCacheTtl = Number(
  process.env.POI_DETAIL_CACHE_TTL_MS || 15 * 60 * 1000
);

async function wikiSummary(title, lang = "en") {
  try {
    const endpoint = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`;
    const { data } = await axios.get(endpoint, { timeout: 4000 });
    if (data?.extract) return data.extract;
  } catch (_e) {}
  return null;
}

async function search(req, res) {
  try {
    const {
      dest,
      lat,
      lng,
      distance,
      category,
      kidFriendly,
      accessibility,
      openNow,
      timeNeeded,
      cost,
      lang = "en",
      page = 1,
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const normalizeNumber = (v) =>
      Number.isFinite(Number(v)) ? Number(Number(v).toFixed(4)) : null;
    const normalizeList = (v) =>
      String(v || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .sort();
    const cacheKey = JSON.stringify({
      dest: dest?.trim().toLowerCase() || null,
      lat: normalizeNumber(lat),
      lng: normalizeNumber(lng),
      distance: Number(distance) || 5,
      category: normalizeList(category),
      kidFriendly: kidFriendly === true,
      accessibility: accessibility === true,
      openNow: openNow === true,
      timeNeeded: timeNeeded ? String(timeNeeded) : null,
      cost: cost ? String(cost) : null,
      lang,
      page: pageNumber,
    });

    let center;
    let resolvedDestination = null;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      center = { lat: Number(lat), lng: Number(lng) };
    } else if (dest) {
      // Use existing, well-tested geocoder shared with Stays
      const ge = await geocodeCity(dest, lang);
      center = { lat: ge.lat, lng: ge.lng };
      resolvedDestination = {
        query: dest,
        display: ge.display,
        address: ge.address,
        city: ge.city,
        state: ge.state,
        country: ge.country,
        lat: ge.lat,
        lng: ge.lng,
      };
    } else {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Provide either lat/lng or dest"
          )
        );
    }

    const radius = Math.round((Number(distance) || 5) * 1000);
    const quotaResult = enforceQuota({
      identifier: req.user?.uid || req.ip,
      key: "poi:search",
      limit: poiSearchLimit,
      windowMs: poiWindow,
    });
    if (!quotaResult.allowed) {
      return res
        .status(429)
        .json(
          createErrorResponse(
            429,
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "POI search quota exceeded",
            { resetAt: quotaResult.resetAt }
          )
        );
    }
    const cached = getCached("poi:search", cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    const raw = await searchNearbyPoi({
      lat: center.lat,
      lng: center.lng,
      radiusMeters: radius,
      language: lang,
      categories: category,
    });
    trackExternalCall({
      service: "google-places-poi",
      userId: req.user?.uid || req.ip,
      metadata: { destination: dest || `${center.lat},${center.lng}` },
    });

    // Map and enrich
    let items = raw.map((p) => mapPlaceToPoiCard(p, center, lang));
    items = applySmartFilters(items, {
      kidFriendly,
      accessibility,
      openNow,
      timeNeeded,
      cost,
      categoriesWanted: category,
    });

    // Pagination
    const pageSize = 20;
    const totalResults = items.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const currentPage = Math.min(pageNumber, totalPages);
    const start = (currentPage - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);

    const payload = {
      items: slice,
      total: totalResults,
      page: currentPage,
      pageSize,
      totalPages,
      resolvedDestination,
    };
    setCached("poi:search", cacheKey, payload, poiSearchCacheTtl);
    return res.json({ ...payload, cache: { provider: "memory", stats: getCacheStats() } });
  } catch (e) {
    logError(e, { endpoint: "/api/poi/search", query: req.query });
    const status = e.response?.status || e.status || 500;
    const message =
      e.response?.data?.error?.message || e.message || "Failed to search POIs";
    return res
      .status(status)
      .json(
        createErrorResponse(status, ERROR_CODES.EXTERNAL_SERVICE_ERROR, message)
      );
  }
}

async function details(req, res) {
  const { id } = req.params;
  const lang = req.query.lang || "en";
  try {
    const quotaResult = enforceQuota({
      identifier: req.user?.uid || req.ip,
      key: "poi:detail",
      limit: poiDetailLimit,
      windowMs: poiWindow,
    });
    if (!quotaResult.allowed) {
      return res
        .status(429)
        .json(
          createErrorResponse(
            429,
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "POI detail quota exceeded",
            { resetAt: quotaResult.resetAt }
          )
        );
    }

    const cacheKey = JSON.stringify({ id, lang });
    const cached = getCached("poi:detail", cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const place = await fetchPlaceById(id, lang);
    trackExternalCall({
      service: "google-places-poi",
      userId: req.user?.uid || req.ip,
      metadata: { lookup: id },
    });
    if (!place) {
      return res
        .status(404)
        .json(
          createErrorResponse(404, ERROR_CODES.NOT_FOUND, "Destination not found")
        );
    }

    // Try to enrich description with Wikipedia summary when missing
    let description = place.description || "";
    if (!description && place.name) {
      description = (await wikiSummary(place.name, lang)) || "";
    }

    const payload = {
      ...place,
      description,
    };
    setCached("poi:detail", cacheKey, payload, poiDetailCacheTtl);
    return res.json({ ...payload, cache: { provider: "memory", stats: getCacheStats() } });
  } catch (e) {
    logError(e, { endpoint: "/api/poi/:id", id });
    const status = e.response?.status || e.status || 500;
    return res
      .status(status)
      .json(
        createErrorResponse(status, ERROR_CODES.EXTERNAL_SERVICE_ERROR, e.message)
      );
  }
}

module.exports = { search, details };
