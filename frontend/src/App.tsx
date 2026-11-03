import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { FarmDetailPage } from "./pages/FarmDetailPage";
import { FarmFormPage } from "./pages/FarmFormPage";
import { FarmListPage } from "./pages/FarmListPage";
import { CatalogsPage } from "./pages/CatalogsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/farms" replace />} />
          <Route path="farms" element={<FarmListPage />} />
          <Route path="farms/new" element={<FarmFormPage />} />
          <Route path="farms/:id" element={<FarmDetailPage />} />
          <Route path="farms/:id/edit" element={<FarmFormPage />} />
          <Route path="catalogs" element={<CatalogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
