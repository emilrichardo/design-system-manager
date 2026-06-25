// T035 — Serialización JSON determinista. Indentación de 2 espacios + newline final.
// El orden de propiedades es el contractual de los builders (deterministas). No escribe archivos.
export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
