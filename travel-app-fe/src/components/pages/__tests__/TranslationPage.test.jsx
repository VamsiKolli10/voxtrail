import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithQuery as render } from "../../../test/renderWithQuery";
import Translation from "../Translation.jsx";
import { useAuth } from "../../../contexts/AuthContext.jsx";
import { useAnalytics } from "../../../contexts/AnalyticsContext.jsx";
import { translateText } from "../../../services/translation";
import { addSavedPhrase } from "../../../services/savedPhrases";

vi.mock("../../../contexts/AuthContext.jsx", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../contexts/AnalyticsContext.jsx", () => ({
  useAnalytics: vi.fn(),
}));

vi.mock("../../../services/translation", () => ({
  translateText: vi.fn(),
}));

vi.mock("../../../services/savedPhrases", () => ({
  addSavedPhrase: vi.fn(),
}));

vi.mock("../../../hooks/useTravelContext", () => ({
  __esModule: true,
  default: () => ({
    sourceLanguageCode: "en",
    targetLanguageCode: "es",
    setLanguagePair: vi.fn(),
  }),
}));

describe("Translation page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { uid: "u1" } });
    useAnalytics.mockReturnValue({
      trackModuleView: vi.fn(),
      trackEvent: vi.fn(),
    });
    global.navigator.clipboard = { writeText: vi.fn() };
    global.SpeechSynthesisUtterance = function () {};
    global.window.speechSynthesis = {
      cancel: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      onvoiceschanged: null,
    };
  });

  it("translates input text and shows result", async () => {
    translateText.mockResolvedValue({ translation: "hola" });
    render(<Translation />);

    const input = screen.getByPlaceholderText(/type text to translate/i);
    fireEvent.change(input, {
      target: { value: "hello" },
    });

    const translateButton = screen.getByRole("button", { name: /translate/i });
    fireEvent.click(translateButton);

    // Wait for the translation to complete and appear in the output field
    await waitFor(
      () => {
        expect(screen.getByDisplayValue("hola")).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    expect(translateText).toHaveBeenCalledWith("hello", "en-es");
  });

  it("saves a translation to phrasebook", async () => {
    translateText.mockResolvedValue({ translation: "hola" });
    addSavedPhrase.mockResolvedValue("saved-1");
    render(<Translation />);

    const input = screen.getByPlaceholderText(/type text to translate/i);
    fireEvent.change(input, {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /translate/i }));
    await waitFor(() => screen.getByDisplayValue("hola"));

    const saveBtn = screen.getByRole("button", { name: /save to phrasebook/i });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(addSavedPhrase).toHaveBeenCalled());
  });

  it("handles translation errors gracefully", async () => {
    translateText.mockRejectedValue({
      response: {
        status: 400,
        data: { error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
      },
    });
    render(<Translation />);

    const input = screen.getByPlaceholderText(/type text to translate/i);
    fireEvent.change(input, {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /translate/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid input")).toBeInTheDocument();
      expect(screen.getByLabelText("Translated text")).toHaveValue("");
      expect(screen.getByRole("button", { name: /save to phrasebook/i })).toBeDisabled();
      expect(screen.queryByText("Translation complete")).not.toBeInTheDocument();
    });
  });

  it("handles rate limit errors", async () => {
    translateText.mockRejectedValue({
      response: {
        status: 429,
        data: {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests",
            resetAt: Date.now() + 60000,
          },
        },
      },
    });
    render(<Translation />);

    const input = screen.getByPlaceholderText(/type text to translate/i);
    fireEvent.change(input, {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /translate/i }));

    await waitFor(() => {
      expect(screen.getByText(/wait a minute/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Translated text")).toHaveValue("");
    });
  });

  it("handles network errors", async () => {
    translateText.mockRejectedValue(new Error("Network request failed"));
    render(<Translation />);

    const input = screen.getByPlaceholderText(/type text to translate/i);
    fireEvent.change(input, {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /translate/i }));

    await waitFor(() => {
      const errorMessage = screen.getByText(/error contacting translation server/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it("validates empty input before translating", async () => {
    render(<Translation />);

    const translateButton = screen.getByRole("button", { name: /translate/i });
    fireEvent.click(translateButton);

    // Should either show validation error or not call translateText
    await waitFor(() => {
      const validationError = screen.queryByText(/required|empty|fill/i);
      expect(validationError || !translateText.mock.calls.length).toBeTruthy();
    });
  });

  it("handles save phrase errors", async () => {
    translateText.mockResolvedValue({ translation: "hola" });
    addSavedPhrase.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: { code: "VALIDATION_ERROR", message: "Invalid phrase data" },
        },
      },
    });
    render(<Translation />);

    const input = screen.getByPlaceholderText(/type text to translate/i);
    fireEvent.change(input, {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: /translate/i }));
    await waitFor(() => screen.getByDisplayValue("hola"));

    const saveBtn = screen.getByRole("button", { name: /save to phrasebook/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Component shows error in a Snackbar/Alert, check for the error message
      const errorMessage = screen.getByText(/Invalid phrase data/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it("disables translate button while translating", async () => {
    let resolveTranslation;
    const translationPromise = new Promise((resolve) => {
      resolveTranslation = resolve;
    });
    translateText.mockReturnValue(translationPromise);

    render(<Translation />);

    const input = screen.getByPlaceholderText(/type text to translate/i);
    fireEvent.change(input, {
      target: { value: "hello" },
    });

    const translateButton = screen.getByRole("button", { name: /translate/i });
    fireEvent.click(translateButton);

    // Button should be disabled during translation
    await waitFor(() => {
      expect(translateButton).toBeDisabled();
    });

    resolveTranslation({ translation: "hola" });
    await waitFor(() => {
      expect(translateButton).not.toBeDisabled();
    });
  });
  it("clears stale output when the source changes", async () => {
    translateText.mockResolvedValue({ translation: "hola" });
    render(<Translation />);
    const input = screen.getByLabelText("Text to translate");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /^translate$/i }));
    await screen.findByDisplayValue("hola");
    fireEvent.change(input, { target: { value: "goodbye" } });
    expect(screen.getByLabelText("Translated text")).toHaveValue("");
    expect(screen.getByRole("button", { name: /save to phrasebook/i })).toBeDisabled();
  });

  it("reports clipboard failures without losing the translation", async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error("Permission denied"));
    translateText.mockResolvedValue({ translation: "hola" });
    render(<Translation />);
    fireEvent.change(screen.getByLabelText("Text to translate"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /^translate$/i }));
    await screen.findByDisplayValue("hola");
    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));
    expect(await screen.findByText(/could not copy/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Translated text")).toHaveValue("hola");
  });

  it("treats empty provider results as errors", async () => {
    translateText.mockResolvedValue({ translation: "" });
    render(<Translation />);
    fireEvent.change(screen.getByLabelText("Text to translate"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /^translate$/i }));
    expect(await screen.findByText(/error contacting translation server/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeDisabled();
  });

});
