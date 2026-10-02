const express = require("express");
const router = express.Router();
const { geocodeCity } = require("../stays/providers/googlePlaces");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { createCustomLimiter } = require("../utils/rateLimiter");
const { getCached, setCached } = require("../utils/cache");
const asyncHandler = require("../utils/asyncHandler");

const resolveLimiter = createCustomLimiter({
  windowMs: Number(process.env.LOCATION_RESOLVE_WINDOW_MS || 60_000),
  max: Number(process.env.LOCATION_RESOLVE_MAX || 60),
  message: "Too many location lookups. Please slow down.",
});

const cacheTtlMs = Number(
  process.env.LOCATION_RESOLVE_CACHE_TTL_MS || 5 * 60 * 1000
);

router.get("/resolve", resolveLimiter, asyncHandler(async (req, res) => {
  const rawQuery = req.query.q || req.query.query || req.query.dest || "";
  const rawLang = req.query.lang || "en";
  if (typeof rawQuery !== "string" || rawQuery.length > 200 ||
      typeof rawLang !== "string" || rawLang.length > 12) {
    return res.status(400).json(createErrorResponse(400, ERROR_CODES.VALIDATION_ERROR,
      "Location query and language must be single bounded strings"));
  }
  const query = rawQuery.trim();
  const lang = rawLang.trim() || "en";

  if (!query) {
    return res
      .status(400)
      .json(
        createErrorResponse(
          400,
          ERROR_CODES.BAD_REQUEST,
          "Provide a location query"
        )
      );
  }

  const cacheKey = JSON.stringify({
    q: query.toLowerCase(),
    lang,
  });
  const cached = getCached("location:resolve", cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    const result = await geocodeCity(query, lang);
    const payload = {
      query,
      display: result.display || query,
      address: result.address || "",
      city: result.city || "",
      state: result.state || "",
      country: result.country || "",
      lat: result.lat,
      lng: result.lng,
    };
    setCached("location:resolve", cacheKey, payload, cacheTtlMs);
    return res.json(payload);
  } catch (e) {
    logError(e, { endpoint: "/api/location/resolve", query });
    return res
      .status(502)
      .json(
        createErrorResponse(
          502,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          "Failed to resolve location"
        )
      );
  }
}));

module.exports = router;
