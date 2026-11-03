import { useEffect } from "react";

const BASE_TITLE = "Minecraft FarmHub";

/** Pone el título de la pestaña ("Página · Minecraft FarmHub"); sin título, deja solo el nombre de la app. */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
