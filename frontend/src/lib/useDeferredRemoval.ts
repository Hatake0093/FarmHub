import { useCallback, useState } from "react";
import { errorMessage } from "../api/client";
import { useFeedback } from "./feedback";

/**
 * Borrado con "Deshacer": el elemento se oculta al instante y el borrado real se hace cuando caduca el aviso.
 * Sin proveedor de avisos (pruebas), pide confirmación y borra directamente.
 */
export function useDeferredRemoval(onChanged: () => void, onError: (message: string) => void) {
  const feedback = useFeedback();
  const [hidden, setHidden] = useState<ReadonlySet<number>>(new Set());

  const show = useCallback((id: number) => {
    setHidden((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const remove = useCallback(
    async (id: number, label: string, action: () => Promise<unknown>) => {
      const perform = async () => {
        try {
          await action();
          onChanged();
        } catch (err) {
          show(id);
          onError(errorMessage(err));
        }
      };

      if (!feedback.canUndo) {
        if (await feedback.confirm({ message: `¿Quitar ${label}?`, danger: true })) await perform();
        return;
      }

      setHidden((current) => new Set(current).add(id));
      feedback.toast({
        message: `Eliminado: ${label}`,
        actionLabel: "Deshacer",
        onAction: () => show(id),
        onExpire: () => void perform(),
      });
    },
    [feedback, onChanged, onError, show],
  );

  return { hidden, remove };
}
