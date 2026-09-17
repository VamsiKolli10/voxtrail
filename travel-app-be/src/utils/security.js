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
 * Middleware to validate request signatures
 * @param {Object} options - Configuration options
 * @param {string} options.secret - Secret key for signature validation
 * @param {Array} options.methods - HTTP methods that require signature validation
 * @returns {Function} - Express middleware function
 */
function validateRequestSignature(options = {}) {
  const {
    secret = process.env.REQUEST_SIGNING_SECRET,
    methods = ["POST", "PUT", "PATCH", "DELETE"],
    protectedPaths = [],
    skipPaths = ["/api/stays/photo"],
  } = options;

  if (!secret) {
    throw new Error(
      "REQUEST_SIGNING_SECRET is required to start the API server"
    );
  }

  return (req, res, next) => {
    const requestPath = (req.originalUrl || req.path || "").split("?")[0];
    const shouldSkip = skipPaths.some((path) =>
      requestPath.startsWith(path)
    );
    if (shouldSkip) {
      return next();
    }

    // Only validate for specified methods
    const shouldValidateMethod = methods.includes(req.method);
    const shouldValidatePath = protectedPaths.some((path) =>
      requestPath.startsWith(path)
    );
    if (!shouldValidateMethod && !shouldValidatePath) {
      return next();
    }

    // Skip signature validation for requests that already carry a verified Firebase user (server-to-server signed calls can still be used when no auth header is present)
    if (req.userVerified && req.user) {
      return next();
    }

    // If a Bearer token is present, let downstream auth middleware handle validity
    const hasAuthHeader =
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ");
    if (hasAuthHeader) {
      return next();
    }

    const signature = req.headers["x-request-signature"];
    if (!signature) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ERROR_CODES.UNAUTHORIZED,
            "Missing request signature"
          )
        );
    }

    const timestamp = req.headers["x-timestamp"];
    if (!timestamp) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ERROR_CODES.UNAUTHORIZED,
            "Missing request timestamp"
          )
        );
    }

    // Check if timestamp is recent (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ERROR_CODES.UNAUTHORIZED,
            "Request timestamp is invalid or expired"
          )
        );
    }

    // Create a fingerprint of the request for signing
    const body = JSON.stringify(req.body || {});
    const path = req.path;
    const method = req.method;
    const dataToSign = `${method}:${path}:${body}:${timestamp}`;

    // Verify the signature
    if (!verifySignature(dataToSign, signature, secret)) {
      logError(new Error("Invalid request signature"), {
        ip: req.ip,
        user: req.user ? req.user.uid : "anonymous",
        path: req.path,
        method: req.method,
      });

      return res
        .status(401)
        .json(
          createErrorResponse(
            401,
            ERROR_CODES.UNAUTHORIZED,
            "Invalid request signature"
          )
        );
    }

    // Store the fingerprint for tracking
    req.requestFingerprint = generateRequestFingerprint(req);
    req.requestSignatureValidated = true;

    next();
  };
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

/**
 * Middleware for enhanced authorization checks
 * @param {Object} options - Configuration options
 * @returns {Function} - Express middleware function
 */
function enhancedAuthorization(options = {}) {
  const { strictMode = false } = options;

  return (req, res, next) => {
    // Skip enhanced authorization checks for authentication paths and public API endpoints
    const authPaths = [
      "/api/auth",
      "/api/login",
      "/api/token",
      "/api/session",
      "/api/register",
    ];

    // Skip checks for public API endpoints that should be accessible without authentication
    const publicPaths = [
      "/api/stays/photo",
      "/api/stays/search",
      "/api/translate/health",
    ];

    if (
      authPaths.some((path) => req.path.startsWith(path)) ||
      publicPaths.some((path) => req.path.startsWith(path))
    ) {
      return next();
    }

    // If the request has a valid authorization header,
    // skip most of the strict authorization checks
    const hasAuth =
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ");

    // Check for required headers for all requests when strict mode is on
    const requiredHeaders = ["user-agent"];
    const missingHeaders = requiredHeaders.filter(
      (header) => !req.headers[header]
    );

    if (missingHeaders.length > 0) {
      logError(new Error("Missing required security headers"), {
        ip: req.ip,
        user: req.user ? req.user.uid : "anonymous",
        path: req.path,
        method: req.method,
        missingHeaders,
      });

      // Block non-authenticated requests with missing headers in strict mode
      if (strictMode) {
        const status = hasAuth ? 400 : 403;
        const code = hasAuth ? ERROR_CODES.BAD_REQUEST : ERROR_CODES.FORBIDDEN;
        return res
          .status(status)
          .json(
            createErrorResponse(
              status,
              code,
              "Missing required security headers"
            )
          );
      }
    }

    // Authenticated requests skip the heuristic checks below (unusual user
    // agent, etc.) -- those exist to slow down anonymous scraping/bot
    // traffic, not to reject clients (curl, scripts, mobile HTTP libraries,
    // health checks) that happen not to send a browser-like User-Agent once
    // they've already proven their identity with a bearer token. This bypass
    // must run before the suspicious-user-agent check below, not after --
    // otherwise a legitimate authenticated request gets blocked with a 403
    // before we ever get here.
    if (hasAuth) {
      // Log authenticated traffic after header validation
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${
          req.originalUrl
        } auth:${hasAuth}`
      );
      return next();
    }

    // Check for unusual user agent patterns
    const userAgent = req.headers["user-agent"] || "";
    const isSuspiciousUserAgent =
      userAgent.length === 0 ||
      (userAgent.includes("bot") && !userAgent.includes("googlebot")) ||
      userAgent.includes("curl") ||
      userAgent.includes("wget");

    if (isSuspiciousUserAgent && strictMode) {
      logError(new Error("Suspicious user agent detected"), {
        ip: req.ip,
        user: req.user ? req.user.uid : "anonymous",
        path: req.path,
        method: req.method,
        userAgent,
      });

      return res
        .status(403)
        .json(
          createErrorResponse(
            403,
            ERROR_CODES.FORBIDDEN,
            "Suspicious user agent"
          )
        );
    }

    // Check for IP-based restrictions if needed
    // This could be expanded to maintain a list of banned or restricted IPs

    // Store security context
    req.securityContext = {
      fingerprint: generateRequestFingerprint(req),
      isAuthenticated: !!req.user,
      timestamp: Date.now(),
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
  validateRequestSignature,
  addSecurityHeaders,
  securityLogging,
  enhancedAuthorization,
};
