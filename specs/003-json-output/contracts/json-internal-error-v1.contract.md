# Contract — JSON Internal Error v1 (003)

Envelope seguro para **errores internos de la frontera CLI** (excepción inesperada con `--json`
activo). **No** es un outcome de dominio: vive solo en la capa CLI y nunca aparece en los tipos de los
casos de uso headless (FR-034).

## Forma

```ts
type JsonInternalErrorEnvelopeV1 = {
  formatVersion: "1.0.0";
  command: "validate" | "inspect";
  outcome: "internal-error";
  result: null;
  error: { code: string; message: string }; // code estable: "internal-cli-error"
};
```

## Reglas

- Se emite **solo** cuando `--json` está activo y una excepción inesperada se propaga más allá del
  caso de uso (el reporter JSON nunca llegó a `completed()` → **stdout vacío**).
- **stdout vacío**, **stderr** contiene exactamente este envelope + newline, **exit 70** (FR-021/FR-033).
- `code` estable `"internal-cli-error"`; `message` **seguro**: sin stack, sin paths, sin mensaje crudo
  no controlado de librerías (FR-032).
- Se escribe **una sola vez** (en el `catch` del handler CLI del comando, que conoce `command`).
- **No** se aplica a errores de uso de Commander (esos mantienen la política existente → exit 3, sin
  JSON).

## Ejemplo (stderr, exit 70)

```json
{
  "formatVersion": "1.0.0",
  "command": "inspect",
  "outcome": "internal-error",
  "result": null,
  "error": { "code": "internal-cli-error", "message": "Ocurrió un error interno." }
}
```
