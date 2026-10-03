import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithQuery as render } from "../../../test/renderWithQuery";
import { MemoryRouter } from "react-router-dom";
import DiscoverPage from "../DiscoverPage.jsx";
import { searchPOIs } from "../../../services/poi";

vi.mock("../../../services/poi", () => ({
  searchPOIs: vi.fn(),
}));

vi.mock("../../../contexts/AnalyticsContext.jsx", () => ({
  useAnalytics: () => ({ trackModuleView: vi.fn(), trackEvent: vi.fn() }),
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

describe("POI search page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows results after search", async () => {
    searchPOIs.mockResolvedValue({
      items: [{ id: "p1", name: "Eiffel Tower" }],
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
      expect(screen.getByText(/Eiffel Tower/i)).toBeInTheDocument();
    });
  });
});
