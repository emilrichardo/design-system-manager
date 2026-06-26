// T045 — Manejo de señales en la frontera CLI. No llama a process.exit ni aborta abruptamente:
// solo marca la cancelación; la operación crítica (transacción) finaliza o hace rollback sola.
// Registra listeners únicos y devuelve un limpiador para no acumularlos entre ejecuciones/tests.
export interface SignalTarget {
  once(event: string, listener: () => void): unknown;
  off(event: string, listener: () => void): unknown;
}

export function installSignalHandlers(target: SignalTarget, onSignal: () => void): () => void {
  const handler = (): void => onSignal();
  target.once("SIGINT", handler);
  target.once("SIGTERM", handler);
  return () => {
    target.off("SIGINT", handler);
    target.off("SIGTERM", handler);
  };
}
