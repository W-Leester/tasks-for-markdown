export type Listener<T> = (value: T) => void;
export interface Subscription {
  dispose(): void;
}

/** Minimal typed event emitter so core modules can publish events without depending on vscode. */
export class Emitter<T> {
  private listeners = new Set<Listener<T>>();

  on(listener: Listener<T>): Subscription {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  fire(value: T): void {
    for (const l of [...this.listeners]) l(value);
  }

  dispose(): void {
    this.listeners.clear();
  }
}
