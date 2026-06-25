# Data Model — ds-init (Phase 1)

Entidades del dominio y reglas de validación. Modelo conceptual independiente del lenguaje; los
tipos TS se derivan de los schemas (ver `contracts/`). El dominio NO contiene I/O.

## Entidades

### DesignSystemIdentity (entrada de dominio)
Datos mínimos que el usuario aporta/confirma.

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `name` | string | Sí | No vacío tras recortar espacios. Sin restricción de charset (libre, legible). |
| `slug` | string | Sí | Cumple `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Autopropuesto desde `name`; editable. |
| `description` | string | No | Texto libre opcional. |
| `version` | string | Sí | SemVer válido. Por defecto `0.1.0`. |

**Reglas de derivación de slug** (desde `name`): minúsculas → transliterar/eliminar diacríticos →
separadores/espacios a un único `-` → eliminar caracteres no permitidos → recortar `-` inicial/final.
Si el resultado queda vacío → solicitar edición manual. Un slug **escrito manualmente** que sea
inválido NO se corrige en silencio: se rechaza con explicación (FR-008a, ADR-0003).

### HostRoot (resultado de resolución)
| Campo | Tipo | Descripción |
|---|---|---|
| `rootDir` | path absoluto real | Directorio del `package.json` más cercano (raíz anfitriona). |
| `packageJsonPath` | path | Ruta al `package.json` que define la raíz. |
| `gitRootDir` | path \| null | Raíz Git más cercana (tope de búsqueda) si existe. |
| `isMonorepoChild` | boolean | true si hay un `package.json` ancestro adicional dentro del gitRoot. |

**Invariantes**: `rootDir` está dentro de `gitRootDir` cuando éste existe; la búsqueda nunca
asciende por encima de `gitRootDir`; todas las rutas se normalizan con realpath. (ADR-0002)

### ManagerConfig (`neuraz-ds.config.json`)
Configuración mínima del gestor para localizar el DS en futuras ejecuciones.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `configSchemaVersion` | string (SemVer) | Sí | Versión del schema de configuración. |
| `designSystemDir` | string (ruta relativa) | Sí | Ruta relativa a la carpeta del DS (p. ej. `design-system`). |
| `formatVersion` | string | No | Versión del formato administrado (DTCG `2025.10`). |

No duplica los datos del manifiesto. Contrato: `contracts/neuraz-ds.config.schema.md`.

### DesignSystemManifest (`design-system/design-system.json`)
Identidad canónica del Design System.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `manifestSchemaVersion` | string (SemVer) | Sí | Versión del formato del manifiesto. |
| `name` | string | Sí | = `DesignSystemIdentity.name`. |
| `slug` | string | Sí | = slug validado. |
| `description` | string | No | Opcional. |
| `version` | string (SemVer) | Sí | Versión del DS (def. `0.1.0`). |
| `tokensDir` | string (ruta relativa) | No | Referencia a fuentes de tokens (p. ej. `tokens`) si es necesaria. |

**No contiene valores visuales** (sin colores/medidas). Contrato:
`contracts/design-system.manifest.schema.md`.

### DtcgTokenDocument (`design-system/tokens/base.tokens.json`)
Documento DTCG **2025.10** mínimo y válido. Demuestra grupo, `$type`, `$value`, `$description` y un
alias. Contrato y contenido exacto: `contracts/dtcg-tokens.contract.md`.

### InitializationPlan (dominio)
Plan calculado antes de escribir.

| Campo | Tipo | Descripción |
|---|---|---|
| `hostRoot` | HostRoot | Raíz resuelta y mostrada al usuario. |
| `filesToCreate` | { path; contents }[] | Archivos nuevos (rutas relativas a `rootDir`). |
| `conflicts` | string[] | Rutas objetivo ya ocupadas (no se sobrescriben). |
| `previousState` | enum | `none` \| `complete-valid` \| `partial` \| `complete-invalid`. |

### ValidationResult (dominio)
| Campo | Tipo | Descripción |
|---|---|---|
| `ok` | boolean | true si no hay errores críticos. |
| `errors` | Issue[] | Errores que bloquean (build/escritura). |
| `warnings` | Issue[] | Advertencias no bloqueantes. |

`Issue = { code: string; message: string; path?: string }`.

### InitializationResult (salida del caso de uso)
Resultado estructurado independiente de la terminal. Ver
`contracts/initialization-result.contract.md`.

```text
| { status: "created";   files: string[] }
| { status: "unchanged"; reason: string }
| { status: "cancelled" }
| { status: "conflict";  conflicts: string[] }
| { status: "failed";    errors: Issue[] }
```

## Estados de inicialización previa (FR-004)

`init` clasifica el estado del proyecto en **cuatro** categorías mutuamente excluyentes. Cada una
determina un `InitializationResult.status` y un único código de salida (ver
`contracts/initialization-result.contract.md` y `contracts/exit-codes.md`). **`001-ds-init` no
repara, adopta, migra ni recupera** estructuras parciales o inválidas (fuera de alcance).

| Estado | Definición | Comportamiento | `status` | Exit |
|---|---|---|---|---|
| `none` | No existe configuración Neuraz válida ni archivos reconocibles del DS administrado. | Continúa: inspección → plan → (sin escribir antes de confirmar). | `created` (o `cancelled`/`conflict` según el flujo) | 0 / 1 / 4 |
| `complete-valid` | Existe configuración reconocible y **todos** los archivos obligatorios están presentes y validan. | No escribe ni modifica nada; informa la ubicación del DS detectado. | `unchanged` | 2 |
| `partial` | Existen uno o más artefactos en rutas/nombres administrados, pero **no** conforman una inicialización completa y válida (p. ej. config sin manifiesto; manifiesto sin config; carpeta de tokens sin config; algunos de los archivos que `init` crearía; config que referencia archivos ausentes). | Se trata como **conflicto**: no completa, no repara, no sobrescribe, no escribe; enumera archivos encontrados y obligatorios ausentes; explica que el usuario debe resolverlos (o usar una futura función de reparación). | `conflict` | 4 |
| `complete-invalid` | La configuración y la estructura obligatoria existen, pero uno o más documentos canónicos son inválidos (manifiesto con schema inválido, versión no SemVer, tokens que no validan como DTCG, referencias inválidas). | No modifica archivos; informa los errores de validación. **No** se clasifica como `partial` ni como conflicto de archivos. | `failed` (categoría `validation`) | 3 |

> `none` es el único estado que puede terminar escribiendo; el resultado final depende del flujo
> (creación exitosa, cancelación o conflicto de rutas detectado durante el `plan`).

## Relaciones

```text
DesignSystemIdentity ──(produce)──▶ DesignSystemManifest
ManagerConfig.designSystemDir ──(apunta a)──▶ carpeta del DS ──(contiene)──▶ DtcgTokenDocument
HostRoot ──(límite de)──▶ InitializationPlan.filesToCreate (todas dentro de rootDir)
InitializationPlan ──(se ejecuta y valida)──▶ InitializationResult
```

## Reglas de validación transversales

- Todas las rutas en `filesToCreate` deben resolver (realpath) **dentro** de `hostRoot.rootDir`
  (ADR-0002); cualquier escape ⇒ `failed` antes de escribir.
- Validación en 3 capas (research §7): entrada (zod) → dominio (reglas slug/semver/identidad) →
  archivos generados (ajv/DTCG + relectura post-escritura).
