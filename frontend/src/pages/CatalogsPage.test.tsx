import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogsPage } from "./CatalogsPage";
import { mockApi } from "../test/fetchMock";

describe("CatalogsPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("muestra el motivo cuando el servidor impide borrar una categoría en uso", async () => {
    const fetchMock = mockApi({
      "/api/categories": () => ({ body: [{ id: 1, name: "Mobs", description: null }] }),
      "/api/minecraft-versions": [],
      "/api/categories/1": () => ({
        status: 409,
        body: { title: "La categoría tiene 3 granjas. Cámbialas de categoría o bórralas antes." },
      }),
    });
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(
      <MemoryRouter>
        <CatalogsPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Borrar la categoría Mobs" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("3 granjas"));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => c[0] === "/api/categories/1" && (c[1] as RequestInit).method === "DELETE")).toBe(true),
    );
    // La categoría sigue listada porque nada se borró.
    expect(screen.getByText("Mobs")).toBeTruthy();
  });
});
