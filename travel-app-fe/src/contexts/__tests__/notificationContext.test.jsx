import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationProvider, useNotify } from "../NotificationContext.jsx";

function Trigger() {
  const { notify } = useNotify();
  return <button onClick={() => notify("Logged out successfully", "success")}>go</button>;
}

describe("NotificationProvider", () => {
  it("shows a toast requested by any descendant", () => {
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>
    );
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByText("Logged out successfully")).toBeInTheDocument();
  });
});
