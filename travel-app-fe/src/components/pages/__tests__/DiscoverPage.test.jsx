import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DiscoverPage from "../DiscoverPage.jsx";
import { searchPOIs } from "../../../services/poi";

vi.mock("../../../services/poi", () => ({
  searchPOIs: vi.fn(),
}));

vi.mock("../../../contexts/AnalyticsContext.jsx", () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

vi.mock("../../../hooks/useTravelContext", () => ({
  __esModule: true,
  default: () => ({
    destination: "",
    destinationDisplayName: "",
    destinationLat: null,
    destinationLng: null,
    setDestinationContext: vi.fn(),
  }),
}));

describe("DiscoverPage (POI search)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search results", async () => {
    searchPOIs.mockResolvedValue({
      items: [{ id: "p1", name: "Louvre" }],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    render(
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText(/Search city, country, or attraction/i);
    fireEvent.change(searchInput, {
      target: { value: "Paris" },
    });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Louvre/i)).toBeInTheDocument();
    });
  });

  it("shows nothing when searching without destination or coords", async () => {
    searchPOIs.mockResolvedValue({ items: [] });
    render(
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>
    );
    const searchInput = screen.getByLabelText(/search city, country, or attraction/i);
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(searchPOIs).not.toHaveBeenCalled());
  });

  it("explains a failed search and lets the user retry", async () => {
    searchPOIs.mockRejectedValueOnce(new Error("Network Error"));
    searchPOIs.mockResolvedValueOnce({ items: [{ id: "p1", name: "Louvre" }] });

    render(
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText(/Search city, country, or attraction/i);
    fireEvent.change(searchInput, { target: { value: "Paris" } });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(screen.getByText(/couldn't load places/i)).toBeInTheDocument()
    );
    expect(screen.queryByText(/no places found/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(screen.getByText(/Louvre/i)).toBeInTheDocument());
  });
});
