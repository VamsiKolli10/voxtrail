import { firebaseApp } from "../firebase";

/**
 * Firebase App Check (ADR-002). Disabled unless
 * VITE_APPCHECK_RECAPTCHA_SITE_KEY is set; the SDK is loaded lazily so it
 * costs nothing when off. The API verifies the token in monitor mode until
 * APP_CHECK_ENFORCE=true on the backend.
 */
let appCheckPromise = null;

function siteKey() {
  return import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY || "";
}

export async function getAppCheckToken() {
  const key = siteKey();
  if (!key) return null;
  try {
    const sdk = await import("firebase/app-check");
    appCheckPromise ??= Promise.resolve(
      sdk.initializeAppCheck(firebaseApp, {
        provider: new sdk.ReCaptchaV3Provider(key),
        isTokenAutoRefreshEnabled: true,
      })
    );
    const appCheck = await appCheckPromise;
    const { token } = await sdk.getToken(appCheck, false);
    return token || null;
  } catch (error) {
    // Never block a request on App Check; the backend decides (monitor/enforce).
    console.warn("App Check token unavailable", error);
    return null;
  }
}

export function __resetAppCheckForTests() {
  appCheckPromise = null;
}
