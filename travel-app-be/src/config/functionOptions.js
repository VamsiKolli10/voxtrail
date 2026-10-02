const { defineInt, defineSecret } = require("firebase-functions/params");

// Deployment settings for the API function. See
// docs/adr/001-api-runtime-2nd-gen.md.
//
// Keep REGION synchronized with the Firebase Hosting rewrite in firebase.json:
// a fixed region prevents Hosting from routing to a different deployment.
const REGION = "us-central1";

// Provider keys live in Secret Manager (`firebase functions:secrets:set NAME`)
// and are injected as environment variables at runtime, so config/env.js and
// the provider modules keep reading process.env unchanged.
const SECRET_NAMES = [
  "OPENROUTER_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "REQUEST_SIGNING_SECRET",
];
const secrets = SECRET_NAMES.map((name) => defineSecret(name));

// Instance bounds are deploy-time params (override in .env / .env.<project>).
// Scale to zero by default; 2nd gen serves many requests per instance, so a
// small ceiling still allows hundreds of in-flight requests.
const minInstances = defineInt("FUNCTION_MIN_INSTANCES", { default: 0 });
const maxInstances = defineInt("FUNCTION_MAX_INSTANCES", { default: 5 });

const API_V2_OPTIONS = {
  region: REGION,
  cpu: 1,
  // Up to 80 requests share one instance. Module-level state in src/ is
  // limited to deliberately shared caches, counters and rate-limit stores.
  concurrency: 80,
  memory: "512MiB",
  timeoutSeconds: 120,
  minInstances,
  maxInstances,
  secrets,
};

module.exports = { REGION, SECRET_NAMES, API_V2_OPTIONS };
