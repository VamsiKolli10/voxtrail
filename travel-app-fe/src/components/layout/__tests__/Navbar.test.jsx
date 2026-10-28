import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "../Navbar.jsx";
import { AppearanceProvider } from "../../../contexts/AppearanceContext.jsx";

vi.mock("../../../contexts/AuthContext.jsx", () => ({ useAuth: () => ({ user: null, loading: false }) }));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => () => {},
}));

describe("Navbar", () => {
  it("renders brand and toggles theme", () => {
    render(
      <AppearanceProvider>
        <Navbar />
      </AppearanceProvider>
    );

    expect(screen.getByText(/voxtrail/i)).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /dark/i });
    fireEvent.click(toggle);
    expect(toggle).toBeInTheDocument(); // ensures button remains after toggle
  });
});
