import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// public/theme-init.js runs before the bundle to avoid a light flash.
// Vitest runs from the travel-app-fe root.
const script = readFileSync(resolve(process.cwd(), "public/theme-init.js"), "utf8");
const run = () => new Function(script)();

const mockOsDark = (matches) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches });
};

describe("theme-init.js", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockOsDark(false);
  });

  it("applies the stored mode", () => {
    window.localStorage.setItem("stc:appearance", "dark");
    run();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to the OS preference for missing or 'system' values", () => {
    mockOsDark(true);
    window.localStorage.setItem("stc:appearance", "system");
    run();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("uses the same storage key as AppearanceProvider", async () => {
    const { APPEARANCE_STORAGE_KEY } = await import("../AppearanceContext.jsx");
    expect(script).toContain(`"${APPEARANCE_STORAGE_KEY}"`);
  });
});
