# ADR 0002 — Resolución de la raíz anfitriona y límite autorizado de escritura

- **Estado**: Aceptado
- **Fecha**: 2026-06-25
- **Contexto**: Feature 001-ds-init. Constitución I, XIV, XVII.

## Decisión

### Algoritmo de resolución
1. Partir del directorio **real** de ejecución (`realpath(process.cwd())`).
2. Ascender buscando el `package.json` **más cercano**.
3. Detectar la raíz Git más cercana (`.git`) cuando exista.
4. El `package.json` elegido debe estar **dentro** de esa raíz Git.
5. La búsqueda **nunca** asciende por encima de la raíz Git.
6. Sin repositorio Git: la raíz anfitriona es el directorio del `package.json` más cercano.
7. En **monorepo** (varios `package.json`): se usa el **más cercano** al directorio de ejecución;
   la raíz anfitriona es ese workspace, **no** la raíz global. La v1 administra solo ese workspace.
8. Si existe configuración Neuraz previa válida dentro de la misma raíz, tiene prioridad para
   identificar el DS.

### Normalización y seguridad de rutas (límite autorizado)
- Todas las rutas se normalizan y se resuelven por **ruta real** (`fs.realpath`) antes de escribir.
- El **límite autorizado de escritura** es la raíz anfitriona resuelta.
- Se **rechaza** cualquier ruta, symlink o configuración que conduzca fuera del límite: directorios
  superiores, otro workspace o rutas absolutas externas. La operación **falla antes de escribir**.
- La raíz resuelta se **muestra al usuario** antes de confirmar.

## Consecuencias

- Implementable con APIs nativas de Node (sin dependencias) y testeable de forma aislada.
- Exit `5` (`INVALID_HOST`) ante raíz no resoluble; rechazo de escape ⇒ `failed`/exit 5 o 3 según
  origen.

## Alternativas rechazadas

- Exigir ejecución desde la raíz: peor UX y propenso a errores.
- Usar la raíz global del monorepo: contradice "un workspace por ejecución" y la spec.
- `find-up`/`pkg-dir`: dependencias para lógica trivial que además no cubren tope Git ni anti-escape.
