import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import authReducer from "../../store/slices/authSlice";
import { AuthProvider } from "../AuthContext.jsx";
import { handleEmailVerification } from "../../services/auth";

const firebaseMocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null);
    return () => {};
  }),
  onIdTokenChanged: vi.fn(() => () => {}),
}));

vi.mock("../../firebase", () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: firebaseMocks.onAuthStateChanged,
    onIdTokenChanged: firebaseMocks.onIdTokenChanged,
  },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: firebaseMocks.onAuthStateChanged,
  onIdTokenChanged: firebaseMocks.onIdTokenChanged,
  isSignInWithEmailLink: vi.fn(() => false),
  signOut: vi.fn(),
}));

vi.mock("../../services/auth", () => ({
  handleEmailVerification: vi.fn(),
}));

const renderProvider = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Provider store={configureStore({ reducer: { auth: authReducer } })}>
        <AuthProvider>
          <div>app</div>
        </AuthProvider>
      </Provider>
    </MemoryRouter>
  );

describe("AuthProvider email verification link", () => {
  const originalPath = window.location.pathname + window.location.search;

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/?mode=verifyEmail&oobCode=abc123");
  });

  afterEach(() => {
    window.history.pushState({}, "", originalPath);
  });

  it("verifies the code and strips the action params from the URL", async () => {
    handleEmailVerification.mockResolvedValue(true);
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    renderProvider();

    await waitFor(() => expect(handleEmailVerification).toHaveBeenCalledWith("abc123"));
    await waitFor(() => expect(replaceSpy).toHaveBeenCalled());
    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("");
    replaceSpy.mockRestore();
  });
  it("leaves dedicated verification pages to handle their own code", async () => {
    renderProvider("/verify-email?mode=verifyEmail&oobCode=abc123");
    await waitFor(() => expect(document.body).toHaveTextContent("app"));
    expect(handleEmailVerification).not.toHaveBeenCalled();
  });

  it("does not repeatedly submit an expired legacy code", async () => {
    handleEmailVerification.mockResolvedValue(false);
    renderProvider();
    await waitFor(() => expect(handleEmailVerification).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.body).toHaveTextContent("app"));
    expect(handleEmailVerification).toHaveBeenCalledTimes(1);
  });

});
