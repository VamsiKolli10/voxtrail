import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Phrasebook from "../Phrasebook.jsx";
import { generatePhrasebook } from "../../../services/phrasebook";
import { listSavedPhrases, addSavedPhrase } from "../../../services/savedPhrases";
import { cacheSavedPhrases, readSavedPhrases } from "../../../services/offlineCache";

vi.mock("../../../contexts/AuthContext.jsx", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));

vi.mock("../../../services/phrasebook", () => ({
  generatePhrasebook: vi.fn(),
}));

vi.mock("../../../services/savedPhrases", () => ({
  listSavedPhrases: vi.fn(),
  addSavedPhrase: vi.fn(),
  removeSavedPhrase: vi.fn(),
}));

vi.mock("../../../services/offlineCache", () => ({
  cacheSavedPhrases: vi.fn(),
  readSavedPhrases: vi.fn(),
}));

let connectivityState = { isOnline: true };
vi.mock("../../../hooks/useConnectivity", () => ({
  __esModule: true,
  default: () => connectivityState,
}));

vi.mock("../../../hooks/useTravelContext", () => ({
  __esModule: true,
  default: () => ({
    sourceLanguageName: "English",
    targetLanguageName: "Spanish",
    sourceLanguageCode: "en",
    targetLanguageCode: "es",
    setLanguagePair: vi.fn(),
  }),
}));

describe("Phrasebook page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectivityState = { isOnline: true };
    listSavedPhrases.mockResolvedValue([]);
    cacheSavedPhrases.mockResolvedValue();
    readSavedPhrases.mockResolvedValue([]);
  });

  it("generates phrases and displays them", async () => {
    generatePhrasebook.mockResolvedValue({
      topic: "Travel",
      sourceLang: "en",
      targetLang: "es",
      phrases: [
        {
          phrase: "Hola",
          transliteration: "",
          meaning: "Hello",
          usageExample: "Hola",
        },
      ],
    });

    render(<Phrasebook />);

    fireEvent.change(screen.getByLabelText(/topic/i), {
      target: { value: "Travel" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Hola/i).length).toBeGreaterThan(0);
    });
  });

  it("shows offline message when no cached phrases", async () => {
    connectivityState = { isOnline: false };
    readSavedPhrases.mockResolvedValue([]);
    render(<Phrasebook />);
    await waitFor(() =>
      expect(
        screen.getByText(/you're offline and we don't have any saved phrases cached yet/i)
      ).toBeInTheDocument()
    );
  });

  it("saves a generated phrase to saved list", async () => {
    generatePhrasebook.mockResolvedValue({
      topic: "Travel",
      sourceLang: "en",
      targetLang: "es",
      phrases: [
        {
          phrase: "Hola",
          transliteration: "",
          meaning: "Hello",
          usageExample: "Hola",
        },
      ],
    });
    addSavedPhrase.mockResolvedValue("saved-1");

    render(<Phrasebook />);

    fireEvent.change(screen.getByLabelText(/topic/i), {
      target: { value: "Travel" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => screen.getAllByText(/Hola/i));
    const saveButtons = screen.getAllByRole("button", { name: /save/i });
    fireEvent.click(saveButtons[0]);
    await waitFor(() => expect(addSavedPhrase).toHaveBeenCalled());
  });
});
