import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignSection } from "./DesignSection";
import { mockApi } from "../test/fetchMock";
import type { FarmDesignSummary } from "../api/types";

const design: FarmDesignSummary = {
  id: 5,
  name: "Diseño principal",
  description: null,
  authorId: null,
  authorName: null,
  files: [
    {
      id: 9,
      kind: "Litematic",
      originalFileName: "principal.litematic",
      contentType: "application/octet-stream",
      sizeBytes: 2048,
      sha256: "abc",
    },
  ],
};

function postCalls(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "POST");
}

describe("DesignSection", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lista los archivos del diseño con enlace de descarga", () => {
    mockApi({ "/api/authors": [] });
    render(<DesignSection farmId={1} designs={[design]} onChanged={() => undefined} />);

    const link = screen.getByRole("link", { name: "principal.litematic" });
    expect(link.getAttribute("href")).toBe("/api/design-files/9/download");
    expect(screen.getByText(/Litematica · 2.0 KB/)).toBeTruthy();
  });

  it("no sube un archivo con extensión no admitida", async () => {
    const fetchMock = mockApi({ "/api/authors": [] });
    render(<DesignSection farmId={1} designs={[design]} onChanged={() => undefined} />);

    const input = screen.getByLabelText(/Subir archivo/);
    const file = new File(["x"], "virus.exe", { type: "application/octet-stream" });
    await userEvent.upload(input, file, { applyAccept: false });

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("no admitido"));
    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  it("sube el archivo como multipart y avisa al terminar", async () => {
    const fetchMock = mockApi({
      "/api/authors": [],
      "/api/designs/5/files": () => ({
        status: 201,
        body: { id: 10, kind: "Litematic", originalFileName: "nuevo.litematic" },
      }),
    });
    const onChanged = vi.fn();
    render(<DesignSection farmId={1} designs={[design]} onChanged={onChanged} />);

    const file = new File(["contenido"], "nuevo.litematic");
    await userEvent.upload(screen.getByLabelText(/Subir archivo/), file);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    const [url, init] = postCalls(fetchMock)[0] as [string, RequestInit];
    expect(url).toBe("/api/designs/5/files");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(init.headers).toEqual({});
  });

  it("borra el diseño solo si el usuario confirma", async () => {
    const fetchMock = mockApi({
      "/api/authors": [],
      "/api/designs/5": () => ({ status: 204 }),
    });
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    const onChanged = vi.fn();
    render(<DesignSection farmId={1} designs={[design]} onChanged={onChanged} />);

    await userEvent.click(screen.getByRole("button", { name: "Borrar diseño" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === "DELETE")).toHaveLength(0);

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Borrar diseño" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls.some((c) => c[0] === "/api/designs/5" && (c[1] as RequestInit).method === "DELETE")).toBe(true);
  });
});
