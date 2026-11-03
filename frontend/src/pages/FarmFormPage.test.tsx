import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FarmFormPage } from "./FarmFormPage";
import { mockApi } from "../test/fetchMock";

function renderNewFarm() {
  return render(
    <MemoryRouter initialEntries={["/farms/new"]}>
      <Routes>
        <Route path="/farms/new" element={<FarmFormPage />} />
        <Route path="/farms/:id" element={<p>Ficha</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FarmFormPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("no envía el formulario si falta el nombre ni la categoría", async () => {
    const fetchMock = mockApi({
      "/api/categories": [{ id: 1, name: "Recursos", description: null }],
      "/api/minecraft-versions": [],
    });
    renderNewFarm();

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El nombre es obligatorio.")).toBeTruthy();
    expect(screen.getByText("Selecciona una categoría.")).toBeTruthy();
    const posted = fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    expect(posted).toHaveLength(0);
  });

  it("envía la granja con etiquetas normalizadas separadas por comas", async () => {
    const created = { id: 7, name: "Granja nueva" };
    const fetchMock = mockApi({
      "/api/categories": [{ id: 1, name: "Recursos", description: null }],
      "/api/minecraft-versions": [{ id: 3, name: "1.21.4" }],
      "/api/farms": () => ({ body: created }),
    });
    renderNewFarm();

    await screen.findByRole("option", { name: "Recursos" });
    await userEvent.type(screen.getByLabelText(/Nombre/), "Granja nueva");
    await userEvent.selectOptions(screen.getByLabelText(/Categoría/), "1");
    await userEvent.click(screen.getByRole("checkbox", { name: "1.21.4" }));
    await userEvent.type(screen.getByLabelText(/Etiquetas/), "mobs, xp, mobs");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByText("Ficha")).toBeTruthy());
    const post = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({
      name: "Granja nueva",
      description: null,
      difficulty: "Easy",
      categoryId: 1,
      minecraftVersionIds: [3],
      tags: ["mobs", "xp"],
    });
  });
});
