import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PageContainer from "../PageContainer.jsx";

describe("PageContainer", () => {
  it("renders the title as the page's single h1, plus meta content", () => {
    render(
      <PageContainer title="Find Accommodations" meta={<span>3 stays</span>}>
        body
      </PageContainer>
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("3 stays")).toBeInTheDocument();
  });

  it("fullBleed keeps overflow visible so sticky sidebars work", () => {
    const { container } = render(
      <PageContainer variant="fullBleed" title="Explore">
        body
      </PageContainer>
    );
    expect(getComputedStyle(container.firstChild).overflow).toBe("visible");
  });

  it("default variant clips its decorative background", () => {
    const { container } = render(<PageContainer title="Home">body</PageContainer>);
    expect(getComputedStyle(container.firstChild).overflow).toBe("hidden");
  });
});
