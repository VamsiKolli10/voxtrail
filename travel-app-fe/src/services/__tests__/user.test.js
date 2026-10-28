import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchProfile } from "../user";
import api from "../api";

vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("user service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches profile", async () => {
    api.get.mockResolvedValue({ data: { uid: "u1" } });

    const profile = await fetchProfile();

    expect(api.get).toHaveBeenCalledWith("/profile", { signal: undefined });
    expect(profile).toEqual({ uid: "u1" });
  });
});
