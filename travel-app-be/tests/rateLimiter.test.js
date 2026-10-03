const express = require("express");
const request = require("supertest");
const { createCustomLimiter, createApiLimiter } = require("../src/utils/rateLimiter");

function buildApp(middleware, { userFromHeader = false } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  if (userFromHeader) {
    // Stand-in for attachUserContext.
    app.use((req, _res, next) => {
      const uid = req.header("x-test-uid");
      if (uid) req.user = { uid };
      next();
    });
  }
  app.use(middleware);
  app.get("/", (_req, res) => res.json({ ok: true }));
  app.post("/", (_req, res) => res.json({ ok: true }));
  return app;
}

describe("rateLimiter utilities", () => {
  test("custom limiter counts requests per client IP (IPv6 by subnet)", async () => {
    const app = buildApp(createCustomLimiter({ windowMs: 60000, max: 1 }));
    const get = (ip) => request(app).get("/").set("X-Forwarded-For", ip);
    expect((await get("192.0.2.1")).status).toBe(200);
    expect((await get("192.0.2.1")).status).toBe(429);
    expect((await get("192.0.2.2")).status).toBe(200);
    expect((await get("2001:db8::1")).status).toBe(200);
    expect((await get("2001:db8::2")).status).toBe(429);
  });

  test("createCustomLimiter blocks after max requests", async () => {
    const app = buildApp(
      createCustomLimiter({
        windowMs: 1000,
        max: 1,
        message: "limit hit",
        keyGenerator: () => "test-key",
      })
    );
    const agent = request.agent(app);
    expect((await agent.get("/")).statusCode).toBe(200);
    const second = await agent.get("/");
    expect(second.statusCode).toBe(429);
    expect(second.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  describe("createApiLimiter (the single API flood guard, ADR-002)", () => {
    const limiter = () =>
      createApiLimiter({ windowMs: 60000, authenticatedMax: 3, anonymousMax: 1 });

    test("anonymous callers get the lower limit, keyed by IP", async () => {
      const app = buildApp(limiter(), { userFromHeader: true });
      const get = (ip) => request(app).get("/").set("X-Forwarded-For", ip);
      expect((await get("198.51.100.1")).status).toBe(200);
      expect((await get("198.51.100.1")).status).toBe(429);
      expect((await get("198.51.100.2")).status).toBe(200);
    });

    test("signed-in callers are keyed by user, not IP", async () => {
      const app = buildApp(limiter(), { userFromHeader: true });
      const get = (uid, ip) =>
        request(app).get("/").set("X-Forwarded-For", ip).set("x-test-uid", uid);
      // Same user from three IPs shares one bucket of 3.
      expect((await get("alice", "203.0.113.1")).status).toBe(200);
      expect((await get("alice", "203.0.113.2")).status).toBe(200);
      expect((await get("alice", "203.0.113.3")).status).toBe(200);
      expect((await get("alice", "203.0.113.4")).status).toBe(429);
      // Another user on a shared IP is unaffected.
      expect((await get("bob", "203.0.113.1")).status).toBe(200);
    });

    test("skip() exempts paths with their own limiter", async () => {
      const app = buildApp(
        createApiLimiter({ windowMs: 60000, anonymousMax: 1, skip: () => true })
      );
      expect((await request(app).get("/")).status).toBe(200);
      expect((await request(app).get("/")).status).toBe(200);
    });
  });
});
