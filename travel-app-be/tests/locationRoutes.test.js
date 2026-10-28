const request = require("supertest");

jest.mock("../src/stays/providers/googlePlaces", () => ({
  geocodeCity: jest.fn(),
}));

jest.mock("../src/utils/cache", () => {
  const cacheStore = {};
  return {
    getCached: jest.fn(
      (key, cacheKey) => cacheStore[`${key}:${cacheKey}`] || null
    ),
    setCached: jest.fn((key, cacheKey, value) => {
      cacheStore[`${key}:${cacheKey}`] = value;
    }),
    __clearCache: () => {
      Object.keys(cacheStore).forEach((key) => delete cacheStore[key]);
    },
  };
});

const { geocodeCity } = require("../src/stays/providers/googlePlaces");
const { getCached, setCached, __clearCache } = require("../src/utils/cache");

describe("Location routes", () => {
  let app;

  beforeAll(() => {
    const { createApp } = require("../src/app");
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __clearCache();
  });

  test("requires sign-in (each lookup is a billed Places call)", async () => {
    const res = await request(app)
      .get("/api/location/resolve?q=Paris")
      .set("user-agent", "jest");
    expect(res.statusCode).toBe(401);
    expect(geocodeCity).not.toHaveBeenCalled();
  });

  test("requires query parameter for location resolve", async () => {
    const res = await request(app)
      .get("/api/location/resolve")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body.error.message).toMatch(/location query/i);
  });

  test("accepts query, q, or dest parameter", async () => {
    geocodeCity.mockResolvedValueOnce({
      display: "Paris",
      lat: 48.8566,
      lng: 2.3522,
      address: "Paris, France",
      city: "Paris",
      country: "France",
    });

    const res1 = await request(app)
      .get("/api/location/resolve?q=Paris")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");
    expect(res1.statusCode).toBe(200);

    const res2 = await request(app)
      .get("/api/location/resolve?query=Paris")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");
    expect(res2.statusCode).toBe(200);

    const res3 = await request(app)
      .get("/api/location/resolve?dest=Paris")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");
    expect(res3.statusCode).toBe(200);
  });

  test("returns resolved location with coordinates", async () => {
    geocodeCity.mockResolvedValueOnce({
      display: "Paris, France",
      lat: 48.8566,
      lng: 2.3522,
      address: "Paris, France",
      city: "Paris",
      state: "Île-de-France",
      country: "France",
    });

    const res = await request(app)
      .get("/api/location/resolve?q=Paris")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(res.body.query).toBe("Paris");
    expect(res.body.display).toBe("Paris, France");
    expect(res.body.lat).toBe(48.8566);
    expect(res.body.lng).toBe(2.3522);
    expect(res.body.city).toBe("Paris");
    expect(res.body.country).toBe("France");
    expect(res.body.cached).toBeUndefined();
  });

  test("returns cached result when available", async () => {
    const cachedData = {
      query: "Paris",
      display: "Paris, France",
      lat: 48.8566,
      lng: 2.3522,
      address: "Paris, France",
      city: "Paris",
      country: "France",
    };

    const cacheKey = JSON.stringify({ q: "paris", lang: "en" });
    setCached("location:resolve", cacheKey, cachedData, 5000);

    const res = await request(app)
      .get("/api/location/resolve?q=Paris")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.display).toBe("Paris, France");
    expect(geocodeCity).not.toHaveBeenCalled();
  });

  test("handles geocoding errors gracefully", async () => {
    geocodeCity.mockRejectedValueOnce(
      new Error("Geocoding service unavailable")
    );

    const res = await request(app)
      .get("/api/location/resolve?q=InvalidPlace")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(502);
    expect(res.body.error.code).toBe("EXTERNAL_SERVICE_ERROR");
    expect(res.body.error.message).toMatch(/resolve location/i);
  });

  test("respects language parameter", async () => {
    geocodeCity.mockResolvedValueOnce({
      display: "París",
      lat: 48.8566,
      lng: 2.3522,
      address: "París, Francia",
      city: "París",
      country: "Francia",
    });

    const res = await request(app)
      .get("/api/location/resolve?q=Paris&lang=es")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(geocodeCity).toHaveBeenCalledWith("Paris", "es");
  });

  test("defaults to English when lang is not provided", async () => {
    geocodeCity.mockResolvedValueOnce({
      display: "Paris",
      lat: 48.8566,
      lng: 2.3522,
    });

    const res = await request(app)
      .get("/api/location/resolve?q=Paris")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(200);
    expect(geocodeCity).toHaveBeenCalledWith("Paris", "en");
  });

  test("handles empty query string gracefully", async () => {
    const res = await request(app)
      .get("/api/location/resolve?q=   ")
      .set("Authorization", "Bearer valid-user-token")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  test("applies the per-user hourly quota to location resolve", async () => {
    geocodeCity.mockResolvedValue({
      display: "Test",
      lat: 0,
      lng: 0,
    });

    // Make requests up to the limit
    const requests = Array(61)
      .fill(null)
      .map(() =>
        request(app)
          .get("/api/location/resolve?q=Test")
          .set("Authorization", "Bearer valid-user-token")
          .set("user-agent", "jest")
      );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.statusCode === 429);

    // At least one should be rate limited
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test("rejects repeated query parameters without calling geocoding", async () => {
    // A different user: the quota above is per user, not per IP.
    const res = await request(app).get("/api/location/resolve?q=Paris&q=London")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-admin-token");
    expect(res.statusCode).toBe(400);
    expect(geocodeCity).not.toHaveBeenCalled();
  });
});
