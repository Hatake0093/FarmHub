# Herramientas del frontend: ESLint y TypeScript

## TypeScript

**Qué es:** el compilador que comprueba los tipos antes de ejecutar el código.

**Versión:** 5.8. Configuración en `tsconfig.app.json` y `tsconfig.node.json`.

**Opciones que importan:**

- `strict`: comprobaciones estrictas (nulos, tipos implícitos).
- `noUnusedLocals` y `noUnusedParameters`: avisan de variables sin uso.
- `verbatimModuleSyntax`: los tipos se importan con `import type`.
- `erasableSyntaxOnly`: no admite parámetros con modificador en constructores (`constructor(private x)`). Se escribe el campo explícitamente.

**Comando:** `npx tsc -b`.

## ESLint

**Qué es:** el analizador de estilo y de errores comunes del código JavaScript y TypeScript.

**Versión:** 9.25, con `typescript-eslint` 8.30. Plugins: `eslint-plugin-react-hooks` (reglas de hooks) y `eslint-plugin-react-refresh`.

**Comando:** `npm run lint` (en `frontend/`).

**Reglas que más aparecen:**

- `react-hooks/exhaustive-deps`: avisa de dependencias que faltan en `useEffect` o `useMemo`. Si se silencia (`eslint-disable-next-line`), hay que tener una razón clara y escribirla en un comentario.
- `prefer-const`: variables que no se reasignan deben ser `const`.

## Orden recomendado antes de subir cambios

```bash
cd frontend
npx tsc -b && npm run lint && npx vitest run && npm run build
```
