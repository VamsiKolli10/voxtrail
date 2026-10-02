const express = require("express");
const router = express.Router();
const {
  generateCulturalEtiquette,
} = require("../controllers/culturalEtiquetteController");
const asyncHandler = require("../utils/asyncHandler");
const { briefMiddleware } = require("./cultureIntelligenceRoutes");

// Legacy: mounted at /api/cultural-etiquette in app.js.
// This now proxies to the unified Culture Intelligence brief implementation.
router.get("/", ...briefMiddleware, asyncHandler(generateCulturalEtiquette));

module.exports = router;
