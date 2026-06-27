# ADR 0011 — Contrato JSON público y versionado

- **Estado**: Aceptado
- **Fecha**: 2026-06-27
- **Contexto**: Feature 003-json-output. `validate`/`inspect` deben ofrecer una salida JSON estable
  para scripts, CI, agentes y MCP, reutilizando los resultados headless existentes
  (`ValidateDesignSystemResult` / `InspectDesignSystemResult`) sin reanalizar. Constitución II, XIII,
  XV, XVI, XVII.

## Decisión

1. **Envelope versionado** con cuatro campos base **siempre presentes**: `formatVersion`, `command`,
   `outcome`, `result`. En `not-found` e `internal-error`, `result === null`.
2. **`formatVersion = "1.0.0"`**, constante inmutable `JSON_FORMAT_VERSION` en la capa de aplicación,
   **independiente** de `package.version`. Semver del contrato: patch = fix de serialización; minor =
   campos opcionales nuevos; major = quitar/renombrar/retipar/cambiar enum o cardinalidad.
3. **DTO públicos separados del dominio** (`JsonValidateResultV1`, `JsonInspectResultV1`,
   `JsonIssueV1`, `JsonInspectedValueV1<T>`, `JsonValidationV1`, envelopes). **Nunca** se serializa un
   objeto de dominio con `JSON.stringify(domainObject)`: mappers puros traducen resultado → DTO.
4. **Null-policy única**: campos estables ⇒ siempre presentes (con `null`/`[]`/`{}`); se omiten solo
   los campos que el contrato declara específicos de un outcome (`error` en `not-found`/
   `internal-error`). Prohibido `undefined`/`NaN`/`Infinity`/`BigInt`/función/símbolo.
5. **Campo `error` de nivel superior** en `not-found` (mapea `hostError`, puede ser `null`) e
   `internal-error` (`{code,message}`). Decisión tomada para respetar la spec (US8, FR-009), que
   muestra `error` en el nivel superior; se descarta la alternativa de anidarlo en `result.error`.
6. **Seguridad del contrato**: no se exponen `context` de issues, stacks, errores crudos AJV/Zod,
   contenido de archivos ni configuración completa.

## Consecuencias

- El contrato público evoluciona sin acoplarse al dominio ni a `package.version`.
- Los consumidores deben tolerar claves desconocidas (compatibilidad hacia adelante con minors).
- Cualquier cambio incompatible exige bump de `formatVersion` mayor.

## Alternativas rechazadas

- `JSON.stringify` directo del dominio: filtra campos internos y acopla el contrato a la
  implementación.
- Versión = `package.version`: ata el formato al ciclo de release del paquete.
- `error` anidado en `result.error`: contradice los ejemplos normativos de la spec (US8/FR-009).

## Referencias

- [contracts/json-envelope-v1](../../specs/003-json-output/contracts/json-envelope-v1.contract.md),
  [data-model.md](../../specs/003-json-output/data-model.md). Relacionado: ADR-0006 (exit codes),
  ADR-0007 (modelo de inspección), ADR-0012, ADR-0013.
