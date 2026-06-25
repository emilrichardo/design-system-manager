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

## Escenarios de seguridad / borde

| Escenario | Acción | Resultado esperado | Exit |
|---|---|---|---|
| Sin `package.json` | `init` en dir sin npm | error claro, **nada escrito** | 5 |
| Desde subcarpeta | `init` desde `apps/web/src` | raíz = dir del `package.json` más cercano | 0 |
| Monorepo | varios `package.json` | usa el más cercano (no la raíz global) | 0 |
| Ya inicializado | `init` por 2ª vez | `unchanged`, sin cambios | 2 |
| Conflicto parcial | existe `neuraz-ds.config.json` | enumera conflictos, **nada escrito** | 4 |
| DTCG inválido previo | `base.tokens.json` con error | informa, no sobrescribe | 4/2 |
| Slug inválido manual | slug `MPF UI` | rechaza, pide corrección | 3 |
| Nombre vacío | name `""` | rechaza | 3 |
| Sin permisos de escritura | dir RO | falla limpio, sin parciales | 6 |
| Symlink hacia afuera | ruta objetivo es symlink externo | rechaza antes de escribir | 5/3 |
| Cancelar en confirmación | responder "no" | `cancelled`, sin cambios | 1 |

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
