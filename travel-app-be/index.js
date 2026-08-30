const functions = require("firebase-functions/v1");
const { createApp } = require("./src/app");

const app = createApp();
// Keep this synchronized with the Firebase Hosting rewrite in firebase.json.
// A fixed region prevents Hosting from routing to a different deployment.
const region = "us-central1";
// Increased memory for translation model loading (models can be 100-200MB each)
const memory = process.env.FUNCTION_MEMORY || "2GB";
// Increased timeout to 120s to allow model loading (model timeout is 90s)
const timeoutSeconds = Number(process.env.FUNCTION_TIMEOUT || 120);
// Keep at least 1 instance warm to avoid cold starts for translation models
const minInstances = Number(process.env.FUNCTION_MIN_INSTANCES || 0);
const maxInstances = Number(process.env.FUNCTION_MAX_INSTANCES || 10);

exports.api = functions
  .region(region)
  .runWith({
    memory,
    timeoutSeconds,
    minInstances,
    maxInstances,
  })
  .https.onRequest(app);
