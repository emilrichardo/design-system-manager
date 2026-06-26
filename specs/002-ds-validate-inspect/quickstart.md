# Quickstart / Validation Guide — ds-validate-inspect

Guía de validación de la feature (no implementación). Escenarios ejecutables que prueban `validate`
e `inspect` end-to-end. Referencia: [spec.md](spec.md), [data-model.md](data-model.md),
[contracts/](contracts/).

## Prerrequisitos

- Node.js `>=22`; proyecto anfitrión con `package.json`; directorios temporales aislados en pruebas.
- Comandos **no interactivos**: funcionan en CI sin TTY.

## Escenario: DS válido (creado por `init`)

```bash
mkdir host && cd host && npm init -y
npx neuraz-ds init            # crea el DS (feature 001)
npx neuraz-ds validate        # → válido, exit 0
npx neuraz-ds inspect         # → inspección completa, exit 0
```

`validate` muestra: raíz anfitriona, archivos comprobados, estado, nº de errores/warnings, lista de
issues. `inspect` muestra: Identidad / Archivos / Tokens (Grupos, Valores, Aliases) / Validación.

> Cota de presentación (C2): el reporter textual de `inspect` imprime como máximo
> **`MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200`** filas de tokens. Con más de 200 añade un aviso del estilo
> `Mostrando 200 de 12 450 tokens; 12 250 tokens no se muestran en la salida textual.` Es una cota de
> CLI: el modelo headless y las estadísticas conservan todos los tokens; no cambia `valid` ni el exit code.

## Matriz de estados y códigos (uno por escenario)

| Escenario | validate | inspect | Exit |
|---|---|---|---|
| DS completo y válido | válido | inspección completa | 0 |
| DS completo inválido (slug/SemVer/DTCG/alias) | inválido | informe + datos no confiables | 3 |
| Estructura parcial (faltan archivos / tipo incompatible) | inválido | present/missing/recuperables | 4 |
| No inicializado (sin config administrada) | no localizable | "no existe DS administrado" | 5 |
| Sin `package.json` / raíz no resoluble | host | host | 5 |
| Error de lectura / permisos / archivo demasiado grande | error fs | error fs | 6 |

## DTCG — comprobaciones clave

- Tipo **reconocido** (DTCG 2025.10) sin análisis profundo en Neuraz → **warning**
  `dtcg-type-not-deeply-inspected`, DS sigue válido, cuenta en `byType`.
- Tipo **no reconocido** → **error**, DS inválido, nodo `untrusted` en la inspección.
- Token sin `$type` propio que **hereda** un tipo reconocido de un grupo → válido; sin tipo propio ni
  heredado → error.
- Aliases: `{group.token}` válido; inexistente / a-grupo / ciclo (directo/indirecto) / malformado →
  error. `inspect` reporta `aliasState` por token.

## Pureza observacional (clave de seguridad)

```bash
# snapshot del proyecto (listado + bytes + mtime + permisos), ejecutar ambos comandos, re-snapshot:
# el snapshot DEBE ser idéntico — validate/inspect NUNCA escriben ni crean staging/temporales.
```

## Headless (TUI/Studio/MCP futuros)

```ts
const report = await validateDesignSystem({ executionDir }, deps);      // sin Commander/Clack/TTY
const inspection = await inspectDesignSystem({ executionDir }, deps);   // mismo análisis subyacente
```

La CLI solo formatea estos modelos. `--json` queda diferido pero habilitado (los casos de uso ya
devuelven datos estructurados).

## Criterios de éxito cubiertos

SC-001…SC-010 de la spec, verificados por unit + integración (FS real) + CLI + **regresión de `001`**.
Auditoría y matriz de cierre se generarán en la fase final de esta feature.
