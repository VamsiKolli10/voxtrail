const crypto = require("crypto");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("./errorHandler");

/**
 * Generate a cryptographically secure random token
 * @param {number} length - Length of the token in bytes
 * @returns {string} - Hexadecimal string representation of the token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash a string using a secure hashing algorithm
 * @param {string} data - String to hash
 * @param {string} salt - Optional salt to add to the hash
 * @returns {string} - Hexadecimal string representation of the hash
 */
function secureHash(data, salt = "") {
  return crypto
    .createHash("sha256")
    .update(data + salt)
    .digest("hex");
}

/**
 * Create a HMAC signature for request signing
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key for signing
 * @returns {string} - Hexadecimal string representation of the signature
 */
function createSignature(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Verify a HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key used for signing
 * @returns {boolean} - True if signature is valid, false otherwise
 */
function verifySignature(data, signature, secret) {
  if (!signature || typeof signature !== "string") {
    return false;
  }

  try {
    const expectedSignature = createSignature(data, secret);
    const provided = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(
      provided,
      expected
    );
  } catch (_err) {
    return false;
  }
}

/**
 * Generate a request fingerprint for tracking
 * @param {Object} req - Express request object
 * @returns {string} - Fingerprint string
 */
function generateRequestFingerprint(req) {
  const userAgent = req.headers["user-agent"] || "";
  const acceptLanguage = req.headers["accept-language"] || "";
  const acceptEncoding = req.headers["accept-encoding"] || "";
  const ip = req.ip || req.connection.remoteAddress;

  const data = `${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`;
  return secureHash(data);
}

/**
 * Middleware to add security headers
 * @param {Object} options - Configuration options
 * @returns {Function} - Express middleware function
 */
function addSecurityHeaders(options = {}) {
  const {
    contentSecurityPolicy = {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.openrouter.ai"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    xssFilter = true,
    noSniff = true,
    frameGuard = "deny",
    ieNoOpen = true,
    noOpen = true,
    strictTransportSecurity = "max-age=31536000; includeSubDomains",
  } = options;

  return (req, res, next) => {
    // Don't apply strict security headers for authentication paths
    const authPaths = [
      "/api/auth",
      "/api/login",
      "/api/token",
      "/api/session",
      "/api/register",
    ];
    const isAuthPath = authPaths.some((path) => req.path.startsWith(path));

    if (isAuthPath) {
      // Only apply minimal security headers for auth paths
      res.setHeader("X-Content-Type-Options", "nosniff");
      return next();
    }

    // Apply full security headers for other paths
    // Content Security Policy
    if (contentSecurityPolicy) {
      const csp = Object.entries(contentSecurityPolicy.directives)
        .map(
          ([key, values]) =>
            `${key} ${Array.isArray(values) ? values.join(" ") : values}`
        )
        .join("; ");
      res.setHeader("Content-Security-Policy", csp);
    }

    // XSS Protection
    if (xssFilter) {
      res.setHeader("X-XSS-Protection", "1; mode=block");
    }

    // Prevent MIME type sniffing
    if (noSniff) {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }

    // Clickjacking protection
    if (frameGuard) {
      res.setHeader("X-Frame-Options", frameGuard);
    }

    // IE8+ XSS protection
    if (ieNoOpen) {
      res.setHeader("X-Download-Options", "noopen");
    }

    // IE8+ XSS protection
    if (noOpen) {
      res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    }

    // HTTPS Strict Transport Security
    if (strictTransportSecurity && req.secure) {
      res.setHeader("Strict-Transport-Security", strictTransportSecurity);
    }

    // Referrer Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );

    next();
  };
}

/**
 * Middleware to add request tracking and security logging
 * @param {Object} options - Configuration options
 * @returns {Function} - Express middleware function
 */
function securityLogging(options = {}) {
  const { trackSuspiciousActivity = true } = options;

  return (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    // Override the res.send method to capture the response
    res.send = function (body) {
      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log security-related events
      if (trackSuspiciousActivity) {
        // Check for unusual patterns
        const isUnusualRequest =
          responseTime > 5000 || // Response time is unusually long
          (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429) || // Client error (skip expected rate limits)
          res.statusCode >= 500; // Server error

        if (isUnusualRequest) {
          logError(new Error("Suspicious activity detected"), {
            ip: req.ip,
            user: req.user ? req.user.uid : "anonymous",
            path: req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.headers["user-agent"],
          });
        }
      }

      // Call the original send method
      originalSend.call(this, body);
    };

    next();
  };
}

module.exports = {
  generateSecureToken,
  secureHash,
  createSignature,
  verifySignature,
  generateRequestFingerprint,
  addSecurityHeaders,
  securityLogging,
};
