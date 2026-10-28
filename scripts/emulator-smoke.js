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
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${url} returned HTTP ${response.status} with a non-JSON response: ${text.slice(0, 200)}`);
  }
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
  if (home.headers.get("x-content-type-options") !== "nosniff" ||
      home.headers.get("x-frame-options") !== "DENY" ||
      !home.headers.get("content-security-policy")?.includes("frame-ancestors 'none'")) {
    throw new Error("Firebase Hosting security headers are missing");
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

  const stayUrl = `${hostingUrl}/api/saved-stays/smoke-place`;
  const headers = { authorization: `Bearer ${auth.idToken}`, "content-type": "application/json" };
  const shortlist = await expectJson(`${hostingUrl}/api/saved-stays`, 200, { headers });
  if (shortlist.items.length !== 0) throw new Error("New account has another account's saved stays");
  await expectJson(stayUrl, 201, { method: "PUT", headers, body: JSON.stringify({ nickname: "Smoke test option", notes: "User-authored note" }) });
  await expectJson(stayUrl, 200, { method: "PUT", headers, body: JSON.stringify({ nickname: "Updated option" }) });
  const saved = await expectJson(`${hostingUrl}/api/saved-stays`, 200, { headers });
  if (saved.items.length !== 1 || saved.items[0].nickname !== "Updated option" || !saved.items[0].createdAt) {
    throw new Error(`Saved-stays persistence failed: ${JSON.stringify(saved)}`);
  }
  await expectJson(stayUrl, 200, { method: "DELETE", headers });
  await expectJson(stayUrl, 200, { method: "DELETE", headers });
  const removed = await expectJson(`${hostingUrl}/api/saved-stays`, 200, { headers });
  if (removed.items.length !== 0) throw new Error("Removed stay remains in the shortlist");

  console.log("Firebase emulator smoke tests passed: Hosting, Functions, Firestore, Auth, and saved-stays CRUD.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
