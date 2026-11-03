# Pruebas de backend: xUnit y Microsoft.AspNetCore.Mvc.Testing

## xUnit

**Qué es:** el framework de pruebas que usamos en .NET. Las pruebas son métodos marcados con `[Fact]` (un caso) o `[Theory]` (varios casos con `[InlineData]` o `[MemberData]`).

**Dónde está:** `backend/tests/FarmHub.Tests/`. Son unas 100 pruebas que cubren:

- Los lectores de archivos (con archivos generados en memoria y con los archivos de muestra de `archivos .litematic`).
- Las reglas de dominio: ciclos de dependencias, extensiones admitidas, límites de la rejilla, normalización de etiquetas.
- El almacenamiento local (ida y vuelta, y rechazo de claves no válidas).
- El catálogo de bloques.

**Cómo se ejecutan:**

```bash
cd backend && dotnet test
```

**Convenciones:** `Assert.Equal`, `Assert.True`, `Assert.Throws<T>` y `Assert.Contains`. Una prueba debe comprobar algo concreto (un valor, un error), no solo que no lance excepciones.

## Microsoft.AspNetCore.Mvc.Testing

**Qué es:** permite levantar la API en memoria dentro de las pruebas, sin abrir un puerto. Con `WebApplicationFactory<Program>` y `CreateClient()` se hacen peticiones HTTP reales contra la aplicación.

**Cómo lo usamos:** `HealthControllerTests` comprueba que `/api/health` responde 200. Es la base para añadir pruebas de endpoints completos.

**Qué no cubre:** las pruebas de API no usan la base de datos de desarrollo; si añades una prueba que la necesite, hay que preparar una base aparte.

## Lo que se comprueba a mano

Algunas cosas se han probado contra la API en marcha con `curl` (subidas de archivos, respuestas 409 y 400, cascadas de borrado). No están automatizadas todavía; si quieres, pueden convertirse en pruebas de integración.
