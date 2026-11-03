import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FarmDetailPage } from "./pages/FarmDetailPage";
import { FarmFormPage } from "./pages/FarmFormPage";
import { FarmListPage } from "./pages/FarmListPage";
import { CatalogsPage } from "./pages/CatalogsPage";
import { StructurePreviewPage } from "./pages/StructurePreviewPage";
import { StructuresPage } from "./pages/StructuresPage";
import { BlocksPage } from "./pages/BlocksPage";
import { ItemsPage } from "./pages/ItemsPage";
import { useEffect } from "react";
import { blocksApi } from "./api/blocks";
import { setColorOverrides } from "./lib/blockColors";
import { StructureEditorPage } from "./pages/StructureEditorPage";

export default function App() {
  // Carga los colores elegidos al abrir la aplicación, para que todos los visores los usen.
  useEffect(() => {
    blocksApi.list().then(setColorOverrides).catch(() => undefined);
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/farms" replace />} />
          <Route path="farms" element={<FarmListPage />} />
          <Route path="farms/new" element={<FarmFormPage />} />
          <Route path="farms/:id" element={<FarmDetailPage />} />
          <Route path="farms/:id/edit" element={<FarmFormPage />} />
          <Route path="catalogs" element={<CatalogsPage />} />
          <Route path="structures" element={<StructuresPage />} />
          <Route path="structures/preview" element={<StructurePreviewPage />} />
          <Route path="blocks" element={<BlocksPage />} />
          <Route path="items" element={<ItemsPage />} />
          <Route path="structures/:id" element={<StructureEditorPage />} />
        </Route>
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
