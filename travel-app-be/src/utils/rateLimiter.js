const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("./errorHandler");

/**
 * Creates a rate limiter with custom configuration
 * @param {Object} options - Configuration options for the rate limiter
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.keyGenerator - Function to generate a key for rate limiting
 * @param {string} options.message - Custom message to send when rate limit is exceeded
 * @param {Function} options.onLimitReached - Function to call when rate limit is reached
 * @returns {Object} - The rate limiter middleware
 */
function createCustomLimiter(options = {}) {
  const {
    windowMs = 60000, // Default 1 minute
    max = 60, // Default 60 requests per window
    keyGenerator,
    message = "Too many requests, please try again later.",
    onLimitReached = null,
  } = options;

  const limiter = rateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || ((req) => ipKeyGenerator(req.ip)),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      if (onLimitReached) {
        onLimitReached(req, res);
      }

      logError(new Error("Rate limit exceeded"), {
        ip: req.ip,
        user: req.user ? req.user.uid : "anonymous",
        path: req.path,
        method: req.method,
      });

      res.status(429).json(
        createErrorResponse(429, ERROR_CODES.RATE_LIMIT_EXCEEDED, message, {
          limit: max,
          windowMs,
          resetTime: new Date(Date.now() + windowMs),
        })
      );
    },
  });

  return limiter;
}

/**
 * The single API-wide flood guard (ADR-002). Signed-in callers are keyed by
 * Firebase UID, anonymous callers by IP (IPv6 grouped by subnet).
 *
 * This is in-memory and per instance, so it only blunts bursts; real
 * per-user limits on paid providers are the durable Firestore quotas
 * (middleware/durableQuota.js).
 */
function createApiLimiter({
  windowMs = 60000,
  authenticatedMax = 120,
  anonymousMax = 30,
  skip,
} = {}) {
  return rateLimit({
    windowMs,
    limit: (req) => (req.user?.uid ? authenticatedMax : anonymousMax),
    keyGenerator: (req) =>
      req.user?.uid ? `uid:${req.user.uid}` : `ip:${ipKeyGenerator(req.ip)}`,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logError(new Error("Rate limit exceeded"), {
        ip: req.ip,
        user: req.user ? req.user.uid : "anonymous",
        path: req.path,
        method: req.method,
      });
      res.status(429).json(
        createErrorResponse(
          429,
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          "Too many requests, please slow down.",
          {
            limit: req.user?.uid ? authenticatedMax : anonymousMax,
            windowMs,
          }
        )
      );
    },
  });
}

module.exports = {
  createCustomLimiter,
  createApiLimiter,
};
