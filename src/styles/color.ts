/**
 * Utilidades de color para verificar los tokens de diseño.
 *
 * Contraste: definición de luminancia relativa y razón de contraste de WCAG 2.2
 * (https://www.w3.org/TR/WCAG22/#dfn-relative-luminance y #dfn-contrast-ratio).
 * Distancia entre colores: CIE76 (distancia euclídea en CIELAB, iluminante D65).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Convierte `#rgb` o `#rrggbb` a componentes de 0 a 255. */
export function parseHex(hex: string): Rgb {
  if (!HEX.test(hex)) {
    throw new Error(`Color inválido: «${hex}». Se espera #rgb o #rrggbb.`);
  }
  const digitos =
    hex.length === 4
      ? hex
          .slice(1)
          .split('')
          .map((d) => d + d)
          .join('')
      : hex.slice(1);
  return {
    r: Number.parseInt(digitos.slice(0, 2), 16),
    g: Number.parseInt(digitos.slice(2, 4), 16),
    b: Number.parseInt(digitos.slice(4, 6), 16),
  };
}

/** Componente sRGB (0–255) a valor lineal (0–1). */
function lineal(canal: number): number {
  const c = canal / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa según WCAG 2.2. */
export function luminancia(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Razón de contraste entre dos colores, de 1 a 21. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Color a CIELAB (D65). */
export function aLab(hex: string): { l: number; a: number; b: number } {
  const { r, g, b } = parseHex(hex);
  const [rl, gl, bl] = [lineal(r), lineal(g), lineal(b)];
  // sRGB lineal a XYZ (D65), normalizado por el blanco de referencia.
  const x = (0.4124 * rl + 0.3576 * gl + 0.1805 * bl) / 0.95047;
  const y = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  const z = (0.0193 * rl + 0.1192 * gl + 0.9505 * bl) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 / 116) * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** Diferencia de color CIE76 (ΔE*ab). */
export function deltaE(a: string, b: string): number {
  const p = aLab(a);
  const q = aLab(b);
  return Math.hypot(p.l - q.l, p.a - q.a, p.b - q.b);
}
