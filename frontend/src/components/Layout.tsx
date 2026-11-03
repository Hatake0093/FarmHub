import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { to: "/farms", label: "Biblioteca" },
  { to: "/structures", label: "Esquemáticos" },
  { to: "/blocks", label: "Bloques" },
  { to: "/items", label: "Items" },
  { to: "/catalogs", label: "Catálogos" },
];

export function Layout() {
  // El editor de esquemáticos usa todo el ancho de la pantalla; el resto de páginas, un contenedor centrado.
  const location = useLocation();
  const wide = location.pathname.startsWith("/structures/");
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <header className="app-header">
        <Link to="/farms" className="brand">
          Minecraft FarmHub
        </Link>
        <nav className="app-nav" aria-label="Principal">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-link">
              {item.label}
            </NavLink>
          ))}
          <Link to="/farms/new" className="button button-primary">
            Nueva granja
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main id="contenido" tabIndex={-1} className={wide ? "container container-wide" : "container"}>
        <Outlet />
      </main>
    </>
  );
}
