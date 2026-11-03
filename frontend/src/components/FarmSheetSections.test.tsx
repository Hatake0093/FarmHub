import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FarmSheetSections } from "./FarmSheetSections";
import { mockApi } from "../test/fetchMock";
import type { FarmDetail } from "../api/types";

const farm: FarmDetail = {
  id: 2,
  name: "Granja de prueba",
  description: null,
  difficulty: "Easy",
  category: { id: 1, name: "Recursos", description: null },
  minecraftVersions: [],
  tags: [],
  widthX: null,
  heightY: null,
  depthZ: null,
  operatingConditions: null,
  designs: [],
  links: [],
  structures: [],
  productions: [],
  requires: [],
  requiredBy: [],
};

function postCalls(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "POST");
}

describe("FarmSheetSections", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("no envía una producción con cantidad 0 ni sin recurso", async () => {
    const fetchMock = mockApi({ "/api/minecraft-versions": [], "/api/farms": { items: [], page: 1, pageSize: 100, totalCount: 0 }, "/api/structures": [] });
    render(<MemoryRouter><FarmSheetSections farm={farm} onChanged={() => undefined} /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/Recurso \*/), "Hierro");
    await userEvent.type(screen.getByLabelText(/Cantidad por hora/), "0");
    await userEvent.click(screen.getByRole("button", { name: "Añadir producción" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("mayor que 0"));
    expect(postCalls(fetchMock).filter((c) => String(c[0]).includes("productions"))).toHaveLength(0);
  });

  it("no envía un enlace sin URL", async () => {
    const fetchMock = mockApi({ "/api/minecraft-versions": [], "/api/farms": { items: [], page: 1, pageSize: 100, totalCount: 0 }, "/api/structures": [] });
    render(<MemoryRouter><FarmSheetSections farm={farm} onChanged={() => undefined} /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText("Título del enlace"), "Tutorial");
    await userEvent.click(screen.getByRole("button", { name: "Añadir enlace" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("obligatorios"));
    expect(postCalls(fetchMock).filter((c) => String(c[0]).includes("links"))).toHaveLength(0);
  });
});
