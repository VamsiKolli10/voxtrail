import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "../Login.jsx";
import PublicRoute from "../../common/PublicRoute";
import {
  loginWithEmail,
  resendEmailVerification,
} from "../../../services/auth";

vi.mock("../../../services/auth", () => ({
  loginWithEmail: vi.fn(),
  resendEmailVerification: vi.fn(),
}));

vi.mock("../../../hooks/useNotification", () => ({
  __esModule: true,
  default: () => ({
    showNotification: vi.fn(),
  }),
}));

let session;
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => session,
}));
function Destination() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}${location.hash}`}</div>;
}

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session = { user: null, loading: false };
  });

  it("returns to the protected location after the auth state changes", async () => {
    const fixture = () => <MemoryRouter initialEntries={[{ pathname: "/login", state: {
      from: { pathname: "/stays/hotel", search: "?lang=fr", hash: "#photos" },
      email: "user@test.dev", verificationSent: true,
    } }]}><Routes>
      <Route element={<PublicRoute />}><Route path="/login" element={<Login />} /></Route>
      <Route path="*" element={<Destination />} />
    </Routes></MemoryRouter>;
    const view = render(fixture());
    await screen.findByText(/we sent a verification link/i);
    expect(screen.getByLabelText(/email address/i)).toHaveValue("user@test.dev");
    session = { user: { uid: "u1" }, loading: false };
    view.rerender(fixture());
    expect(await screen.findByText("/stays/hotel?lang=fr#photos")).toBeInTheDocument();
  });

  it("validates empty fields", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
  });

  it("submits credentials", async () => {
    loginWithEmail.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@test.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(loginWithEmail).toHaveBeenCalledWith("user@test.dev", "secret")
    );
  });

  it("resends verification on auth error", async () => {
    loginWithEmail.mockRejectedValue({
      code: "auth/email-not-verified",
      email: "user@test.dev",
    });
    resendEmailVerification.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@test.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/please verify your email/i)).toBeInTheDocument()
    );
    // The detailed guidance (with the address) is shown, not just the error.
    expect(
      screen.getByText(/check user@test\.dev for the verification email/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /resend verification email/i })
    ).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i })
    );
    await waitFor(() => expect(resendEmailVerification).toHaveBeenCalled());
  });

  it("displays error message on invalid credentials", async () => {
    loginWithEmail.mockRejectedValue({
      code: "auth/invalid-credential",
      message: "Invalid email or password",
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "wrong@test.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const errorMessage = screen.queryByText(/invalid|incorrect|wrong/i);
      expect(errorMessage || screen.queryByText(/error/i)).toBeTruthy();
    });
  });

  it("handles network errors gracefully", async () => {
    loginWithEmail.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@test.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const errorElement = screen.queryByText(/error|network|failed/i);
      expect(errorElement).toBeTruthy();
    });
  });

  it("validates email format", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const form = emailInput.closest("form");
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, {
      target: { value: "invalid-email" },
    });
    fireEvent.change(passwordInput, {
      target: { value: "secret" },
    });

    // Submit the form properly
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(submitButton);
    }

    // Should show validation error for invalid email format
    await waitFor(
      () => {
        // Check for the error message - it should be in an Alert component
        const validationError = screen.queryByText(
          /Please enter a valid email address/i
        );
        expect(validationError).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(loginWithEmail).not.toHaveBeenCalled();
  });
});
