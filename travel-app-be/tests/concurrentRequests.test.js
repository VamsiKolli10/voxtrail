// ADR-001: on 2nd gen, up to 80 requests share one process. Overlapping
// requests must not leak state into each other through module-level code.
const request = require("supertest");

jest.mock("axios", () => ({ post: jest.fn(), get: jest.fn() }));

describe("overlapping requests in one instance", () => {
  let app;
  let mockAxios;

  beforeAll(() => {
    process.env.OPENROUTER_API_KEY = "test-only-key";
    jest.resetModules();
    mockAxios = require("axios");
    // Each provider call resolves after a random delay with a reply derived
    // from its own prompt, so responses complete out of order.
    mockAxios.post.mockImplementation(async (_url, body) => {
      const prompt = body.messages[body.messages.length - 1].content;
      const original = /"""([\s\S]*)"""/.exec(prompt)[1];
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 40));
      return { data: { choices: [{ message: { content: `ES:${original}` } }] } };
    });
    const { createApp } = require("../src/app");
    app = createApp();
  });

  afterAll(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  test("each translation response matches its own request", async () => {
    const inputs = Array.from({ length: 25 }, (_, i) => `phrase number ${i}`);
    const responses = await Promise.all(
      inputs.map((text) =>
        request(app)
          .post("/api/translate")
          .set("user-agent", "jest")
          .set("Authorization", "Bearer valid-user-token")
          .send({ text, langPair: "en-es" })
      )
    );

    responses.forEach((res, i) => {
      expect(res.statusCode).toBe(200);
      expect(res.body.translation).toBe(`ES:${inputs[i]}`);
    });
    const requestIds = new Set(responses.map((res) => res.headers["x-request-id"]));
    expect(requestIds.size).toBe(inputs.length);
  });
});
