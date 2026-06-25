# Quickstart / Validation Guide — ds-init

Guía de **validación** de la funcionalidad (no implementación). Describe escenarios ejecutables que
prueban `init` de extremo a extremo una vez implementado. Referencia: [spec.md](spec.md),
[data-model.md](data-model.md), [contracts/](contracts/).

## Prerrequisitos (entorno de prueba)

- Node.js `>=22`.
- Un directorio temporal aislado por escenario (las pruebas usan `fs.mkdtemp`).
- El paquete del gestor enlazado/instalado en el proyecto de prueba (futuro).

## Escenario feliz (US1)

```bash
# Dado un proyecto npm sin Design System
mkdir -p /tmp/host && cd /tmp/host && npm init -y

# Cuando se ejecuta init (modo interactivo)
npx neuraz-ds init
#   → solicita: name, slug (autopropuesto), description?, version (def 0.1.0)
#   → muestra el PLAN: raíz anfitriona resuelta, archivos nuevos, conflictos: ninguno
#   → pide confirmación → sí
```

**Resultado esperado** (`status: created`, exit 0):

```text
design-system/
├── design-system.json          # manifiesto
└── tokens/
    └── base.tokens.json        # DTCG 2025.10 mínimo válido
neuraz-ds.config.json           # config del gestor
```

Verificaciones (semánticas, no snapshots):
- `neuraz-ds.config.json` valida contra su schema y `designSystemDir = "design-system"`.
- `design-system.json` valida; `slug` cumple la regex; `version = 0.1.0`.
- `base.tokens.json` valida como DTCG y el alias `{color.base.blue-500}` resuelve.

## Escenarios — resultado semántico y código de salida (uno por escenario)

Cada escenario tiene **exactamente un** código de salida según el contrato vigente
([contracts/exit-codes.md](contracts/exit-codes.md), fuente normativa) y su `status`
([contracts/initialization-result.contract.md](contracts/initialization-result.contract.md)).

| Escenario | Condición que lo produce | `status` | Exit |
|---|---|---|---|
| Inicialización exitosa | Estado `none`, datos válidos, confirmación dada | `created` | 0 |
| Cancelación | El usuario responde "no" en `confirm` (o cancela un prompt) | `cancelled` | 1 |
| DS ya inicializado y válido | Estado `complete-valid` (config + obligatorios presentes y válidos) | `unchanged` | 2 |
| Slug inválido | Entrada de slug no cumple la regex (validación de entrada) | `failed`/`validation` | 3 |
| Nombre vacío | Entrada de nombre vacía (validación de entrada) | `failed`/`validation` | 3 |
| DS completo pero inválido | Estado `complete-invalid` (manifiesto/SemVer/DTCG/refs inválidos) | `failed`/`validation` | 3 |
| Archivos parciales | Estado `partial` (p. ej. existe `neuraz-ds.config.json` sin manifiesto) | `conflict` | 4 |
| Conflicto de rutas | Una ruta objetivo ya está ocupada (detectado en `plan`) | `conflict` | 4 |
| Ausencia de `package.json` | `resolve` no halla `package.json` en el límite | `failed`/`host` | 5 |
| Symlink/ruta que escapa | Ruta objetivo resuelve (realpath) fuera de la raíz anfitriona | `failed`/`host` | 5 |
| Error de escritura | Fallo de E/S en `stage`/`commit` (p. ej. dir sin permisos) → rollback | `failed`/`filesystem` | 6 |
| Verificación posterior falla | `verify` detecta que lo persistido no valida → limpieza | `failed`/`post-verify` | 7 |

> Resolución correcta de raíz (sin error): ejecutar desde una subcarpeta usa el `package.json` más
> cercano; en monorepo usa el más cercano (no la raíz global). Ambos terminan en `created` (0) si
> el resto del flujo es exitoso.

### Notas de desambiguación

- **Entrada inválida** (slug/nombre/versión) y **DS completo-inválido** comparten exit `3`
  (categoría `validation`), pero difieren en origen: la primera ocurre en `validate` de entradas;
  la segunda en `inspect` de un DS preexistente. Ninguna escribe.
- **Ausencia de `package.json`** y **escape de ruta/symlink externo** comparten exit `5`
  (`host`/límite autorizado), por ser ambos fallos de resolución/seguridad del anfitrión, antes de
  cualquier escritura.

## Portabilidad (US4)

```bash
# Tras init, eliminar el gestor y comprobar que el DS sigue siendo legible y válido
npm remove @neuraz/design-system-manager
cat design-system/design-system.json      # legible
# los archivos permanecen; validan con cualquier validador DTCG/JSON Schema externo
```

## Criterios de éxito cubiertos

SC-001…SC-007 de la spec. SC-007 (automatizable en directorio temporal) es la base de las pruebas
de integración descritas en [plan.md](plan.md) (§ Testing) y en la futura `tasks.md`.
