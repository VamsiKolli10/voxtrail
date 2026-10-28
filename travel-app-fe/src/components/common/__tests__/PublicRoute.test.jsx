import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PublicRoute from "../PublicRoute";

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" }, loading: false }),
}));

describe("signed-in public routes", () => {
  it.each(["/terms", "/privacy", "/verify-email"])("keeps %s accessible", (path) => {
    render(<MemoryRouter initialEntries={[path]}><Routes>
      <Route element={<PublicRoute />}><Route path={path} element={<div>Public content</div>} /></Route>
      <Route path="/home" element={<div>Dashboard</div>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText("Public content")).toBeInTheDocument();
  });
});
