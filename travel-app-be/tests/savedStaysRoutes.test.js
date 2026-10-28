const request = require("supertest");

// Account-scoped in-memory Firestore. Queue transactions to exercise racing
// requests; the emulator smoke test verifies the real Admin SDK as well.
const mockRecords = new Map();
let mockQueue = Promise.resolve();
const mockSnapshot = (ref) => ({
  id: ref.id,
  exists: mockRecords.has(ref.path),
  data: () => mockRecords.get(ref.path),
});
function mockCollection(path) {
  return {
    doc: (id) => ({
      id,
      path: `${path}/${id}`,
      collection: (name) => mockCollection(`${path}/${id}/${name}`),
    }),
    orderBy: () => ({
      limit: (limit) => ({
        get: async () => ({
          docs: [...mockRecords.entries()]
            .filter(
              ([key]) =>
                key.startsWith(`${path}/`) &&
                key.split("/").length === path.split("/").length + 1,
            )
            .sort((a, b) => b[1].createdAt - a[1].createdAt)
            .slice(0, limit)
            .map(([key]) =>
              mockSnapshot({ id: key.split("/").pop(), path: key }),
            ),
        }),
      }),
    }),
  };
}
const mockDb = {
  collection: mockCollection,
  runTransaction: jest.fn((callback) => {
    const result = mockQueue.then(async () => {
      const writes = [];
      const value = await callback({
        get: async (ref) => mockSnapshot(ref),
        set: (ref, data) => writes.push(() => mockRecords.set(ref.path, data)),
        delete: (ref) => writes.push(() => mockRecords.delete(ref.path)),
      });
      writes.forEach((write) => write());
      return value;
    });
    mockQueue = result.catch(() => {});
    return result;
  }),
};
jest.mock("../src/config/firebaseAdmin", () => ({
  ...jest.requireActual("../src/config/firebaseAdmin"),
  db: mockDb,
}));
const { createApp } = require("../src/app");
const counter = "users/user-123/preferences/saved_stays";
const stayPath = (id) => `users/user-123/saved_stays/${id}`;

describe("Saved stays", () => {
  let app;
  const call = (method, path = "", token = "valid-user-token") => {
    const req = request(app)
      [method](`/api/saved-stays${path}`)
      .set("user-agent", "jest");
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };
  beforeEach(() => {
    mockRecords.clear();
    mockDb.runTransaction.mockClear();
    app = createApp();
  });

  test.each(["get", "put", "delete"])(
    "requires authentication for %s",
    async (method) => {
      const response = await call(
        method,
        method === "get" ? "" : "/place-1",
        null,
      );
      expect(response.status).toBe(401);
      expect(mockDb.runTransaction).not.toHaveBeenCalled();
    },
  );

  test("saves user metadata, trims it and returns ordered timestamps", async () => {
    const first = await call("put", "/place-1").send({
      nickname: "  Near the station  ",
      notes: "  Ask about check-in  ",
    });
    expect(first.status).toBe(201);
    expect(first.body).toEqual({ placeId: "place-1" });
    const original = mockRecords.get(stayPath("place-1"));
    expect(Object.keys(original).sort()).toEqual([
      "createdAt",
      "nickname",
      "notes",
      "updatedAt",
    ]);
    expect(original.nickname).toBe("Near the station");
    const second = await call("put", "/place-2").send({ nickname: "Backup" });
    expect(second.status).toBe(201);
    mockRecords.get(stayPath("place-2")).createdAt = new Date(
      Date.now() + 1000,
    );
    const list = await call("get");
    expect(list.status).toBe(200);
    expect(list.headers["cache-control"]).toBe("private, no-store");
    expect(list.body.items.map((item) => item.placeId)).toEqual([
      "place-2",
      "place-1",
    ]);
    expect(list.body.items[1]).toEqual({
      placeId: "place-1",
      nickname: "Near the station",
      notes: "Ask about check-in",
      createdAt: original.createdAt.toISOString(),
      updatedAt: original.updatedAt.toISOString(),
    });
    expect(mockRecords.get(counter).count).toBe(2);
  });

  test("concurrent repeated saves are idempotent; edits preserve createdAt", async () => {
    const responses = await Promise.all(
      [0, 1].map(() => call("put", "/place-1").send({ nickname: "Option" })),
    );
    expect(responses.map((res) => res.status).sort()).toEqual([200, 201]);
    const createdAt = mockRecords.get(stayPath("place-1")).createdAt;
    expect(mockRecords.get(counter).count).toBe(1);
    const edit = await call("put", "/place-1").send({
      nickname: "First choice",
      notes: "Quiet room",
    });
    expect(edit.status).toBe(200);
    expect(mockRecords.get(stayPath("place-1"))).toMatchObject({
      nickname: "First choice",
      createdAt,
    });
    expect(mockRecords.get(counter).count).toBe(1);
  });

  test("isolates lists, updates and removals between owners", async () => {
    await call("put", "/same-place").send({ nickname: "Private choice" });
    expect((await call("get", "", "valid-admin-token")).body.items).toEqual([]);
    await call("put", "/same-place", "valid-admin-token").send({
      nickname: "Other account",
    });
    await call("delete", "/same-place", "valid-admin-token");
    expect((await call("get")).body.items[0].nickname).toBe("Private choice");
    expect((await call("get", "?uid=admin-user")).body.items[0].nickname).toBe(
      "Private choice",
    );
  });

  test.each([
    {},
    { nickname: "   " },
    { nickname: "x".repeat(101) },
    { nickname: "Valid", notes: "x".repeat(1001) },
    { nickname: "Valid", userId: "other-owner" },
    { nickname: "Valid", photos: [{ url: "provider-content" }] },
  ])("rejects invalid or provider/ownership fields: %j", async (body) => {
    expect((await call("put", "/place-1").send(body)).status).toBe(400);
    expect(mockDb.runTransaction).not.toHaveBeenCalled();
  });

  test.each(["unsafe.id", "unsafe%2Fid", "x".repeat(257)])(
    "rejects unsafe place ID %s",
    async (id) => {
      expect(
        (await call("put", `/${id}`).send({ nickname: "Option" })).status,
      ).toBe(400);
      expect((await call("delete", `/${id}`)).status).toBe(400);
      expect(mockDb.runTransaction).not.toHaveBeenCalled();
    },
  );

  test("enforces the cap across simultaneous additions, but permits edits", async () => {
    mockRecords.set(counter, { count: 99 });
    const responses = await Promise.all(
      ["place-a", "place-b"].map((id) =>
        call("put", `/${id}`).send({ nickname: id }),
      ),
    );
    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(mockRecords.get(counter).count).toBe(100);
    const savedId = responses.find((res) => res.status === 201).body.placeId;
    expect(
      (await call("put", `/${savedId}`).send({ nickname: "Edited" })).status,
    ).toBe(200);
  });

  test("removals are idempotent and release a slot", async () => {
    await call("put", "/place-1").send({ nickname: "Option" });
    for (let i = 0; i < 2; i += 1) {
      expect((await call("delete", "/place-1")).body).toEqual({ ok: true });
    }
    expect((await call("get")).body.items).toEqual([]);
    expect(mockRecords.get(counter).count).toBe(0);
  });

  test("hides database diagnostics on failures", async () => {
    mockDb.runTransaction.mockRejectedValueOnce(
      new Error("secret database detail"),
    );
    const response = await call("put", "/place-1").send({ nickname: "Option" });
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain(
      "secret database detail",
    );
  });
});
