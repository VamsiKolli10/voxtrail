describe("bounded performance metrics", () => {
  test("bounds both samples and route buckets and retains active routes", () => {
    jest.resetModules();
    const { recordTiming, getPerformanceSnapshot } = require("../src/utils/performance");
    for (let i = 0; i < 1000; i++) {
      recordTiming(`GET /unique-${i}`, i);
      recordTiming("GET /active", i);
    }
    const snapshot = getPerformanceSnapshot();
    expect(snapshot.length).toBeLessThanOrEqual(256);
    expect(snapshot.find((item) => item.route === "GET /active").count).toBe(200);
    expect(snapshot.some((item) => item.route === "GET /unique-0")).toBe(false);
  });
  test("unmatched paths share one timing bucket", async () => {
    jest.resetModules();
    const request = require("supertest");
    const { createApp } = require("../src/app");
    const { getPerformanceSnapshot } = require("../src/utils/performance");
    const app = createApp();
    for (const path of ["/missing-a", "/missing-b", "/missing-c"]) {
      expect((await request(app).get(path)).statusCode).toBe(404);
    }
    expect(getPerformanceSnapshot()).toEqual([
      expect.objectContaining({ route: "GET <unmatched>", count: 3 }),
    ]);
  });

});
