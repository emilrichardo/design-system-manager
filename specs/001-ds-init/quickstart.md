# Quickstart — ds-init

Guía de uso y validación del comando `init` **ya implementado**. Referencia: [spec.md](spec.md),
[data-model.md](data-model.md), [contracts/](contracts/).

## Instalación (desarrollo local)

```bash
npm install -D @neuraz/design-system-manager
npx neuraz-ds init
```

Mientras el paquete no esté publicado, pruébalo con un tarball local:

```bash
# en el repo del gestor
npm run build && npm pack            # genera neuraz-design-system-manager-<version>.tgz
# en el proyecto anfitrión
npm install -D /ruta/al/neuraz-design-system-manager-<version>.tgz
npx neuraz-ds init
```

## Precondición

El proyecto anfitrión debe tener un `package.json`. El inicializador **no** crea `package.json`,
**no** ejecuta `npm init`, **no** instala dependencias, **no** modifica scripts, **no** publica y
**no** crea commits.

`init` es **interactivo** y requiere una terminal (TTY). (Aún no existe un modo no interactivo.)

## Prerrequisitos (para las pruebas automatizadas)

- Node.js `>=22`.
- Un directorio temporal aislado por escenario (las pruebas usan `fs.mkdtemp`).

## Escenario feliz (US1)

```bash
# Dado un proyecto npm sin Design System
mkdir -p host && cd host && npm init -y

# Cuando se ejecuta init (modo interactivo, en una terminal)
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
| Symlink en ruta administrada | una ruta administrada es un symlink (tipo incompatible) | `conflict` | 4 |
| Symlink externo en el dir `design-system` | rechazado en la promoción, no se sigue | `failed`/`filesystem` | 6 |
| Error de escritura | Fallo de E/S en `stage`/`commit` (p. ej. dir sin permisos) → rollback | `failed`/`filesystem` | 6 |
| Verificación posterior falla | `verify` detecta que lo persistido no valida → limpieza | `failed`/`post-verify` | 7 |
| Error interno inesperado (frontera CLI) | excepción no contractual | (no contractual) `70` |

> Resolución correcta de raíz (sin error): ejecutar desde una subcarpeta usa el `package.json` más
> cercano; en monorepo usa el más cercano (**no** la raíz global), inicializa solo ese workspace y
> no escribe fuera de la raíz anfitriona. Ambos terminan en `created` (0) si el resto es exitoso.

> Cancelar antes de confirmar (cancelar un prompt o responder "no") devuelve `cancelled` (exit 1)
> y **no crea archivos ni deja staging**.

### Notas de desambiguación

- **Entrada inválida** (slug/nombre/versión) y **DS completo-inválido** comparten exit `3`
  (categoría `validation`), pero difieren en origen: la primera ocurre en `validate` de entradas;
  la segunda en `inspect` de un DS preexistente. Ninguna escribe.
- **Seguridad de rutas**: el `exit 5` (`host`) corresponde a la resolución del anfitrión (p. ej.
  falta `package.json`). Un symlink/escape en una ruta administrada se rechaza de forma segura sin
  seguir el enlace ni modificar el destino externo: si la ruta administrada **es** un symlink se
  clasifica como `partial` → `conflict` (4); si el directorio `design-system` es un symlink externo
  se rechaza en la promoción → `failed`/`filesystem` (6). En ambos casos no hay escritura externa.

## Portabilidad (US4)

```bash
# Tras init, eliminar el gestor y comprobar que el DS sigue siendo legible y válido
npm remove @neuraz/design-system-manager
cat design-system/design-system.json      # legible
# los archivos permanecen; validan con cualquier validador DTCG/JSON Schema externo
```

## Criterios de éxito cubiertos

SC-001…SC-007 de la spec, verificados por la suite de integración (`tests/integration/*`) y de CLI
(`tests/cli/*`). SC-007 (automatizable en directorio temporal) es la base de esas pruebas. La
auditoría de cierre y la matriz de trazabilidad final están en [audit.md](audit.md).
