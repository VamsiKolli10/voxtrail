const admin = require("firebase-admin");
const { generateKeyPairSync } = require("node:crypto");
const fs = require("fs");
const path = require("path");

let cachedCredentials;

function loadServiceAccount() {
  if (cachedCredentials) return cachedCredentials;

  const inline =
    process.env.FB_ADMIN_CREDENTIALS || process.env.FIREBASE_ADMIN_CREDENTIALS;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!inline && !credentialsPath) {
    throw new Error(
      "Missing FB_ADMIN_CREDENTIALS (formerly FIREBASE_ADMIN_CREDENTIALS). Provide a base64 encoded service account JSON via environment variables or set GOOGLE_APPLICATION_CREDENTIALS to a readable file."
    );
  }

  try {
    let jsonString;

    if (inline) {
      jsonString = inline.trim().startsWith("{")
        ? inline
        : Buffer.from(inline, "base64").toString("utf8");
    } else {
      const resolvedPath = path.isAbsolute(credentialsPath)
        ? credentialsPath
        : path.resolve(process.cwd(), credentialsPath);
      jsonString = fs.readFileSync(resolvedPath, "utf8");
    }

    cachedCredentials = JSON.parse(jsonString);

    if (!cachedCredentials.project_id) {
      throw new Error("Service account credentials are missing project_id");
    }

    return cachedCredentials;
  } catch (err) {
    throw new Error(
      `Unable to load Firebase Admin credentials: ${err.message}`
    );
  }
}

function isManagedGoogleRuntime() {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT
  );
}

function isFirebaseEmulator() {
  return Boolean(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FUNCTIONS_EMULATOR === "true"
  );
}

function certificateCredential(serviceAccount) {
  if (admin.credential?.cert) return admin.credential.cert(serviceAccount);
  return require("firebase-admin/app").cert(serviceAccount);
}

// Initialize Firebase Admin SDK exactly once
const initializedApps =
  typeof admin.getApps === "function" ? admin.getApps() : admin.apps || [];
if (!initializedApps.length) {
  const runningInEmulator = isFirebaseEmulator();
  const hasExplicitCredentials =
    !runningInEmulator &&
    Boolean(
      process.env.FB_ADMIN_CREDENTIALS ||
        process.env.FIREBASE_ADMIN_CREDENTIALS ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS
    );

  if (hasExplicitCredentials) {
    const serviceAccount = loadServiceAccount();
    const projectId = serviceAccount.project_id;

    admin.initializeApp({
      credential: certificateCredential(serviceAccount),
      projectId,
      databaseURL: `https://${projectId}.firebaseio.com`,
    });
  } else if (runningInEmulator) {
    // Generate a process-local demo certificate so emulator mode cannot use a
    // developer's real project credentials or contact Google OAuth.
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const projectId = process.env.GCLOUD_PROJECT || "demo-voxtrail";
    admin.initializeApp({
      projectId,
      credential: certificateCredential({
        project_id: projectId,
        client_email: `emulator@${projectId}.iam.gserviceaccount.com`,
        private_key: privateKey,
      }),
    });
  } else if (isManagedGoogleRuntime()) {
    // Firebase Functions and Cloud Run provide Application Default Credentials.
    // Avoid distributing a second long-lived service-account key at runtime.
    admin.initializeApp();
  } else {
    throw new Error(
      "Firebase Admin credentials are required outside a managed Google Cloud runtime."
    );
  }
}

const db =
  typeof admin.firestore === "function"
    ? admin.firestore()
    : require("firebase-admin/firestore").getFirestore();
const auth =
  typeof admin.auth === "function"
    ? admin.auth()
    : require("firebase-admin/auth").getAuth();
const FieldValue =
  admin.firestore?.FieldValue || require("firebase-admin/firestore").FieldValue;

module.exports = {
  admin,
  db,
  auth,
  FieldValue,
  loadServiceAccount,
  isManagedGoogleRuntime,
  isFirebaseEmulator,
  certificateCredential,
};
