const request = require("supertest");

jest.mock("../src/lib/openrouterClient", () => {
  const mockChatComplete = jest.fn(async () =>
    JSON.stringify({
      destination: { id: "place", name: "Paris" },
      params: { days: 2 },
      days: [{ day: 1, blocks: [] }],
    })
  );
  return {
    chatComplete: mockChatComplete,
    __mockChatComplete: mockChatComplete,
  };
});

jest.mock("../src/utils/quota", () => {
  const mockEnforceQuota = jest.fn(() => ({
    allowed: true,
    resetAt: Date.now() + 1000,
  }));
  return {
    enforceQuota: mockEnforceQuota,
    __mockEnforceQuota: mockEnforceQuota,
  };
});

const {
  __mockChatComplete: chatComplete,
} = require("../src/lib/openrouterClient");
const { __mockEnforceQuota: enforceQuota } = require("../src/utils/quota");

jest.mock("../src/stays/providers/googlePlaces", () => ({
  fetchPlaceSummary: jest.fn(async () => ({ id: "p1", name: "Paris", location: null })),
  geocodeCenter: jest.fn(async () => ({ display: "Paris", lat: 1, lng: 2 })),
}));

describe("Itinerary routes", () => {
  let app;

  beforeAll(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const { createApp } = require("../src/app");
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects missing destination and coordinates", async () => {
    const res = await request(app)
      .get("/api/itinerary/generate")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns 429 when itinerary quota exceeded", async () => {
    enforceQuota.mockReturnValueOnce({ allowed: false, resetAt: 123 });

    const res = await request(app)
      .get("/api/itinerary/generate?dest=Paris")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(429);
    expect(res.body.error).toBeDefined();
  });

  test("returns itinerary when parameters are valid", async () => {
    const res = await request(app)
      .get("/api/itinerary/generate?dest=Paris&days=2&pace=relaxed")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.destination).toBeDefined();
    expect(Array.isArray(res.body.days)).toBe(true);
  });

  test("handles placeId lookup", async () => {
    const res = await request(app)
      .get("/api/itinerary/generate?placeId=ChIJN1t_tDeuEmsRUsoyG83frY4")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.destination.name).toBe("Paris");
  });

  test("handles lat/lng coordinates", async () => {
    chatComplete.mockResolvedValueOnce(
      JSON.stringify({
        destination: { id: "coords:48.8566,2.3522", name: "Selected area" },
        params: { days: 3 },
        days: [{ day: 1, blocks: [] }],
      })
    );

    const res = await request(app)
      .get("/api/itinerary/generate?lat=48.8566&lng=2.3522&days=3")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.destination.id.startsWith("coords:")).toBe(true);
  });

  test("falls back to sample on geocode failure", async () => {
    const { geocodeCenter } = require("../src/stays/providers/googlePlaces");
    geocodeCenter.mockRejectedValueOnce(new Error("Geocode fail"));

    chatComplete.mockResolvedValueOnce(
      JSON.stringify({
        destination: { id: "text:UnknownCity", name: "UnknownCity" },
        params: { days: 2 },
        days: [{ day: 1, blocks: [] }],
      })
    );

    const res = await request(app)
      .get("/api/itinerary/generate?dest=UnknownCity&days=2")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.destination.name).toBe("UnknownCity");
    expect(Array.isArray(res.body.days)).toBe(true);
  });

  test("uses sampleItinerary when no OpenRouter key", async () => {
    const oldKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "";

    const res = await request(app)
      .get(
        "/api/itinerary/generate?dest=Paris&days=2&budget=mid&pace=relaxed&interests=food"
      )
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.tips).toEqual(
      expect.arrayContaining(["Group nearby activities to reduce transit time"])
    );
    process.env.OPENROUTER_API_KEY = oldKey;
  });

  test("falls back to sample on malformed JSON", async () => {
    const oldKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "";
    chatComplete.mockResolvedValueOnce("not json {invalid}");

    const res = await request(app)
      .get("/api/itinerary/generate?dest=Paris")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.days)).toBe(true);
    expect(res.body.days.length).toBe(3); // default days
    process.env.OPENROUTER_API_KEY = oldKey;
  });

  test("returns fallback itinerary when OpenRouter responds with invalid JSON", async () => {
    chatComplete.mockResolvedValueOnce("oops { not valid json");

    const res = await request(app)
      .get("/api/itinerary/generate?dest=Paris&days=3")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.days)).toBe(true);
    expect(res.body.fallback).toBe(true);
    expect(res.body.notice).toMatch(/unexpected format/i);
  });
});
