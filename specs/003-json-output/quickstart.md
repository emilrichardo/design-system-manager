# Quickstart — JSON output (003)

Guía de validación ejecutable de `validate --json` e `inspect --json`. Solo lectura; no modifica el
Design System.

## Requisitos

- Node.js `>=22`.
- Un proyecto anfitrión con `package.json` y un Design System administrado (creado con
  `neuraz-ds init`). Ver [001-ds-init/quickstart.md](../001-ds-init/quickstart.md).

## Uso

```bash
neuraz-ds validate --json
neuraz-ds inspect --json
```

Reglas: **stdout** contiene exactamente un documento JSON (2 espacios + newline final), **stderr**
vacío, y el **exit code es el mismo** que sin `--json` (0/3/4/5/6). Sin `--json`, el comportamiento es
idéntico al actual (reporter textual, cota de 200 en `inspect`).

## Escenarios

### DS válido (exit 0)

```bash
neuraz-ds validate --json
echo "exit: $?"   # 0
```

`stdout` (abreviado): `{"formatVersion":"1.0.0","command":"validate","outcome":"valid","result":{…"valid":true…}}`.

### DS inválido (exit 3)

```bash
neuraz-ds validate --json; echo "exit: $?"   # 3
```

El JSON es válido y parseable; `outcome` es `"complete-invalid"`, `result.valid` es `false`, y
`result.errors` lista los issues estructurados. **El exit ≠ 0 no impide obtener el JSON.**

### DS parcial (exit 4)

```bash
neuraz-ds inspect --json; echo "exit: $?"   # 4
```

`outcome` es `"partial"`; `result` conserva la información recuperable (archivos presentes/ausentes,
identidad recuperada con `trust`).

### Sin DS administrado (exit 5)

```bash
neuraz-ds validate --json; echo "exit: $?"   # 5
```

`outcome` es `"not-found"`, `result` es `null`, `error` describe la causa (o `null`).

### `inspect` con más de 200 tokens (exit 0)

```bash
neuraz-ds inspect --json
```

`result.tokens.paths` contiene **todos** los nodos (sin cota de 200) y `result.tokens.total ===
result.tokens.paths.length`. No aparece ningún mensaje de truncado (eso es solo del reporter textual).

## Consumir el resultado (ejemplo opcional con `jq`)

> `jq` **no** es dependencia del paquete; es solo un ejemplo de consumo.

```bash
neuraz-ds validate --json | jq -r '.outcome'        # p. ej. "valid"
neuraz-ds inspect  --json | jq '.result.tokens.total'
```

Redirigir a un archivo también funciona (sin TTY):

```bash
neuraz-ds inspect --json > inspection.json
node -e "JSON.parse(require('fs').readFileSync('inspection.json','utf8')); console.log('ok')"
```

## Exit code no cero con JSON válido

Patrón típico en CI: capturar el JSON y seguir según el código.

```bash
out="$(neuraz-ds validate --json)"; code=$?
echo "$out" | jq -e '.outcome'      # JSON siempre parseable
exit "$code"                         # 0/3/4/5/6 según el estado
```

## Compatibilidad

Sin `--json`, `validate` e `inspect` conservan textos, secciones, separación stdout/stderr, cota
textual de 200, códigos y funcionamiento sin TTY. La suite histórica (001 + 002) permanece verde.
