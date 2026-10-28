import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "../../../theme";
import Emergency from "../Emergency.jsx";
import { resetEmergencyAliases } from "../../../services/emergencyAliases";
import { resolveLocation } from "../../../services/location";

vi.mock("../../../services/location", () => ({ resolveLocation: vi.fn() }));
let travelContext = {};
vi.mock("../../../hooks/useTravelContext", () => ({
  __esModule: true,
  default: () => travelContext,
}));

const aliasFile = {
  version: 1,
  countries: ["Japan"],
  aliases: [["Kyoto", 0], ["京都", 0]],
};

function renderPage() {
  return render(
    <ThemeProvider theme={createAppTheme("light", { cssVariables: false })}>
      <MemoryRouter>
        <Emergency />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function search(value) {
  const input = screen.getByPlaceholderText(/search a country or city/i);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
}

describe("Emergency page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetEmergencyAliases();
    resolveLocation.mockReset();
    travelContext = { setDestinationContext: vi.fn() };
  });

  it("never suggests a universal 911 number before country selection", () => {
    renderPage();
    expect(screen.getByText(/contact local emergency services/i)).toBeInTheDocument();
    expect(screen.queryByText(/call 911 right away/i)).not.toBeInTheDocument();
  });

  it("dials alternatives individually and preserves leading zeros", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    travelContext = { ...travelContext, destinationCountry: "France" };
    const view = renderPage();
    const buttons = await screen.findAllByRole("button", { name: "Call 112" });
    fireEvent.click(buttons[0]);
    expect(open).toHaveBeenCalledWith("tel:112");
    view.unmount();
    travelContext = { ...travelContext, destinationCountry: "Australia" };
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: "Call 000" }))[0]);
    expect(open).toHaveBeenCalledWith("tel:000");
  });

  it("shows numbers for the travel context's country without loading place names", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    travelContext = {
      ...travelContext,
      destinationCity: "Lyon",
      destinationCountry: "France",
    };
    renderPage();
    expect(await screen.findAllByText(/112 or 17/)).not.toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("loads the alias file on first city search", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: async () => aliasFile });
    renderPage();
    search("Kyoto");
    expect(await screen.findAllByText("110")).not.toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("data/emergency-aliases.v1.json"));
    expect(resolveLocation).not.toHaveBeenCalled();
  });

  it("falls back to geocoding when place names can't be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    resolveLocation.mockResolvedValue({ country: "Japan", city: "Kyoto" });
    renderPage();
    search("Kyoto");
    expect(await screen.findAllByText("110")).not.toHaveLength(0);
    expect(screen.getByText(/city search is limited/i)).toBeInTheDocument();
  });

  it("renders the page and the country dropdown", () => {
    renderPage();
    expect(screen.getByText("Emergency")).toBeInTheDocument();
    expect(screen.getByLabelText(/Or pick a country/i)).toBeInTheDocument();
  });
});
