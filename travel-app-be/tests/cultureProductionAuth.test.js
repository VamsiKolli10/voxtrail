const request = require("supertest");

test.each(["/api/culture/brief", "/api/cultural-etiquette"])("production endpoint %s rejects anonymous paid generation", async (path) => {
  const previous = process.env.NODE_ENV;
  let app;
  try {
    process.env.NODE_ENV = "production";
    jest.isolateModules(() => { app = require("../src/app").createApp(); });
  } finally {
    process.env.NODE_ENV = previous;
  }
  const res = await request(app).get(`${path}?destination=Paris`).set("user-agent", "jest");
  expect(res.statusCode).toBe(401);
});
