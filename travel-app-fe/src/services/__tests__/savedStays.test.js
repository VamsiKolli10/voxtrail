import { describe, it, expect, vi } from "vitest";
import api from "../api";
import { saveStay } from "../savedStays";

vi.mock("../api", () => ({ default: { put: vi.fn() } }));

describe("saved stays service", () => {
  it("sends only user metadata and safely encodes the place reference", async () => {
    api.put.mockResolvedValue({ data: { placeId: "place/1" } });
    await saveStay({
      placeId: "place/1",
      nickname: "My choice",
      notes: "My notes",
      userId: "other",
      name: "Provider name",
      photos: [],
    });
    expect(api.put).toHaveBeenCalledWith("/saved-stays/place%2F1", {
      nickname: "My choice",
      notes: "My notes",
    });
  });
});
