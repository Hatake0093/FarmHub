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

  it("marca los campos inválidos, los enlaza con su error y enfoca el primero", async () => {
    mockApi({
      "/api/categories": [{ id: 1, name: "Recursos", description: null }],
      "/api/minecraft-versions": [],
    });
    renderNewFarm();

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const name = await screen.findByLabelText(/Nombre/);
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(name.getAttribute("aria-describedby")).toBe("name-error");
    expect(document.activeElement).toBe(name);
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
      widthX: null,
      heightY: null,
      depthZ: null,
      operatingConditions: null,
    });
  });

  it("envía las dimensiones como números y rechaza valores no enteros", async () => {
    const fetchMock = mockApi({
      "/api/categories": [{ id: 1, name: "Recursos", description: null }],
      "/api/minecraft-versions": [],
      "/api/farms": () => ({ body: { id: 9 } }),
    });
    renderNewFarm();

    await screen.findByRole("option", { name: "Recursos" });
    await userEvent.type(screen.getByLabelText(/Nombre/), "Con medidas");
    await userEvent.selectOptions(screen.getByLabelText(/Categoría/), "1");
    await userEvent.type(screen.getByLabelText(/Ancho/), "10.5");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Debe ser un número entero entre 1 y 10000.")).toBeTruthy();

    await userEvent.clear(screen.getByLabelText(/Ancho/));
    await userEvent.type(screen.getByLabelText(/Ancho/), "10");
    await userEvent.type(screen.getByLabelText(/Alto/), "5");
    await userEvent.type(screen.getByLabelText(/Profundidad/), "8");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST" && call[0] === "/api/farms");
      expect(post).toBeTruthy();
    });
    const post = fetchMock.mock.calls.find((call) => call[0] === "/api/farms" && (call[1] as RequestInit | undefined)?.method === "POST");
    const body = JSON.parse((post![1] as RequestInit).body as string);
    expect([body.widthX, body.heightY, body.depthZ]).toEqual([10, 5, 8]);
  });
});
