import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FeedbackContext, type ConfirmOptions, type Feedback, type ToastOptions } from "../lib/feedback";

const DEFAULT_TOAST_MS = 6000;

interface ToastItem extends ToastOptions {
  id: number;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (accepted: boolean) => void;
}

/** Proporciona diálogos de confirmación accesibles y avisos con "Deshacer" a toda la aplicación. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const live = useRef(new Map<number, ToastItem>());
  const nextId = useRef(1);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback(
    (input: ConfirmOptions | string) =>
      new Promise<boolean>((resolve) => {
        const options = typeof input === "string" ? { message: input } : input;
        setPending((previous) => {
          previous?.resolve(false);
          return { options, resolve };
        });
      }),
    [],
  );

  function answer(accepted: boolean) {
    pending?.resolve(accepted);
    setPending(null);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!pending || !dialog || dialog.open) return;
    // jsdom y navegadores antiguos no tienen showModal: se abre igualmente.
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, [pending]);

  const finish = useCallback((id: number, expired: boolean) => {
    const toast = live.current.get(id);
    if (!toast) return;
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    live.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
    if (expired) toast.onExpire?.();
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      const item = { ...options, id };
      live.current.set(id, item);
      setToasts((current) => [...current, item]);
      timers.current.set(
        id,
        setTimeout(() => finish(id, true), options.durationMs ?? DEFAULT_TOAST_MS),
      );
    },
    [finish],
  );

  // Si se cierra la pestaña con borrados pendientes, avisa: esos borrados aún no se han hecho.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if ([...live.current.values()].some((t) => t.onExpire)) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    const pendingTimers = timers.current;
    return () => {
      window.removeEventListener("beforeunload", warn);
      pendingTimers.forEach(clearTimeout);
    };
  }, []);

  const value = useMemo<Feedback>(() => ({ canUndo: true, confirm, toast }), [confirm, toast]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {pending && (
        <dialog
          ref={dialogRef}
          className="confirm-dialog"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          onCancel={(event) => {
            event.preventDefault();
            answer(false);
          }}
        >
          <h2 id="confirm-title">{pending.options.title ?? "¿Estás seguro?"}</h2>
          <p id="confirm-message" className="description">
            {pending.options.message}
          </p>
          <div className="actions">
            <button type="button" className="button" autoFocus onClick={() => answer(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className={`button ${pending.options.danger ? "button-danger-solid" : "button-primary"}`}
              onClick={() => answer(true)}
            >
              {pending.options.confirmLabel ?? "Confirmar"}
            </button>
          </div>
        </dialog>
      )}

      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
            {t.actionLabel && (
              <button
                type="button"
                className="button-link toast-action"
                onClick={() => {
                  t.onAction?.();
                  finish(t.id, false);
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}
