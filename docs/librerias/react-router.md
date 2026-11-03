# React Router

**Qué es:** la librería de rutas para aplicaciones React. Decide qué pantalla mostrar según la dirección del navegador.

**Versión:** 7.18 (`react-router-dom`).

## Cómo la usamos

- **Rutas** (`src/App.tsx`): `/farms`, `/farms/new`, `/farms/:id`, `/farms/:id/edit`, `/structures`, `/structures/:id`, `/blocks`, `/items`, `/catalogs`. Todas van dentro de `Layout`, que tiene la barra de navegación.
- **Navegación:** `<Link>` para enlaces, `useNavigate()` para ir a otra pantalla después de guardar o importar.
- **Parámetros:** `useParams()` lee `:id`.
- **Parámetros de búsqueda:** `useSearchParams()` guarda los filtros de la biblioteca en la URL, así que se pueden recargar o compartir.
- **Estilo condicional:** `Layout` usa `useLocation()` para dar a `/structures/:id` un contenedor más ancho.

## Cosas que hay que saber

- **Componentes fuera del router:** las pruebas de componentes que usan `Link` o `useNavigate` deben envolverse en `MemoryRouter`. Si no, fallan con un error de contexto.
- **Rutas con `BrowserRouter`:** la aplicación usa `BrowserRouter`, así que el servidor de desarrollo de Vite debe servir `index.html` para cualquier ruta (ya lo hace por defecto).
