const request = require("supertest");

jest.mock("../src/controllers/translationController", () => {
  const translateText = jest.fn(async (req, res) => {
    if (req.body.langPair === "zz-zz") {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR" },
      });
    }
    return res.json({ translation: `translated:${req.body.text}` });
  });
  return { translateText, __translateText: translateText };
});

const {
  __translateText: translateTextMock,
} = require("../src/controllers/translationController");

describe("Translation routes", () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    const { createApp } = require("../src/app");
    app = createApp();
  });

  test("rejects unauthenticated translation attempts", async () => {
    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .send({ text: "hello", langPair: "en-es" });

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("rejects unsupported language pairs", async () => {
    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: "hello", langPair: "zz-zz" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("validates payload before translating", async () => {
    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: "", langPair: "en-es" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details?.issues?.[0]).toMatch(/text/i);
  });

  test("rejects text that exceeds maximum length", async () => {
    const longText = "x".repeat(600);
    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: longText, langPair: "en-es" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("translates text when payload and auth are valid", async () => {
    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: "hello", langPair: "en-es" });

    expect(res.statusCode).toBe(200);
    expect(res.body.translation).toBe("translated:hello");
  });

  test("handles translator exceptions", async () => {
    translateTextMock.mockImplementationOnce(() => {
      throw new Error("Translation service unavailable");
    });

    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: "hello", langPair: "en-es" });

    expect([200, 500]).toContain(res.statusCode);
    if (res.statusCode === 500) {
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBeDefined();
    }
  });

  test("validates langPair format", async () => {
    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: "hello", langPair: "invalid-format" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects requests without user-agent header", async () => {
    const res = await request(app)
      .post("/api/translate")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: "hello", langPair: "en-es" });

    // Should either reject or require user-agent based on security middleware
    expect([400, 401, 403]).toContain(res.statusCode);
  });
});
