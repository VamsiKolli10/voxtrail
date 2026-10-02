const express = require("express");
const router = express.Router();

const {
  getBrief,
  askQuestion,
  getContextualTips,
} = require("../controllers/cultureIntelligenceController");
const { validateBody } = require("../middleware/validate");
const { cultureQuestionSchema, cultureContextualSchema } = require("../utils/schemas");
const {
  createRoleBasedLimiter,
  createCustomLimiter,
} = require("../utils/rateLimiter");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/authenticate");
const { durableDailyQuota } = require("../middleware/durableQuota");

// Rate limiting strategy:
// - /brief: moderate shared limit (e.g., 40/min window) with role-aware behavior.
// - /qa: stricter, per-user/IP (10/min).
// - /contextual: lightweight but controlled (60/min).
//
// These sit on top of the global role-based + method-based limiters already
// applied in app.createApp().

const briefLimiter = createRoleBasedLimiter({
  windowMs: 60_000,
  limits: {
    anonymous: 20,
    user: 40,
    admin: 80,
  },
  defaultMessage: "Too many culture brief requests",
});

const qaLimiter = createCustomLimiter({
  windowMs: 60_000,
  max: 10,
  message: "Too many culture Q&A requests, please slow down.",
});

const contextualLimiter = createCustomLimiter({
  windowMs: 60_000,
  max: 60,
  message: "Too many contextual culture tips requests, please slow down.",
});

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

const briefMiddleware = [productionAuth, briefLimiter, cultureQuota];
// GET /api/culture/brief
router.get("/brief", ...briefMiddleware, asyncHandler(getBrief));

// POST /api/culture/qa
router.post(
  "/qa",
  productionAuth,
  qaLimiter,
  cultureQuota,
  validateBody(cultureQuestionSchema),
  asyncHandler(askQuestion)
);

// POST /api/culture/contextual
router.post(
  "/contextual",
  productionAuth,
  contextualLimiter,
  cultureQuota,
  validateBody(cultureContextualSchema),
  asyncHandler(getContextualTips)
);

module.exports = router;
module.exports.briefMiddleware = briefMiddleware;
