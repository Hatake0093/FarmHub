# fNbt

**Qué es:** una biblioteca de .NET para leer y escribir NBT, el formato binario que usa Minecraft para guardar estructuras, bloques y datos. Está publicada en NuGet (versión 2.1.0).

**Para qué la usamos:** leer los archivos `.litematic` (Litematica), `.schem` (Sponge) y `.nbt` (estructuras de Minecraft). No escribimos NBT todavía.

## Cómo la usamos

- **Carga (`Infrastructure/Structures/NbtFileLoader.cs`):** `LoadRoot(stream)` lee el archivo entero, detecta si es gzip mirando los dos primeros bytes (`0x1f 0x8b`) y lo descomprime si hace falta. Después usa `NbtFile.LoadFromStream` con `NbtCompression.None`.
- **Límite de tamaño:** el contenido descomprimido pasa por `LimitedReadStream` (en `Litematic/LitematicReader.cs`), que corta si supera 256 MB. Así un archivo comprimido malicioso no llena la memoria.
- **Lectores:** `LitematicReader`, `SchematicReader` y `StructureNbtReader` recorren los tags (`NbtCompound`, `NbtList`, `NbtInt`, `NbtLongArray`, `NbtByteArray`...) y los convierten al mismo modelo (`LitematicModel`).

## Tipos de tag que aparecen

| Tag de fNbt | Qué guarda en nuestros archivos |
|---|---|
| `NbtCompound` | Objetos con campos (metadatos, regiones, bloques) |
| `NbtList` | Listas (paleta, posiciones, bloques de una estructura) |
| `NbtLongArray` | Índices de bloque empaquetados (Litematica) |
| `NbtByteArray` | Índices en varint (`.schem`) |
| `NbtInt`, `NbtShort`, `NbtByte` | Dimensiones y coordenadas (según el formato) |
| `NbtString` | Nombres de bloque y textos |

## Cosas a tener en cuenta

- **Empaquetado de Litematica:** las entradas de la paleta ocupan bits y pueden cruzar el límite de un `long`. Está verificado con los archivos de muestra del proyecto (ver `LitematicReader.cs`).
- **Orden de índices:** la fórmula `(y × profundidad + z) × anchura + x` es un supuesto que todavía no se ha confirmado frente a Litematica en el juego.
- **Propiedades de bloque:** `.litematic` y `.nbt` se leen solo con el nombre; las propiedades (como `facing`) se descartan. Los `.schem` conservan las propiedades en el nombre.
- **Regiones negativas:** el tamaño de una región puede ser negativo en Litematica. Los lectores usan el valor absoluto para el volumen.
