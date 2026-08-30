const hostingUrl = "http://127.0.0.1:5500";
const authUrl = "http://127.0.0.1:5909";

async function requestWithRetry(url, options = {}, attempts = 12) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`${url} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError;
}

async function expectJson(url, expectedStatus = 200, options = {}) {
  const response = await requestWithRetry(url, options);
  const body = await response.json();
  if (response.status !== expectedStatus) {
    throw new Error(
      `${url} returned HTTP ${response.status}: ${JSON.stringify(body)}`
    );
  }
  return body;
}

async function run() {
  const home = await requestWithRetry(hostingUrl);
  if (home.status !== 200 || !(await home.text()).includes("<div id=\"root\">")) {
    throw new Error("Firebase Hosting did not serve the frontend application");
  }

  const health = await expectJson(`${hostingUrl}/api/healthz`);
  if (health.status !== "ok") throw new Error("Unexpected health response");

  const readiness = await expectJson(`${hostingUrl}/api/readyz`);
  if (readiness.status !== "ready" || readiness.checks?.firestore !== true) {
    throw new Error(`Unexpected readiness response: ${JSON.stringify(readiness)}`);
  }

  const email = `smoke-${Date.now()}@example.test`;
  const auth = await expectJson(
    `${authUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    200,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "SmokeTest-123!", returnSecureToken: true }),
    }
  );
  if (!auth.idToken) throw new Error("Auth emulator did not return an ID token");

  const savedPhrases = await expectJson(`${hostingUrl}/api/saved-phrases`, 200, {
    headers: { authorization: `Bearer ${auth.idToken}` },
  });
  if (!Array.isArray(savedPhrases.items)) {
    throw new Error("Authenticated saved-phrases response is malformed");
  }

  console.log("Firebase emulator smoke tests passed: Hosting, Functions, Firestore, and Auth.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
