# Vite

**Qué es:** la herramienta de desarrollo y empaquetado del frontend. Arranca un servidor con recarga instantánea y, para producción, genera los archivos estáticos.

**Versión:** 6.3. Con `@vitejs/plugin-react` para React.

## Configuración (`frontend/vite.config.ts`)

- **Proxy de la API:** las peticiones a `/api` se reenvían a `http://localhost:5167`, el puerto del backend. Así el frontend no necesita saber la dirección del backend y no hay problemas de CORS en desarrollo.
- **Pruebas:** la sección `test` configura Vitest con entorno `jsdom` (ver [pruebas-frontend.md](pruebas-frontend.md)).

Si cambias el puerto del backend, cambia también el proxy y el `launchSettings.json` del API.

## Comandos

```bash
cd frontend
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # comprueba tipos y genera dist/
npm run preview  # sirve el build para probarlo
```

`npm run build` ejecuta `tsc -b` antes de Vite, así que los errores de tipos también rompen el build.

## Cosas que hay que saber

- **`dist/` y `node_modules/`** están en `.gitignore`.
- **Puerto ocupado:** `--strictPort` evita que Vite cambie de puerto en silencio, que es lo que queremos para el proxy.
