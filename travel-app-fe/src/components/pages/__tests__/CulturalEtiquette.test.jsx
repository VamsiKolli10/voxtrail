import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import CulturalEtiquette from "../CulturalEtiquette.jsx";
import { getCultureBrief, askCultureQuestion } from "../../../services/culturalEtiquette";

vi.mock("../../../services/culturalEtiquette", () => ({
  getCultureBrief: vi.fn(),
  askCultureQuestion: vi.fn(),
}));

vi.mock("../../../hooks/useTravelContext", () => ({
  __esModule: true,
  default: () => ({
    destination: "",
    culture: "",
    language: "en",
    updateTravelContext: vi.fn(),
    setDestinationContext: vi.fn(),
  }),
}));

describe("CulturalEtiquette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCultureBrief.mockResolvedValue({
      destination: "Paris",
      categories: { greetings: ["Bonjour"] },
      generatedAt: new Date().toISOString(),
    });
  });

  it("shares an in-flight brief during StrictMode effect replay", async () => {
    let respond;
    getCultureBrief.mockImplementation(() => new Promise((resolve) => { respond = resolve; }));
    render(<StrictMode><CulturalEtiquette destination="StrictModeCity" /></StrictMode>);
    expect(getCultureBrief).toHaveBeenCalledTimes(1);
    await act(async () => respond({ categories: { greetings: ["Shared guidance"] } }));
    expect(screen.getByText("Shared guidance")).toBeInTheDocument();
  });

  it("ignores an older destination response after a newer one completes", async () => {
    let oldResponse;
    getCultureBrief.mockImplementation(({ destination }) => destination === "TokyoRace"
      ? new Promise((resolve) => { oldResponse = resolve; })
      : Promise.resolve({ categories: { greetings: ["Paris guidance"] } }));
    const view = render(<CulturalEtiquette destination="TokyoRace" />);
    await waitFor(() => expect(oldResponse).toBeTypeOf("function"));
    view.rerender(<CulturalEtiquette destination="ParisRace" />);
    await screen.findByText("Paris guidance");
    await act(async () => oldResponse({ categories: { greetings: ["Tokyo guidance"] } }));
    expect(screen.getByText("Paris guidance")).toBeInTheDocument();
    expect(screen.queryByText("Tokyo guidance")).not.toBeInTheDocument();
  });

  it("ignores Q&A from the previous destination", async () => {
    let answer;
    askCultureQuestion.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    const view = render(<CulturalEtiquette destination="TokyoQA" />);
    await screen.findByText("Bonjour");
    fireEvent.change(screen.getByLabelText(/ask a question about local etiquette/i), { target: { value: "How to greet?" } });
    fireEvent.click(screen.getByRole("button", { name: /ask/i }));
    view.rerender(<CulturalEtiquette destination="ParisQA" />);
    await act(async () => answer({ answer: "Old answer", highlights: [] }));
    expect(screen.queryByText("Old answer")).not.toBeInTheDocument();
  });

  it("loads brief and displays categories", async () => {
    render(<CulturalEtiquette destination="Paris" />);
    await waitFor(() => expect(screen.getByText(/Bonjour/i)).toBeInTheDocument());
  });

  it("asks a question and shows answer", async () => {
    askCultureQuestion.mockResolvedValue({
      answer: "Say bonjour",
      highlights: ["Be polite"],
    });
    render(<CulturalEtiquette destination="Paris" />);
    await waitFor(() => screen.getByText(/Bonjour/i));

    fireEvent.change(
      screen.getByLabelText(/ask a question about local etiquette/i),
      {
        target: { value: "How to greet?" },
      }
    );
    fireEvent.click(screen.getByRole("button", { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText(/Say bonjour/i)).toBeInTheDocument();
    });
  });
});
