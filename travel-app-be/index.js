const functions = require("firebase-functions/v1");
const { createApp } = require("./src/app");

const app = createApp();
// Keep this synchronized with the Firebase Hosting rewrite in firebase.json.
// A fixed region prevents Hosting from routing to a different deployment.
const region = "us-central1";
// Configurable resources for the API and external provider requests.
const memory = process.env.FUNCTION_MEMORY || "2GB";
const timeoutSeconds = Number(process.env.FUNCTION_TIMEOUT || 120);
// Default to scale-to-zero; operators can opt into warm instances.
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
