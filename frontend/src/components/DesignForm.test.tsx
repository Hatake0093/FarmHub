import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignForm } from "./DesignForm";
import { mockApi } from "../test/fetchMock";

function renderForm(onSubmit = vi.fn()) {
  render(
    <DesignForm
      title="Nuevo diseño"
      initial={{ name: "Mi diseño", description: "", authorId: "" }}
      submitLabel="Crear diseño"
      saving={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={() => undefined}
    />,
  );
  return onSubmit;
}

describe("DesignForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("Intro en el campo de nuevo creador añade el creador y no envía el diseño", async () => {
    const fetchMock = mockApi({
      "/api/authors": (init?: RequestInit) =>
        init?.method === "POST" ? { body: { id: 7, name: "Ilmango" } } : { body: [] },
    });
    const onSubmit = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo creador" }));
    await userEvent.type(screen.getByLabelText("Nombre del nuevo creador"), "Ilmango{Enter}");

    expect(await screen.findByRole("option", { name: "Ilmango" })).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === "POST")).toBe(true);
  });

  it("enlaza el error del nombre con el campo", async () => {
    mockApi({ "/api/authors": [] });
    const onSubmit = renderForm();

    await userEvent.clear(screen.getByLabelText(/Nombre \*/));
    await userEvent.click(screen.getByRole("button", { name: "Crear diseño" }));

    const name = screen.getByLabelText(/Nombre \*/);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe("design-name-error");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
