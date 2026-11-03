# ASP.NET Core

**Qué es:** el framework web de .NET. Recibe las peticiones HTTP, las envía al controlador adecuado y devuelve la respuesta en JSON.

**Para qué lo usamos:** toda la API REST de FarmHub (`/api/...`). También el arranque, la inyección de dependencias y la serialización.

## Piezas que usamos

- **Arranque (`Program.cs`):** crea la aplicación, registra servicios y ejecuta las migraciones de la base de datos antes de aceptar peticiones.
- **Controladores (`Controllers/`):** cada clase agrupa rutas de una parte de la aplicación (`FarmsController`, `BlocksController`, `SavedStructuresController`...). Los atributos `[HttpGet]`, `[HttpPut("{id:int}")]`, etc. definen la ruta y el verbo.
- **Inyección de dependencias:** los controladores reciben lo que necesitan en el constructor (`FarmHubDbContext`, `IFileStorage`). Lo registramos con `AddDbContext` y `AddSingleton`.
- **Validación manual:** usamos `ValidationProblem(...)` para devolver errores 400 con un mensaje claro, y `Conflict(...)` para los 409 (por ejemplo, un nombre repetido o un elemento en uso).
- **Subida de archivos:** `IFormFile` con `[Consumes("multipart/form-data")]` y `[RequestSizeLimit]`.
- **Serialización de enumeraciones:** `JsonStringEnumConverter` hace que `Difficulty` viaje como `"Easy"` y no como un número.

## Decisiones

- **Respuestas de error:** los códigos son los habituales: 400 datos no válidos, 404 no encontrado, 409 conflicto (por ejemplo, borrar algo en uso o confirmar un cambio que pierde bloques), 415 formato de archivo no admitido.
- **OpenAPI:** `AddOpenApi` y `MapOpenApi` sirven la especificación en desarrollo, para explorar la API.
- **Puerto:** el perfil `http` de `Properties/launchSettings.json` usa el puerto 5167. El proxy de Vite apunta a ese puerto (ver [vite.md](vite.md)).

## Cómo añadir una ruta

1. Crea o amplía un controlador en `Controllers/`.
2. Usa un contrato (record) de `Contracts/` para la entrada y la salida.
3. Valida, consulta el `DbContext` y devuelve el resultado.
4. Añade una prueba si la regla es importante.
