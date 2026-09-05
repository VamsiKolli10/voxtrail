const express = require("express");
const axios = require("axios");
const router = express.Router();
const {
  geocodeCity,
  nearbyLodging,
  toResultItem,
  fetchById,
  ensureKey,
  GOOGLE_API_KEY,
  PLACES_BASE_URL,
} = require("../stays/providers/googlePlaces");
const {
  expressErrorHandler,
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { getCached, setCached } = require("../utils/cache");
const { requireAuth } = require("../middleware/authenticate");
const { createCustomLimiter } = require("../utils/rateLimiter");
const { enforceQuota } = require("../utils/quota");
const { durableWindowedQuota } = require("../middleware/durableQuota");
const { trackExternalCall } = require("../utils/monitoring");
const { validateQuery, validateParams } = require("../middleware/validate");
const { staysSearchSchema } = require("../utils/schemas");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");

const searchLimiter = createCustomLimiter({
  windowMs: Number(process.env.STAYS_SEARCH_WINDOW_MS || 60_000),
  max: Number(process.env.STAYS_SEARCH_MAX_PER_IP || 15),
  message: "Too many stay searches from this IP. Please slow down.",
});

const detailLimiter = createCustomLimiter({
  windowMs: Number(process.env.STAY_DETAIL_WINDOW_MS || 60_000),
  max: Number(process.env.STAY_DETAIL_MAX_PER_IP || 30),
  message: "Too many stay lookups from this IP. Try again shortly.",
});

const userQuotaLimit = Number(process.env.STAYS_PER_USER_PER_HOUR || 60);
const userQuotaWindow = Number(
  process.env.STAYS_PER_USER_WINDOW_MS || 60 * 60 * 1000
);
const searchCacheTtl = Number(
  process.env.STAYS_SEARCH_CACHE_TTL_MS || 2 * 60 * 1000
);
const detailCacheTtl = Number(
  process.env.STAY_DETAIL_CACHE_TTL_MS || 15 * 60 * 1000
);

// The in-process quota above is per-instance only, so it does not hold under
// multiple Functions instances. These durable, Firestore-backed quotas
// enforce the real per-user cap on the paid Google Places/Hotels calls.
const isProduction = !["test", "development"].includes(process.env.NODE_ENV);
const staysSearchQuota = isProduction
  ? durableWindowedQuota({
      name: "stays-search",
      userLimit: userQuotaLimit,
      windowMs: userQuotaWindow,
    })
  : (_req, _res, next) => next();
const staysDetailQuota = isProduction
  ? durableWindowedQuota({
      name: "stays-detail",
      userLimit: Math.max(20, Math.floor(userQuotaLimit / 2)),
      windowMs: userQuotaWindow,
    })
  : (_req, _res, next) => next();

const encodePlacePath = (name) =>
  String(name)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

// Photo endpoint is public - no authentication required
router.get("/photo", async (req, res) => {
  const { name, ref, maxWidth, maxHeight } = req.query;

  try {
    ensureKey();

    const photoName = name || ref;
    if (!photoName) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Place photo name is required"
          )
        );
    }

    const params = {};
    if (maxWidth) params.maxWidthPx = Number(maxWidth);
    if (maxHeight) params.maxHeightPx = Number(maxHeight);
    if (!params.maxWidthPx && !params.maxHeightPx) {
      params.maxWidthPx = 640;
    }

    const endpoint = `${PLACES_BASE_URL}/${encodePlacePath(photoName)}/media`;
    let upstream = await axios.get(endpoint, {
      headers: {
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "*",
        Accept: "image/*",
      },
      params,
      responseType: "stream",
      maxRedirects: 0,
      validateStatus: (status) => status === 200 || status === 302,
    });

    // Set permissive headers to avoid CORP blocking when FE and BE differ (5173 vs 8000)
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // If Google returns an expiring redirect, fetch it server-side so clients do not cache it
    if (upstream.status === 302 && upstream.headers.location) {
      upstream = await axios.get(upstream.headers.location, {
        responseType: "stream",
        validateStatus: (status) => status >= 200 && status < 400,
      });
    }

    if (upstream.headers["content-type"]) {
      res.setHeader("Content-Type", upstream.headers["content-type"]);
    }
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=3600"
    );

    return upstream.data.pipe(res);
  } catch (e) {
    logError(e, { endpoint: "/api/stays/photo", query: req.query });
    return res
      .status(502)
      .json(
        createErrorResponse(
          502,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          "Failed to fetch photo from provider"
        )
      );
  }
});

