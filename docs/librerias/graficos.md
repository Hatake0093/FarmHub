# Gráficos: Canvas 2D y WebGL 2

FarmHub no usa librerías de gráficos. Todo el dibujo es la API que ya trae el navegador.

## Canvas 2D

**Qué es:** una superficie de píxeles con funciones para dibujar rectángulos, trazos, texto e imágenes (`CanvasRenderingContext2D`).

**Dónde se usa:**

- **Capa 2D editable** (`StructureEditorPage`, `LitematicViewer`): cada celda es un `fillRect`. Con la rejilla activa se deja 1 px de hueco.
- **Vista isométrica** (`IsometricView`): cada cara visible es un polígono (`moveTo`/`lineTo`/`fill`). Las texturas se pintan con `setTransform` + `drawImage` recortadas con `clip()`.
- **Corte lateral** (`SliceView`) y **capas apiladas** (`StackView`): cuadrículas de `fillRect`.
- **Atlas de texturas** (`lib/atlas.ts`): un canvas fuera de pantalla donde se copian las texturas de todos los bloques.

**Detalles útiles:**

- `imageSmoothingEnabled = false` mantiene nítidas las texturas de píxeles.
- `setTransform` aplica una matriz afín; después se restablece a la identidad para no afectar al resto del dibujo.
- Para medir lo que se dibuja, `getImageData` funciona, pero `readPixels` de WebGL no (ver abajo).

## WebGL 2

**Qué es:** la API de la GPU del navegador. Permite dibujar triángulos con profundidad y shaders escritos en GLSL.

**Dónde se usa:** `lib/gl.ts` (renderizador), `components/Voxel3DView.tsx` (vista 3D).

**Cómo está hecho:**

- **Shaders:** un vertex shader que aplica la matriz de cámara y calcula la luz por normal, y un fragment shader que elige entre el color del vértice y la textura del atlas.
- **Malla:** `lib/mesh3d.ts` genera un solo búfer con las caras visibles (solo las que dan a aire). Cada vértice tiene posición, normal, color, uv y un indicador de textura.
- **Cámara:** `lib/mat4.ts` construye las matrices (perspectiva, `lookAt`, traslación, escala) en orden column-major. La órbita se calcula con yaw, pitch y distancia.
- **Profundidad:** el buffer de profundidad ordena las caras solas; no hace falta ordenar cubos como en el dibujo 2D.

**Cosas a tener en cuenta:**

- **Contexto perdido:** si el navegador pierde el contexto WebGL, la vista deja de dibujar. No está gestionado todavía.
- **`preserveDrawingBuffer`:** no está activado, así que leer píxeles del lienzo con `readPixels` después de que se haya mostrado devuelve vacío. Para probar la vista, se comparan capturas de pantalla.
- **Límite de memoria:** la malla ocupa unos 48 bytes por vértice y 4 vértices por cara. Una estructura muy grande puede necesitar bastante memoria.
- **Compatibilidad:** si el navegador no tiene WebGL 2, `createRenderer` devuelve `null` y la vista muestra un aviso.
