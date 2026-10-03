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

  it("reuses a cached search instead of calling the API again (ADR-005)", async () => {
    searchPOIs.mockImplementation(async (params) => ({
      items: [{ id: params.dest, name: `${params.dest} Museum` }],
    }));
    render(
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>
    );
    const input = screen.getByLabelText(/Search city, country, or attraction/i);
    const search = (dest) => {
      fireEvent.change(input, { target: { value: dest } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    };

    search("Paris");
    await waitFor(() => expect(screen.getByText("Paris Museum")).toBeInTheDocument());
    search("Rome");
    await waitFor(() => expect(screen.getByText("Rome Museum")).toBeInTheDocument());
    search("Paris");
    await waitFor(() => expect(screen.getByText("Paris Museum")).toBeInTheDocument());
    expect(searchPOIs).toHaveBeenCalledTimes(2);
  });

  it("shows the newest search even when an older response arrives later (ADR-005)", async () => {
    let resolveSlow;
    searchPOIs.mockImplementation((params) =>
      params.dest === "Paris"
        ? new Promise((resolve) => {
            resolveSlow = () => resolve({ items: [{ id: "old", name: "Old Paris Museum" }] });
          })
        : Promise.resolve({ items: [{ id: "new", name: "Rome Museum" }] })
    );
    render(
      <MemoryRouter>
        <DiscoverPage />
      </MemoryRouter>
    );
    const input = screen.getByLabelText(/Search city, country, or attraction/i);
    fireEvent.change(input, { target: { value: "Paris" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(searchPOIs).toHaveBeenCalledTimes(1));

    fireEvent.change(input, { target: { value: "Rome" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => expect(screen.getByText("Rome Museum")).toBeInTheDocument());

    resolveSlow();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Old Paris Museum")).not.toBeInTheDocument();
    expect(screen.getByText("Rome Museum")).toBeInTheDocument();
  });
});
