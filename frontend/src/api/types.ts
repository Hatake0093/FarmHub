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

export type LinkKind = "Tutorial" | "Reference";
export type ProductionUnit = "Items" | "Stacks";

export interface FarmLink {
  id: number;
  title: string;
  url: string;
  kind: LinkKind;
}

export interface FarmProduction {
  id: number;
  resourceName: string;
  amountPerHour: number;
  unit: ProductionUnit;
  requiresAfk: boolean;
  measurementConditions: string | null;
  source: string | null;
  measuredInVersionId: number | null;
  measuredInVersion: string | null;
}

export interface FarmRelation {
  dependencyId: number;
  farmId: number;
  farmName: string;
  note: string | null;
}

export interface FarmDetail {
  id: number;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  category: Category;
  minecraftVersions: MinecraftVersion[];
  tags: string[];
  widthX: number | null;
  heightY: number | null;
  depthZ: number | null;
  operatingConditions: string | null;
  designs: FarmDesignSummary[];
  links: FarmLink[];
  productions: FarmProduction[];
  requires: FarmRelation[];
  requiredBy: FarmRelation[];
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
  widthX: number | null;
  heightY: number | null;
  depthZ: number | null;
  operatingConditions: string | null;
}

export interface LinkInput {
  title: string;
  url: string;
  kind: LinkKind;
}

export interface ProductionInput {
  resourceName: string;
  amountPerHour: number;
  unit: ProductionUnit;
  requiresAfk: boolean;
  measurementConditions: string | null;
  source: string | null;
  measuredInVersionId: number | null;
}
