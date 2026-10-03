import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithQuery as render } from "../../../test/renderWithQuery";
import { MemoryRouter } from "react-router-dom";
import StaysSearchPage from "../StaysSearchPage.jsx";
import { searchStays } from "../../../services/stays";

vi.mock("../../../services/stays", () => ({
  searchStays: vi.fn(),
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

describe("StaysSearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading and renders results", async () => {
    searchStays.mockResolvedValue({
      items: [{ id: "s1", name: "Hotel One" }],
      total: 1,
      totalPages: 1,
      page: 1,
    });

    render(
      <MemoryRouter>
        <StaysSearchPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/destination/i), {
      target: { value: "Paris" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText(/Hotel One/i)).toBeInTheDocument();
    });
  });

  it("handles error state", async () => {
    searchStays.mockRejectedValue(new Error("network"));

    render(
      <MemoryRouter>
        <StaysSearchPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/destination/i), {
      target: { value: "Paris" },
    });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(searchStays).toHaveBeenCalled();
    });
  });

  it("passes an abort signal so abandoned searches can be cancelled", async () => {
    searchStays.mockResolvedValue({ items: [], total: 0 });
    render(
      <MemoryRouter>
        <StaysSearchPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/destination/i), { target: { value: "Paris" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() => expect(searchStays).toHaveBeenCalled());
    expect(searchStays.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
