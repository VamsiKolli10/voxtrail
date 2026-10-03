import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery as render } from "../../../test/renderWithQuery";
import userEvent from "@testing-library/user-event";
import PlaceReviews from "../PlaceReviews.jsx";

describe("PlaceReviews", () => {
  it("doesn't fetch until the user asks (ADR-004)", async () => {
    const loadReviews = vi.fn(async () => ({
      reviews: [
        { author_name: "Ana", author_uri: "https://maps.google.com/ana", rating: 5, text: "Lovely stay" },
      ],
    }));
    render(<PlaceReviews title="Guest Reviews" reviewsCount={1200} queryKey={["r", 1]} loadReviews={loadReviews} />);

    expect(loadReviews).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Show reviews (1,200)" }));

    expect(loadReviews).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Lovely stay")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "https://maps.google.com/ana");
    expect(screen.getByText("Reviews from Google")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    const loadReviews = vi
      .fn()
      .mockRejectedValueOnce(new Error("502"))
      .mockResolvedValueOnce({ reviews: [] });
    render(<PlaceReviews queryKey={["r", 2]} loadReviews={loadReviews} />);

    await userEvent.click(screen.getByRole("button", { name: "Show reviews" }));
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No reviews yet.")).toBeInTheDocument();
  });
});
