// ADR-002: identity + per-user quotas + provider caps; no request signing,
// no user-agent heuristics; revocation checks only where they matter.
const request = require("supertest");

const savedPhrase = {
  phrase: "Hola",
  transliteration: "",
  meaning: "Hello",
  usageExample: "Hola!",
  topic: "greetings",
  sourceLang: "en",
  targetLang: "es",
};

describe("abuse and cost protection", () => {
  afterEach(() => {
    delete process.env.TRANSLATION_DAILY_QUOTA;
  });

  test("the API no longer needs REQUEST_SIGNING_SECRET", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)]
      );
    const offenders = walk(path.join(__dirname, "..", "src")).filter((file) =>
      fs.readFileSync(file, "utf8").includes("REQUEST_SIGNING_SECRET")
    );
    expect(offenders).toEqual([]);
    jest.resetModules();
    const { createApp } = require("../src/app");
    expect(() => createApp()).not.toThrow();
  });

  test("anonymous clients are not rejected for their user-agent", async () => {
    jest.resetModules();
    const { createApp } = require("../src/app");
    const res = await request(createApp())
      .get("/api/translate/health")
      .set("user-agent", "curl/8.5.0");
    expect(res.statusCode).not.toBe(403);
  });

  test("translation has a per-user daily quota", async () => {
    process.env.TRANSLATION_DAILY_QUOTA = "2";
    jest.resetModules();
    jest.doMock("../src/controllers/translationController", () => ({
      translateText: (req, res) => res.json({ translation: `t:${req.body.text}` }),
      healthCheck: (_req, res) => res.json({ ok: true }),
    }));
    const { createApp } = require("../src/app");
    const app = createApp();
    const translate = (token) =>
      request(app)
        .post("/api/translate")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "hello", langPair: "en-es" });

    expect((await translate("valid-user-token")).statusCode).toBe(200);
    expect((await translate("valid-user-token")).statusCode).toBe(200);
    const third = await translate("valid-user-token");
    expect(third.statusCode).toBe(429);
    expect(third.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    // Quotas are per user.
    expect((await translate("valid-admin-token")).statusCode).toBe(200);
    jest.dontMock("../src/controllers/translationController");
  });

  test("token revocation is checked on writes but not on reads", async () => {
    jest.resetModules();
    const { createApp } = require("../src/app");
    const { auth } = require("../src/config/firebaseAdmin");
    const app = createApp();

    auth.verifyIdToken.mockClear();
    await request(app)
      .get("/api/saved-phrases")
      .set("Authorization", "Bearer valid-user-token");
    expect(auth.verifyIdToken.mock.calls.every((call) => call[1] !== true)).toBe(true);

    auth.verifyIdToken.mockClear();
    const created = await request(app)
      .post("/api/saved-phrases")
      .set("Authorization", "Bearer valid-user-token")
      .send(savedPhrase);
    expect(created.statusCode).toBe(201);
    expect(auth.verifyIdToken).toHaveBeenCalledWith("valid-user-token", true);
  });
});

describe("App Check middleware", () => {
  const { appCheck } = require("../src/middleware/appCheck");
  const run = async (middleware, headers = {}) => {
    const req = {
      header: (name) => headers[name],
      originalUrl: "/api/x",
      requestId: "test",
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    return { req, res, next };
  };
  const verifier = (ok) => () => ({
    verifyToken: ok ? jest.fn().mockResolvedValue({}) : jest.fn().mockRejectedValue(new Error("bad")),
  });

  test("monitor mode records but never rejects", async () => {
    const { req, next, res } = await run(appCheck({ getAppCheck: verifier(false) }));
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.appCheck).toEqual({ verified: false, reason: "missing" });
  });

  test("enforce mode rejects missing and invalid tokens", async () => {
    const missing = await run(appCheck({ getAppCheck: verifier(true), enforce: true }));
    expect(missing.res.status).toHaveBeenCalledWith(401);
    const invalid = await run(appCheck({ getAppCheck: verifier(false), enforce: true }), {
      "X-Firebase-AppCheck": "forged",
    });
    expect(invalid.res.status).toHaveBeenCalledWith(401);
    expect(invalid.next).not.toHaveBeenCalled();
  });

  test("enforce mode accepts a valid token", async () => {
    const { next, req } = await run(appCheck({ getAppCheck: verifier(true), enforce: true }), {
      "X-Firebase-AppCheck": "valid",
    });
    expect(next).toHaveBeenCalled();
    expect(req.appCheck.verified).toBe(true);
  });
});

describe("durable quota documents expire", () => {
  test("daily and windowed counters carry expireAt for the Firestore TTL policy", async () => {
    jest.resetModules();
    const writes = [];
    jest.doMock("../src/config/firebaseAdmin", () => ({
      db: {
        collection: () => ({ doc: (id) => ({ id }) }),
        runTransaction: async (fn) =>
          fn({
            get: async () => ({ exists: false }),
            set: (_ref, data) => writes.push(data),
          }),
      },
    }));
    const { durableDailyQuota, durableWindowedQuota } = require("../src/middleware/durableQuota");
    const req = { user: { uid: "u1" }, userRoles: ["user"] };
    const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await durableDailyQuota({ name: "translation", userLimit: 5 })(req, res, next);
    await durableWindowedQuota({ name: "poi-search", userLimit: 5, windowMs: 3_600_000 })(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    writes.forEach((doc) => {
      expect(doc.expireAt).toBeInstanceOf(Date);
      expect(doc.expireAt.getTime()).toBeGreaterThan(Date.now());
    });
    jest.dontMock("../src/config/firebaseAdmin");
  });
});
