// API entry point. Runtime choice: docs/adr/001-api-runtime-2nd-gen.md.
const functionsV1 = require("firebase-functions/v1");
const { onRequest } = require("firebase-functions/v2/https");
const { createApp } = require("./src/app");

const {
  REGION,
  SECRET_NAMES,
  API_V2_OPTIONS,
} = require("./src/config/functionOptions");

const app = createApp();

// Cloud Functions 2nd gen: the Hosting rewrite (/api/**) points here.
exports.apiV2 = onRequest(API_V2_OPTIONS, app);

// Legacy 1st gen function, kept only so traffic can be switched back by
// pointing the Hosting rewrite at `api` again. Delete this export (and run
// `firebase functions:delete api --region us-central1`) once apiV2 is verified.
exports.api = functionsV1
  .region(REGION)
  .runWith({
    memory: "2GB",
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 10,
    secrets: SECRET_NAMES,
  })
  .https.onRequest(app);
