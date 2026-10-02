import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import Landing from "../Landing.jsx";
import { createAppTheme } from "../../../theme.js";

vi.mock("../../../contexts/AppearanceContext.jsx", () => ({
  useAppearance: () => ({ mode: "light", toggleMode: vi.fn() }),
}));

const renderLanding = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={createAppTheme("light", { cssVariables: false })}>
        <Landing />
      </ThemeProvider>
    </MemoryRouter>
  );

describe("Landing page", () => {
  it("shows the hero headline and CTAs", () => {
    renderLanding();
    expect(
      screen.getByText(/one travel workspace for translation, stays, pois, and safety/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start your journey/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in to your workspace/i })).toBeInTheDocument();
  });

  it("highlights core modules and production signals", () => {
    renderLanding();
    expect(screen.getByText(/translate & phrasebooks/i)).toBeInTheDocument();
    expect(screen.getByText(/stays with context/i)).toBeInTheDocument();
    expect(screen.getByText(/your travel tools, together/i)).toBeInTheDocument();
  });

  it("renders itineraries section with connected journey copy", () => {
    renderLanding();
    expect(
      screen.getByText(/journeys with translations, pois, and stays already connected/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Kyoto Ground Truth/i)).toBeInTheDocument();
  });
});
