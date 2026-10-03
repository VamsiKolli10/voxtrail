import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithQuery as render } from "../../../test/renderWithQuery";
import StayDetailsPage from "../StayDetailsPage.jsx";
import { getStay } from "../../../services/stays";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../../../services/stays", () => ({
  getStay: vi.fn(),
}));

vi.mock("../../../contexts/AnalyticsContext.jsx", () => ({
  useAnalytics: () => ({ trackModuleView: vi.fn(), trackEvent: vi.fn() }),
}));

describe("StayDetailsPage bookmark/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.navigator.share = vi.fn();
  });

  it("toggles bookmark and triggers share", async () => {
    getStay.mockResolvedValue({ id: "s1", name: "Hotel One", location: {} });

    render(
      <MemoryRouter initialEntries={["/stays/s1"]}>
        <Routes>
          <Route path="/stays/:id" element={<StayDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Hotel One/i)).toBeInTheDocument());

    const bookmarkBtn = screen.getByLabelText(/save stay/i);
    fireEvent.click(bookmarkBtn);
    const shareBtn = screen.getByLabelText(/share stay/i);
    fireEvent.click(shareBtn);
    expect(navigator.share).toHaveBeenCalled();
  });
});
