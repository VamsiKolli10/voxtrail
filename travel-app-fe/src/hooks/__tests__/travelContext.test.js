import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import travelContextReducer from "../../store/slices/travelContextSlice";
import useTravelContext from "../useTravelContext";

function createWrapper() {
  const store = configureStore({
    reducer: {
      travelContext: travelContextReducer,
    },
  });
  const Wrapper = ({ children }) => React.createElement(Provider, { store }, children);
  return Wrapper;
}

describe("useTravelContext", () => {
  it("updates language pair", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTravelContext(), { wrapper });

    act(() => {
      result.current.setLanguagePair(
        { sourceLanguageCode: "fr", targetLanguageCode: "de" },
        { source: "test" }
      );
    });

    expect(result.current.sourceLanguageCode).toBe("fr");
    expect(result.current.targetLanguageCode).toBe("de");
  });

  it("initializes with default language pair", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTravelContext(), { wrapper });

    expect(result.current.sourceLanguageCode).toBeDefined();
    expect(result.current.targetLanguageCode).toBeDefined();
    expect(typeof result.current.sourceLanguageCode).toBe("string");
    expect(typeof result.current.targetLanguageCode).toBe("string");
  });

  it("handles multiple language pair updates", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTravelContext(), { wrapper });

    act(() => {
      result.current.setLanguagePair(
        { sourceLanguageCode: "en", targetLanguageCode: "es" },
        { source: "test" }
      );
    });

    expect(result.current.sourceLanguageCode).toBe("en");
    expect(result.current.targetLanguageCode).toBe("es");

    act(() => {
      result.current.setLanguagePair(
        { sourceLanguageCode: "fr", targetLanguageCode: "de" },
        { source: "test" }
      );
    });

    expect(result.current.sourceLanguageCode).toBe("fr");
    expect(result.current.targetLanguageCode).toBe("de");
  });

  it("provides setLanguagePair function", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTravelContext(), { wrapper });

    expect(typeof result.current.setLanguagePair).toBe("function");
  });
});
