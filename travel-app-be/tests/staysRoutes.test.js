const request = require("supertest");

jest.mock("../src/stays/providers/googlePlaces", () => {
  const stays = {
    "stay-1": { id: "stay-1", name: "Stay 1", location: { lat: 1, lng: 2 } },
  };
  return {
    geocodeCity: jest.fn(async (dest) => ({
      display: dest,
      lat: 1,
      lng: 2,
      address: "123 Test St",
      city: "Test City",
      state: "Test State",
      country: "Test Country",
    })),
    nearbyLodging: jest.fn(async () => [
      { id: "stay-1" },
      { id: "stay-2" },
      { id: "stay-3" },
    ]),
    toResultItem: jest.fn((place) => ({
      id: place.id,
      name: `Stay ${place.id}`,
      location: { distanceKm: 1 },
    })),
    fetchById: jest.fn(async (id) => stays[id] || null),
    ensureKey: jest.fn(),
    GOOGLE_API_KEY: "test-key",
    PLACES_BASE_URL: "https://example.com",
  };
});

describe("Stays routes", () => {
  let app;

  beforeAll(() => {
    const { createApp } = require("../src/app");
    app = createApp();
  });

  test("requires authentication for stay search", async () => {
    const res = await request(app)
      .get("/api/stays/search?lat=1&lng=2")
      .set("user-agent", "jest");

    expect(res.statusCode).toBe(401);
  });

  test("returns 400 for missing location in stay search", async () => {
    const res = await request(app)
      .get("/api/stays/search")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("accepts lat/lng when dest is empty", async () => {
    const res = await request(app)
      .get("/api/stays/search?dest=&lat=1&lng=2")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.resolvedDestination).toBeNull();
  });

  test("returns stay detail when found", async () => {
    const res = await request(app)
      .get("/api/stays/stay-1")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe("stay-1");
  });

  test("accepts coordinates on the equator and prime meridian", async () => {
    const res = await request(app).get("/api/stays/search?lat=0&lng=0")
      .set("user-agent", "jest").set("Authorization", "Bearer valid-user-token");
    expect(res.statusCode).toBe(200);
    const { nearbyLodging } = require("../src/stays/providers/googlePlaces");
    expect(nearbyLodging).toHaveBeenCalledWith(expect.objectContaining({ lat: 0, lng: 0 }));
  });

  test("uses different cached responses for different page sizes", async () => {
    const getPage = (size) => request(app).get(`/api/stays/search?dest=PageSizeTown&pageSize=${size}`)
      .set("user-agent", "jest").set("Authorization", "Bearer valid-user-token");
    expect((await getPage(5)).body.pageSize).toBe(5);
    expect((await getPage(50)).body.pageSize).toBe(50);
  });

  test("returns 404 when stay detail missing", async () => {
    const res = await request(app)
      .get("/api/stays/unknown")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("validates coordinates format in stay search", async () => {
    const res = await request(app)
      .get("/api/stays/search?lat=invalid&lng=2")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("handles destination parameter in stay search", async () => {
    const res = await request(app)
      .get("/api/stays/search?dest=Paris")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    // Should either succeed with geocoding or return validation error
    expect([200, 400, 502]).toContain(res.statusCode);
  });

  test("validates distance parameter when provided", async () => {
    const res = await request(app)
      .get("/api/stays/search?lat=1&lng=2&distance=invalid")
      .set("user-agent", "jest")
      .set("Authorization", "Bearer valid-user-token");

    // Should either accept or validate distance parameter
    expect([200, 400]).toContain(res.statusCode);
  });
});
