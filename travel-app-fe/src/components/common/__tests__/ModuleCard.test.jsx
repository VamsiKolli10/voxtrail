import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ModuleCard } from "../ModuleCard";

it("does not expose a decorative card as a dead button", () => {
  render(<ModuleCard interactive><button>Explore</button></ModuleCard>);
  expect(screen.getAllByRole("button")).toHaveLength(1);
});

it("activates keyboard actions once and ignores nested control keys", () => {
  const action = vi.fn();
  render(<ModuleCard interactive onClick={action}>Card<button>Child</button></ModuleCard>);
  fireEvent.keyDown(screen.getByRole("button", { name: "Card Child" }), { key: "Enter" });
  expect(action).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole("button", { name: "Child" }), { key: "Enter" });
  expect(action).toHaveBeenCalledTimes(1);
});
