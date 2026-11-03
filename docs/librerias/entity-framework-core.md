# Entity Framework Core

**Qué es:** el ORM de .NET. Traduce entre objetos C# y tablas de base de datos, y gestiona las migraciones (cambios del esquema).

**Para qué lo usamos:** guardar granjas, categorías, diseños, archivos, esquemáticos, bloques, items y sus relaciones.

## Piezas que usamos

- **`FarmHubDbContext`** (`Infrastructure/Persistence/`): la conexión lógica a la base. Cada `DbSet<T>` es una tabla. `OnModelCreating` define longitudes máximas, índices, claves únicas y el comportamiento al borrar (`Restrict`, `Cascade`, `SetNull`).
- **Relaciones muchos a muchos:** granjas con versiones y etiquetas, granjas con esquemáticos. EF crea la tabla de unión sin que tengamos que escribirla.
- **Consultas:** `AsNoTracking()` en lecturas (más rápido, no sigue los cambios), `Include` y `ThenInclude` para cargar relaciones, `AsSplitQuery()` cuando hay varias colecciones grandes.
- **Migraciones:** cada cambio de modelo genera una migración en `Persistence/Migrations/`. Al arrancar, `Program.cs` ejecuta `Database.MigrateAsync()`, así que la base siempre queda al día.

## Comandos útiles

Desde `backend/`, con la herramienta `dotnet-ef` instalada:

```bash
dotnet ef migrations add NombreDelCambio --project src/FarmHub.Infrastructure --startup-project src/FarmHub.Api --output-dir Persistence/Migrations
dotnet ef database update --project src/FarmHub.Infrastructure --startup-project src/FarmHub.Api
```

Normalmente no hace falta el segundo comando, porque el arranque aplica las migraciones solo.

## Cosas que hay que tener en cuenta

- **Arrays de bytes y cambios:** EF no detecta cambios hechos *dentro* de un `byte[]` ya asignado. Por eso al guardar celdas del esquemático trabajamos sobre una copia y asignamos un array nuevo (ver `SavedStructuresController`).
- **Borrar en cascada:** borrar una granja borra sus diseños y archivos; borrar un esquemático solo quita sus vínculos con granjas.
- **Claves y longitudes:** cualquier texto tiene longitud máxima en la base. Si se supera, la base rechaza el guardado.

<a id="npgsql"></a>
## Npgsql (proveedor de PostgreSQL)

**Qué es:** el paquete que permite a EF Core hablar con PostgreSQL. Se instala como `Npgsql.EntityFrameworkCore.PostgreSQL`.

**Cómo se usa:** en `Program.cs`, `options.UseNpgsql(connectionString)`. La cadena de conexión está en `appsettings.Development.json`, con la clave `ConnectionStrings:FarmHub`.

**Qué conviene saber:** PostgreSQL debe estar en marcha antes de arrancar el backend. Si no lo está, el error aparece al primer acceso a datos, no al arrancar.
