# React

**Qué es:** la librería para construir interfaces con componentes. Cada componente es una función que devuelve elementos JSX y que se vuelve a dibujar cuando cambia su estado.

**Versión:** 19.1.

## Cómo la usamos

- **Componentes de página** (`src/pages/`): `FarmListPage`, `FarmDetailPage`, `FarmFormPage`, `StructuresPage`, `StructureEditorPage`, `BlocksPage`, `ItemsPage`, `CatalogsPage`.
- **Componentes reutilizables** (`src/components/`): `LitematicViewer`, `DesignSection`, `BlockPicker`, `Voxel3DView`, `IsometricView`, `SliceView`, `StackView`, `LayerStepper`, `LayerRange`, `Layout`.
- **Estado:** `useState` para lo que se muestra, `useRef` para lo que no debe redibujar la pantalla (la copia local de la rejilla, el historial, la posición del ratón, los recursos de WebGL).
- **Efectos:** `useEffect` para llamadas a la API, listeners del teclado y del ratón, y dibujo en canvas. Siempre devuelven una función de limpieza que quita listeners y cancela peticiones pendientes.
- **Memoización:** `useMemo` para cálculos caros (la malla 3D, el recorte por capas), para que el ratón no los repita en cada movimiento.

## Reglas que seguimos

- **No mutar estado:** los cambios se hacen con funciones (`setPending((c) => withChange(c, ...))`).
- **Dependencias de los efectos:** el linter (`eslint-plugin-react-hooks`) avisa si falta alguna. Si se silencia, debe explicarse en un comentario.
- **Atajos de teclado:** el listener se registra en un efecto. Si necesita un valor que cambia a menudo (como la posición del ratón), ese valor va en una `ref`, porque un listener registrado con un valor antiguo lee el valor antiguo.
- **Errores de red:** cada llamada muestra su error en la pantalla (`errorMessage(err)`), no en la consola.

## Cosas que hay que saber

- **Modo estricto:** en desarrollo, React ejecuta los efectos dos veces. Por eso todos los recursos (WebGL, listeners, peticiones) se liberan en la limpieza.
- **Campos controlados:** los `<input>` tienen `value` y `onChange`. Para formularios grandes se usa `defaultValue` con una `key` cuando hace falta reiniciarlos.
