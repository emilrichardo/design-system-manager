// Abstracción de salida de la CLI, inyectable y capturable en pruebas.
// out(): stdout (ayuda, plan, éxito, unchanged, cancelación). err(): stderr (conflictos, fallos).
export interface CliIO {
  out(text: string): void;
  err(text: string): void;
}

export const processIO: CliIO = {
  out: (text) => {
    process.stdout.write(text);
  },
  err: (text) => {
    process.stderr.write(text);
  },
};
