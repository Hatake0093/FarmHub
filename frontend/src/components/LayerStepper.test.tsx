import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LayerStepper } from "./LayerStepper";

describe("LayerStepper", () => {
  afterEach(cleanup);

  it("sube y baja una capa y no sale de los límites", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<LayerStepper value={1} max={3} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Subir a la capa superior" }));
    expect(onChange).toHaveBeenLastCalledWith(2);

    await userEvent.click(screen.getByRole("button", { name: "Bajar a la capa inferior" }));
    expect(onChange).toHaveBeenLastCalledWith(0);

    rerender(<LayerStepper value={3} max={3} onChange={onChange} />);
    expect((screen.getByRole("button", { name: "Subir a la capa superior" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
