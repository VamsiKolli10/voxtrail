const { durableDailyQuota, durableWindowedQuota } = require("./durableQuota");
const { enforceQuota } = require("../utils/quota");
const { createErrorResponse, ERROR_CODES } = require("../utils/errorHandler");

/**
 * Per-user quotas for routes that call paid providers (ADR-002).
 *
 * Production: durable Firestore counters (shared by every instance).
 * Development/test: the same limits in process memory, so local runs and the
 * test suite don't need Firestore. One helper per route replaces the old
 * "durable in prod + in-memory duplicate" pairs.
 */
const isProduction = () =>
  !["test", "development"].includes(process.env.NODE_ENV);

function memoryQuota({ name, limit, windowMs, message }) {
  return (req, res, next) => {
    const result = enforceQuota({
      identifier: req.user?.uid || req.ip,
      key: name,
      limit,
      windowMs,
    });
    if (!result.allowed) {
      return res.status(429).json(
        createErrorResponse(429, ERROR_CODES.RATE_LIMIT_EXCEEDED, message, {
          resetAt: result.resetAt,
        })
      );
    }
    return next();
  };
}

function userDailyQuota({ name, limit }) {
  if (isProduction()) return durableDailyQuota({ name, userLimit: limit });
  return memoryQuota({
    name,
    limit,
    windowMs: 24 * 60 * 60 * 1000,
    message: "Daily quota reached",
  });
}

function userWindowQuota({ name, limit, windowMs }) {
  if (isProduction()) {
    return durableWindowedQuota({ name, userLimit: limit, windowMs });
  }
  return memoryQuota({ name, limit, windowMs, message: `${name} quota reached` });
}

module.exports = { userDailyQuota, userWindowQuota };
