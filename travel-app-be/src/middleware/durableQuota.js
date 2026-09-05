const { db } = require("../config/firebaseAdmin");
const { createErrorResponse, ERROR_CODES, logError } = require("../utils/errorHandler");

function durableDailyQuota({ name, userLimit, adminLimit = userLimit * 5 }) {
  if (!name || !userLimit) throw new Error("Quota name and userLimit are required");

  return async (req, res, next) => {
    if (!req.user?.uid) {
      return res.status(401).json(
        createErrorResponse(401, ERROR_CODES.UNAUTHORIZED, "Authentication required")
      );
    }

    const isAdmin = req.userRoles?.includes("admin");
    const limit = isAdmin ? adminLimit : userLimit;
    const day = new Date().toISOString().slice(0, 10);
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-");
    const ref = db.collection("usageQuotas").doc(`${day}:${safeName}:${req.user.uid}`);

    try {
      const usage = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const count = snapshot.exists ? Number(snapshot.data().count || 0) : 0;
        if (count >= limit) return { allowed: false, count };
        transaction.set(
          ref,
          {
            count: count + 1,
            day,
            endpoint: safeName,
            userId: req.user.uid,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
        return { allowed: true, count: count + 1 };
      });

      res.setHeader("X-Daily-Quota-Limit", String(limit));
      res.setHeader("X-Daily-Quota-Remaining", String(Math.max(0, limit - usage.count)));
      if (!usage.allowed) {
        return res.status(429).json(
          createErrorResponse(
            429,
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "Daily generation quota reached"
          )
        );
      }
      next();
    } catch (error) {
      logError(error, { requestId: req.requestId, quota: safeName, userId: req.user.uid });
      return res.status(503).json(
        createErrorResponse(
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          "Usage quota service unavailable"
        )
      );
    }
  };
}

function durableWindowedQuota({ name, userLimit, adminLimit = userLimit * 5, windowMs = 60 * 60 * 1000 }) {
  if (!name || !userLimit) throw new Error("Quota name and userLimit are required");

  return async (req, res, next) => {
    if (!req.user?.uid) {
      return res.status(401).json(
        createErrorResponse(401, ERROR_CODES.UNAUTHORIZED, "Authentication required")
      );
    }

    const isAdmin = req.userRoles?.includes("admin");
    const limit = isAdmin ? adminLimit : userLimit;
    const bucket = Math.floor(Date.now() / windowMs);
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-");
    const ref = db.collection("usageQuotas").doc(`window:${bucket}:${safeName}:${req.user.uid}`);

    try {
      const usage = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const count = snapshot.exists ? Number(snapshot.data().count || 0) : 0;
        if (count >= limit) return { allowed: false, count };
        transaction.set(
          ref,
          {
            count: count + 1,
            bucket,
            windowMs,
            endpoint: safeName,
            userId: req.user.uid,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
        return { allowed: true, count: count + 1 };
      });

      res.setHeader("X-Quota-Limit", String(limit));
      res.setHeader("X-Quota-Remaining", String(Math.max(0, limit - usage.count)));
      if (!usage.allowed) {
        return res.status(429).json(
          createErrorResponse(
            429,
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            `${name} quota reached. This limit is shared across all server instances.`
          )
        );
      }
      next();
    } catch (error) {
      logError(error, { requestId: req.requestId, quota: safeName, userId: req.user.uid });
      return res.status(503).json(
        createErrorResponse(
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          "Usage quota service unavailable"
        )
      );
    }
  };
}

module.exports = { durableDailyQuota, durableWindowedQuota };
