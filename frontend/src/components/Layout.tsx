import { Link, Outlet, useLocation } from "react-router-dom";

export function Layout() {
  // El editor de esquemáticos usa todo el ancho de la pantalla; el resto de páginas, un contenedor centrado.
  const location = useLocation();
  const wide = location.pathname.startsWith("/structures/");
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
      <main className={wide ? "container container-wide" : "container"}>
        <Outlet />
      </main>
    </>
  );
}
