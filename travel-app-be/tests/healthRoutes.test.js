const request = require("supertest");

describe("Health and readiness routes", () => {
  let app;

  beforeAll(() => {
    const { createApp } = require("../src/app");
    app = createApp();
  });

  test.each(["/healthz", "/api/healthz"])("exposes liveness at %s", async (path) => {
    const response = await request(app).get(path);

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  test.each(["/readyz", "/api/readyz"])(
    "verifies Firestore readiness at %s",
    async (path) => {
      const response = await request(app).get(path);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        status: "ready",
        checks: { firestore: true },
      });
    }
  );
});
