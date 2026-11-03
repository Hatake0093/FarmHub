export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface MinecraftVersion {
  id: number;
  name: string;
}

export interface FarmSummary {
  id: number;
  name: string;
  difficulty: Difficulty;
  categoryId: number;
  categoryName: string;
  minecraftVersions: string[];
  tags: string[];
}

export type DesignFileKind = "Litematic" | "Image" | "Pdf";

export interface DesignFile {
  id: number;
  kind: DesignFileKind;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
}

export interface FarmDesignSummary {
  id: number;
  name: string;
  description: string | null;
  authorId: number | null;
  authorName: string | null;
  files: DesignFile[];
}

export interface Author {
  id: number;
  name: string;
  url: string | null;
}

export interface DesignInput {
  farmId: number;
  name: string;
  description: string | null;
  authorId: number | null;
}

export interface FarmDetail {
  id: number;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  category: Category;
  minecraftVersions: MinecraftVersion[];
  tags: string[];
  designs: FarmDesignSummary[];
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface FarmInput {
  name: string;
  description: string | null;
  difficulty: Difficulty;
  categoryId: number;
  minecraftVersionIds: number[];
  tags: string[];
}
