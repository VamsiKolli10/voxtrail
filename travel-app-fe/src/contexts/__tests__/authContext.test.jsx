import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../AuthContext.jsx";
import { auth } from "../../firebase";
import {
  onAuthStateChanged,
  onIdTokenChanged,
} from "firebase/auth";

const firebaseMocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  onIdTokenChanged: vi.fn(),
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

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = null;
    onAuthStateChanged.mockImplementation((authArg, cb) => {
      cb(null);
      return () => {};
    });
    onIdTokenChanged.mockImplementation(() => {
      return () => {};
    });
  });

  it("provides auth state", async () => {
    const wrapper = ({ children }) => (
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
