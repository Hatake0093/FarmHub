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

export interface CategoryInput {
  name: string;
  description: string | null;
}

export const categoriesApi = {
  list: () => apiRequest<Category[]>("/categories"),
  create: (input: CategoryInput) =>
    apiRequest<Category>("/categories", { method: "POST", body: JSON.stringify(input) }),
  update: (id: number, input: CategoryInput) =>
    apiRequest<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: number) => apiRequest<void>(`/categories/${id}`, { method: "DELETE" }),
};

export const versionsApi = {
  list: () => apiRequest<MinecraftVersion[]>("/minecraft-versions"),
  create: (name: string) =>
    apiRequest<MinecraftVersion>("/minecraft-versions", { method: "POST", body: JSON.stringify({ name }) }),
  update: (id: number, name: string) =>
    apiRequest<MinecraftVersion>(`/minecraft-versions/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  remove: (id: number) => apiRequest<void>(`/minecraft-versions/${id}`, { method: "DELETE" }),
};
