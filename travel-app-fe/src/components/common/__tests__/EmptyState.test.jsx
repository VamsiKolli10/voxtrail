import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState.jsx";

describe("EmptyState", () => {
  it("announces itself and renders title, description and action", () => {
    render(
      <EmptyState
        title="No stays found"
        description="Try another destination."
        action={<button>Reset</button>}
      />
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "No stays found" })).toBeInTheDocument();
    expect(screen.getByText("Try another destination.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("lets callers pick the heading level", () => {
    render(<EmptyState title="Stay not found" titleComponent="h1" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Stay not found");
  });
});
