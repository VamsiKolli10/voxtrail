const express = require("express");
const request = require("supertest");
const { validateQuery } = require("../src/middleware/validate");
const { staysSearchSchema, poiSearchSchema } = require("../src/utils/schemas");

const app = express();
app.get("/stays", validateQuery(staysSearchSchema), (req, res) => res.json(req.query));
app.get("/poi", validateQuery(poiSearchSchema), (req, res) => res.json(req.query));

test("Express 5 downstream handlers receive parsed values and stripped fields", async () => {
  const res = await request(app).get("/stays?dest=%20Paris%20&lat=0&lng=0&unknown=value");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ dest: "Paris", lat: 0, lng: 0, page: 1 });
});

test("POI flags retain their boolean types", async () => {
  const res = await request(app).get("/poi?dest=Paris&kidFriendly=true&openNow=false");
  expect(res.status).toBe(200);
  expect(res.body.kidFriendly).toBe(true);
  expect(res.body.openNow).toBe(false);
});

test.each(["lat=&lng=0", "lat=0&lng=", "lat=1&lat=2&lng=0"])("rejects ambiguous coordinates: %s", async (query) => {
  expect((await request(app).get(`/stays?${query}`)).status).toBe(400);
});

test("rejects invalid boolean flags", async () => {
  expect((await request(app).get("/poi?dest=Paris&kidFriendly=maybe")).status).toBe(400);
});
