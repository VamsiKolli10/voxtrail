const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authenticate");
const { search, details } = require("../controllers/poiController");
const { validateQuery, validateParams } = require("../middleware/validate");
const { poiSearchSchema } = require("../utils/schemas");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const { userWindowQuota } = require("../middleware/userQuota");
const {
  getPlaceReviews,
  placeReviewsQuota,
} = require("../controllers/placeReviewsController");


// Per-user quotas on the paid Google Places calls: durable in production,
// in-memory in development/test (middleware/userQuota.js, ADR-002).
const poiWindowMs = Number(process.env.POI_PER_USER_WINDOW_MS || 60 * 60 * 1000);
const poiPerHour = Number(process.env.POI_PER_USER_PER_HOUR || 120);
const poiSearchQuota = userWindowQuota({
  name: "poi-search",
  limit: poiPerHour,
  windowMs: poiWindowMs,
});
const poiDetailQuota = userWindowQuota({
  name: "poi-detail",
  limit: Math.max(40, Math.floor(poiPerHour / 2)),
  windowMs: poiWindowMs,
});

router.get(
  "/search",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateQuery(poiSearchSchema),
  poiSearchQuota,
  asyncHandler(search)
);
router.get(
  "/:id/reviews",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateParams(z.object({ id: z.string().min(1, "id is required") })),
  placeReviewsQuota,
  asyncHandler(getPlaceReviews)
);
router.get(
  "/:id",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateParams(
    z.object({
      id: z.string().min(1, "id is required"),
    })
  ),
  poiDetailQuota,
  asyncHandler(details)
);

module.exports = router;
