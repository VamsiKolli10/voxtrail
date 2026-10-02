import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import Navbar from "../Navbar.jsx";
import { AppearanceProvider } from "../../../contexts/AppearanceContext.jsx";
import authReducer from "../../../store/slices/authSlice";

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => () => {},
}));

describe("Navbar", () => {
  it("renders brand and toggles theme", () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    render(
      <Provider store={store}>
        <AppearanceProvider>
          <Navbar />
        </AppearanceProvider>
      </Provider>
    );

    expect(screen.getByText(/voxtrail/i)).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /dark/i });
    fireEvent.click(toggle);
    expect(toggle).toBeInTheDocument(); // ensures button remains after toggle
  });
});
