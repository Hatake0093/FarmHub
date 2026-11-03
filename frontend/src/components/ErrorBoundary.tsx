import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Si una página falla al dibujarse, muestra un aviso en lugar de dejar la pantalla en blanco.
 * Casi siempre significa que la API no es la versión que espera el frontend: reiniciarla suele bastar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error al mostrar la página", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="empty-state" role="alert">
        <h2>Esta página no se pudo mostrar</h2>
        <p className="muted">
          Revisa que la API esté en marcha y sea la versión actual (reinicia <code>dotnet run</code>) y recarga la página.
        </p>
        <p className="muted small">Detalle: {this.state.error.message}</p>
      </section>
    );
  }
}
