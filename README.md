# Minecraft FarmHub

Aplicación web para gestionar, documentar, consultar y planificar granjas automáticas de Minecraft Java Edition.

FarmHub no pretende ser una wiki de Minecraft. Es una herramienta de planificación e ingeniería pensada para jugadores de supervivencia técnica: una biblioteca personal de diseños, con archivos Litematica, materiales, producciones y un orden de construcción recomendado.

> **Estado:** fase de diseño y definición de requisitos. Todavía no hay código implementado.

---

## Tabla de contenidos

- [Objetivo](#objetivo)
- [Alcance](#alcance)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Hoja de ruta](#hoja-de-ruta)
- [Decisiones pendientes](#decisiones-pendientes)
- [Principios de desarrollo](#principios-de-desarrollo)
- [Fuera del alcance inicial](#fuera-del-alcance-inicial)
- [Licencia](#licencia)

---

## Objetivo

Construir una aplicación que permita:

- Administrar una biblioteca personal de granjas.
- Guardar diseños y referencias de sus creadores.
- Importar y consultar archivos `.litematic`.
- Visualizar construcciones por capas.
- Consultar materiales y cantidades necesarias.
- Registrar producciones por hora.
- Comparar la eficiencia de diferentes granjas.
- Organizar las granjas construidas y pendientes.
- Planificar el orden de construcción.
- Identificar dependencias entre granjas.
- Consultar compatibilidad con versiones de Minecraft Java.

La aplicación será inicialmente personal, pero se diseñará pensando en una futura publicación como proyecto open source para otros jugadores.

## Alcance

### Primera etapa: aplicación personal

La primera versión la administra un único usuario. No se incluyen inicialmente:

- Cuentas públicas o registro de usuarios.
- Moderación de contenido.
- Publicación comunitaria de diseños.
- Valoraciones o comentarios públicos.

### Evolución futura

- Publicación como software de código abierto.
- Uso por otros jugadores.
- Bibliotecas compartidas.
- Contribuciones comunitarias.
- Cuentas y colecciones personales.

## Funcionalidades

### Biblioteca de granjas

Cada granja tendrá una ficha técnica con: nombre, categoría, descripción, creador o diseñador, versiones compatibles de Minecraft Java, dificultad de construcción, materiales necesarios, producción estimada por hora, condiciones de funcionamiento, dimensiones, tutoriales y referencias, archivos descargables, y dependencias y requisitos.

> Las producciones se registran con su unidad, condiciones de medición y fuente cuando esté disponible. **No se inventan valores de producción ni se asume compatibilidad entre versiones.**

### Diseños y blueprints

Formatos previstos:

| Formato | Estado |
|---|---|
| `.litematic` | Prioridad de implementación |
| `.schem` | Soporte futuro |
| Imágenes de referencia | Previsto |
| PDF | Previsto |
| Enlaces externos | Previsto |

Los archivos se conservan para poder descargarlos posteriormente.

### Visor Litematica por capas

**Funcionalidad principal del proyecto.** Permite importar un archivo `.litematic` y visualizar la construcción mediante una representación 2D interactiva:

- Importación y descompresión del NBT.
- Lectura de metadatos y dimensiones.
- Interpretación de paletas de bloques y de los datos de bloques de cada región.
- Soporte de archivos con múltiples regiones.
- Vista desde arriba (plano X/Z) con selección de capa en el eje Y y navegación entre capas.
- Zoom y desplazamiento.
- Inspección de bloques (identificador y propiedades).
- Cálculo de cantidades por tipo de bloque.
- Detección de archivos inválidos o incompatibles.
- Asociación de los archivos importados a los diseños de la biblioteca.

Consideraciones técnicas:

- El formato `.litematic` usa NBT comprimido.
- Los índices de paleta deben interpretarse correctamente, incluido el empaquetado de los datos de bloques.
- Soporte de coordenadas y dimensiones negativas, y de regiones superpuestas.
- No cargar estructuras completas innecesariamente en el frontend.
- Validar tamaños y límites de los archivos importados.
- El backend .NET interpreta los archivos; el frontend React se encarga de la visualización e interacción.
- Antes de implementar un parser NBT propio se evaluarán bibliotecas existentes.

### Materiales de construcción

- Cantidades de bloques requeridos, agrupadas por tipo.
- Cálculo automático desde archivos Litematica.
- Totales en unidades y en stacks de Minecraft.
- Diferenciación entre bloques de construcción y materiales de fabricación cuando corresponda.

Las recetas de fabricación y el cálculo de recursos base quedan para una etapa posterior.

### Producción y eficiencia

Datos registrados por granja: ítems producidos por hora, tipos de recursos generados, requisitos de funcionamiento, necesidad de jugador AFK, distancias y condiciones relevantes, versión de Minecraft usada en la medición y fuente del rendimiento.

Los rendimientos se tratan como **estimaciones dependientes de las condiciones de funcionamiento**.

### Planificador de progresión

- Registro de dependencias entre granjas (por ejemplo, una granja que produce materiales necesarios para construir otra).
- Identificación de requisitos pendientes.
- Recomendaciones de construcción basadas en relaciones y datos registrados, no en reglas arbitrarias.
- Secuencia de progresión y priorización según los recursos necesarios.

### Gestión de mundos

- Varios mundos de Minecraft, cada uno con nombre y versión de Minecraft Java.
- Granjas planificadas, en construcción y terminadas, con progreso de infraestructura.
- Una misma granja puede usarse en distintos mundos.
- La biblioteca de diseños se mantiene separada de las instancias de granjas construidas.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | React + TypeScript |
| Backend | ASP.NET Core / .NET 10 |
| Base de datos | PostgreSQL (propuesto) |
| ORM | Entity Framework Core (propuesto) |
| Estilos | Tailwind CSS (propuesto) |
| Control de versiones | Git + GitHub |

## Arquitectura

Flujo de importación de un archivo `.litematic`:

```text
Archivo .litematic
       |
       v
Backend ASP.NET Core
       |
       v
Descompresión y lectura NBT
       |
       v
Interpretación de regiones y paletas
       |
       v
Modelo interno de construcción
       |
       +----> Cálculo de materiales
       |
       +----> Metadatos y dimensiones
       |
       +----> Consulta de capas
                    |
                    v
              API REST
                    |
                    v
           React + TypeScript
                    |
                    v
             Visor 2D
```

Principios:

- Separación clara entre frontend, backend, lógica de dominio y persistencia.
- Sin microservicios ni complejidad distribuida sin una necesidad demostrable.
- El modelo interno debe permitir añadir otras representaciones visuales (por ejemplo, 3D) sin reescribir la lógica de interpretación.

## Hoja de ruta

**Fase A — Fundamentos:** estructura de solución, configuración de frontend y backend, persistencia, entidades iniciales, API básica e interfaz de navegación.

**Fase B — Biblioteca:** CRUD de granjas, categorías, diseños, autores, referencias y archivos, filtros y búsquedas.

**Fase C — Motor Litematica:** descompresión NBT, metadatos, paletas, regiones, extracción de capas, cálculo de bloques y pruebas con archivos reales.

**Fase D — Visor interactivo:** renderizado 2D, navegación por capas, zoom y desplazamiento, inspección de bloques, leyenda de materiales e integración con la biblioteca.

**Fase E — Planificación:** producciones por hora, dependencias, recomendaciones, gestión de mundos y seguimiento de progreso.

## Decisiones

| # | Tema | Decisión |
|---|---|---|
| 1 | Categorías y creadores | Una categoría puede contener diseños de varios creadores. El creador va en la ficha de cada diseño. |
| 2 | Almacenamiento de archivos | Disco local del servidor; la base de datos guarda la ruta y los metadatos. |
| 3 | Base de datos | PostgreSQL con Entity Framework Core. |
| 4 | Lectura NBT | fNbt (NuGet). Querz.NBT se descartó: es una biblioteca de Java y no existe paquete .NET con ese nombre. Debe validarse con archivos `.litematic` reales antes de dar la Fase C por cerrada. |
| 5 | Renderizado 2D | Canvas 2D. |
| 6 | Versiones de Minecraft | Tabla de versiones oficiales con relación N:M con las granjas. No se asume compatibilidad entre versiones. |
| 7 | Clasificación | Una categoría principal más etiquetas libres para filtrar. |
| 8 | Despliegue | Solo local por ahora. El despliegue público se decidirá más adelante. |

## Principios de desarrollo

- Código comprensible y mantenible; evitar complejidad innecesaria.
- Priorizar funcionalidades reales sobre demostraciones visuales.
- Buenas prácticas de React, TypeScript y .NET.
- Pruebas para los componentes críticos, especialmente el parser Litematica.
- Documentar las decisiones arquitectónicas.
- Trabajo con Git y Pull Requests, revisando el código generado antes de aceptarlo.
- Mantener la posibilidad de publicar el proyecto como open source.

El desarrollador humano conserva la responsabilidad de arquitectura, validación y decisiones técnicas.

## Fuera del alcance inicial

- Visor 3D completo.
- Mapas interactivos de mundos.
- Lectura automática de archivos de guardado de Minecraft.
- Integración directa con servidores de Minecraft.
- Marketplace de diseños.
- Sistema social.
- Inteligencia artificial obligatoria.
- Compatibilidad completa con Bedrock Edition.

## Licencia

Pendiente de definir. El proyecto se contempla como open source en el futuro.
