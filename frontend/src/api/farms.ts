import { apiRequest } from "./client";
import type { Category, Difficulty, FarmDetail, FarmInput, FarmSummary, MinecraftVersion, Paged } from "./types";

export interface FarmListQuery {
  q?: string;
  categoryId?: number;
  difficulty?: Difficulty;
  tag?: string;
  version?: string;
  page?: number;
  pageSize?: number;
}

function toQueryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const farmsApi = {
  list: (query: FarmListQuery) => apiRequest<Paged<FarmSummary>>(`/farms${toQueryString(query)}`),
  get: (id: number) => apiRequest<FarmDetail>(`/farms/${id}`),
  create: (input: FarmInput) =>
    apiRequest<FarmDetail>("/farms", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: FarmInput) =>
    apiRequest<FarmDetail>(`/farms/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => apiRequest<void>(`/farms/${id}`, { method: "DELETE" }),
};

export const categoriesApi = {
  list: () => apiRequest<Category[]>("/categories"),
};

export const versionsApi = {
  list: () => apiRequest<MinecraftVersion[]>("/minecraft-versions"),
};
