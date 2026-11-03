import { createContext, useContext } from "react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  /** Pinta el botón de confirmar como acción destructiva. */
  danger?: boolean;
}

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Se ejecuta si el aviso caduca sin que se pulse la acción (p. ej. el borrado real tras "Deshacer"). */
  onExpire?: () => void;
  durationMs?: number;
}

export interface Feedback {
  /** Indica si hay avisos con "Deshacer" disponibles (hay proveedor montado). */
  canUndo: boolean;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  toast: (options: ToastOptions) => void;
}

// Sin proveedor (p. ej. en pruebas de un componente suelto) se usa el diálogo del navegador.
const fallback: Feedback = {
  canUndo: false,
  confirm: async (options) => window.confirm(typeof options === "string" ? options : options.message),
  toast: () => undefined,
};

export const FeedbackContext = createContext<Feedback>(fallback);

export function useFeedback(): Feedback {
  return useContext(FeedbackContext);
}
