// ADR-004: Places SKUs, cached geocoding, signed photo URLs, on-demand reviews.
const { Readable } = require("node:stream");
const request = require("supertest");

jest.mock("axios", () => ({ get: jest.fn(), post: jest.fn() }));

const savedKey = process.env.GOOGLE_PLACES_API_KEY;
let axios;

function load(modulePath) {
  return require(modulePath);
}

beforeEach(() => {
  jest.resetModules();
  process.env.GOOGLE_PLACES_API_KEY = "test-places-key";
  delete process.env.GEOCODER;
  axios = require("axios");
  axios.get.mockReset();
  axios.post.mockReset();
});

afterAll(() => {
  if (savedKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
  else process.env.GOOGLE_PLACES_API_KEY = savedKey;
});

const photoQuery = (url) => url.slice(url.indexOf("?"));

describe("signed photo URLs", () => {
  function imageResponse() {
    return {
      status: 200,
      headers: { "content-type": "image/jpeg" },
      data: Readable.from([Buffer.from("jpeg-bytes")]),
    };
  }

  test("search results carry signed, expiring URLs", () => {
    const { toResultItem } = load("../src/stays/providers/googlePlaces");
    const item = toResultItem({ id: "p1", photos: [{ name: "places/p1/photos/a" }] }, null);
    const params = new URLSearchParams(photoQuery(item.photos[0].url));
    expect(params.get("name")).toBe("places/p1/photos/a");
    expect(params.get("sig")).toMatch(/^[0-9a-f]{64}$/);
    expect(Number(params.get("exp"))).toBeGreaterThan(Date.now());
  });

  test("the proxy rejects unsigned, tampered and expired links", async () => {
    const { signPhotoUrl } = load("../src/lib/photoUrls");
    const { createApp } = load("../src/app");
    const app = createApp();
    const good = signPhotoUrl("places/p1/photos/a", { maxWidth: 640 });

    const unsigned = await request(app).get("/api/stays/photo?name=places/p1/photos/a");
    expect(unsigned.statusCode).toBe(403);

    const tampered = await request(app).get(
      `${good.replace("maxWidth=640", "maxWidth=1600")}`
    );
    expect(tampered.statusCode).toBe(403);

    const expired = signPhotoUrl("places/p1/photos/a", {}, Date.now() - 24 * 3600 * 1000);
    const expiredRes = await request(app).get(expired);
    expect(expiredRes.statusCode).toBe(403);
    expect(expiredRes.body.error.message).toMatch(/expired/i);

    expect(axios.get).not.toHaveBeenCalled();
  });

  test("upstream stream failures finish with 502 instead of an uncaught error", async () => {
    const { signPhotoUrl } = load("../src/lib/photoUrls");
    const { createApp } = load("../src/app");
    axios.get.mockResolvedValueOnce({ status: 200, headers: { "content-type": "image/jpeg" },
      data: new Readable({ read() { this.destroy(new Error("upstream reset")); } }),
    });
    const res = await request(createApp()).get(signPhotoUrl("places/p1/photos/a"));
    expect(res.statusCode).toBe(502);
    expect(res.body.error.message).toMatch(/fetch photo/);
    expect(res.headers["cache-control"]).toBeUndefined();
  });

  test("an error after photo bytes closes the response without an uncaught error", async () => {
    const { signPhotoUrl } = load("../src/lib/photoUrls");
    const { createApp } = load("../src/app");
    let started = false;
    const stream = new Readable({ read() {
      if (started) return;
      started = true;
      this.push(Buffer.from("partial-jpeg"));
      setImmediate(() => this.destroy(new Error("upstream reset")));
    } });
    axios.get.mockResolvedValueOnce({ status: 200, headers: { "content-type": "image/jpeg" }, data: stream });
    await expect(request(createApp()).get(signPhotoUrl("places/p1/photos/a"))).rejects.toThrow(/aborted|reset|hang up/i);
    expect(stream.destroyed).toBe(true);
  });

  test("a provider stream closing without an error does not hang the response", async () => {
    const { signPhotoUrl } = load("../src/lib/photoUrls");
    const { createApp } = load("../src/app");
    axios.get.mockResolvedValueOnce({ status: 200, headers: {},
      data: new Readable({ read() { this.destroy(); } }),
    });
    const res = await request(createApp()).get(signPhotoUrl("places/p1/photos/a"));
    expect(res.statusCode).toBe(502);
  });

  test("a disconnected browser aborts and closes the provider stream", async () => {
    const http = require("node:http");
    const { once } = require("node:events");
    const { signPhotoUrl } = load("../src/lib/photoUrls");
    const { createApp } = load("../src/app");
    let signal;
    let started = false;
    const stream = new Readable({ read() {
      if (started) return;
      started = true;
      this.push(Buffer.from("partial-photo"));
    } });
    const closed = new Promise((resolve) => stream.once("close", resolve));
    axios.get.mockImplementationOnce(async (_url, options) => {
      signal = options.signal;
      signal.addEventListener("abort", () => stream.destroy(new Error("request canceled")), { once: true });
      return { status: 200, headers: { "content-type": "image/jpeg" }, data: stream };
    });
    const server = createApp().listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      await new Promise((resolve, reject) => {
        const client = http.get(`http://127.0.0.1:${server.address().port}${signPhotoUrl("places/p1/photos/a")}`, (res) => {
          res.once("data", () => { res.destroy(); resolve(); });
        });
        client.on("error", reject);
      });
      await closed;
      expect(signal.aborted).toBe(true);
      expect(stream.destroyed).toBe(true);
    } finally { await new Promise((resolve) => server.close(resolve)); }
  });

  test("App Check enforcement permits only signed photos without headers", async () => {
    process.env.APP_CHECK_ENFORCE = "true";
    try {
      const { signPhotoUrl } = load("../src/lib/photoUrls");
      const { createApp } = load("../src/app");
      const app = createApp();
      axios.get.mockResolvedValueOnce(imageResponse());
      expect((await request(app).get(signPhotoUrl("places/p1/photos/a"))).statusCode).toBe(200);
      expect((await request(app).get("/api/stays/photo?name=places/p1/photos/a")).statusCode).toBe(403);
      expect((await request(app).get("/api/stays/search?dest=Paris")).statusCode).toBe(401);
      expect((await request(app).get("/api/stays/photo/extra")).statusCode).toBe(401);
    } finally { delete process.env.APP_CHECK_ENFORCE; }
  });

  test("a signed link is proxied with browser-only caching", async () => {
    const { signPhotoUrl } = load("../src/lib/photoUrls");
    const { createApp } = load("../src/app");
    axios.get.mockResolvedValueOnce(imageResponse());
    const res = await request(createApp()).get(
      signPhotoUrl("places/p1/photos/a", { maxWidth: 640 })
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toMatch(/^private, max-age=\d+$/);
    expect(axios.get.mock.calls[0][1].params).toEqual({ maxWidthPx: 640 });
  });
});

describe("field masks keep Atmosphere fields out of default calls", () => {
  test("stay/POI details don't request reviews or editorialSummary", async () => {
    const { fetchById } = load("../src/stays/providers/googlePlaces");
    axios.get.mockResolvedValueOnce({ data: { id: "p1", displayName: { text: "Hotel" } } });
    const detail = await fetchById("p1");
    const mask = axios.get.mock.calls[0][1].headers["X-Goog-FieldMask"];
    expect(mask).not.toMatch(/reviews|editorialSummary/);
    expect(detail.reviews).toEqual([]);
  });

  test("Explore search doesn't request editorialSummary", async () => {
    const { searchNearbyPoi } = load("../src/poi/providers/googlePlacesPoi");
    axios.post.mockResolvedValueOnce({ data: { places: [] } });
    await searchNearbyPoi({ lat: 1, lng: 2 });
    expect(axios.post.mock.calls[0][2].headers["X-Goog-FieldMask"]).not.toMatch(
      /editorialSummary/
    );
  });

  test("reviews are a separate, reviews-only call", async () => {
    const { fetchReviewsById } = load("../src/stays/providers/googlePlaces");
    axios.get.mockResolvedValueOnce({
      data: {
        id: "p1",
        reviews: [{ rating: 5, text: { text: "Great" }, authorAttribution: { displayName: "Ana" } }],
      },
    });
    const result = await fetchReviewsById("p1");
    expect(axios.get.mock.calls[0][1].headers["X-Goog-FieldMask"]).toBe("id,reviews");
    expect(result.reviews[0]).toMatchObject({ author_name: "Ana", rating: 5, text: "Great" });
  });

  test("itinerary grounding uses a name+location mask", async () => {
    const { fetchPlaceSummary } = load("../src/stays/providers/googlePlaces");
    axios.get.mockResolvedValueOnce({
      data: { id: "p1", displayName: { text: "Paris" }, location: { latitude: 48.8, longitude: 2.3 } },
    });
    await expect(fetchPlaceSummary("p1")).resolves.toEqual({
      id: "p1",
      name: "Paris",
      location: { lat: 48.8, lng: 2.3 },
    });
    expect(axios.get.mock.calls[0][1].headers["X-Goog-FieldMask"]).toBe("id,displayName,location");
  });
});

describe("geocoding", () => {
  test("failed Places geocoding never logs API credentials", async () => {
    process.env.GEOCODER = "places";
    const { geocodeCity } = load("../src/stays/providers/googlePlaces");
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const failure = Object.assign(new Error("provider unavailable"), {
      config: { url: "https://places.googleapis.com/v1/places:searchText", method: "post", headers: { "X-Goog-Api-Key": "secret-credential" } },
    });
    axios.post.mockRejectedValueOnce(failure);
    try {
      await expect(geocodeCity("Unique failed city")).rejects.toThrow();
      expect(JSON.stringify(spy.mock.calls)).not.toContain("secret-credential");
    } finally { spy.mockRestore(); }
  });

  const geocodeOk = {
    data: {
      status: "OK",
      results: [
        {
          place_id: "ChIJParis",
          formatted_address: "Paris, France",
          types: ["locality", "political"],
          geometry: { location: { lat: 48.8566, lng: 2.3522 } },
          address_components: [
            { long_name: "Paris", short_name: "Paris", types: ["locality", "political"] },
            { long_name: "Île-de-France", short_name: "IDF", types: ["administrative_area_level_1"] },
            { long_name: "France", short_name: "FR", types: ["country", "political"] },
          ],
        },
      ],
    },
  };

  test("uses the Geocoding API", async () => {
    const { geocodeCity } = load("../src/stays/providers/googlePlaces");
    axios.get.mockResolvedValueOnce(geocodeOk);
    const result = await geocodeCity("paris", "en");
    expect(axios.get.mock.calls[0][0]).toContain("/geocode/json");
    expect(axios.post).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      lat: 48.8566,
      lng: 2.3522,
      placeId: "ChIJParis",
      display: "Paris",
      city: "Paris",
      country: "France",
      source: "geocoding",
    });
  });

  test.each(["ZERO_RESULTS", "REQUEST_DENIED"])(
    "%s falls back to Places Text Search",
    async (status) => {
      const { geocodeCity } = load("../src/stays/providers/googlePlaces");
      axios.get.mockResolvedValueOnce({ data: { status, results: [] } });
      axios.post.mockResolvedValueOnce({
        data: {
          places: [
            {
              id: "p9",
              displayName: { text: "Mount Rainier" },
              location: { latitude: 46.85, longitude: -121.76 },
            },
          ],
        },
      });
      const result = await geocodeCity("mount rainier");
      expect(axios.post.mock.calls[0][0]).toContain("places:searchText");
      expect(result).toMatchObject({ lat: 46.85, source: "places-text-search" });
    }
  );

  test("other Geocoding errors are not hidden behind the pricier fallback", async () => {
    const { geocodeCity } = load("../src/stays/providers/googlePlaces");
    axios.get.mockResolvedValueOnce({ data: { status: "OVER_QUERY_LIMIT", results: [] } });
    await expect(geocodeCity("paris")).rejects.toMatchObject({ code: "OVER_QUERY_LIMIT" });
    expect(axios.post).not.toHaveBeenCalled();
  });

  function fakeDb() {
    const docs = new Map();
    return {
      docs,
      collection: jest.fn(() => ({
        doc: (id) => ({
          get: async () => ({ exists: docs.has(id), data: () => docs.get(id) }),
          set: async (data) => docs.set(id, data),
        }),
      })),
    };
  }

  test("geocodeCenter stores only lat/lng/placeId (<30 days) and reuses it", async () => {
    const { geocodeCenter } = load("../src/stays/providers/googlePlaces");
    const db = fakeDb();
    axios.get.mockResolvedValueOnce(geocodeOk);

    const first = await geocodeCenter("Paris", "en", { db });
    expect(first).toMatchObject({ lat: 48.8566, lng: 2.3522, cached: false });
    const [stored] = [...db.docs.values()];
    expect(Object.keys(stored).sort()).toEqual(["expireAt", "lat", "lng", "placeId"]);
    expect(stored.expireAt.getTime() - Date.now()).toBeLessThan(30 * 24 * 3600 * 1000);

    const second = await geocodeCenter("  paris ", "en", { db });
    expect(second).toMatchObject({ lat: 48.8566, lng: 2.3522, cached: true });
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  test("geocodeCenter still works when the cache is unavailable", async () => {
    const { geocodeCenter } = load("../src/stays/providers/googlePlaces");
    const db = { collection: () => { throw new Error("firestore down"); } };
    axios.get.mockResolvedValueOnce(geocodeOk);
    await expect(geocodeCenter("Paris", "en", { db })).resolves.toMatchObject({ lat: 48.8566 });
  });
});

describe("GET /api/stays/:id/reviews and /api/poi/:id/reviews", () => {
  test("requires sign-in and returns reviews on demand", async () => {
    const { createApp } = load("../src/app");
    const app = createApp();
    axios.get.mockResolvedValue({
      data: { id: "p1", reviews: [{ rating: 4, text: { text: "Nice" } }] },
    });

    const anon = await request(app).get("/api/stays/p1/reviews");
    expect(anon.statusCode).toBe(401);

    for (const base of ["/api/stays", "/api/poi"]) {
      const res = await request(app)
        .get(`${base}/p1/reviews?lang=en`)
        .set("Authorization", "Bearer valid-user-token");
      expect(res.statusCode).toBe(200);
      expect(res.body.reviews[0]).toMatchObject({ rating: 4, text: "Nice" });
    }
    // Second call is served from the in-memory cache.
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
