// ADR-001: the API runs on Cloud Functions 2nd gen with request concurrency
// and Secret Manager-backed provider keys; Hosting routes /api/** to it.
const fs = require("node:fs");
const path = require("node:path");

describe("API function deployment options", () => {
  let functionsModule;
  let options;

  beforeAll(() => {
    jest.resetModules();
    functionsModule = require("../index");
    options = require("../src/config/functionOptions");
  });

  test("apiV2 is a 2nd gen function that serves concurrent requests", () => {
    const endpoint = functionsModule.apiV2.__endpoint;
    expect(endpoint.platform).toBe("gcfv2");
    expect(endpoint.region).toEqual([options.REGION]);
    expect(endpoint.concurrency).toBeGreaterThan(1);
    // Concurrency > 1 requires at least one full vCPU.
    expect(endpoint.cpu).toBeGreaterThanOrEqual(1);
    expect(endpoint.timeoutSeconds).toBe(120);
  });

  test("provider keys are bound from Secret Manager", () => {
    const bound = functionsModule.apiV2.__endpoint.secretEnvironmentVariables.map(
      (secret) => secret.key
    );
    expect(bound).toEqual(
      expect.arrayContaining(["OPENROUTER_API_KEY", "GOOGLE_PLACES_API_KEY"])
    );
    // The rollback function must see the same keys.
    const legacy = functionsModule.api.__endpoint;
    expect(legacy.platform).toBe("gcfv1");
    expect(legacy.secretEnvironmentVariables.map((s) => s.key)).toEqual(bound);
  });

  test("the Hosting rewrite targets apiV2 in the same region", () => {
    const firebaseJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "firebase.json"), "utf8")
    );
    const apiRewrite = firebaseJson.hosting.rewrites.find((rule) =>
      String(rule.source).startsWith("/api")
    );
    expect(apiRewrite.function.functionId).toBe("apiV2");
    expect(apiRewrite.function.region).toBe(options.REGION);
  });
});
