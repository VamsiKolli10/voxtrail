import "@testing-library/jest-dom";
import { vi } from "vitest";

// Render every component under the real app theme so tests see the same
// design tokens (palette.border, customShadows, radius, …) as production.
vi.mock("@testing-library/react", async (importOriginal) => {
  const actual = await importOriginal();
  const { createElement } = await import("react");
  const { ThemeProvider } = await import("@mui/material/styles");
  const { createAppTheme } = await import("../theme.js");
  const theme = createAppTheme("light");
  const ThemeWrapper = ({ children }) =>
    createElement(ThemeProvider, { theme }, children);
  const render = (ui, options = {}) => {
    const Inner = options.wrapper;
    const wrapper = Inner
      ? ({ children }) =>
          createElement(ThemeWrapper, null, createElement(Inner, null, children))
      : ThemeWrapper;
    return actual.render(ui, { ...options, wrapper });
  };
  return { ...actual, render };
});

const quiet =
  import.meta.env.MODE === "test" && process.env.VERBOSE_TEST_LOGS !== "true";

if (quiet) {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
}

// jsdom doesn't implement matchMedia; provide a minimal stub for MUI theme checks
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Mock canvas getContext to prevent MapLibre GL JS errors
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
    if (type === "2d") {
      return {
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        drawImage: vi.fn(),
        createImageData: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
      };
    }
    if (type === "webgl" || type === "experimental-webgl") {
      return {
        drawingBufferWidth: 300,
        drawingBufferHeight: 150,
        getExtension: vi.fn(() => null),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        getAttribLocation: vi.fn(() => 0),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        viewport: vi.fn(),
      };
    }
    return null;
  });
}

// Mock ResizeObserver if not available
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock IntersectionObserver if not available
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock window.matchMedia for responsive breakpoints
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

// Mock navigator.geolocation
Object.defineProperty(navigator, "geolocation", {
  writable: true,
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
});
