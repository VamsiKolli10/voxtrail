import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import VerifyEmail from "../VerifyEmail";
import { handleEmailVerification } from "../../../services/auth";

vi.mock("../../../services/auth", () => ({ handleEmailVerification: vi.fn() }));
vi.mock("../../../contexts/AppearanceContext.jsx", () => ({ useAppearance: () => ({ mode: "light", toggleMode: vi.fn() }) }));

it("submits a verification code once under StrictMode and shows success", async () => {
  handleEmailVerification.mockResolvedValue(true);
  render(<StrictMode><MemoryRouter initialEntries={["/verify-email?mode=verifyEmail&oobCode=abc"]}>
    <VerifyEmail />
  </MemoryRouter></StrictMode>);
  expect(await screen.findByText(/Email verified! You can now sign in/i)).toBeInTheDocument();
  expect(handleEmailVerification).toHaveBeenCalledTimes(1);
});
