const express = require("express");
const {
  translateText,
  healthCheck,
} = require("../controllers/translationController");
const { requireAuth } = require("../middleware/authenticate");
const { validateBody } = require("../middleware/validate");
const { translationSchema } = require("../utils/schemas");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/",
  requireAuth({ allowRoles: ["user", "admin"] }),
  validateBody(translationSchema),
  asyncHandler(translateText)
);
router.get("/health", asyncHandler(healthCheck));

module.exports = router;
