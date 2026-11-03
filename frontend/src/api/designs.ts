import { apiRequest } from "./client";
import type { Author, DesignFile, DesignInput } from "./types";

export interface DesignUpdateInput {
  name: string;
  description: string | null;
  authorId: number | null;
}

export const designsApi = {
  create: (input: DesignInput) =>
    apiRequest<{ id: number }>("/designs", { method: "POST", body: JSON.stringify(input) }),

  update: (id: number, input: DesignUpdateInput) =>
    apiRequest<unknown>(`/designs/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  remove: (id: number) => apiRequest<void>(`/designs/${id}`, { method: "DELETE" }),

  uploadFile: (designId: number, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<DesignFile>(`/designs/${designId}/files`, { method: "POST", body });
  },

  removeFile: (fileId: number) => apiRequest<void>(`/design-files/${fileId}`, { method: "DELETE" }),

  downloadUrl: (fileId: number) => `/api/design-files/${fileId}/download`,
};

export const authorsApi = {
  list: () => apiRequest<Author[]>("/authors"),
  create: (name: string) =>
    apiRequest<Author>("/authors", { method: "POST", body: JSON.stringify({ name, url: null }) }),
};
