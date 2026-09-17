/**
 * Mock MapLibre GL JS for testing environment
 * This prevents canvas getContext errors and map initialization issues
 */

// Mock canvas getContext
const mockCanvas = {
  getContext: vi.fn((type) => {
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
  }),
  width: 300,
  height: 150,
  style: {},
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

// Mock LngLat
class MockLngLat {
  constructor(lng, lat) {
    this.lng = lng;
    this.lat = lat;
  }

  toArray() {
    return [this.lng, this.lat];
  }

  toString() {
    return `LngLat(${this.lng}, ${this.lat})`;
  }
}

// Mock LngLatBounds
class MockLngLatBounds {
  constructor(sw, ne) {
    this.sw = sw;
    this.ne = ne;
    this._list = [];
  }

  extend(coord) {
    if (coord instanceof MockLngLat) {
      this._list.push(coord);
    } else if (Array.isArray(coord) && coord.length === 2) {
      this._list.push(new MockLngLat(coord[0], coord[1]));
    }
    return this;
  }

  getSouthWest() {
    return this.sw || new MockLngLat(0, 0);
  }

  getNorthEast() {
    return this.ne || new MockLngLat(0, 0);
  }

  getSouthEast() {
    return new MockLngLat(this.ne?.lng || 0, this.sw?.lat || 0);
  }

  getNorthWest() {
    return new MockLngLat(this.sw?.lng || 0, this.ne?.lat || 0);
  }
}

// Mock Marker
class MockMarker {
  constructor(options = {}) {
    this.options = options;
    this._lngLat = null;
    this._popup = null;
    this._element = {
      style: { cursor: "default" },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  }

  setLngLat(lngLat) {
    this._lngLat = lngLat;
    return this;
  }

  setPopup(popup) {
    this._popup = popup;
    return this;
  }

  getElement() {
    return this._element;
  }

  addTo(map) {
    return this;
  }

  remove() {
    return this;
  }
}

// Mock Popup
class MockPopup {
  constructor(options = {}) {
    this.options = options;
    this._text = "";
  }

  setText(text) {
    this._text = text;
    return this;
  }

  setHTML(html) {
    this._text = html;
    return this;
  }

  addTo(map) {
    return this;
  }

  remove() {
    return this;
  }
}

// Mock Map
class MockMap {
  constructor(options = {}) {
    this.options = options;
    this._listeners = new Map();
    this._container = options.container || { appendChild: vi.fn() };
    this._style = options.style || {};
    this._center = options.center || [0, 0];
    this._zoom = options.zoom || 0;
  }

  addControl(control, position) {
    return this;
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(handler);
    return this;
  }

  off(event, handler) {
    if (this._listeners.has(event)) {
      const handlers = this._listeners.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  easeTo(options) {
    return this;
  }

  fitBounds(bounds, options) {
    return this;
  }

  getZoom() {
    return this._zoom;
  }

  setZoom(zoom) {
    this._zoom = zoom;
    return this;
  }

  getCenter() {
    return new MockLngLat(this._center[0], this._center[1]);
  }

  setCenter(center) {
    this._center = center;
    return this;
  }

  resize() {
    return this;
  }

  remove() {
    return this;
  }
}

// Mock NavigationControl
class MockNavigationControl {
  onAdd() {
    return {
      onRemove: vi.fn(),
      _container: {
        className: "mock-navigation-control",
        style: {},
      },
    };
  }

  onRemove() {
    return this;
  }
}

// Export the mock maplibregl
const mockMapLibreGL = {
  Map: MockMap,
  Marker: MockMarker,
  Popup: MockPopup,
  LngLat: MockLngLat,
  LngLatBounds: MockLngLatBounds,
  NavigationControl: MockNavigationControl,
  AttributionControl: vi.fn(),
  ScaleControl: vi.fn(),
  FullscreenControl: vi.fn(),
  GeolocateControl: vi.fn(),
};

// Mock the canvas element globally if needed
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
}

export default mockMapLibreGL;
export {
  MockMap as Map,
  MockMarker as Marker,
  MockPopup as Popup,
  MockLngLat as LngLat,
  MockLngLatBounds as LngLatBounds,
  MockNavigationControl as NavigationControl,
  MockMap,
  MockMarker,
  MockPopup,
  MockLngLat,
  MockLngLatBounds,
  MockNavigationControl,
};
