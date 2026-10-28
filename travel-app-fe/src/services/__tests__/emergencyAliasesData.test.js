import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The alias file is data, not code (ADR-006): check its shape on every run.
const file = JSON.parse(
  readFileSync(resolve(__dirname, "../../../public/data/emergency-aliases.v1.json"), "utf8")
);

describe("emergency-aliases.v1.json", () => {
  it("has the expected shape", () => {
    expect(file.version).toBe(1);
    expect(file.countries.length).toBeGreaterThan(200);
    expect(file.aliases.length).toBeGreaterThan(30000);
  });

  it("points every alias at a known country, with unique names", () => {
    const seen = new Set();
    for (const [name, index] of file.aliases) {
      expect(typeof name).toBe("string");
      expect(file.countries[index]).toBeTruthy();
      const key = name.toLowerCase();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