router.get(
  "/search",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateQuery(staysSearchSchema),
  searchLimiter,
  staysSearchQuota,
  asyncHandler(async (req, res) => {
    try {
    const {
      dest,
      lat,
      lng,
      rating,
      distance,
      type,
      amenities,
        page = 1,
        pageSize: pageSizeInput,
        lang = "en",
        checkInDate,
        checkOutDate,
        adults,
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
      type: normalizeList(type),
      amenities: normalizeList(amenities),
      rating: rating ? Number(rating) : null,
      page: pageNumber,
      lang,
    });

    const quotaResult = enforceQuota({
      identifier: req.user?.uid || req.userId || req.ip,
      key: "stays:search",
      limit: userQuotaLimit,
      windowMs: userQuotaWindow,
    });
    if (!quotaResult.allowed) {
      return res
        .status(429)
        .json(
          createErrorResponse(
            429,
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "Stay search quota exceeded",
            { resetAt: quotaResult.resetAt }
          )
        );
    }

    const cached = getCached("stays:search", cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    let center;
    let resolvedDestination = null;
    if (lat && lng) {
      center = { lat: Number(lat), lng: Number(lng) };
    } else if (dest) {
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

    const radius = Math.round((Number(distance) || 5) * 1000); // km -> meters

    const raw = await nearbyLodging({
      lat: center.lat,
      lng: center.lng,
      radiusMeters: radius,
      language: lang,
    });
    trackExternalCall({
      service: "google-places-stays",
      userId: req.user?.uid || req.ip,
      metadata: {
        destination: dest || resolvedDestination?.display || "coords",
      },
    });
    let items = raw.map((e) => toResultItem(e, center, lang));

    // basic filters
    if (type) {
      const wanted = String(type)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (wanted.length) {
        items = items.filter((i) => {
          const tags =
            (Array.isArray(i.typeTags) && i.typeTags.length
              ? i.typeTags
              : i.type
              ? [i.type]
              : []
            ).map((tag) => String(tag).toLowerCase());
          return tags.some((tag) => wanted.includes(tag));
        });
      }
    }
    if (distance) {
      items = items.filter(
        (i) => (i.location.distanceKm ?? 9999) <= Number(distance)
      );
    }

    // amenities filter (require ALL selected amenities to be present)
    if (amenities) {
      const wantAm = String(amenities)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (wantAm.length) {
        items = items.filter((i) => {
          const has = new Set(i.amenities || []);
          return wantAm.every((a) => has.has(a));
        });
      }
    }

    if (rating) {
      const minRating = Number(rating);
      if (!Number.isNaN(minRating)) {
        items = items.filter(
          (i) => (typeof i.rating === "number" ? i.rating : 0) >= minRating
        );
      }
    }

    // simple pagination (allow client to request larger page sizes for frontend pagination)
    const pageSize = (() => {
      const requested = Number(pageSizeInput);
      if (Number.isFinite(requested) && requested > 0) {
        return Math.min(50, Math.max(5, Math.floor(requested)));
      }
      return 5;
    })();
    const totalResults = items.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const currentPage = Math.min(pageNumber, totalPages);
    const start = (currentPage - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);

    const payload = {
      items: slice,
      page: currentPage,
      pageSize,
      total: totalResults,
      totalPages,
      resolvedDestination,
    };
    setCached("stays:search", cacheKey, payload, searchCacheTtl);
    res.json(payload);
  } catch (e) {
    logError(e, { endpoint: "/api/stays/search", query: req.query });
    const status = e.response?.status || e.status || 500;
    const message =
      e.response?.data?.error?.message || e.message || "Failed to search stays";
    res
      .status(status)
      .json(
        createErrorResponse(status, ERROR_CODES.EXTERNAL_SERVICE_ERROR, message)
      );
  }
  })
);

router.get(
  "/:id",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateParams(
    z.object({
      id: z.string().min(1, "id is required"),
    })
  ),
  detailLimiter,
  staysDetailQuota,
  asyncHandler(async (req, res) => {
    try {
      const quotaResult = enforceQuota({
        identifier: req.user?.uid || req.ip,
        key: "stays:detail",
        limit: Math.max(20, Math.floor(userQuotaLimit / 2)),
        windowMs: userQuotaWindow,
      });
      if (!quotaResult.allowed) {
        return res
          .status(429)
          .json(
            createErrorResponse(
              429,
              ERROR_CODES.RATE_LIMIT_EXCEEDED,
              "Stay detail quota exceeded",
              { resetAt: quotaResult.resetAt }
            )
          );
      }

      const cacheKey = JSON.stringify({
        id: req.params.id,
        lang: req.query.lang || "en",
      });
      const cached = getCached("stays:detail", cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }

      const stay = await fetchById(req.params.id, req.query.lang || "en");
      trackExternalCall({
        service: "google-places-stays",
        userId: req.user?.uid || req.ip,
        metadata: { lookup: req.params.id },
      });
      if (!stay)
        return res
          .status(404)
          .json(
            createErrorResponse(404, ERROR_CODES.NOT_FOUND, "Stay not found")
          );
      setCached("stays:detail", cacheKey, stay, detailCacheTtl);
      res.json(stay);
    } catch (e) {
      logError(e, { endpoint: "/api/stays/:id", id: req.params.id });
      res
        .status(500)
        .json(createErrorResponse(500, ERROR_CODES.DB_ERROR, e.message));
    }
  })
);

module.exports = router;
