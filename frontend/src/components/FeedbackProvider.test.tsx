import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedbackProvider } from "./FeedbackProvider";
import { FarmSheetSections } from "./FarmSheetSections";
import { useFeedback } from "../lib/feedback";
import { mockApi } from "../test/fetchMock";
import type { FarmDetail } from "../api/types";

const farm: FarmDetail = {
  id: 2,
  name: "Granja",
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
  links: [{ id: 9, title: "Vídeo", url: "https://example.com", kind: "Tutorial" }],
  structures: [],
  productions: [],
  requires: [],
  requiredBy: [],
};

function Asker({ onAnswer }: { onAnswer: (accepted: boolean) => void }) {
  const { confirm } = useFeedback();
  return (
    <button type="button" onClick={async () => onAnswer(await confirm({ message: "¿Seguro?", confirmLabel: "Sí, borrar", danger: true }))}>
      Preguntar
    </button>
  );
}

function deletes(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === "DELETE");
}

describe("FeedbackProvider", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("confirm devuelve true al aceptar y false al cancelar", async () => {
    const answer = vi.fn();
    render(
      <FeedbackProvider>
        <Asker onAnswer={answer} />
      </FeedbackProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Preguntar" }));
    expect(screen.getByText("¿Seguro?")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(answer).toHaveBeenLastCalledWith(false);

    await userEvent.click(screen.getByRole("button", { name: "Preguntar" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, borrar" }));
    expect(answer).toHaveBeenLastCalledWith(true);
    expect(screen.queryByText("¿Seguro?")).toBeNull();
  });

  function renderSheet() {
    const fetchMock = mockApi({
      "/api/minecraft-versions": [],
      "/api/structures": [],
      "/api/farms": { items: [], page: 1, pageSize: 100, totalCount: 0 },
      "/api/farm-links/9": () => ({ status: 204 }),
      "/api/links/9": () => ({ status: 204 }),
    });
    const onChanged = vi.fn();
    render(
      <MemoryRouter>
        <FeedbackProvider>
          <FarmSheetSections farm={farm} onChanged={onChanged} />
        </FeedbackProvider>
      </MemoryRouter>,
    );
    return { fetchMock, onChanged };
  }

  it("quitar un enlace lo oculta y permite deshacer sin borrar nada", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchMock, onChanged } = renderSheet();

    await userEvent.click(screen.getByRole("button", { name: /Quitar el enlace Vídeo/ }));
    expect(screen.queryByRole("link", { name: "Vídeo" })).toBeNull();
    expect(screen.getByText(/Eliminado: el enlace "Vídeo"/)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByRole("link", { name: "Vídeo" })).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(deletes(fetchMock)).toHaveLength(0);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("si no se deshace, el borrado real se hace al caducar el aviso", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetchMock, onChanged } = renderSheet();

    await userEvent.click(screen.getByRole("button", { name: /Quitar el enlace Vídeo/ }));
    expect(deletes(fetchMock)).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(deletes(fetchMock)).toHaveLength(1);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
