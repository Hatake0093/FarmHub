import { Link, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <>
      <header className="app-header">
        <Link to="/farms" className="brand">
          Minecraft FarmHub
        </Link>
        <nav className="app-nav">
          <Link to="/farms">Biblioteca</Link>
          <Link to="/structures">Esquemáticos</Link>
          <Link to="/blocks">Bloques</Link>
          <Link to="/catalogs">Catálogos</Link>
          <Link to="/farms/new" className="button button-primary">
            Nueva granja
          </Link>
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
