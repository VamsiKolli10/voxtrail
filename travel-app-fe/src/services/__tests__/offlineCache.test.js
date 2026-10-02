import { expect, it, vi } from "vitest";
import { cacheSavedPhrases, readSavedPhrases } from "../offlineCache";

it("never reads another account's offline snapshot or legacy unscoped phrases", async () => {
  const records = new Map([["legacy", { id: "legacy", phrase: "private legacy phrase" }]]);
  const db = {
    transaction: () => {
      const tx = { objectStore: () => ({
        put: (item) => { records.set(item.id, item); queueMicrotask(() => tx.oncomplete()); },
        get: (id) => {
          const request = {};
          queueMicrotask(() => { request.result = records.get(id); request.onsuccess(); });
          return request;
        },
      }) };
      return tx;
    },
  };
  const open = vi.fn(() => {
    const request = {};
    queueMicrotask(() => { request.result = db; request.onsuccess(); });
    return request;
  });
  Object.defineProperty(window, "indexedDB", { value: { open }, configurable: true });
  expect(await readSavedPhrases()).toEqual([]);
  expect(await cacheSavedPhrases([{ id: "p", phrase: "hola" }])).toBe(false);
  expect(open).not.toHaveBeenCalled();
  await cacheSavedPhrases([{ id: "p", phrase: "hola" }], "alice");
  expect(await readSavedPhrases("bob")).toEqual([]);
  await cacheSavedPhrases([{ id: "p", phrase: "bonjour" }], "bob");
  expect(await readSavedPhrases("alice")).toEqual([{ id: "p", phrase: "hola" }]);
  expect(await readSavedPhrases("bob")).toEqual([{ id: "p", phrase: "bonjour" }]);
});
