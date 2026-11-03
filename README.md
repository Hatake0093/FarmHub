# Minecraft FarmHub

Aplicación web personal para planificar y documentar granjas automáticas de Minecraft Java Edition: una biblioteca de granjas con su ficha técnica, y un editor de esquemáticos (estructuras) con visores 2D, isométrica y de cortes.

> **Estado:** uso personal, en desarrollo. Funciona en local. No tiene cuentas ni despliegue público.

---

## Índice

- [Qué hace hoy](#qué-hace-hoy)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Pruebas](#pruebas)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Arquitectura](#arquitectura)
- [Decisiones técnicas](#decisiones-técnicas)
- [Hoja de ruta](#hoja-de-ruta)
- [Licencia](#licencia)

---

## Qué hace hoy

### Biblioteca de granjas

- **Granjas:** crear, editar, borrar y listar con paginación. Filtros por nombre, categoría, dificultad, etiqueta y versión de Minecraft.
- **Ficha técnica:** categoría, dificultad, descripción, versiones de Minecraft Java compatibles, dimensiones (X, Y, Z en bloques) y condiciones de funcionamiento.
- **Producciones por hora:** recurso, cantidad, unidad (ítems o stacks), si requiere AFK, condiciones de medición, fuente y versión usada para medir. No se inventan valores.
- **Dependencias:** una granja puede necesitar otras. Se rechazan las autodependencias, las duplicadas y los ciclos, también los indirectos.
- **Tutoriales y referencias:** enlaces con título, URL validada y tipo.
- **Diseños:** cada granja tiene diseños con creador opcional y archivos. Se pueden subir, descargar y borrar. Límite de 25 MB por archivo.
- **Esquemáticos vinculados:** una granja puede usar esquemáticos del editor, y un esquemático puede servir a varias granjas.

### Catálogos

- **Categorías y versiones de Minecraft:** crear, renombrar y borrar. Un elemento en uso no se puede borrar.
- **Bloques:** lista curada de 330 bloques, con nombre en español editable a mano, color por bloque y textura propia (PNG, JPEG o WebP de hasta 256 × 256). Carga masiva de texturas desde una carpeta, emparejadas por nombre.
- **Items:** lista curada de 140 items, con nombre en español y color editables. Se pueden añadir bloques e items nuevos por identificador.

### Lectura de archivos de construcción

- **`.litematic`** (Litematica): gzip o sin comprimir. Validado con los archivos de muestra del proyecto.
- **`.schem`** (Sponge v2 y v3) y **`.nbt`** (estructura de Minecraft).
- Al subir un archivo a un diseño se valida: un archivo corrupto se rechaza con el motivo.
- Materiales por tipo de bloque, sin aire, con el número de stacks de 64.

### Visor de archivos

- **Capa 2D:** elegir región y capa, zoom, desplazamiento, rejilla y clic para ver el bloque.
- **Isométrica:** rango de capas (desde–hasta), giros de 90° y color o textura por bloque.
- **Corte lateral:** plano en X o en Z, con coordenadas al pasar el ratón.
- **Capas apiladas:** en el editor de esquemáticos.

### Editor de esquemáticos

Estructuras propias en un formato interno (paleta y celdas), independientes de cualquier granja.

- **Crear e importar:** desde cero, o importando un `.litematic`, `.schem` o `.nbt` (se usa la primera región).
- **Coordenada base:** la esquina mínima de la estructura en el mundo. Al tocar un bloque se muestra la coordenada del mundo donde debe ir.
- **Tamaño:** cambiar tamaño (pide confirmación si se pierden bloques) y extender en los seis lados sin perder nada. Las coordenadas del mundo se mantienen.
- **Pintar:** pintar, borrar, cuentagotas (botón central), relleno por región, línea, rectángulo hueco y rectángulo lleno.
- **Selección:** arrastrar con Mayús para seleccionar una caja. Mover, copiar, reflejar en X o Z y girar 90° (si la caja es cuadrada).
- **Portapapeles:** copiar una selección y pegarla en cualquier otro esquemático.
- **Capas:** clonar una capa en otra, bloquear capas (una capa bloqueada no admite ediciones), y capa fantasma de la capa inferior o superior.
- **Deshacer y rehacer:** cada trazo, movimiento o pegado es una edición deshacible.
- **Medir:** dos puntos, aunque estén en capas distintas; diferencia por eje y distancia.
- **Atajos:** B pintar, E borrar, F relleno, L línea, K y J rectángulos, M medir, P bloquear capa, G rejilla, Tab cambiar vista, [ ] o RePág/AvPág cambiar de capa, Ctrl+C y Ctrl+V copiar y pegar, Ctrl+Z y Ctrl+Y deshacer y rehacer, H, V y R en la selección.

Un detalle de uso: el selector de bloques se muestra plegado y, al desplegarlo, flota sobre la rejilla. Los bloques recientes aparecen primero.

---

## Limitaciones conocidas

- **Sin cuentas ni autenticación:** cualquiera con acceso a la aplicación puede modificarla. Está pensada para uso local.
- **No exporta** a `.litematic` ni a `.schem`. Solo importa.
- **Orden de índices del visor sin confirmar** frente a Litematica. Los conteos y las paletas son coherentes con los archivos de muestra; el orden espacial se confirma visualmente.
- **Propiedades de bloque:** los lectores conservan el estado de cada bloque (por ejemplo, `type=top` en una losa). En la vista 3D, las losas se dibujan a media altura. Otras formas (escaleras, vallas, antorchas, cables de redstone) todavía se dibujan como cubos completos.
- **Catálogo curado:** los 330 bloques y 140 items no son el catálogo completo del juego. Se amplía añadiendo líneas o desde la propia página.
- **Nombres en español:** los escribe el usuario a mano. No hay traducción automática.
- **Deshacer:** no cubre cambiar tamaño ni extender, porque cambian las posiciones de las celdas.
- **Portapapeles:** vive en el navegador, no en el servidor, y tiene un límite de 200 000 celdas.
- **Isométrica:** hasta 1 000 000 de bloques por volumen. Dibujar estructuras grandes y llenas no está medido.
- **Solo local:** no hay despliegue público.

---

## Documentación técnica

Las librerías que usa el proyecto (para qué sirven, cómo se usan y qué conviene saber) están explicadas en [`docs/`](docs/README.md).

## Requisitos

- **.NET 10 SDK**
- **Node.js 22** (o compatible con Vite 6)
- **PostgreSQL 16** (o compatible)

---

## Puesta en marcha

### 1. Base de datos

Crea el usuario y la base que usa la configuración de desarrollo (`backend/src/FarmHub.Api/appsettings.Development.json`):

```bash
sudo -u postgres psql -c "CREATE ROLE farmhub LOGIN PASSWORD 'farmhub_dev';"
sudo -u postgres createdb -O farmhub farmhub
```

Esa contraseña es solo para desarrollo local.

### 2. Backend

```bash
cd backend/src/FarmHub.Api
dotnet run --launch-profile http
```

La API queda en `http://localhost:5167`. Al arrancar aplica las migraciones y carga los catálogos de bloques e items si faltan. No hace falta ejecutar `dotnet ef` a mano.

Los archivos subidos se guardan en `backend/src/FarmHub.Api/storage/`, que está en `.gitignore`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Las llamadas a `/api` se reenvían a la API con el proxy de Vite.

---

## Pruebas

```bash
cd backend && dotnet test
cd frontend && npx vitest run
```

Y para comprobar tipos y estilo:

```bash
cd frontend && npx tsc -b && npm run lint && npm run build
```

Las pruebas de backend cubren el lector de `.litematic`, `.schem` y `.nbt` (con archivos generados y con los archivos de muestra del proyecto), las reglas de dependencias y de archivos, el almacenamiento y el catálogo. Las de frontend cubren las funciones de edición (planificadores de movimiento, copia, forma, relleno, espejo, giro, portapapeles e historial), el volumen y los cortes, y los componentes críticos.

---

## Estructura del repositorio

```text
backend/
  src/FarmHub.Api/             API REST (controladores, contratos, Program.cs)
  src/FarmHub.Domain/          Entidades, reglas y modelo de dominio
  src/FarmHub.Infrastructure/  EF Core, lectores de archivos, almacenamiento y catálogos
  tests/FarmHub.Tests/         Pruebas xUnit
frontend/
  src/pages/                   Pantallas (biblioteca, ficha, editor, catálogos)
  src/components/              Visores, selector de bloques, vistas
  src/lib/                     Funciones puras: proyección, cortes, edición, historial
  src/api/                     Cliente HTTP tipado
```

---

## Arquitectura

```text
Archivo (.litematic / .schem / .nbt)
        |
        v
  Lector NBT (fNbt)  ->  Modelo común: regiones, paleta, índices de bloque
        |
        +--> Recuento de materiales
        +--> Resumen y capas por API
        +--> Volumen completo por API (una petición, celdas de 16 bits en base64)
                    |
                    v
   Frontend: capa 2D, isométrica, cortes, capas apiladas (Canvas 2D)

Editor de esquemáticos
  Rejilla propia (paleta + celdas) en PostgreSQL
  Copia local en el navegador, actualizada con cada edición
  Historial de deshacer y rehacer; cada edición se envía al servidor
```

Principios:

- Frontend, backend, dominio y persistencia separados. Las reglas (ciclos, límites, validaciones) son funciones puras con pruebas.
- Sin microservicios. Un proceso de API y una base de datos.
- Las vistas consumen el mismo modelo: añadir una vista no obliga a reescribir la lectura de archivos.

---

## Decisiones técnicas

| # | Tema | Decisión |
|---|---|---|
| 1 | Categorías y creadores | Una categoría puede tener diseños de varios creadores. El creador va en cada diseño. |
| 2 | Archivos subidos | Disco local del servidor. La base de datos guarda la clave y los metadatos. |
| 3 | Base de datos | PostgreSQL con EF Core (Npgsql). Migraciones automáticas al arrancar. |
| 4 | Lectura NBT | fNbt (NuGet). Querz.NBT se descartó: es una biblioteca de Java. |
| 5 | Renderizado | Canvas 2D. Sin WebGL por ahora. |
| 6 | Versiones de Minecraft | Tabla de versiones con relación N:M. No se asume compatibilidad entre versiones. |
| 7 | Clasificación | Una categoría principal y etiquetas libres. |
| 8 | Despliegue | Solo local por ahora. |
| 9 | Estilos | CSS propio con variables y tema claro y oscuro. Tailwind no se ha adoptado. |
| 10 | Formato de esquemáticos propios | Paleta y celdas en PostgreSQL. La exportación a `.litematic` queda pendiente de validar en Litematica. |
| 11 | Edición | Cada edición se envía al servidor al terminar, y el historial guarda los valores antes y después. |

---

## Hoja de ruta

Hecho: biblioteca completa, lectura de los tres formatos, visores, editor de esquemáticos con herramientas de diseño, catálogos y textura por bloque.

Pendiente, por orden de prioridad:

1. **Validar el orden de índices** del visor con Litematica (comparando una capa real).
2. **Exportar** esquemáticos propios a `.litematic` o `.schem`, con prueba de apertura en Litematica.
3. **Vincular diseños** de una granja a esquemáticos concretos, y ver desde un esquemático las granjas que lo usan.
4. **Plan de construcción:** lista de materiales por esquemático o por selección, y orden de progresión entre granjas.
5. **Texturas por cara** (superior, lateral, inferior) para bloques como la hierba.
6. **Vista isométrica por WebGL** si las estructuras grandes lo necesitan.
7. **Acceso con usuario** antes de cualquier despliegue fuera del equipo local.

---

## Licencia

Pendiente de definir. El proyecto se contempla como open source en el futuro.
