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
| `previousState` | enum | `none` \| `complete` \| `partial`. |

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

- **none**: ni config ni manifiesto presentes → flujo de creación.
- **complete**: config + manifiesto válidos y coherentes → `unchanged` (idempotencia, US3).
- **partial**: existe parte (config sin manifiesto, tokens sin config, manifiesto inválido,
  DTCG con errores) → se informa estado y acción necesaria; no se sobrescribe sin autorización.

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
