/**
 * Ningún valor de color, tamaño o espaciado se escribe fuera de tokens.css.
 *
 * Revisa los .css de src/ (incluidos los CSS Modules) y, en los .astro, los bloques <style> y
 * los atributos style. Las condiciones de @media y @container quedan exceptuadas porque no
 * aceptan var(). No revisa estilos escritos como objetos en .tsx: los componentes de React
 * usan CSS Modules.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const TOKENS = join(SRC, 'styles', 'tokens.css');

const PATRONES = [
  { que: 'color hexadecimal', regex: /#[0-9a-f]{3,8}\b/gi },
  {
    que: 'función de color',
    regex: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi,
  },
  {
    que: 'longitud',
    regex: /(?<![\w-])\d*\.?\d+(?:px|rem|em|ch|ex|pt|pc|cm|mm|in|vmin|vmax)\b/gi,
  },
];

/** Extrae el CSS de un archivo .astro: bloques <style> y atributos style. */
function cssDeAstro(fuente: string): string {
  const bloques = [...fuente.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const atributos = [...fuente.matchAll(/\bstyle=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g)].map(
    (m) => m[1] ?? m[2] ?? m[3],
  );
  return [...bloques, ...atributos].join('\n');
}

/** Devuelve los valores sueltos encontrados en un texto CSS. */
export function buscarValoresSueltos(css: string): string[] {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@(?:media|container)[^{]*\{/g, '{');
  return PATRONES.flatMap(({ que, regex }) =>
    [...limpio.matchAll(regex)].map((m) => `${que}: ${m[0]}`),
  );
}

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) return archivos(ruta);
    return /\.(css|astro)$/.test(entrada.name) ? [ruta] : [];
  });
}

describe('buscarValoresSueltos', () => {
  it('detecta colores y longitudes escritos a mano', () => {
    expect(
      buscarValoresSueltos('a { color: #fff; background: rgb(0 0 0); padding: 1.5rem 2px; }'),
    ).toEqual([
      'color hexadecimal: #fff',
      'función de color: rgb(',
      'longitud: 1.5rem',
      'longitud: 2px',
    ]);
  });

  it('acepta tokens, ceros, porcentajes, condiciones de @media y comentarios', () => {
    expect(
      buscarValoresSueltos(`
        /* 12px en un comentario */
        @media (min-width: 40rem) { a { padding: var(--espacio-4); margin: 0; width: 100%; } }
        #tokens, .capa-12px { flex: 1 1 0; }
      `),
    ).toEqual([]);
  });
});

describe('valores fuera de tokens.css', () => {
  const lista = archivos(SRC).filter((ruta) => ruta !== TOKENS);

  it('hay archivos para revisar', () => {
    expect(lista.length).toBeGreaterThan(0);
  });

  it.each(lista.map((ruta) => [relative(SRC, ruta).replaceAll('\\', '/'), ruta]))(
    '%s usa solo tokens',
    (_nombre, ruta) => {
      const fuente = readFileSync(ruta, 'utf8');
      const css = ruta.endsWith('.astro') ? cssDeAstro(fuente) : fuente;
      expect(buscarValoresSueltos(css)).toEqual([]);
    },
  );
});
