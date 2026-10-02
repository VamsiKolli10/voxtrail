import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import authReducer from "../../store/slices/authSlice";
import { AuthProvider } from "../AuthContext.jsx";
import { signOut } from "firebase/auth";

const state = vi.hoisted(() => ({ user: null }));
vi.mock("react-firebase-hooks/auth", () => ({ useAuthState: () => [state.user, false, null] }));
vi.mock("../../firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("../../services/auth", () => ({ handleEmailVerification: vi.fn() }));

const user = (uid) => ({ uid, emailVerified: true, reload: vi.fn().mockResolvedValue(), getIdToken: vi.fn().mockResolvedValue("token") });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function setup() {
  const store = configureStore({ reducer: { auth: authReducer } });
  const view = () => <MemoryRouter><Provider store={store}><AuthProvider><div>app</div></AuthProvider></Provider></MemoryRouter>;
  const result = render(view());
  return { store, update: () => result.rerender(view()) };
}
beforeEach(() => { vi.clearAllMocks(); });
describe("AuthProvider account changes", () => {
  it("ignores an old reload completing after a new account signs in", async () => {
    const oldReload = deferred();
    state.user = user("alice");
    state.user.reload.mockReturnValue(oldReload.promise);
    const { store, update } = setup();
    state.user = user("bob");
    update();
    await waitFor(() => expect(store.getState().auth.user?.uid).toBe("bob"));
    await act(async () => oldReload.resolve());
    expect(store.getState().auth.user?.uid).toBe("bob");
  });
  it("does not sign out a new account when an old token refresh fails", async () => {
    const oldToken = deferred();
    const alice = user("alice");
    alice.getIdToken.mockReturnValue(oldToken.promise);
    state.user = alice;
    const { store, update } = setup();
    await waitFor(() => expect(alice.getIdToken).toHaveBeenCalled());
    state.user = user("bob");
    update();
    await waitFor(() => expect(store.getState().auth.user?.uid).toBe("bob"));
    await act(async () => oldToken.reject(new Error("revoked old session")));
    expect(signOut).not.toHaveBeenCalled();
    expect(store.getState().auth.user?.uid).toBe("bob");
  });
});
