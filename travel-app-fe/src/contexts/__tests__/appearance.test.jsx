import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppearanceProvider, useAppearance } from "../AppearanceContext.jsx";

function Harness() {
  const { mode, toggleMode } = useAppearance();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={toggleMode}>toggle</button>
    </div>
  );
}

describe("AppearanceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock matchMedia and localStorage
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      // MUI's color-scheme manager uses the legacy listener API
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
  });

  it("defaults to light mode and toggles to dark", () => {
    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    );

    expect(screen.getByTestId("mode").textContent).toBe("light");
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "stc:appearance",
      "dark"
    );
  });

  it("restores mode from localStorage on mount", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("dark");

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    );

    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("toggles back to light mode", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("dark");

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    );

    expect(screen.getByTestId("mode").textContent).toBe("dark");
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "stc:appearance",
      "light"
    );
  });

  it("handles invalid localStorage values gracefully", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("invalid-mode");

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    );

    // Should default to light mode when invalid value is stored
    expect(screen.getByTestId("mode").textContent).toBe("light");
  });

  it("handles localStorage errors gracefully", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage quota exceeded");
    });

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    );

    // Should still toggle mode even if localStorage fails
    fireEvent.click(screen.getByText("toggle"));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("switches <html data-theme> so CSS variables follow the mode", () => {
    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    fireEvent.click(screen.getByText("toggle"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("follows the OS preference when nothing is stored", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    });
    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    );
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });
});
