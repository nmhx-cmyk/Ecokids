import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

describe("Badge", () => {
  it("renders its text", () => {
    render(<Badge>Mới</Badge>);
    expect(screen.getByText("Mới")).toBeInTheDocument();
  });

  it("applies the default variant classes", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-cream-100");
    expect(badge.className).toContain("text-ink-700");
  });

  it("applies the coral variant classes", () => {
    render(<Badge variant="coral">Coral</Badge>);
    const badge = screen.getByText("Coral");
    expect(badge.className).toContain("bg-coral-50");
    expect(badge.className).toContain("text-coral-600");
  });

  it("applies the mint variant classes", () => {
    render(<Badge variant="mint">Mint</Badge>);
    const badge = screen.getByText("Mint");
    expect(badge.className).toContain("bg-mint-50");
    expect(badge.className).toContain("text-mint-600");
  });

  it("merges custom className with variant classes", () => {
    render(
      <Badge variant="danger" className="custom-class">
        Danger
      </Badge>,
    );
    const badge = screen.getByText("Danger");
    expect(badge.className).toContain("custom-class");
    expect(badge.className).toContain("text-danger");
  });
});
