const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authenticate");
const { createCustomLimiter } = require("../utils/rateLimiter");
const { search, details } = require("../controllers/poiController");
const { validateQuery, validateParams } = require("../middleware/validate");
const { poiSearchSchema } = require("../utils/schemas");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const { durableWindowedQuota } = require("../middleware/durableQuota");

const poiSearchLimiter = createCustomLimiter({
  windowMs: Number(process.env.POI_SEARCH_WINDOW_MS || 60_000),
  max: Number(process.env.POI_SEARCH_MAX_PER_IP || 30),
  message: "Too many POI search requests from this IP.",
});

const poiDetailLimiter = createCustomLimiter({
  windowMs: Number(process.env.POI_DETAIL_WINDOW_MS || 60_000),
  max: Number(process.env.POI_DETAIL_MAX_PER_IP || 60),
  message: "Too many POI detail requests from this IP.",
});

// The in-process quota inside poiController is per-instance only, so it does
// not hold under multiple Functions instances. These durable, Firestore-backed
// quotas enforce the real per-user cap on the paid Google Places calls.
const isProduction = !["test", "development"].includes(process.env.NODE_ENV);
const poiSearchWindowMs = Number(process.env.POI_PER_USER_WINDOW_MS || 60 * 60 * 1000);
const poiSearchQuota = isProduction
  ? durableWindowedQuota({
      name: "poi-search",
      userLimit: Number(process.env.POI_PER_USER_PER_HOUR || 120),
      windowMs: poiSearchWindowMs,
    })
  : (_req, _res, next) => next();
const poiDetailQuota = isProduction
  ? durableWindowedQuota({
      name: "poi-detail",
      userLimit: Math.max(40, Math.floor(Number(process.env.POI_PER_USER_PER_HOUR || 120) / 2)),
      windowMs: poiSearchWindowMs,
    })
  : (_req, _res, next) => next();

router.get(
  "/search",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateQuery(poiSearchSchema),
  poiSearchLimiter,
  poiSearchQuota,
  asyncHandler(search)
);
router.get(
  "/:id",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateParams(
    z.object({
      id: z.string().min(1, "id is required"),
    })
  ),
  poiDetailLimiter,
  poiDetailQuota,
  asyncHandler(details)
);

module.exports = router;
