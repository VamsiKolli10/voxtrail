const express = require("express");
const request = require("supertest");
const {
  createCustomLimiter,
  createRoleBasedLimiter,
  createMethodBasedLimiter,
} = require("../src/utils/rateLimiter");

function buildApp(middleware) {
  const app = express();
  app.use(middleware);
  app.get("/", (_req, res) => res.json({ ok: true }));
  app.post("/", (_req, res) => res.json({ ok: true }));
  return app;
}

describe("rateLimiter utilities", () => {
  test.each([
    ["custom", () => createCustomLimiter({ windowMs: 60000, max: 1 })],
    ["role", () => createRoleBasedLimiter({ windowMs: 60000, limits: { anonymous: 1 } })],
    ["method", () => createMethodBasedLimiter({ windowMs: 60000, limits: { GET: 1 } })],
  ])("%s limiter counts requests per client instead of per request object or all clients", async (_name, create) => {
    const app = buildApp(create());
    app.set("trust proxy", 1);
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

    const first = await agent.get("/");
    expect(first.statusCode).toBe(200);

    const second = await agent.get("/");
    expect(second.statusCode).toBe(429);
    expect(second.body.error?.code || second.body.error?.message).toBeDefined();
  });

  test("createRoleBasedLimiter applies role-specific limits", async () => {
    const limiter = createRoleBasedLimiter({
      windowMs: 1000,
      limits: { anonymous: 1 },
      defaultMessage: "role limit",
    });
    const app = buildApp(limiter);
    const agent = request.agent(app);

    const first = await agent.get("/");
    expect(first.statusCode).toBe(200);

    const second = await agent.get("/");
    expect(second.statusCode).toBe(429);
    expect(second.body.error?.code || second.body.error?.message).toBeDefined();
  });

  test("createMethodBasedLimiter applies per-method limits", async () => {
    const limiter = createMethodBasedLimiter({
      windowMs: 1000,
      limits: { POST: 1 },
      defaultMessage: "method limit",
    });
    const app = buildApp(limiter);
    const agent = request.agent(app);

    const first = await agent.post("/");
    expect(first.statusCode).toBe(200);

    const second = await agent.post("/");
    expect(second.statusCode).toBe(429);
    expect(second.body.error?.code || second.body.error?.message).toBeDefined();
  });
});
