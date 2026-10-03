import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../AuthContext.jsx";
import { signOut } from "firebase/auth";
import { queryClient } from "../../services/queryClient";

const state = vi.hoisted(() => ({ user: null }));
vi.mock("react-firebase-hooks/auth", () => ({ useAuthState: () => [state.user, false, null] }));
vi.mock("../../firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }));
vi.mock("../../services/auth", () => ({ handleEmailVerification: vi.fn() }));

const user = (uid) => ({ uid, emailVerified: true, reload: vi.fn().mockResolvedValue(), getIdToken: vi.fn().mockResolvedValue("token") });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function setup() {
  const seen = { current: null };
  const Probe = () => { seen.current = useAuth(); return <div>app</div>; };
  const view = () => <MemoryRouter><AuthProvider><Probe /></AuthProvider></MemoryRouter>;
  const result = render(view());
  return { auth: seen, update: () => result.rerender(view()) };
}
beforeEach(() => { vi.clearAllMocks(); });
describe("AuthProvider account changes", () => {
  it("ignores an old reload completing after a new account signs in", async () => {
    const oldReload = deferred();
    state.user = user("alice");
    state.user.reload.mockReturnValue(oldReload.promise);
    const { auth, update } = setup();
    state.user = user("bob");
    update();
    await waitFor(() => expect(auth.current.user?.uid).toBe("bob"));
    await act(async () => oldReload.resolve());
    expect(auth.current.user?.uid).toBe("bob");
  });
  it("does not sign out a new account when an old token refresh fails", async () => {
    const oldToken = deferred();
    const alice = user("alice");
    alice.getIdToken.mockReturnValue(oldToken.promise);
    state.user = alice;
    const { auth, update } = setup();
    await waitFor(() => expect(alice.getIdToken).toHaveBeenCalled());
    state.user = user("bob");
    update();
    await waitFor(() => expect(auth.current.user?.uid).toBe("bob"));
    await act(async () => oldToken.reject(new Error("revoked old session")));
    expect(signOut).not.toHaveBeenCalled();
    expect(auth.current.user?.uid).toBe("bob");
  });
  it("clears cached server data when the account signs out (ADR-005)", async () => {
    state.user = user("alice");
    const { auth, update } = setup();
    await waitFor(() => expect(auth.current.user?.uid).toBe("alice"));
    queryClient.setQueryData(["savedPhrases", "list", "alice"], { items: [{ id: "1" }] });

    state.user = null;
    update();
    await waitFor(() => expect(auth.current.user).toBeNull());
    expect(queryClient.getQueryData(["savedPhrases", "list", "alice"])).toBeUndefined();
  });
});
