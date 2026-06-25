# ADR 0005 — Stack inicial del CLI

- **Estado**: Aceptado (decisiones de dirección; versiones exactas al instalar)
- **Fecha**: 2026-06-25
- **Contexto**: Feature 001-ds-init. Constitución V, XIV, XVI. Verificación en
  [research.md](../../specs/001-ds-init/research.md).

## Decisión

| Aspecto | Decisión | Nota |
|---|---|---|
| Runtime | Node.js `>=22` | LTS vigentes (24 Active, 22 Maintenance) en 2026-06. |
| Lenguaje | TypeScript estricto | Tipos para contratos/validación. |
| Módulos | ESM (`type: module`, NodeNext) | Estándar actual de Node LTS. |
| Distribución | Paquete npm con `bin: neuraz-ds` | Un único paquete internamente modular. |
| Comandos/CLI | **commander** | Maduro, 0 deps, subcomandos para futuros `validate`/`inspect`. |
| Prompts | **@clack/prompts** | Cancelación nativa, accesible; tras puerto `Prompter`. |
| Validación entrada/dominio | **zod** | DX TS; tipos derivados del schema. |
| Validación DTCG | **ajv** (JSON Schema 2020-12) | Validador estándar y rápido. |
| SemVer | **semver** | Validación canónica de versiones. |
| Testing | **vitest** v4 | Unit + integración (temp dirs) + CLI por subproceso. |
| Resolución raíz/symlinks | APIs nativas Node (`node:fs`/`node:path`) | Sin dependencia; testeable aislado. |

Dependencias de **producción** previstas (minimizadas): `commander`, `@clack/prompts`, `zod`,
`ajv`, `semver`. Dependencias de **desarrollo**: `typescript`, `vitest`, `@types/node` y un bundler
de salida (p. ej. `tsup`/`tsc`, a decidir en implementación).

## Consecuencias

- Stack mantenido y verificado; ninguna dependencia abandonada.
- El dominio no depende del CLI ni del filesystem (puertos en `application/`), habilitando
  reutilización futura por Studio y MCP (Constitución XV).

## Alternativas rechazadas

- `cac`/`clipanion`/`yargs` para CLI: ver research §5 (commander gana por madurez + subcomandos).
- `inquirer`/`prompts`: @clack maneja mejor la cancelación.
- `node:test`: viable, menos ergonómico para fixtures de integración.
- Framework CLI propio: prohibido por la guía (reinventar sin valor).
