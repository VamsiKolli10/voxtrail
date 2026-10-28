// ADR-003: /api/translate uses Cloud Translation first and falls back to
// OpenRouter when it fails.
jest.mock("axios", () => ({ post: jest.fn(), get: jest.fn() }));

const mockRequest = jest.fn();
jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn(async () => ({ request: mockRequest })),
  })),
}));

const ENV_KEYS = ["TRANSLATION_PROVIDER", "TRANSLATION_FALLBACK", "OPENROUTER_API_KEY"];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

function loadController() {
  jest.resetModules();
  return require("../src/controllers/translationController");
}

function callTranslate(controller, body) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return controller.translateText({ body }, res).then(() => res);
}

const googleReply = (text) => ({ data: { data: { translations: [{ translatedText: text }] } } });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.TRANSLATION_PROVIDER = "google";
  delete process.env.TRANSLATION_FALLBACK;
  process.env.OPENROUTER_API_KEY = "test-only-key";
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("createGoogleTranslator", () => {
  test("posts plain-text v2 request and returns the translation", async () => {
    const { createGoogleTranslator, ENDPOINT } = require("../src/lib/googleTranslate");
    const request = jest.fn(async () => googleReply(" Hola "));
    const translate = createGoogleTranslator({ getClient: async () => ({ request }) });
    await expect(translate({ text: "Hello", source: "en", target: "es" })).resolves.toBe("Hola");
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: ENDPOINT,
        method: "POST",
        data: { q: "Hello", source: "en", target: "es", format: "text" },
      })
    );
  });

  test("rejects an empty result", async () => {
    const { createGoogleTranslator } = require("../src/lib/googleTranslate");
    const translate = createGoogleTranslator({
      getClient: async () => ({ request: async () => googleReply("") }),
    });
    await expect(translate({ text: "Hi", source: "en", target: "es" })).rejects.toThrow(/empty/);
  });
});

describe("translation controller provider chain", () => {
  test("uses Cloud Translation by default", async () => {
    mockRequest.mockResolvedValueOnce(googleReply("こんにちは"));
    const res = await callTranslate(loadController(), { text: "hello google", langPair: "en-ja" });
    expect(res.json).toHaveBeenCalledWith({ translation: "こんにちは", provider: "google" });
    expect(require("axios").post).not.toHaveBeenCalled();
  });

  test("falls back to OpenRouter when Cloud Translation fails", async () => {
    mockRequest.mockRejectedValueOnce(Object.assign(new Error("PERMISSION_DENIED"), { code: 403 }));
    const controller = loadController();
    require("axios").post.mockResolvedValueOnce({
      data: { choices: [{ message: { content: "Hola" } }] },
    });
    const res = await callTranslate(controller, { text: "hello fallback", langPair: "en-es" });
    expect(res.json).toHaveBeenCalledWith({ translation: "Hola", provider: "openrouter" });
  });

  test("TRANSLATION_FALLBACK=none surfaces the Cloud Translation error", async () => {
    process.env.TRANSLATION_FALLBACK = "none";
    mockRequest.mockRejectedValueOnce(new Error("PERMISSION_DENIED"));
    const controller = loadController();
    const res = await callTranslate(controller, { text: "hello nofallback", langPair: "en-es" });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(require("axios").post).not.toHaveBeenCalled();
  });

  test("accepts the expanded language list and still rejects unknown codes", async () => {
    mockRequest.mockResolvedValue(googleReply("ok"));
    const controller = loadController();
    for (const langPair of ["hi-en", "zh-ko", "ar-tr", "th-id"]) {
      const res = await callTranslate(controller, { text: `t ${langPair}`, langPair });
      expect(res.status).not.toHaveBeenCalled();
    }
    const bad = await callTranslate(controller, { text: "x", langPair: "en-xx" });
    expect(bad.status).toHaveBeenCalledWith(400);
  });

  test("health reports the provider plan", async () => {
    const controller = loadController();
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await controller.healthCheck({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({ provider: "google", fallback: "openrouter" });
  });
});
