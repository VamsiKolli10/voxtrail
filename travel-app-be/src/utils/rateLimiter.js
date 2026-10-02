const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("./errorHandler");

// Create a map to store different rate limiters
const limiters = new Map();

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
 * Register a named rate limiter
 * @param {string} name - Name of the rate limiter
 * @param {Object} options - Configuration options for the rate limiter
 */
function registerLimiter(name, options) {
  limiters.set(name, createCustomLimiter(options));
  return limiters.get(name);
}

/**
 * Get a named rate limiter
 * @param {string} name - Name of the rate limiter
 * @returns {Object} - The rate limiter middleware
 */
function getLimiter(name) {
  return limiters.get(name) || createCustomLimiter();
}

/**
 * Create a role-based rate limiter
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {Object} options.limits - Map of roles to max requests
 * @param {string} options.defaultMessage - Default message when rate limit is exceeded
 * @returns {Function} - Rate limiter middleware
 */
function createRoleBasedLimiter(options = {}) {
  const {
    windowMs = 60000,
    limits = {},
    defaultMessage = "Too many requests",
  } = options;

  // Pre-create all role-based rate limiters
  const roleLimiters = {};

  // Create a rate limiter for each role
  Object.keys(limits).forEach((role) => {
    const maxRequests = limits[role];
    const keyGenerator = (req) => `${ipKeyGenerator(req.ip)}:${role}`;
    const message = `${defaultMessage} for ${role} role`;

    roleLimiters[role] = createCustomLimiter({
      windowMs,
      max: maxRequests,
      keyGenerator,
      message,
      onLimitReached: (req, res) => {
        logError(new Error("Role-based rate limit exceeded"), {
          ip: req.ip,
          user: req.user ? req.user.uid : "anonymous",
          role,
          path: req.path,
          method: req.method,
        });
      },
    });
  });

  // Only create limiters for roles that are explicitly defined
  // Don't create a default anonymous limiter if not specified

  return (req, res, next) => {
    // Get the user role or default to 'anonymous'
    const userRole =
      req.userRoles && req.userRoles.length > 0
        ? req.userRoles[0]
        : "anonymous";

    // Skip rate limiting if this role is not in the defined limits (allows unlimited access)
    if (!limits[userRole]) {
      return next();
    }

    // Use the pre-created rate limiter for this role
    const limiter = roleLimiters[userRole];
    limiter(req, res, next);
  };
}

/**
 * Create a method-based rate limiter
 * @param {Object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {Object} options.limits - Map of HTTP methods to max requests
 * @param {string} options.defaultMessage - Default message when rate limit is exceeded
 * @returns {Function} - Rate limiter middleware
 */
function createMethodBasedLimiter(options = {}) {
  const {
    windowMs = 60000,
    limits = {},
    defaultMessage = "Too many requests",
  } = options;

  // Pre-create all method-based rate limiters
  const methodLimiters = {};

  // Create a rate limiter for each HTTP method
  Object.keys(limits).forEach((method) => {
    if (method !== "DEFAULT") {
      const maxRequests = limits[method];
      const keyGenerator = (req) => `${ipKeyGenerator(req.ip)}:${method}`;
      const message = `${defaultMessage} for ${method} requests`;

      methodLimiters[method] = createCustomLimiter({
        windowMs,
        max: maxRequests,
        keyGenerator,
        message,
        onLimitReached: (req, res) => {
          logError(new Error("Method-based rate limit exceeded"), {
            ip: req.ip,
            user: req.user ? req.user.uid : "anonymous",
            method,
            path: req.path,
          });
        },
      });
    }
  });

  // Only create limiters for methods that are explicitly defined
  // Don't create a default limiter if not specified

  return (req, res, next) => {
    // Get the HTTP method
    const method = req.method.toUpperCase();

    // Skip rate limiting if this method is not in the defined limits
    if (!limits[method] && !limits["DEFAULT"]) {
      return next();
    }

    // Use the pre-created rate limiter for this method
    const limiter = methodLimiters[method] || methodLimiters["DEFAULT"];
    limiter(req, res, next);
  };
}

// Pre-register some common limiters
registerLimiter("default", { windowMs: 60000, max: 1000 });
registerLimiter("strict", { windowMs: 60000, max: 50 });
registerLimiter("moderate", { windowMs: 60000, max: 50 });
registerLimiter("generous", { windowMs: 60000, max: 120 });
registerLimiter("photoPublic", { windowMs: 60000, max: 300 }); // 300 requests per minute for public photos
registerLimiter("publicApi", { windowMs: 60000, max: 200 }); // 200 requests per minute for other public APIs

module.exports = {
  createCustomLimiter,
  registerLimiter,
  getLimiter,
  createRoleBasedLimiter,
  createMethodBasedLimiter,
};
