import { apiRequest } from "./client";
import type { FarmLink, FarmProduction, FarmRelation, LinkInput, ProductionInput } from "./types";

const json = (body: unknown) => JSON.stringify(body);

export const linksApi = {
  add: (farmId: number, input: LinkInput) =>
    apiRequest<FarmLink>(`/farms/${farmId}/links`, { method: "POST", body: json(input) }),
  remove: (linkId: number) => apiRequest<void>(`/farm-links/${linkId}`, { method: "DELETE" }),
};

export const productionsApi = {
  add: (farmId: number, input: ProductionInput) =>
    apiRequest<FarmProduction>(`/farms/${farmId}/productions`, { method: "POST", body: json(input) }),
  update: (productionId: number, input: ProductionInput) =>
    apiRequest<FarmProduction>(`/farm-productions/${productionId}`, { method: "PUT", body: json(input) }),
  remove: (productionId: number) => apiRequest<void>(`/farm-productions/${productionId}`, { method: "DELETE" }),
};

export const dependenciesApi = {
  add: (farmId: number, requiredFarmId: number, note: string | null) =>
    apiRequest<FarmRelation>(`/farms/${farmId}/dependencies`, {
      method: "POST",
      body: json({ requiredFarmId, note }),
    }),
  remove: (dependencyId: number) => apiRequest<void>(`/farm-dependencies/${dependencyId}`, { method: "DELETE" }),
};

export const farmStructuresApi = {
  link: (farmId: number, structureId: number) =>
    apiRequest<void>(`/farms/${farmId}/structures`, { method: "POST", body: json({ structureId }) }),
  unlink: (farmId: number, structureId: number) =>
    apiRequest<void>(`/farms/${farmId}/structures/${structureId}`, { method: "DELETE" }),
};
