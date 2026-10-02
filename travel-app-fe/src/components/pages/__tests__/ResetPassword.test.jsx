import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "../ResetPassword.jsx";
import {
  verifyPasswordReset,
  confirmPasswordResetWithCode,
} from "../../../services/auth";

vi.mock("../../../services/auth", () => ({
  verifyPasswordReset: vi.fn(),
  confirmPasswordResetWithCode: vi.fn(),
}));

vi.mock("../../../hooks/useNotification", () => ({
  default: () => ({
    showNotification: vi.fn(),
  }),
}));

describe("ResetPassword page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyPasswordReset.mockResolvedValue("gefey60749@bialode.com");
    confirmPasswordResetWithCode.mockResolvedValue();
  });

  it("validates missing fields", async () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?oobCode=abc"]}>
        <ResetPassword />
      </MemoryRouter>
    );

    // Wait for verification to complete
    await waitFor(() => {
      expect(screen.queryByText(/verifying your reset link/i)).not.toBeInTheDocument();
    });

    // Now try to submit without filling fields
    const submitButton = screen.getByRole("button", { name: /update password/i });
    fireEvent.click(submitButton);

    // The error should appear in an Alert component
    await waitFor(() => {
      expect(
        screen.getByText(/Please fill in both password fields/i)
      ).toBeInTheDocument();
    });
  });

  it("submits new password", async () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?oobCode=abc"]}>
        <ResetPassword />
      </MemoryRouter>
    );

    // Wait for verification to complete
    await waitFor(() => {
      expect(screen.queryByText(/verifying your reset link/i)).not.toBeInTheDocument();
    });

    // Fill in the password fields
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "Password1!" },
    });

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /update password/i });
    fireEvent.click(submitButton);

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText(/password reset complete/i)).toBeInTheDocument();
    });

    expect(confirmPasswordResetWithCode).toHaveBeenCalledWith("abc", "Password1!");
  });
}, 20000);
