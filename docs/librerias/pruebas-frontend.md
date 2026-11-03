# Pruebas de frontend: Vitest, jsdom y Testing Library

## Vitest

**Qué es:** el framework de pruebas que usa Vite. Tiene la misma sintaxis que Jest (`describe`, `it`, `expect`) y es rápido.

**Versión:** 3.2.

**Cómo se ejecuta:**

```bash
cd frontend
npx vitest run          # una vez
npx vitest run src/lib  # solo una carpeta
```

**Qué cubren:** las funciones puras de `src/lib/` (proyección, recorte, mallas, historial, planificadores de edición, portapapeles, matrices, medidas, formas) y componentes críticos (formularios, listas, vista de cambio de bloque, vista de tamaño).

## jsdom

**Qué es:** un DOM simulado en Node. Permite probar componentes sin navegador.

**Límite:** no tiene canvas real ni WebGL. Por eso las funciones de dibujo se prueban por separado (las que calculan qué dibujar) y la parte gráfica se comprueba en el navegador.

## Testing Library (`@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`)

**Qué es:** utilidades para probar componentes como lo haría un usuario: buscar elementos por su texto o su rol y simular clics y escritura.

**Versiones:** React Testing Library 16.3, DOM 10.4, user-event 14.6.

**Patrones que usamos:**

- Buscar por rol y nombre accesible: `screen.getByRole("button", { name: "Guardar" })`, `getByLabelText(/Nombre/)`.
- Esperar resultados asíncronos: `await screen.findByRole("alert")`.
- Simular usuario: `await userEvent.type(...)`, `await userEvent.click(...)`.
- Limpiar entre pruebas: `afterEach(cleanup)` y `vi.unstubAllGlobals()`.

**Mocks de la API:** `src/test/fetchMock.ts` sustituye `fetch` por una función que responde según la ruta. Así las pruebas no necesitan el backend.

## Cosas que hay que saber

- Si un componente usa `Link`, `useNavigate` o `useParams`, envuélvelo en `MemoryRouter` en la prueba.
- Los `<input type="file">` ocultos se prueban con `userEvent.upload`. Con `applyAccept: false` se puede probar el rechazo por extensión.
- Los textos con números o símbolos (como "Δ X 3") se comprueban con expresiones regulares o con `toHaveProperty("textContent", expect.stringContaining(...))`.
