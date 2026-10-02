import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StayDetailsPage from "../StayDetailsPage.jsx";
import { getStay } from "../../../services/stays";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../../../services/stays", () => ({
  getStay: vi.fn(),
}));

vi.mock("../../../contexts/AnalyticsContext.jsx", () => ({
  useAnalytics: () => ({ trackModuleView: vi.fn(), trackEvent: vi.fn() }),
}));

describe("StayDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows stay details", async () => {
    getStay.mockResolvedValue({ id: "s1", name: "Hotel One", location: {} });

    render(
      <MemoryRouter initialEntries={["/stays/s1"]}>
        <Routes>
          <Route path="/stays/:id" element={<StayDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Hotel One/i)).toBeInTheDocument();
    });
  });

  it("shows error state", async () => {
    getStay.mockRejectedValue(new Error("boom"));

    render(
      <MemoryRouter initialEntries={["/stays/s1"]}>
        <Routes>
          <Route path="/stays/:id" element={<StayDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/boom/i)).toBeInTheDocument());
  });

  const renderStay = () =>
    render(
      <MemoryRouter initialEntries={["/stays/s1"]}>
        <Routes>
          <Route path="/stays/:id" element={<StayDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

  it("shows the location map when the stay has coordinates", async () => {
    getStay.mockResolvedValue({
      id: "s1",
      name: "Hotel One",
      location: { lat: 48.85, lng: 2.35, address: "Paris" },
    });
    renderStay();
    await waitFor(() => expect(screen.getByText("Location")).toBeInTheDocument());
  });

  it("hides the location map without coordinates", async () => {
    getStay.mockResolvedValue({ id: "s1", name: "Hotel One", location: {} });
    renderStay();
    await waitFor(() => expect(screen.getByText(/Hotel One/i)).toBeInTheDocument());
    expect(screen.queryByText("Location")).not.toBeInTheDocument();
  });

  it("shows a not-found state with a way back", async () => {
    getStay.mockResolvedValue(null);
    renderStay();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /stay not found/i })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /back to stays/i })).toBeInTheDocument();
  });
});
