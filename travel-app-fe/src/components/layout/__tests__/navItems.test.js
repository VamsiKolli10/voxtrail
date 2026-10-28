import { describe, it, expect } from "vitest";
import { NAV_ITEMS, MOBILE_TABS, MOBILE_MORE, isNavItemActive } from "../navItems";

const byLabel = (label) => NAV_ITEMS.find((i) => i.label === label);

describe("navItems", () => {
  it("puts every item either in mobile tabs or the More sheet", () => {
    expect(MOBILE_TABS.length + MOBILE_MORE.length).toBe(NAV_ITEMS.length);
    expect(MOBILE_MORE.map((i) => i.label)).toEqual(
      expect.arrayContaining(["Stays", "Emergency", "Culture"])
    );
  });

  it("matches nested routes and extra prefixes", () => {
    expect(isNavItemActive(byLabel("Stays"), "/stays/abc")).toBe(true);
    expect(isNavItemActive(byLabel("Explore"), "/discover")).toBe(true);
    expect(isNavItemActive(byLabel("Explore"), "/destinations/42")).toBe(true);
  });

  it("does not match on partial path segments", () => {
    expect(isNavItemActive(byLabel("Home"), "/homework")).toBe(false);
  });
});
