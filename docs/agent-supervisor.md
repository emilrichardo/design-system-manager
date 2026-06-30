# Agent Supervisor — supervisor local y determinista de checkpoints

Tooling del repositorio para automatizar el trabajo de agentes (Codex / Claude) por **feature** y
**checkpoint**, reduciendo la supervisión manual. Vive en `scripts/agent/` y NO forma parte del Core del
Design System Manager (`src/**`). La única fuente canónica del estado de tareas sigue siendo
`specs/<feature>/tasks.md`: el supervisor lo lee, nunca mantiene un estado paralelo.

## Propósito

- Detectar el estado actual de una feature desde `tasks.md`.
- Generar prompts breves (briefs) para el agente sin volcar specs completos.
- Verificar de forma determinista alcance, estado de tareas y gates.
- Generar handoffs para continuar con otro agente.
- Finalizar checkpoints de forma controlada (dry-run por defecto; commit quirúrgico con `--commit`).

Sirve para **cualquier feature Speckit** presente o futura, no solo `006-build-export`.

## Instalación

No requiere instalación: usa Node.js 22 y no añade dependencias. Los comandos se exponen como scripts npm.

## Comandos

```bash
npm run agent:status   -- --feature <feature> [--checkpoint <cp>] [--json]
npm run agent:brief    -- --feature <feature> [--checkpoint <cp>] [--json] [--output <file.md>]
npm run agent:verify   -- --feature <feature> [--checkpoint <cp>] [--json] [--quick|--skip-tests|--skip-build] [--path <glob> ...]
npm run agent:handoff  -- --feature <feature> [--checkpoint <cp>] [--json] [--quick|--skip-tests|--skip-build]
npm run agent:finalize -- --feature <feature> [--checkpoint <cp>] [--json]            # dry-run
npm run agent:finalize -- --feature <feature> --checkpoint <cp> --message "<msg>" --commit
```

Parámetros comunes: `--feature`, `--checkpoint` (opcional: se infiere desde la primera tarea pendiente),
`--json`. El checkpoint puede darse como su label (`A`, `B`, `L`, …), case-insensitive.

### agent:status

Informa `feature`, `totalTasks`, `completedTasks`, `firstPendingTask`, `activeCheckpoint`,
`checkpointRange`, `head`, `workingTree`, `allowedUntracked`. Falla claramente ante: feature inexistente,
`tasks.md` ausente, rango indeterminable, IDs duplicados o marcado inconsistente.

### agent:brief

Genera un prompt **breve** con las tareas exactas del rango, las fuentes canónicas (por path, sin
copiarlas), los gates, la siguiente tarea fuera de alcance, el working tree permitido, las reglas de
commit y el formato de informe. `--output` lo escribe a un archivo; `--json` lo envuelve.

### agent:verify

Validación determinista de:

- **Estado de tareas**: anteriores completas, rango correcto, ninguna posterior iniciada, primera
  pendiente esperada, sin IDs duplicados, sin huecos inconsistentes.
- **Git**: `.agents/skills/speckit-agent-context-update/` nunca staged; deriva de alcance (cuando hay
  configuración o `--path`).
- **Gates**: `typecheck`, `lint`, `test`, `build`, `git diff --check` (lista cerrada).

Banderas: `--quick` (solo typecheck/lint/diffcheck), `--skip-tests`, `--skip-build`. Los gates omitidos
se muestran explícitamente. El cierre completo (`finalize --commit`) **no** permite omitir gates.

Salida humana: `PASS`, o `FAIL` seguido de la lista de fallos. También `--json` estable.

### agent:handoff

Genera `.agent-handoff.json` y `.agent-handoff.md` (ignorados por git) con feature, checkpoint, range,
head, lastValidCommit, tareas, archivos modificados/staged/untracked, gates ejecutados/pasados/fallados,
deriva de alcance, siguiente comando recomendado y `generatedAt`. No incluye fuentes completas, secretos,
variables de entorno ni stack traces.

### agent:finalize

Por defecto **dry-run**: muestra qué marcaría y qué stagearía, sin tocar nada. Con `--commit`:

1. valida (gates completos);
2. comprueba que hay trabajo productivo;
3. marca **solo** el rango;
4. re-verifica el estado;
5. staging quirúrgico (excluye `.agents`);
6. crea un único commit con `--message`;
7. informa primera pendiente y siguiente checkpoint.

