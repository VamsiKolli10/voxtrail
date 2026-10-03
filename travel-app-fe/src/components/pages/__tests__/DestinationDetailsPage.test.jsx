import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQuery as render } from "../../../test/renderWithQuery";
import DestinationDetailsPage from "../DestinationDetailsPage.jsx";
import { getPOIDetails } from "../../../services/poi";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../../services/poi", () => ({
  getPOIDetails: vi.fn(),
}));

vi.mock("../../../hooks/useTravelContext", () => ({
  __esModule: true,
  default: () => ({
    setDestinationContext: vi.fn(),
    updateTravelContext: vi.fn(),
  }),
}));

describe("DestinationDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders details when loaded", async () => {
    getPOIDetails.mockResolvedValue({
      id: "p1",
      name: "Eiffel Tower",
      location: { address: "Paris", lat: 1, lng: 2 },
    });

    render(
      <MemoryRouter initialEntries={["/destinations/p1"]}>
        <Routes>
          <Route path="/destinations/:id" element={<DestinationDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Eiffel Tower/i).length).toBeGreaterThan(0);
    });
  });

  it("shows error when fetch fails", async () => {
    getPOIDetails.mockRejectedValue(new Error("boom"));

    render(
      <MemoryRouter initialEntries={["/destinations/p1"]}>
        <Routes>
          <Route path="/destinations/:id" element={<DestinationDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(
        screen.getByText(/couldn’t load that destination/i)
      ).toBeInTheDocument()
    );
  });
});
