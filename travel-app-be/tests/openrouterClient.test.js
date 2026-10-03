// ADR-003: model selection is configuration only, and the chain only falls
// through on errors another model could fix.
const request = require("supertest");

jest.mock("axios", () => ({ post: jest.fn(), get: jest.fn() }));

const ENV_KEYS = [
  "NODE_ENV",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL_CHAIN",
  "OPENROUTER_MODEL",
  "OPENROUTER_ALLOW_FREE_MODELS",
];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function load() {
  jest.resetModules();
  return {
    client: require("../src/lib/openrouterClient"),
    axios: require("axios"),
  };
}

function httpError(status) {
  const err = new Error(`HTTP ${status}`);
  err.response = { status, data: { error: { message: `status ${status}` } } };
  return err;
}

const ok = (content) => ({ data: { choices: [{ message: { content } }] } });

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-only-key";
  delete process.env.OPENROUTER_MODEL;
  delete process.env.OPENROUTER_ALLOW_FREE_MODELS;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("getModelChain", () => {
  test("drops IDs without a vendor prefix (old implicit fallback)", () => {
    process.env.OPENROUTER_MODEL_CHAIN = "gpt-4o-mini, openai/gpt-4o-mini";
    const { client } = load();
    expect(client.getModelChain()).toEqual(["openai/gpt-4o-mini"]);
  });

  test("production skips :free models unless explicitly allowed", () => {
    process.env.NODE_ENV = "production";
    process.env.OPENROUTER_MODEL_CHAIN =
      "x-ai/grok-4.1-fast:free,google/gemini-2.5-flash-lite";
    const { client } = load();
    expect(client.getModelChain()).toEqual(["google/gemini-2.5-flash-lite"]);

    process.env.OPENROUTER_ALLOW_FREE_MODELS = "true";
    expect(client.getModelChain()).toEqual([
      "x-ai/grok-4.1-fast:free",
      "google/gemini-2.5-flash-lite",
    ]);
  });

  test("development keeps :free models", () => {
    process.env.NODE_ENV = "development";
    process.env.OPENROUTER_MODEL_CHAIN = "x-ai/grok-4.1-fast:free";
    const { client } = load();
    expect(client.getModelChain()).toEqual(["x-ai/grok-4.1-fast:free"]);
  });

  test("legacy OPENROUTER_MODEL goes first without duplicates", () => {
    process.env.OPENROUTER_MODEL = "openai/gpt-4o-mini";
    process.env.OPENROUTER_MODEL_CHAIN =
      "google/gemini-2.5-flash-lite,openai/gpt-4o-mini";
    const { client } = load();
    expect(client.getModelChain()).toEqual([
      "openai/gpt-4o-mini",
      "google/gemini-2.5-flash-lite",
    ]);
  });
});

describe("chatComplete", () => {
  beforeEach(() => {
    process.env.OPENROUTER_MODEL_CHAIN = "vendor/first,vendor/second";
  });

  test("throws AiNotConfiguredError when no usable model is configured", async () => {
    process.env.OPENROUTER_MODEL_CHAIN = "gpt-4o-mini";
    const { client, axios } = load();
    await expect(client.chatComplete({ system: "s", user: "u" })).rejects.toMatchObject({
      code: "AI_NOT_CONFIGURED",
    });
    expect(axios.post).not.toHaveBeenCalled();
  });

  test("a removed model (404) falls through to the next one", async () => {
    const { client, axios } = load();
    axios.post
      .mockRejectedValueOnce(httpError(404))
      .mockResolvedValueOnce(ok("second answer"));
    await expect(client.chatComplete({ system: "s", user: "u" })).resolves.toBe(
      "second answer"
    );
    expect(axios.post.mock.calls.map(([, body]) => body.model)).toEqual([
      "vendor/first",
      "vendor/second",
    ]);
  });

  test.each([400, 401, 402, 403])(
    "%i stops the chain (another model won't fix it)",
    async (status) => {
      const { client, axios } = load();
      axios.post.mockRejectedValueOnce(httpError(status));
      await expect(client.chatComplete({ system: "s", user: "u" })).rejects.toMatchObject({
        response: { status },
      });
      expect(axios.post).toHaveBeenCalledTimes(1);
    }
  );

  test("sends max_tokens (per call, with a default)", async () => {
    const { client, axios } = load();
    axios.post.mockResolvedValue(ok("x"));
    await client.chatComplete({ system: "s", user: "u", max_tokens: 321 });
    await client.chatComplete({ system: "s", user: "u" });
    expect(axios.post.mock.calls[0][1].max_tokens).toBe(321);
    expect(axios.post.mock.calls[1][1].max_tokens).toBe(1500);
  });
});

describe("routes when AI is not configured", () => {
  test("phrasebook answers 503 SERVICE_UNAVAILABLE", async () => {
    process.env.OPENROUTER_MODEL_CHAIN = "";
    const { axios } = load();
    const { createApp } = require("../src/app");
    const res = await request(createApp())
      .post("/api/phrasebook/generate")
      .set("Authorization", "Bearer valid-user-token")
      .send({ topic: "Travel", sourceLang: "en", targetLang: "es" });
    expect(res.statusCode).toBe(503);
    expect(res.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(axios.post).not.toHaveBeenCalled();
  });
});
