const { createErrorResponse, ERROR_CODES, logError } = require("../utils/errorHandler");

/**
 * Firebase App Check verification (ADR-002, phase 2).
 *
 * Monitor mode (default): verifies an `X-Firebase-AppCheck` token when one is
 * sent, records the outcome on `req.appCheck`, and logs missing/invalid
 * tokens, but never rejects. Set APP_CHECK_ENFORCE=true to reject requests
 * without a valid token once the logs show real clients all send one.
 *
 * @param {object} options
 * @param {() => {verifyToken: Function}} options.getAppCheck lazily returns the Admin App Check service
 * @param {boolean} [options.enforce]
 */
function appCheck({ getAppCheck, enforce = false }) {
  return async (req, res, next) => {
    const token = req.header("X-Firebase-AppCheck");
    let verified = false;
    let reason = "missing";

    if (token) {
      try {
        await getAppCheck().verifyToken(token);
        verified = true;
        reason = "ok";
      } catch (error) {
        reason = "invalid";
        logError(error, { message: "App Check token rejected", requestId: req.requestId });
      }
    }

    req.appCheck = { verified, reason };
    if (!verified) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "app_check_unverified",
          reason,
          enforce,
          requestId: req.requestId,
          path: req.originalUrl,
        })
      );
      if (enforce) {
        return res
          .status(401)
          .json(createErrorResponse(401, ERROR_CODES.UNAUTHORIZED, "App verification required"));
      }
    }
    return next();
  };
}

module.exports = { appCheck };
