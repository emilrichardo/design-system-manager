// T030 (006) — Escaping de valores string CSS entre comillas dobles. Separado de la validación de
// identifiers (T026). Política exacta de `research.md`:
//   - escape de `\` y `"` con `\X`;
//   - LF, CR, form feed, NULL y controles C0 + DEL usan escape hex `\XX` con un espacio terminador
//     cuando el siguiente carácter es un dígito hexadecimal o espacio (evita ambigüedad CSS);
//   - Unicode válido (no-controles) se preserva tal cual;
//   - sin dependencia de locale; sin HTML escaping; sin saltos literales en la salida.
// Salida determinista byte-a-byte.

const HEX = "0123456789abcdef";

function hexEscape(code: number, next: string | undefined): string {
  const hex = code.toString(16);
  const nextChar = next ?? "";
  // El parser CSS consume hasta 6 dígitos hex tras `\`; un espacio terminador delimita el escape cuando
  // el carácter siguiente es un dígito hex (0-9a-fA-F) o espacio.
  const needsTerminator = /^[0-9a-fA-F ]$/.test(nextChar);
  return `\\${hex}${needsTerminator ? " " : ""}`;
}

/**
 * Escapa `input` como un string CSS entre comillas dobles (no incluye las comillas externas; el caller
 * las añade). Para uso EXCLUSIVO con valores string; no es un escaper de identifiers.
 */
export function escapeCssStringContent(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    const code = ch.charCodeAt(0);
    if (ch === "\\" || ch === '"') {
      out += `\\${ch}`;
      continue;
    }
    // C0 (0x00-0x1F) y DEL (0x7F) → escape hex con espacio terminador defensivo.
    if (code <= 0x1f || code === 0x7f) {
      out += hexEscape(code, input[i + 1]);
      continue;
    }
    out += ch;
  }
  return out;
}

/** Envoltura conveniente: devuelve `"…"` con el contenido ya escapado. */
export function cssDoubleQuotedString(input: string): string {
  return `"${escapeCssStringContent(input)}"`;
}

/** Letra a hex (utilidad consumida por tests; verifica byte estable). */
export const CSS_HEX_DIGITS = HEX;
