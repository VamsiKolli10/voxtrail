const { auth: adminAuth } = require("../config/firebaseAdmin");
const {
  createErrorResponse,
  ERROR_CODES,
  logError,
} = require("../utils/errorHandler");
const { generateRequestFingerprint } = require("../utils/security");

function extractRoles(decodedToken = {}) {
  const roles = new Set();

  if (Array.isArray(decodedToken.roles)) {
    decodedToken.roles.forEach((role) => roles.add(role));
  }

  if (Array.isArray(decodedToken.role)) {
    decodedToken.role.forEach((role) => roles.add(role));
  } else if (typeof decodedToken.role === "string") {
    roles.add(decodedToken.role);
  }

  if (decodedToken.admin === true) {
    roles.add("admin");
  }

  if (!roles.size) {
    roles.add("user");
  }

  return Array.from(roles);
}

// Revocation checks cost a round-trip to Firebase Auth, so they run only
// where a revoked session could do harm: writes and admin routes (ADR-002).
// Reads accept a valid, unexpired ID token (tokens live about 1 hour).
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function needsRevocationCheck(req, allowRoles) {
  const adminOnly = allowRoles.length > 0 && allowRoles.every((r) => r === "admin");
  return adminOnly || WRITE_METHODS.has(String(req.method).toUpperCase());
}

async function resolveUserFromRequest(
  req,
  { enforceHeader = true, checkRevoked = false } = {}
) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    if (enforceHeader) {
      throw new Error("Missing or invalid Authorization header");
    }
    return null;
  }

  const token = authHeader.slice("Bearer ".length);
  const decoded = checkRevoked
    ? await adminAuth.verifyIdToken(token, true)
    : await adminAuth.verifyIdToken(token);
  const roles = extractRoles(decoded);

  if (decoded.exp * 1000 < Date.now()) {
    const err = new Error("Token has expired");
    err.code = "token-expired";
    throw err;
  }

  if (decoded.revoked === true) {
    const err = new Error("Token has been revoked");
    err.code = "token-revoked";
    throw err;
  }

  if (decoded.ip && decoded.ip !== req.ip) {
    const err = new Error("Token IP mismatch");
    err.code = "token-ip-mismatch";
    throw err;
  }

  return { decoded, roles, revocationChecked: checkRevoked };
}

function hydrateRequestWithUser(req, decoded, roles, revocationChecked = false) {
  req.user = decoded;
  req.tokenRevocationChecked = revocationChecked;
  req.userRoles = roles;
  req.userId = decoded.uid;
  req.userVerified = true;
  req.securityContext = {
    ...req.securityContext,
    authenticated: true,
    userId: decoded.uid,
    tokenId: decoded.jti,
    roles,
    fingerprint: generateRequestFingerprint(req),
    timestamp: Date.now(),
  };
}

async function attachUserContext(req, _res, next) {
  try {
    const result = await resolveUserFromRequest(req, {
      enforceHeader: false,
    });
    if (result) {
      hydrateRequestWithUser(req, result.decoded, result.roles);
    }
  } catch (err) {
    req.userVerified = false;
    logError(err, {
      message: "Failed to hydrate user context for rate limiting",
      ip: req.ip,
      path: req.path,
    });
  } finally {
    next();
  }
}

function requireAuth(options = {}) {
  const { allowRoles = ["user", "admin"], onUnauthorized = null } = options;

  return async function authenticate(req, res, next) {
    try {
      let decoded = null;
      let roles = [];

      const checkRevoked = needsRevocationCheck(req, allowRoles);
      const canReuse =
        req.userVerified && req.user && (!checkRevoked || req.tokenRevocationChecked);

      if (canReuse) {
        decoded = req.user;
        roles = req.userRoles || extractRoles(decoded);
      } else {
        const result = await resolveUserFromRequest(req, {
          enforceHeader: true,
          checkRevoked,
        });
        decoded = result.decoded;
        roles = result.roles;
        hydrateRequestWithUser(req, decoded, roles, result.revocationChecked);
      }

      const allowed = roles.some((role) => {
        if (role === "admin") {
          return allowRoles.includes("admin") && decoded.admin === true;
        }
        return allowRoles.includes(role);
      });
      if (!allowed) {
        logError(new Error("Insufficient role"), {
          user: decoded.uid,
          roles: roles,
          requiredRoles: allowRoles,
          fingerprint: generateRequestFingerprint(req),
        });

        if (typeof onUnauthorized === "function") {
          return onUnauthorized(req, res);
        }
        return res
          .status(403)
          .json(
            createErrorResponse(
              403,
              ERROR_CODES.FORBIDDEN,
              "Forbidden: insufficient role"
            )
          );
      }

      next();
    } catch (err) {
      logError(err, {
        message: "Token verification error",
        ip: req.ip,
        fingerprint: generateRequestFingerprint(req),
      });
      res
        .status(401)
        .json(
          createErrorResponse(401, ERROR_CODES.UNAUTHORIZED, "Unauthorized")
        );
    }
  };
}

module.exports = { requireAuth, attachUserContext };
