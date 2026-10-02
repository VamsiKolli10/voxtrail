import { describe, expect, it } from "vitest";
import { normalizeApiBaseUrl } from "../apiConfig";

describe("API base URL", () => {
  it.each([
    [undefined, "http://localhost:8000/api"],
    ["https://example.test", "https://example.test/api"],
    ["https://example.test/api/", "https://example.test/api"],
    ["/api", "/api"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeApiBaseUrl(input)).toBe(expected);
  });
});
