const express = require("express");
const router = express.Router();

const {
  getBrief,
  askQuestion,
  getContextualTips,
} = require("../controllers/cultureIntelligenceController");
const { validateBody } = require("../middleware/validate");
const { cultureQuestionSchema, cultureContextualSchema } = require("../utils/schemas");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/authenticate");
const { durableDailyQuota } = require("../middleware/durableQuota");

// Limits (ADR-002): production requires sign-in and a durable per-user daily
// quota shared by brief, Q&A and contextual tips. The API-wide flood guard in
// app.js covers bursts.

const isProduction = !["test", "development"].includes(process.env.NODE_ENV);
const productionAuth =
  isProduction
    ? requireAuth({ allowRoles: ["user", "admin"] })
    : (_req, _res, next) => next();
const cultureQuota =
  isProduction
    ? durableDailyQuota({
        name: "culture-generation",
        userLimit: Number(process.env.CULTURE_DAILY_QUOTA || 30),
      })
    : (_req, _res, next) => next();

const briefMiddleware = [productionAuth, cultureQuota];
// GET /api/culture/brief
router.get("/brief", ...briefMiddleware, asyncHandler(getBrief));

// POST /api/culture/qa
router.post(
  "/qa",
  productionAuth,
  cultureQuota,
  validateBody(cultureQuestionSchema),
  asyncHandler(askQuestion)
);

// POST /api/culture/contextual
router.post(
  "/contextual",
  productionAuth,
  cultureQuota,
  validateBody(cultureContextualSchema),
  asyncHandler(getContextualTips)
);

module.exports = router;
module.exports.briefMiddleware = briefMiddleware;
