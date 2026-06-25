// T027 — Builder determinista del documento DTCG 2025.10 mínimo
// (design-system/tokens/base.tokens.json). Contenido exacto de ADR-0004 /
// contracts/dtcg-tokens.contract.md: grupo `color`, $type heredado, base + alias.
// Puro. NO es una identidad visual completa ni una paleta extensa.

/** Documento DTCG (estructura JSON anidada). La validez se comprueba con el validador DTCG. */
export type DtcgDocument = Record<string, unknown>;

export function buildTokens(): DtcgDocument {
  return {
    color: {
      $type: "color",
      base: {
        "blue-500": {
          // DTCG 2025.10 Color Module: valor concreto como objeto sRGB.
          // components = canales RGB de #3b82f6 (59,130,246) normalizados en [0,1].
          $value: {
            colorSpace: "srgb",
            components: [0.231372549, 0.509803922, 0.964705882],
            alpha: 1,
            hex: "#3b82f6",
          },
          $description: "Color base de ejemplo (azul 500). Reemplazar por la paleta real del proyecto.",
        },
      },
      brand: {
        primary: {
          // Alias/referencia: string canónico (sigue la validación de formato/existencia/ciclos).
          $value: "{color.base.blue-500}",
          $description: "Color de marca primario, definido como alias del color base.",
        },
      },
    },
  };
}
