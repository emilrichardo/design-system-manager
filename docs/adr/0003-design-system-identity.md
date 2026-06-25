# ADR 0003 — Identidad del Design System (slug y versión)

- **Estado**: Aceptado
- **Fecha**: 2026-06-25
- **Contexto**: Feature 001-ds-init. Constitución XVII.

## Decisión

### Slug
- **Obligatorio**; se **autopropone** desde el nombre y es **editable** antes de confirmar.
- Regex aprobada: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
  - minúsculas ASCII, dígitos y guiones simples;
  - sin guion inicial/final ni guiones consecutivos;
  - sin espacios, barras, puntos ni caracteres de ruta; no puede ser `.` ni `..`.
- **Derivación desde el nombre**: minúsculas → transliterar/eliminar diacríticos de forma
  predecible → separadores y espacios a un único `-` → eliminar caracteres no permitidos → recortar
  `-` inicial/final. Si el resultado queda vacío ⇒ solicitar edición manual.
- Un slug **escrito manualmente** inválido **no** se corrige en silencio: se explica el problema y
  se pide corrección.

Ejemplos válidos: `mpf-design-system`, `neuraz`, `municipal-ui-2026`.
Inválidos: `MPF Design System`, `mpf_design_system`, `-mpf`, `mpf-`, `mpf--design`, `../design-system`.

### Versión inicial
- Valor por defecto: **`0.1.0`**.
- Debe cumplir **SemVer** (validado con el paquete `semver`).
- Motivo: representa un DS recién inicializado, sin API estable, evolucionable antes del primer
  release estable.

Válidos: `0.1.0`, `1.0.0`, `1.2.3`, `1.0.0-beta.1`. Una versión inválida impide continuar.

## Consecuencias

- Reglas deterministas y testeables (unit tests de derivación y validación).
- Exit `3` (`INVALID_INPUT`) ante slug/versión inválidos.

## Alternativas rechazadas

- Permitir mayúsculas/guiones bajos: rompe portabilidad de nombres en URLs/rutas/paquetes.
- Default `1.0.0`: implicaría API estable desde el inicio, contrario al estado real.
- Corregir slug manual silenciosamente: viola transparencia (Constitución VII).
