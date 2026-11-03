import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, las llamadas a /api se reenvían al backend ASP.NET Core.
// Puerto HTTP del perfil http en backend/src/FarmHub.Api/Properties/launchSettings.json.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5167",
        changeOrigin: true,
      },
    },
  },
});
