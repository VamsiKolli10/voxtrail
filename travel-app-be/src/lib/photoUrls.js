// Signed, expiring photo URLs for the Places photo proxy (ADR-004).
//
// Search and details responses (already authenticated) carry photo URLs with
// an expiry and an HMAC signature; /api/stays/photo serves only those. Without
// this, anyone holding a photo name could make the API fetch photos at the
// project's cost.
//
// Key: PHOTO_URL_SECRET when set; otherwise derived from GOOGLE_PLACES_API_KEY
// (already a server-only secret on every instance, so no new secret to deploy).
// Rotating the Places key invalidates outstanding photo URLs, which is fine:
// they expire within hours anyway.
const crypto = require("node:crypto");
const { createSignature, verifySignature } = require("../utils/security");

const PHOTO_PROXY_PATH = "/api/stays/photo";
const DERIVATION_LABEL = "voxtrail/photo-url/v1";
const MAX_DIMENSION = 1600;

let processSecret = null;
function signingKey() {
  if (process.env.PHOTO_URL_SECRET) return process.env.PHOTO_URL_SECRET;
  if (process.env.GOOGLE_PLACES_API_KEY) {
    return crypto
      .createHmac("sha256", process.env.GOOGLE_PLACES_API_KEY)
      .update(DERIVATION_LABEL)
      .digest("hex");
  }
  // No Places key means no photos can be fetched anyway; a per-process key
  // keeps local development and tests working.
  if (!processSecret) processSecret = crypto.randomBytes(32).toString("hex");
  return processSecret;
}

function ttlMs() {
  const configured = Number(process.env.PHOTO_URL_TTL_MS);
  return Number.isFinite(configured) && configured >= 60_000
    ? configured
    : 6 * 60 * 60 * 1000;
}

// Expiry is snapped to half-TTL steps so the same photo gets the same URL for
// a while (browser cache hits) and every URL stays valid for TTL/2 to TTL.
function expiryFor(now) {
  const ttl = ttlMs();
  const step = Math.floor(ttl / 2);
  return Math.floor(now / step) * step + ttl;
}

function clampDimension(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, MAX_DIMENSION);
}

function payload({ name, maxWidth, maxHeight, exp }) {
  return [name, maxWidth || "", maxHeight || "", exp].join("|");
}

function signPhotoUrl(name, { maxWidth, maxHeight } = {}, now = Date.now()) {
  if (!name) return null;
  const width = clampDimension(maxWidth);
  const height = clampDimension(maxHeight);
  const exp = expiryFor(now);
  const sig = createSignature(
    payload({ name, maxWidth: width, maxHeight: height, exp }),
    signingKey()
  );
  const params = new URLSearchParams({ name });
  if (width) params.set("maxWidth", String(width));
  if (height) params.set("maxHeight", String(height));
  params.set("exp", String(exp));
  params.set("sig", sig);
  return `${PHOTO_PROXY_PATH}?${params.toString()}`;
}

/**
 * Check a photo request's query string.
 * @returns {{ ok: true, name, maxWidth, maxHeight, exp } | { ok: false, reason }}
 */
function verifyPhotoQuery(query = {}, now = Date.now()) {
  const { name, maxWidth, maxHeight, exp, sig } = query;
  const single = [name, maxWidth, maxHeight, exp, sig].every(
    (v) => v === undefined || typeof v === "string"
  );
  if (!single || !name || !exp || !sig) return { ok: false, reason: "unsigned" };

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt)) return { ok: false, reason: "unsigned" };

  const width = maxWidth ? clampDimension(maxWidth) : null;
  const height = maxHeight ? clampDimension(maxHeight) : null;
  const valid = verifySignature(
    payload({ name, maxWidth: width, maxHeight: height, exp: expiresAt }),
    sig,
    signingKey()
  );
  if (!valid) return { ok: false, reason: "bad_signature" };
  if (expiresAt <= now) return { ok: false, reason: "expired" };

  return { ok: true, name, maxWidth: width, maxHeight: height, exp: expiresAt };
}

module.exports = { signPhotoUrl, verifyPhotoQuery, PHOTO_PROXY_PATH };
