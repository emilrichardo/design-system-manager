# ADR 0004 — Estructura mínima de archivos creada por `init`

- **Estado**: Aceptado
- **Fecha**: 2026-06-25
- **Contexto**: Feature 001-ds-init. Constitución II, III, IV, VI, XVII.

## Decisión

`init` crea **solo** los archivos con función real en esta fase:

```text
<raíz-anfitriona>/
├── neuraz-ds.config.json            # configuración del gestor (localiza el DS)
└── design-system/
    ├── design-system.json           # manifiesto (identidad del DS)
    └── tokens/
        └── base.tokens.json         # documento DTCG 2025.10 mínimo válido
```

- **Configuración** en la raíz anfitriona: `neuraz-ds.config.json` (apunta a `designSystemDir`).
- **Manifiesto** en `design-system/design-system.json`.
- **Tokens** (fuente canónica) en `design-system/tokens/`.
- **Separación fuente ↔ artefactos**: la carpeta de artefactos generados (futuro Style Dictionary)
  **no se crea aún**; se reservará como `dist/` o `design-system/.generated/` cuando exista la
  funcionalidad de generación. La fuente nunca se mezcla con artefactos.

### Lo que NO se crea (Constitución XVI — solo lo indispensable)
No se crean carpetas vacías de componentes, patrones, páginas, assets, adapters, documentación ni
artefactos generados.

## Estrategia de evolución

- Nuevas categorías (componentes, temas, etc.) se añadirán en specs posteriores, cada una con su
  contrato; el manifiesto y la config son extensibles por versión de schema.
- La ruta de artefactos generados se definirá en la spec de generación, manteniendo la regla de
  separación y portabilidad.

## Consecuencias

- Resultado comprensible sin instalar el gestor (Constitución XVII) y compatible a futuro con
  Style Dictionary sin acoplarlo ahora (Constitución IV).

## Alternativas rechazadas

- Crear el árbol completo (componentes/patterns/pages/assets): viola "solo lo indispensable" y
  genera ruido vacío.
- Guardar todo en un único archivo: dificulta la separación fuente/artefactos y la evolución.