Ante un gate fallido no marca, no commitea ni limpia el working tree, y sugiere generar un handoff.
Nunca usa `git add .` / `git add -A`.

## Flujo recomendado

```text
agent:status
→ agent:brief                 # pegar el brief al agente
→ (el agente implementa)
→ agent:verify --quick        # feedback rápido
→ (el agente corrige)
→ agent:verify                # gates completos
→ agent:finalize --commit     # cierra el checkpoint
→ siguiente checkpoint
```

## Salida JSON

Todos los comandos aceptan `--json` con una forma estable apta para CI/agentes. Ejemplo de
`agent:status --json`:

```json
{
  "feature": "006-build-export",
  "totalTasks": 158,
  "completedTasks": 158,
  "firstPendingTask": null,
  "activeCheckpoint": "L",
  "checkpointRange": "T140–T158",
  "head": "0de8e4f",
  "workingTree": "clean",
  "allowedUntracked": [".agents/skills/speckit-agent-context-update/"]
}
```

## Handoff entre Codex y Claude

`agent:handoff` produce un resumen accionable para retomar el trabajo con otro agente sin repetir el
prompt original. El receptor lee `.agent-handoff.md` (o el JSON), ejecuta `agent:status`/`agent:verify`
para confirmar y continúa con `nextRecommendedCommand`.

## Quick verification vs full verification

- **Quick** (`agent:verify --quick`): typecheck + lint + `git diff --check`. Para iteración rápida.
- **Full** (`agent:verify`): añade `test` y `build`. Requerido antes de `finalize --commit`.

## finalize: dry-run vs commit

- **dry-run** (sin `--commit`): inspección segura; nunca marca, stagea ni commitea.
- **commit** (`--commit --message "<msg>"`): cierre real, con verificación previa y posterior.

## Configuración opcional (`.agent-supervisor.json`)

Solo defaults y reglas globales — **nunca** estado de tareas ni comandos arbitrarios. Claves permitidas:

```json
{
  "allowedUntracked": [".agents/skills/speckit-agent-context-update/"],
  "gates": { "typecheck": true, "lint": true, "test": true, "build": true, "diffcheck": true },
  "scope": { "007-asset-manager": { "B": ["src/assets/**", "tests/assets/**"], "*": ["src/**"] } }
}
```

`scope` define paths autorizados por feature/checkpoint para detectar deriva. Sin configuración ni
`--path`, no hay restricción de alcance (no se bloquean features nuevas).

## Seguridad

- Los gates son una **lista cerrada** (`typecheck`, `lint`, `test`, `build`, `diffcheck`); jamás se
  ejecutan comandos provenientes de `tasks.md` ni de configuración.
- `tasks.md` es contenido, no código confiable: solo se parsea.
- Se rechazan nombres de feature con traversal, paths fuera del repo, checkpoints inválidos, argumentos
  ambiguos y `.agent-supervisor.json` como symlink.
- `child_process` se invoca con argumentos como array (sin shell): no hay inyección de comandos.
- Las salidas no incluyen secretos ni variables de entorno.

## Resolución de errores

- **"La feature no existe"** → revisa `--feature` (debe existir `specs/<feature>/`).
- **"No existe tasks.md"** → la feature aún no tiene tareas generadas (`/speckit-tasks`).
- **"Estado de tareas inconsistente"** → hay IDs duplicados o una tarea posterior marcada con una
  anterior pendiente; corrige `tasks.md`.
- **"No se puede inferir el checkpoint"** → pasa `--checkpoint <label>`.
- **`finalize --commit` bloqueado** → ejecuta `agent:verify` para ver los fallos; corrige y reintenta.

## Limitaciones

- No reconstruye el estado: si `tasks.md` está mal marcado, el supervisor lo refleja (y lo señala),
  no lo corrige solo.
- No puede comprobar históricamente que no se usó `git add .`; sí garantiza staging explícito en
  `finalize`.
- La detección de deriva de alcance solo actúa cuando hay `scope` configurado o `--path`.
- Los gates dependen de los scripts npm del repo; si cambian de nombre, actualiza la lista cerrada en
  `scripts/agent/lib/gates.mjs`.
- El handoff incluye `generatedAt` (timestamp), por lo que no es un artefacto determinista.
