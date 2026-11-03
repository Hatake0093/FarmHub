/** Un bloque cambiado: lo que había antes y lo que quedó después. Nombres de bloque, aire incluido. */
export interface CellChange {
  x: number;
  y: number;
  z: number;
  before: string;
  after: string;
}

/**
 * Historial de deshacer y rehacer. Cada entrada es una edición completa (un trazo, un movimiento...).
 * Las operaciones que tocan el servidor se marcan después de confirmarse, para que un error no deje el
 * historial desincronizado.
 */
export class EditHistory {
  private undoStack: CellChange[][] = [];
  private redoStack: CellChange[][] = [];

  /** Registra una edición nueva. Invalida lo que se podía rehacer. */
  record(entry: CellChange[]): void {
    if (entry.length === 0) return;
    this.undoStack.push(entry);
    this.redoStack = [];
  }

  peekUndo(): CellChange[] | null {
    return this.undoStack[this.undoStack.length - 1] ?? null;
  }

  peekRedo(): CellChange[] | null {
    return this.redoStack[this.redoStack.length - 1] ?? null;
  }

  /** Tras deshacer en el servidor: pasa la última edición a rehacer. */
  markUndone(): void {
    const entry = this.undoStack.pop();
    if (entry) this.redoStack.push(entry);
  }

  /** Tras rehacer en el servidor: pasa la última edición deshecha a deshacer. */
  markRedone(): void {
    const entry = this.redoStack.pop();
    if (entry) this.undoStack.push(entry);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
