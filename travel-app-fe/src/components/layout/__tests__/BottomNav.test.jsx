import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "../BottomNav.jsx";

vi.mock("@mui/material", async (importOriginal) => ({
  ...(await importOriginal()),
  useMediaQuery: () => true,
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  );

describe("BottomNav", () => {
  it("selects More (not Home) on a route that lives in the More sheet", () => {
    renderAt("/stays");
    expect(screen.getByRole("button", { name: /more/i })).toHaveClass("Mui-selected");
    expect(screen.getByRole("link", { name: /home/i })).not.toHaveClass("Mui-selected");
  });

  it("selects nothing on a route outside the nav", () => {
    renderAt("/terms");
    expect(document.querySelectorAll(".Mui-selected")).toHaveLength(0);
  });

  it("opens the More sheet with Stays, Emergency and Culture", () => {
    renderAt("/home");
    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    expect(screen.getByRole("link", { name: /emergency/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /stays/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /culture/i })).toBeInTheDocument();
  });
});
