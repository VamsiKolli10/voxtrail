require("dotenv").config();

process.env.FIRESTORE_PREFER_REST = process.env.FIRESTORE_PREFER_REST || "true";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const env = require("./config/env");
const translationRoutes = require("./routes/translationRoutes");
const phrasebookRoutes = require("./routes/phrasebookRoutes");
const savedPhraseRoutes = require("./routes/savedPhraseRoutes");
const staysRoutes = require("./routes/staysRoutes");
const poiRoutes = require("./routes/poiRoutes");
const itineraryRoutes = require("./routes/itineraryRoutes");
const culturalEtiquetteRoutes = require("./routes/culturalEtiquetteRoutes");
const cultureIntelligenceRoutes = require("./routes/cultureIntelligenceRoutes");
const locationRoutes = require("./routes/locationRoutes");
const { db } = require("./config/firebaseAdmin");
const { requireAuth, attachUserContext } = require("./middleware/authenticate");
const {
  expressErrorHandler,
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("./utils/errorHandler");
const {
  createCustomLimiter,
  createRoleBasedLimiter,
  createMethodBasedLimiter,
} = require("./utils/rateLimiter");
const {
  addSecurityHeaders,
  securityLogging,
  enhancedAuthorization,
  validateRequestSignature,
} = require("./utils/security");
const { recordTiming, getPerformanceSnapshot } = require("./utils/performance");
const { validateBody } = require("./middleware/validate");
const { userWriteSchema } = require("./utils/schemas");
const { requestContext } = require("./middleware/requestContext");

const defaultAllowedOrigins = [
  "http://localhost",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://smarttravelcompanion-9ed6c.web.app",
  "https://smarttravelcompanion-9ed6c.firebaseapp.com",
];

const allowedOrigins =
  env.CORS_ALLOWED_ORIGIN_LIST.length > 0
    ? env.CORS_ALLOWED_ORIGIN_LIST
    : defaultAllowedOrigins;

const rateLimitWindowMs = env.RATE_LIMIT_WINDOW_MS ?? 60_000;
const rateLimitMax = env.RATE_LIMIT_MAX ?? 60;
const requestBodyLimit = env.REQUEST_BODY_LIMIT || "256kb";
const signingSecret = env.REQUEST_SIGNING_SECRET;
const readinessTimeoutMs = env.READINESS_TIMEOUT_MS ?? 3_000;

if (!signingSecret) {
  throw new Error(
    "REQUEST_SIGNING_SECRET is required. Configure a strong secret before starting the API."
  );
}

// Role-based rate limits (requests per window)
const roleLimits = {
  admin: 120, // Admins can make more requests
  user: 60, // Regular users
  anonymous: 20, // Anonymous users have limited access
};

// Endpoint-specific rate limits
const endpointLimits = {
  "/api/users": {
    windowMs: 60000, // 1 minute
    max: 20, // 20 requests per minute for user management
  },
  "/api/translate": {
    windowMs: 60000, // 1 minute
    max: 30, // 30 requests per minute for translation
  },
  "/api/phrasebook/generate": {
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests per minute for phrasebook generation
  },
  "/api/stays/search": {
    windowMs: 60000, // 1 minute
    max: 40, // 40 requests per minute for stay search
  },
  "/api/stays/photo": {
    windowMs: 60000, // 1 minute
    max: 300, // 300 requests per minute for photo proxy
  },
  "/api/poi/search": {
    windowMs: 60000, // 1 minute
    max: 60,
  },
  "/api/itinerary/generate": {
    windowMs: 60000,
    max: 12, // keep lower to control AI costs
  },
  "/api/location/resolve": {
    windowMs: 60000,
    max: 60,
  },
};

// Method-based rate limits (requests per window for different HTTP methods)
const methodLimits = {
  GET: 100,
  POST: 50,
  PUT: 30,
  PATCH: 20,
  DELETE: 10,
};

function createApp() {
  const app = express();
  let readinessCache = { checkedAt: 0, ready: false };
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestContext);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );

  // Use Helmet with custom configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
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
      // Allow subresources like images to be requested cross-origin (e.g., FE :5173 -> BE :8000)
      crossOriginResourcePolicy: { policy: "cross-origin" },
      xssFilter: true,
      noSniff: true,
      frameGuard: "deny",
      ieNoOpen: true,
      noOpen: true,
    })
  );

  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

  const healthResponse = (_req, res) => res.status(200).json({ status: "ok" });
  const readinessResponse = async (_req, res) => {
    const now = Date.now();
    if (now - readinessCache.checkedAt > 10_000) {
      let timer;
      try {
        await new Promise((resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Firestore readiness check timed out")),
            readinessTimeoutMs
          );
          Promise.resolve(
            db.collection("_health").doc("readiness").get()
          ).then(resolve, reject);
        });
        readinessCache = { checkedAt: now, ready: true };
      } catch (error) {
        readinessCache = { checkedAt: now, ready: false };
        logError(error, { message: "Readiness dependency check failed" });
      } finally {
        clearTimeout(timer);
      }
    }

    res.status(readinessCache.ready ? 200 : 503).json({
      status: readinessCache.ready ? "ready" : "not_ready",
      checks: { firestore: readinessCache.ready },
    });
  };
  // Keep root checks for direct/local API usage and expose /api checks for the
  // Firebase Hosting rewrite, which forwards the original request path.
  app.get("/healthz", healthResponse);
  app.get("/readyz", readinessResponse);
  app.get("/api/healthz", healthResponse);
  app.get("/api/readyz", readinessResponse);

  // Hydrate user context (if any) before applying role-based rate limits
  app.use(attachUserContext);

  // Apply role-based rate limiting to the API (skip hot paths like /stays/photo which can issue many parallel requests)
  const roleLimiter = createRoleBasedLimiter({
    windowMs: rateLimitWindowMs,
    limits: roleLimits,
    defaultMessage: "Too many requests for your role",
  });
  const roleLimitBypass = ["/stays/photo", "/stays/photo/"];
  app.use("/api", (req, res, next) => {
    const path = req.path || "";
    if (roleLimitBypass.some((p) => path.startsWith(p))) {
      return next();
    }
    return roleLimiter(req, res, next);
  });

  // Apply endpoint-specific rate limiting
  Object.entries(endpointLimits).forEach(([path, limits]) => {
    app.use(path, createCustomLimiter(limits));
  });

  // Apply method-based rate limiting to the entire API
  const methodLimiter = createMethodBasedLimiter({
    windowMs: rateLimitWindowMs,
    limits: methodLimits,
    defaultMessage: "Too many requests for this HTTP method",
  });
  app.use("/api", (req, res, next) => {
    const path = req.path || "";
    if (roleLimitBypass.some((p) => path.startsWith(p))) {
      return next();
    }
    return methodLimiter(req, res, next);
  });

  // Add enhanced security middleware
  app.use(addSecurityHeaders());
  app.use(enhancedAuthorization({ strictMode: true }));
  app.use(securityLogging({ trackSuspiciousActivity: true }));

  // Lightweight response time tracking (no logging); adds X-Response-Time-ms header
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const originalEnd = res.end;
    res.end = function patchedEnd(chunk, encoding, callback) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      // Guard against late calls where headers are already sent
      if (!res.headersSent) {
        res.setHeader("X-Response-Time-ms", durationMs.toFixed(1));
      }
      res.requestDurationMs = durationMs;
      const routeKey = `${req.method} ${
        req.route?.path || req.originalUrl.split("?")[0] || req.path
      }`;
      recordTiming(routeKey, durationMs);
      return originalEnd.call(this, chunk, encoding, callback);
    };
    next();
  });

  // Validate request signatures for sensitive endpoints
  app.use(
    validateRequestSignature({
      secret: signingSecret,
      methods: ["POST", "PUT", "PATCH", "DELETE"],
      protectedPaths: ["/api/stays", "/api/poi", "/api/itinerary"],
    })
  );

  app.use((req, _res, next) => {
    const hasAuth = (req.headers.authorization || "").startsWith("Bearer ");
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${
        req.originalUrl
      } auth:${hasAuth}`
    );
    next();
  });

  const requireUser = () => requireAuth({ allowRoles: ["user", "admin"] });
  const requireAdmin = () => requireAuth({ allowRoles: ["admin"] });

  app.get("/api/metrics/perf", requireAdmin(), (_req, res) => {
    res.json({ routes: getPerformanceSnapshot() });
  });

  app.get("/api/users", requireAdmin(), async (req, res) => {
    try {
      const max = Math.min(Number(req.query.limit) || 50, 200);
      const snapshot = await db.collection("users").limit(max).get();
      res.json(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      logError(e, { endpoint: "/api/users" });
      res
        .status(500)
        .json(
          createErrorResponse(
            500,
            ERROR_CODES.DB_ERROR,
            "Failed to fetch users"
          )
        );
    }
  });

  app.post(
    "/api/users",
    requireAdmin(),
    validateBody(userWriteSchema),
    async (req, res) => {
      try {
        const docRef = await db.collection("users").add(req.body || {});
        res.status(201).json({ id: docRef.id });
      } catch (e) {
        logError(e, { endpoint: "/api/users", body: req.body });
        res
          .status(500)
          .json(
            createErrorResponse(500, ERROR_CODES.DB_ERROR, "Failed to add user")
          );
      }
    }
  );

  app.get("/api/profile", requireAuth(), async (req, res) => {
    res.json({
      uid: req.user.uid,
      email: req.user.email,
      name: req.user.name || req.user.displayName || null,
      roles: req.userRoles || [],
    });
  });

  app.use("/api/translate", translationRoutes);
  app.use("/api/phrasebook", phrasebookRoutes);
  app.use("/api/saved-phrases", requireUser(), savedPhraseRoutes);
  app.use("/api/stays", staysRoutes);
  app.use("/api/poi", requireUser(), poiRoutes);
  app.use("/api/itinerary", requireUser(), itineraryRoutes);
  app.use("/api/culture", cultureIntelligenceRoutes);
  app.use("/api/cultural-etiquette", culturalEtiquetteRoutes);
  app.use("/api/location", locationRoutes);

  app.use((req, res) =>
    res.status(404).json(
      createErrorResponse(404, ERROR_CODES.NOT_FOUND, "Not Found", {
        path: req.originalUrl,
      })
    )
  );

  app.use(expressErrorHandler);

  return app;
}

module.exports = { createApp };
