import { apiRequest } from "./client";
import type { Author, DesignFile, DesignInput } from "./types";

export const designsApi = {
  create: (input: DesignInput) =>
    apiRequest<{ id: number }>("/designs", { method: "POST", body: JSON.stringify(input) }),

  uploadFile: (designId: number, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<DesignFile>(`/designs/${designId}/files`, { method: "POST", body });
  },

  downloadUrl: (fileId: number) => `/api/design-files/${fileId}/download`,
};

export const authorsApi = {
  list: () => apiRequest<Author[]>("/authors"),
};
