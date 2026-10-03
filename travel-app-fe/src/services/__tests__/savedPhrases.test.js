import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listSavedPhrases,
  addSavedPhrase,
  removeSavedPhrase,
} from "../savedPhrases";
import api from "../api";

vi.mock("../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("saved phrases service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists saved phrases", async () => {
    api.get.mockResolvedValue({ data: { items: [{ id: "1" }] } });

    const items = await listSavedPhrases();

    expect(api.get).toHaveBeenCalledWith("/saved-phrases", { signal: undefined });
    expect(items).toEqual([{ id: "1" }]);
  });

  it("adds a phrase and returns id", async () => {
    api.post.mockResolvedValue({ data: { id: "abc" } });

    const id = await addSavedPhrase({ phrase: "Hola" });

    expect(api.post).toHaveBeenCalledWith("/saved-phrases", { phrase: "Hola" });
    expect(id).toBe("abc");
  });

  it("removes a phrase and swallows 404s", async () => {
    api.delete.mockResolvedValue({});

    const ok = await removeSavedPhrase("abc");
    expect(api.delete).toHaveBeenCalledWith("/saved-phrases/abc");
    expect(ok).toBe(true);

    api.delete.mockRejectedValue({ response: { status: 404 } });
    const gone = await removeSavedPhrase("missing");
    expect(gone).toBe(false);

    const err = new Error("boom");
    api.delete.mockRejectedValue(err);
    await expect(removeSavedPhrase("abc")).rejects.toBe(err);
  });

  it("handles empty saved phrases list", async () => {
    api.get.mockResolvedValue({ data: { items: [] } });

    const items = await listSavedPhrases();

    expect(items).toEqual([]);
    expect(api.get).toHaveBeenCalledWith("/saved-phrases", { signal: undefined });
  });

  it("handles API errors when listing phrases", async () => {
    const error = {
      response: {
        status: 500,
        data: { error: { code: "INTERNAL_ERROR", message: "Server error" } },
      },
    };
    api.get.mockRejectedValue(error);

    await expect(listSavedPhrases()).rejects.toEqual(error);
  });

  it("handles validation errors when adding phrase", async () => {
    const error = {
      response: {
        status: 400,
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields",
            details: { issues: [{ path: ["phrase"] }] },
          },
        },
      },
    };
    api.post.mockRejectedValue(error);

    await expect(addSavedPhrase({})).rejects.toEqual(error);
  });

  it("handles network errors", async () => {
    const networkError = new Error("Network request failed");
    api.get.mockRejectedValue(networkError);

    await expect(listSavedPhrases()).rejects.toEqual(networkError);
  });

  it("handles unauthorized errors", async () => {
    const error = {
      response: {
        status: 401,
        data: {
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
      },
    };
    api.get.mockRejectedValue(error);

    await expect(listSavedPhrases()).rejects.toEqual(error);
  });
});
