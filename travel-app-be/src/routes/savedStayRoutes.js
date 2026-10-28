const express = require("express");
const { z } = require("zod");
const { validateBody, validateParams } = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");
const {
  listSaved,
  saveStay,
  removeStay,
} = require("../controllers/savedStayController");

const router = express.Router();
router.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});
const placeParams = z.object({
  placeId: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid place ID"),
});
const savedStaySchema = z
  .object({
    nickname: z.string().trim().min(1, "Give this stay a nickname").max(100),
    notes: z.string().trim().max(1000).default(""),
  })
  .strict();

// Authentication is required at the app mount. Ownership always comes from
// the verified token, never from a body or query parameter.
router.get("/", asyncHandler(listSaved));
router.put(
  "/:placeId",
  validateParams(placeParams),
  validateBody(savedStaySchema),
  asyncHandler(saveStay),
);
router.delete(
  "/:placeId",
  validateParams(placeParams),
  asyncHandler(removeStay),
);
module.exports = router;
