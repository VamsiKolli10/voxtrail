import { expect, it, vi } from "vitest";
import { logRecentActivity, readRecentActivity, setRecentActivityUser, clearRecentActivity } from "../recentActivity";

it("isolates account history and hides it while signed out", () => {
  const records = new Map();
  vi.spyOn(window, "localStorage", "get").mockReturnValue({
    getItem: (key) => records.get(key) || null,
    setItem: (key, value) => records.set(key, value),
    removeItem: (key) => records.delete(key),
  });
  setRecentActivityUser("alice");
  logRecentActivity({ title: "Alice's translation" });
  setRecentActivityUser("bob");
  expect(readRecentActivity()).toEqual([]);
  logRecentActivity({ title: "Bob's translation" });
  setRecentActivityUser(null);
  expect(readRecentActivity()).toEqual([]);
  setRecentActivityUser("alice");
  expect(readRecentActivity().map((item) => item.title)).toEqual(["Alice's translation"]);
  clearRecentActivity();
  expect(readRecentActivity()).toEqual([]);
  setRecentActivityUser(null);
  vi.restoreAllMocks();
});
