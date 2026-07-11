import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Enviar</Button>);

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Enviar
      </Button>
    );

    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
