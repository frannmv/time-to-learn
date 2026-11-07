import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contraste, deltaE } from './color';
import { CAPAS, leerTokens, resolver, temaOscuro } from './leer-tokens';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const tokens = leerTokens(css);

const temas = {
  claro: tokens.claro,
  oscuro: temaOscuro(tokens),
} as const;

/** Mínimos de WCAG 2.2: 1.4.3 (texto, AA) y 1.4.11 (elementos no textuales). */
const MINIMO = { texto: 4.5, 'no-texto': 3 } as const;

/**
 * Distancia mínima (CIE76) entre los colores de dos capas. ΔE ≈ 2,3 es apenas perceptible;
 * se pide bastante más para que se distingan de un vistazo. Es un umbral propio del proyecto,
 * no de un estándar.
 */
const DISTANCIA_MINIMA = { borde: 18, fondo: 5 } as const;

const HEX = /^#[0-9a-f]{6}$/i;
const esColor = (nombre: string) => /^--(color|capa-\d)-/.test(nombre);

describe('leerTokens', () => {
  it('lee variables por contexto y expande los pares de capa', () => {
    const ejemplo = leerTokens(`
      /* contraste texto: --a sobre --b */
      /* contraste no-texto: --capa-N-borde sobre --b */
      :root { --a: #000000; --b: #ffffff; --capa-1-borde: var(--a); }
      @media (prefers-color-scheme: dark) { :root { --a: #ffffff; } }
      @media (prefers-reduced-motion: reduce) { :root { --duracion-x: 0ms; } }
      [data-capa='1'] { --ignorada: #123456; }
    `);
    expect(ejemplo.claro).toEqual(
      new Map([
        ['--a', '#000000'],
        ['--b', '#ffffff'],
        ['--capa-1-borde', 'var(--a)'],
      ]),
    );
    expect(ejemplo.oscuro).toEqual(new Map([['--a', '#ffffff']]));
    expect(ejemplo.movimientoReducido).toEqual(new Map([['--duracion-x', '0ms']]));
    expect(ejemplo.pares).toHaveLength(1 + CAPAS.length);
    expect(ejemplo.pares[7]).toEqual({
      tipo: 'no-texto',
      primero: '--capa-7-borde',
      segundo: '--b',
    });
    expect(resolver(temaOscuro(ejemplo), '--capa-1-borde')).toBe('#ffffff');
  });
});

describe('tokens.css', () => {
  it('declara pares de contraste', () => {
    expect(tokens.pares.length).toBeGreaterThan(0);
  });

  it('cada capa OSI tiene variante de fondo y de borde', () => {
    for (const n of CAPAS) {
      expect(tokens.claro.has(`--capa-${n}-fondo`), `--capa-${n}-fondo`).toBe(true);
      expect(tokens.claro.has(`--capa-${n}-borde`), `--capa-${n}-borde`).toBe(true);
    }
  });

  it('el tema oscuro redefine todos los colores y nada más', () => {
    const colores = [...tokens.claro.keys()].filter(esColor).sort();
    expect([...tokens.oscuro.keys()].sort()).toEqual(colores);
  });

  it('con movimiento reducido todas las duraciones valen 0', () => {
    const duraciones = [...tokens.claro.keys()].filter((n) => n.startsWith('--duracion-'));
    expect(duraciones.length).toBeGreaterThan(0);
    expect(Object.fromEntries(tokens.movimientoReducido)).toEqual(
      Object.fromEntries(duraciones.map((n) => [n, '0ms'])),
    );
  });

  for (const [tema, variables] of Object.entries(temas)) {
    describe(`tema ${tema}`, () => {
      it('todos los colores están en hexadecimal #rrggbb', () => {
        for (const nombre of [...variables.keys()].filter(esColor)) {
          expect(resolver(variables, nombre), nombre).toMatch(HEX);
        }
      });

      it.each(tokens.pares)('$tipo: $primero sobre $segundo', ({ tipo, primero, segundo }) => {
        const razon = contraste(resolver(variables, primero), resolver(variables, segundo));
        expect(razon).toBeGreaterThanOrEqual(MINIMO[tipo]);
      });

      for (const variante of ['borde', 'fondo'] as const) {
        it(`los colores de ${variante} de las 7 capas se distinguen entre sí`, () => {
          for (const a of CAPAS) {
            for (const b of CAPAS.filter((n) => n > a)) {
              const distancia = deltaE(
                resolver(variables, `--capa-${a}-${variante}`),
                resolver(variables, `--capa-${b}-${variante}`),
              );
              expect(distancia, `capas ${a} y ${b}`).toBeGreaterThanOrEqual(
                DISTANCIA_MINIMA[variante],
              );
            }
          }
        });
      }
    });
  }
});
