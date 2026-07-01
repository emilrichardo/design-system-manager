# Contract: Deep DTCG Type Support

**Feature**: `011` | Applies to: `validate`/`inspect` (`002`), `foundations` (`004`), `build`/`export`
(`006`, ya profundo en export — este contrato lo alinea con validación/inspección).

Reemplaza, para los 13 tipos reconocidos, el warning genérico `dtcg-type-not-deeply-inspected` por
comportamiento específico. `string` y `boolean` se mantienen soportados sin ser DTCG-estrictos (uso en
metadata de mutaciones de `008`), sin cambios.

| Type | Parser/shape | Validation | Normalization | Resolution | CSS | JSON | TypeScript | Error behavior |
|---|---|---|---|---|---|---|---|---|
| `color` | Objeto sRGB (`colorSpace`,`components`,`alpha`,`hex`) | Ya profundo (`002`) | Ya normalizado | Alias string `{...}` | `#hex` / `rgb()` | Objeto sRGB | Objeto sRGB tipado | `dtcg-color-value-invalid` (ya existe) |
| `dimension` | `{value:number, unit:"px"\|"rem"\|"em"\|"%"}` | `value` finito, `unit` en enum | Ninguna (preserva unidad declarada) | Alias | `${value}${unit}` | Objeto | Objeto tipado | `dimension-shape-invalid` |
| `fontFamily` | `string \| string[]` no vacío | Cada família no-vacía | Ninguna | Alias | Comillas dobles si no es familia genérica | String/array | String/array tipado | `font-family-shape-invalid` |
| `fontWeight` | `"normal" \| "bold" \| number(1-1000 entero)` | Rango/enum | Ninguna | Alias | Número o keyword | Igual | Igual | `font-weight-shape-invalid` |
| `duration` | `{value:number, unit:"ms"\|"s"}` | Igual que `dimension` | Ninguna | Alias | `${value}${unit}` | Objeto | Objeto tipado | `duration-shape-invalid` |
| `cubicBezier` | `[x1,y1,x2,y2]`, `x1,x2 ∈ [0,1]` | 4 números finitos, rango de `x` | Ninguna | Alias | `cubic-bezier(...)` | Array | Tupla tipada | `cubic-bezier-shape-invalid` |
| `number` | `number` finito | Finito | Ninguna | Alias | Número crudo | Número | Número | `number-shape-invalid` |
| `strokeStyle` | `string` (enum CSS) o objeto `{dashArray,lineCap}` | Enum o forma de objeto | Ninguna | Alias | Valor CSS directo | Igual | Igual | `stroke-style-shape-invalid` |
| `border` | `{color, width:Dimension, style:StrokeStyle}` | Composición de los 3 tipos | Ninguna | Alias a nivel raíz o por sub-campo | `${width} ${style} ${color}` | Objeto compuesto | Objeto tipado | `border-shape-invalid` |
| `transition` | `{duration:Duration, delay:Duration, timingFunction:CubicBezier}` | Composición | Ninguna | Alias | `${duration} ${timingFunction} ${delay}` | Objeto compuesto | Objeto tipado | `transition-shape-invalid` |
| `shadow` | `{color, offsetX:Dimension, offsetY:Dimension, blur:Dimension, spread:Dimension, inset?:boolean}` o array (multi-capa) | Composición; array no vacío | `blur`/`spread` default `{0,"px"}` si ausentes (ya en `css-renderer.ts`) | Alias a nivel raíz | `${x} ${y} ${blur} ${spread} ${color}${inset}` (join `, ` si multi-capa) | Objeto/array | Objeto/array tipado | `shadow-shape-invalid` |
| `gradient` | `[{color, position:number(0-1)}]` no vacío | Cada stop válido, posiciones ordenables | Ninguna | Alias a nivel raíz | `linear-gradient(...)` (u otro tipo declarado) | Array de stops | Array tipado | `gradient-shape-invalid` |
| `typography` | `{fontFamily, fontSize:Dimension, fontWeight, lineHeight:number, letterSpacing:Dimension}` (subset composable) | Composición de los tipos simples referenciados | Ninguna | Alias a nivel raíz o por sub-campo | Shorthand `font: ...` o custom properties múltiples | Objeto compuesto | Objeto tipado | `typography-shape-invalid` |

## Rules

1. **R1 — Un tipo de esta tabla nunca emite `dtcg-type-not-deeply-inspected`.** Ese código queda
   reservado para tipos futuros no listados aquí (si DTCG define un tipo 14 en una versión posterior).
2. **R2 — El error específico por tipo es siempre más específico que el warning genérico.** Debe incluir
   el `path` del token y qué sub-campo falló cuando el tipo es compuesto.
3. **R3 — Ningún parser nuevo se implementa dos veces.** El parser de `build`/`export` (`css-renderer.ts`,
   ya escrito para 12 de 13 tipos) es la única fuente de verdad de forma; `validate`/`inspect` deben
   **reutilizarlo**, nunca reimplementar reglas de forma en paralelo (viola guardrail 3: "no se duplica
   lógica de negocio por interfaz").
4. **R4 — Compatibilidad**: un documento `001`–`010` con tokens `color`-only sigue validando exactamente
   igual; esta tabla solo añade comportamiento para tipos que antes caían en el warning genérico.

## Out of scope

- Resolución de gradientes/tipografía compuesta a través de múltiples niveles de alias anidados con
  sub-campos parcialmente aliasados — se documenta como límite conocido para `012`, no ambiguo pero no
  resuelto en `011`.
