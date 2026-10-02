const request = require("supertest");

describe("Profile route", () => {
  let app;

  beforeAll(() => {
    const { createApp } = require("../src/app");
    app = createApp();
  });

  test("rejects unauthenticated profile access", async () => {
    const res = await request(app).get("/api/profile").set("user-agent", "jest");
    expect(res.statusCode).toBe(401);
  });

  test("returns profile when authenticated", async () => {
    const res = await request(app)
      .get("/api/profile")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");
    expect(res.statusCode).toBe(200);
    expect(res.body.uid).toBeDefined();
    expect(Array.isArray(res.body.roles)).toBe(true);
    const { auth } = require("../src/config/firebaseAdmin");
    expect(auth.verifyIdToken).toHaveBeenCalledWith("valid-user-token", true);
  });
});
