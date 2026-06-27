# Contract — JSON InspectedValue v1 (003)

Proyección pública estable de `InspectedValue<T>` (dominio). Mapper genérico puro.
Ver [data-model.md](../data-model.md) §3.

## Forma

```ts
interface JsonInspectedValueV1<T> {
  value: T | null; // SIEMPRE presente; null cuando trust === "unavailable" o value ausente
  trust: "valid" | "recovered" | "untrusted" | "unavailable"; // SIEMPRE
}
```

## Regla de mapeo (crítica)

El dominio define `InspectedValue<T> = { value?: T; trust }` con **`value` OPCIONAL** (omitido cuando
`trust === "unavailable"`). El JSON público **no** debe depender de esa omisión:

```ts
toJsonInspectedValue(iv: InspectedValue<T> | undefined): JsonInspectedValueV1<T> {
  if (iv === undefined) return { value: null, trust: "unavailable" };
  return { value: iv.value ?? null, trust: iv.trust };
}
```

- `value` **siempre presente**; nunca `undefined` (FR-017/FR-018).
- `trust` **siempre presente**; preserva los cuatro niveles `valid|recovered|untrusted|unavailable`.
- Se aplica de forma uniforme a identidad y schema versions (cada subcampo).

## Ejemplos

```json
{ "value": "Acme Design System", "trust": "valid" }
```

```json
{ "value": "0.1.0", "trust": "recovered" }
```

```json
{ "value": null, "trust": "unavailable" }
```
