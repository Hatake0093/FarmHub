# Documentación técnica de FarmHub

Esta carpeta explica las librerías que usa FarmHub: para qué sirve cada una, cómo se usa en el proyecto y qué conviene saber antes de tocarla. No explica los lenguajes (C# y TypeScript).

## Mapa de librerías

| Librería | Versión | Dónde se usa | Documento |
|---|---|---|---|
| ASP.NET Core | .NET 10 | API REST, arranque, serialización JSON | [aspnet-core.md](librerias/aspnet-core.md) |
| Entity Framework Core | 10.0.14 | Acceso a datos y migraciones | [entity-framework-core.md](librerias/entity-framework-core.md) |
| Npgsql (proveedor PostgreSQL) | 10.0.3 | Conexión de EF Core con PostgreSQL | [entity-framework-core.md](librerias/entity-framework-core.md#npgsql) |
| fNbt | 2.1.0 | Lectura de NBT (`.litematic`, `.schem`, `.nbt`) | [fnbt.md](librerias/fnbt.md) |
| xUnit y Microsoft.AspNetCore.Mvc.Testing | 2.9.3 / 10.0.14 | Pruebas de backend, incluida la API | [pruebas-backend.md](librerias/pruebas-backend.md) |
| React | 19.1 | Interfaz | [react.md](librerias/react.md) |
| React Router | 7.18 | Rutas de la aplicación | [react-router.md](librerias/react-router.md) |
| Vite | 6.3 | Servidor de desarrollo, proxy de la API y build | [vite.md](librerias/vite.md) |
| Vitest, jsdom y Testing Library | 3.2 / 26.1 / 16.3 | Pruebas de frontend | [pruebas-frontend.md](librerias/pruebas-frontend.md) |
| ESLint y TypeScript | 9.25 / 5.8 | Estilo y comprobación de tipos | [herramientas-frontend.md](librerias/herramientas-frontend.md) |
| Canvas 2D y WebGL 2 | API del navegador | Visores 2D, isométrica, cortes y vista 3D | [graficos.md](librerias/graficos.md) |

## Lo que no se usa

- **Querz.NBT:** descartada, es una biblioteca de Java.
- **Tailwind CSS:** no se ha adoptado; los estilos son CSS propio con variables.
- **Librerías 3D (three.js, etc.):** no se usan. La vista 3D está escrita directamente sobre WebGL 2.
- **minecraft-data:** no es dependencia del proyecto. Se usó solo de forma puntual para investigar, y no está en `package.json`.
- **Playwright:** herramienta de comprobación que uso yo para probar la aplicación en el navegador. No forma parte del proyecto.

## Cómo está organizado el código

- `backend/src/FarmHub.Api`: arranque (`Program.cs`), controladores y contratos de la API.
- `backend/src/FarmHub.Domain`: entidades y reglas puras.
- `backend/src/FarmHub.Infrastructure`: base de datos, lectores de archivos, almacenamiento y catálogos.
- `frontend/src/api`: cliente HTTP tipado.
- `frontend/src/pages` y `frontend/src/components`: pantallas y componentes.
- `frontend/src/lib`: funciones puras (proyección, cortes, edición, historial, WebGL).
