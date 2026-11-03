import { vi } from "vitest";

type Responder = (init?: RequestInit) => { status?: number; body?: unknown };

/** Simula fetch: responde según la ruta (sin query string). */
export function mockApi(routes: Record<string, Responder | unknown>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.split("?")[0];
    const route = routes[path];
    if (route === undefined) {
      return { ok: false, status: 404, json: async () => ({ title: "No encontrado" }) } as Response;
    }
    const result = typeof route === "function" ? (route as Responder)(init) : { body: route };
    const status = result.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => result.body ?? null,
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
