// Google Cloud Translation, Basic edition (v2 REST). ADR-003.
//
// Auth uses Application Default Credentials: on Cloud Functions that is the
// function's service account (needs roles/cloudtranslate.user), so there is
// no API key to manage. Locally it falls back to FB_ADMIN_CREDENTIALS /
// GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`.
const { GoogleAuth } = require("google-auth-library");

const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const SCOPE = "https://www.googleapis.com/auth/cloud-translation";

function localCredentials() {
  // In a managed runtime, ADC comes from the metadata server.
  const {
    isManagedGoogleRuntime,
    loadServiceAccount,
  } = require("../config/firebaseAdmin");
  if (isManagedGoogleRuntime()) return {};
  const hasInline =
    process.env.FB_ADMIN_CREDENTIALS || process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!hasInline) return {};
  const account = loadServiceAccount();
  return { credentials: account, projectId: account.project_id };
}

let clientPromise = null;
function defaultGetClient() {
  if (!clientPromise) {
    const auth = new GoogleAuth({ scopes: [SCOPE], ...localCredentials() });
    clientPromise = auth.getClient().catch((err) => {
      clientPromise = null; // retry credential discovery on the next call
      throw err;
    });
  }
  return clientPromise;
}

function createGoogleTranslator({ getClient = defaultGetClient } = {}) {
  return async function translateWithGoogle({ text, source, target, signal }) {
    const client = await getClient();
    const response = await client.request({
      url: ENDPOINT,
      method: "POST",
      // format "text" returns plain text instead of HTML-escaped entities.
      data: { q: text, source, target, format: "text" },
      signal,
    });
    const translated = response?.data?.data?.translations?.[0]?.translatedText;
    if (!translated || !translated.trim()) {
      throw new Error("Cloud Translation returned an empty result");
    }
    return translated.trim();
  };
}

module.exports = {
  createGoogleTranslator,
  translateWithGoogle: createGoogleTranslator(),
  ENDPOINT,
};
