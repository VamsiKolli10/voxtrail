// Reviews for a stay or destination, fetched only when the user asks
// (ADR-004): reviews are an Atmosphere field, the most expensive Places SKU.
const { fetchReviewsById } = require("../stays/providers/googlePlaces");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { getCached, setCached } = require("../utils/cache");
const { trackExternalCall } = require("../utils/monitoring");
const { userWindowQuota } = require("../middleware/userQuota");

const reviewsCacheTtl = Number(
  process.env.PLACE_REVIEWS_CACHE_TTL_MS || 15 * 60 * 1000
);

// One bucket shared by /api/stays/:id/reviews and /api/poi/:id/reviews.
const placeReviewsQuota = userWindowQuota({
  name: "place-reviews",
  limit: Number(process.env.PLACE_REVIEWS_PER_HOUR || 30),
  windowMs: 60 * 60 * 1000,
});

async function getPlaceReviews(req, res) {
  const { id } = req.params;
  const lang = typeof req.query.lang === "string" ? req.query.lang : "en";
  const cacheKey = JSON.stringify({ id, lang });
  const cached = getCached("place:reviews", cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const result = await fetchReviewsById(id, lang);
    trackExternalCall({
      service: "google-places-reviews",
      userId: req.user?.uid || req.ip,
      metadata: { lookup: id },
    });
    if (!result) {
      return res
        .status(404)
        .json(createErrorResponse(404, ERROR_CODES.NOT_FOUND, "Place not found"));
    }
    const payload = { id: result.id || id, reviews: result.reviews };
    setCached("place:reviews", cacheKey, payload, reviewsCacheTtl);
    return res.json(payload);
  } catch (e) {
    logError(e, { endpoint: req.originalUrl, id });
    return res
      .status(502)
      .json(
        createErrorResponse(
          502,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          "Failed to load reviews"
        )
      );
  }
}

module.exports = { getPlaceReviews, placeReviewsQuota };
