import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates the label with the input for screen readers", () => {
    render(<TextField label="Usuario" />);
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
  });

  it("marks the input as invalid and announces the error message", () => {
    render(<TextField label="Usuario" errorMessage="Campo requerido" />);

    const input = screen.getByLabelText("Usuario");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Campo requerido");
  });

  it("does not mark the input as invalid when there is no error", () => {
    render(<TextField label="Usuario" />);
    expect(screen.getByLabelText("Usuario")).not.toHaveAttribute("aria-invalid");
  });
});
