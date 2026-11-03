import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FarmListPage } from "./FarmListPage";
import { mockApi } from "../test/fetchMock";

function renderList(path = "/farms") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/farms" element={<FarmListPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FarmListPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("muestra las granjas devueltas por la API", async () => {
    mockApi({
      "/api/farms": {
        items: [
          {
            id: 1,
            name: "Granja de caña",
            difficulty: "Medium",
            categoryId: 1,
            categoryName: "Recursos",
            minecraftVersions: ["1.21.4"],
            tags: ["caña"],
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      },
      "/api/categories": [{ id: 1, name: "Recursos", description: null }],
      "/api/minecraft-versions": [{ id: 1, name: "1.21.4" }],
    });

    renderList();

    expect(await screen.findByRole("link", { name: "Granja de caña" })).toBeTruthy();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Media")).toBeTruthy();
    expect(screen.getByText("Página 1 de 1 (1 granjas)")).toBeTruthy();
  });

  it("envía los filtros de la URL a la API", async () => {
    const fetchMock = mockApi({
      "/api/farms": { items: [], page: 1, pageSize: 20, totalCount: 0 },
      "/api/categories": [],
      "/api/minecraft-versions": [],
    });

    renderList("/farms?tag=mobs&difficulty=Hard");

    expect(await screen.findByText("No hay granjas que coincidan con los filtros.")).toBeTruthy();
    const requested = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(requested.some((url) => url.includes("tag=mobs") && url.includes("difficulty=Hard"))).toBe(true);
  });

  it("muestra el error de la API", async () => {
    mockApi({
      "/api/farms": () => ({ status: 500, body: { title: "Fallo del servidor" } }),
      "/api/categories": [],
      "/api/minecraft-versions": [],
    });

    renderList();

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Fallo del servidor");
  });
});
