const request = require("supertest");

jest.mock("../src/lib/openrouterClient", () => ({
  chatComplete: jest.fn(),
}));

const { chatComplete } = require("../src/lib/openrouterClient");
const mockFirestore = require("firebase-admin").firestore;

describe("Culture intelligence routes", () => {
  let app;

  beforeAll(() => {
    const { createApp } = require("../src/app");
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const cacheStore = mockFirestore.__cultureBriefsStore || {};
    Object.keys(cacheStore).forEach((key) => delete cacheStore[key]);
    // Default model response
    chatComplete.mockResolvedValue(
      JSON.stringify({
        destination: "Paris",
        culture: "French",
        language: "en",
        categories: {
          greetings: ["Hi", "Hello", "Good day"],
          dining: ["tip", "reserve", "be polite"],
          dress_code: ["smart casual", "clean shoes", "modest"],
          gestures: ["handshake", "eye contact", "no pointing"],
          taboos: ["loud voices", "cutting lines", "politics"],
          safety_basics: ["watch bags"],
        },
      })
    );
  });

  test("cache keys preserve Unicode and tuple boundaries", () => {
    const { buildBriefCacheKey } = require("../src/controllers/cultureIntelligenceController")._internal;
    const identities = [["東京", "日本"], ["京都", "日本"], ["القاهرة", "مصر"], ["a-b", "c"], ["a", "b-c"]];
    expect(new Set(identities.map(([dest, culture]) => buildBriefCacheKey(dest, culture, "en"))).size).toBe(identities.length);
    expect(buildBriefCacheKey(" Paris ", "French", "en")).toBe(buildBriefCacheKey("paris", "french", "en"));
  });

  test("waits for a cache write before responding, and tolerates a failed write", async () => {
    const { db } = require("../src/config/firebaseAdmin");
    const collection = db.collection("cultureIntelligenceBriefs");
    const original = collection.doc.getMockImplementation();
    let rejectWrite;
    const writeStarted = new Promise((resolve) => {
      collection.doc.mockImplementation((id) => ({ ...original(id), set: () => {
        resolve();
        return new Promise((_ok, reject) => { rejectWrite = reject; });
      } }));
    });
    const { getBrief } = require("../src/controllers/cultureIntelligenceController");
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    try {
      const pending = getBrief({ query: { destination: "CacheWriteCity" } }, res);
      await writeStarted;
      expect(res.json).not.toHaveBeenCalled();
      rejectWrite(new Error("Firestore unavailable"));
      await pending;
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    } finally { collection.doc.mockImplementation(original); }
  });

  test("requires destination for culture brief", async () => {
    const res = await request(app)
      .get("/api/culture/brief")
      .set("user-agent", "jest");
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns culture brief when destination provided", async () => {
    const res = await request(app)
      .get("/api/culture/brief?destination=Paris")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(res.body.destination).toBe("Paris");
    expect(Array.isArray(res.body.categories?.greetings)).toBe(true);
  });

  test("returns 502 when model response is malformed", async () => {
    chatComplete.mockResolvedValueOnce("nonsense");

    const res = await request(app)
      .get("/api/culture/brief?destination=Paris")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(502);
    expect(res.body.error.code).toBe("EXTERNAL_SERVICE_ERROR");
  });

  test("returns a fallback brief when culture model call fails and no cache available", async () => {
    chatComplete.mockRejectedValueOnce(new Error("provider down"));

    const res = await request(app)
      .get("/api/culture/brief?destination=Paris")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(res.body.fallback).toBe(true);
    expect(res.body.fallbackReason).toBe("model_unavailable");
    expect(Array.isArray(res.body.categories?.greetings)).toBe(true);
    expect(res.body.categories.greetings.length).toBeGreaterThanOrEqual(3);
    const cacheStore = mockFirestore.__cultureBriefsStore || {};
    expect(Object.keys(cacheStore).length).toBe(0);
  });

  test("serves stale cache when model fails", async () => {
    const { _internal } = require("../src/controllers/cultureIntelligenceController");
    const cacheKey = _internal.buildBriefCacheKey("Paris", "Paris", "en");
    const cacheStore = mockFirestore.__cultureBriefsStore;
    cacheStore[cacheKey] = {
      value: {
        destination: "Paris",
        culture: "Paris",
        language: "en",
        categories: {
          greetings: ["Hi", "Hello", "Good day"],
          dining: ["tip", "reserve", "be polite"],
          dress_code: ["smart casual", "clean shoes", "modest"],
          gestures: ["handshake", "eye contact", "no pointing"],
          taboos: ["loud voices", "cutting lines", "politics"],
          safety_basics: ["watch bags"],
        },
        generatedAt: new Date().toISOString(),
      },
      timestamp: Date.now() - 48 * 60 * 60 * 1000,
      destination: "Paris",
      culture: "Paris",
      language: "en",
      cacheVersion: process.env.CULTURE_BRIEF_CACHE_VERSION || "1",
    };

    chatComplete.mockRejectedValueOnce(new Error("OpenRouter unavailable"));

    const res = await request(app)
      .get("/api/culture/brief?destination=Paris")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(res.body.cacheStatus).toBe("stale");
    expect(res.body.destination).toBe("Paris");
    expect(Array.isArray(res.body.categories?.greetings)).toBe(true);
  });

  test("cultural etiquette legacy endpoint proxies brief", async () => {
    const res = await request(app)
      .get("/api/cultural-etiquette?destination=Paris")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(res.body.destination).toBe("Paris");
  });

  test("culturalEtiquetteController handles getBrief error", async () => {
    jest.resetModules();
    jest.doMock("../src/controllers/culturalEtiquetteController", () => ({
      generateCulturalEtiquette: jest
        .fn()
        .mockImplementation((_req, res) =>
          res
            .status(500)
            .json({
              error: { code: "INTERNAL_ERROR", message: "forced failure" },
            })
        ),
    }));

    const { createApp } = require("../src/app");
    const appWithMock = createApp();

    const res = await request(appWithMock)
      .get("/api/cultural-etiquette?destination=Paris")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    jest.resetModules();
  });

  test("validates culture Q&A payload", async () => {
    const res = await request(app)
      .post("/api/culture/qa")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ destination: "", question: "" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns culture Q&A answer for valid payload", async () => {
    chatComplete.mockResolvedValueOnce(
      JSON.stringify({ answer: "Bonjour", highlights: ["Be polite"] })
    );

    const res = await request(app)
      .post("/api/culture/qa")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ destination: "Paris", question: "How to greet?" });

    expect(res.statusCode).toBe(200);
    expect(res.body.answer).toBeDefined();
    expect(Array.isArray(res.body.highlights)).toBe(true);
  });

  test("returns contextual tips for valid payload", async () => {
    chatComplete.mockResolvedValueOnce(
      JSON.stringify({ tips: ["Be polite"], severity: "info" })
    );

    const res = await request(app)
      .post("/api/culture/contextual")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({
        contextType: "translation",
        destination: "Paris",
        text: "Hello",
        sourceLang: "en",
        targetLang: "fr",
      });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tips)).toBe(true);
  });

  test("rejects invalid contextType", async () => {
    const res = await request(app)
      .post("/api/culture/contextual")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ contextType: "unknown" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
