import { describe, expect, it } from "vitest";
import { normalizeApiBaseUrl, resolveApiAssetUrl } from "../apiConfig";

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

 it.each([
   ["https://example.test/api/", "/api/stays/photo?sig=abc&exp=123", "https://example.test/api/stays/photo?sig=abc&exp=123"],
   ["https://example.test/", "/api/stays/photo", "https://example.test/api/stays/photo"],
   ["/api/", "/api/stays/photo", "/api/stays/photo"],
   ["https://example.test/api/", "https://images.test/photo", "https://images.test/photo"],
 ])("resolves asset paths with %s", (base, path, expected) => {
   expect(resolveApiAssetUrl(path, base)).toBe(expected);
 });
