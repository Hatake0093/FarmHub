export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ProblemBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/** Llama a la API del backend. En desarrollo, /api se reenvía con el proxy de Vite. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Solo los cuerpos JSON llevan Content-Type; FormData lo define el navegador con su límite.
  const headers: Record<string, string> = {};
  if (typeof init.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`/api${path}`, { ...init, headers });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ProblemBody | null;
    throw new ApiError(
      response.status,
      body?.title ?? body?.detail ?? `Error ${response.status}`,
      body?.errors ?? {},
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ha ocurrido un error inesperado.";
}
