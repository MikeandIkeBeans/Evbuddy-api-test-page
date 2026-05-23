import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "../App";

describe("App", () => {
  it("renders the root application shell", async () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();

    // Current dashboard shell always renders at least one tab button.
    const tabButtons = await screen.findAllByRole("button");
    expect(tabButtons.length).toBeGreaterThan(0);
  });

  it("allows basic tab interaction without crashing", async () => {
    render(<App />);

    const buttons = await screen.findAllByRole("button");
    await userEvent.click(buttons[0]);
    expect(buttons[0]).toBeInTheDocument();
  });
});