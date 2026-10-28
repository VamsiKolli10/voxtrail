const express = require("express");
const {
  translateText,
  healthCheck,
} = require("../controllers/translationController");
const { requireAuth } = require("../middleware/authenticate");
const { validateBody } = require("../middleware/validate");
const { translationSchema } = require("../utils/schemas");
const asyncHandler = require("../utils/asyncHandler");
const { userDailyQuota } = require("../middleware/userQuota");

const router = express.Router();

router.post(
  "/",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateBody(translationSchema),
  // Every translation is a billed provider call (ADR-002).
  userDailyQuota({
    name: "translation",
    limit: Number(process.env.TRANSLATION_DAILY_QUOTA || 200),
  }),
  asyncHandler(translateText)
);
router.get("/health", asyncHandler(healthCheck));

module.exports = router;
