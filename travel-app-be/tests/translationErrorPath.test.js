const request = require("supertest");

jest.mock("../src/controllers/translationController", () => {
  const translateText = jest.fn((_req, res) =>
    res.status(500).json({
      error: { code: "EXTERNAL_SERVICE_ERROR" },
    })
  );
  return { translateText };
});

describe("Translation error path", () => {
  let app;

  beforeAll(() => {
    jest.resetModules();
    const { createApp } = require("../src/app");
    app = createApp();
  });

  test("surface translator failure as 500", async () => {
    const res = await request(app)
      .post("/api/translate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token")
      .send({ text: "hello", langPair: "en-es" });

    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe("EXTERNAL_SERVICE_ERROR");
  });
});
