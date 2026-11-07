/**
 * Lectura de tokens.css para los tests: extrae las variables de cada contexto (tema claro,
 * tema oscuro, movimiento reducido) y los pares de contraste declarados en comentarios.
 *
 * Es un lector mínimo pensado solo para la forma de tokens.css (variables dentro de `:root`,
 * a lo sumo dentro de un `@media`); no es un parser de CSS general.
 */

export type TipoPar = 'texto' | 'no-texto';

export interface Par {
  tipo: TipoPar;
  /** Color de primer plano (texto o elemento). */
  primero: string;
  /** Color de fondo. */
  segundo: string;
}

export interface Tokens {
  /** Variables de `:root` (tema claro y valores comunes). */
  claro: Map<string, string>;
  /** Variables que redefine `@media (prefers-color-scheme: dark)`. */
  oscuro: Map<string, string>;
  /** Variables que redefine `@media (prefers-reduced-motion: reduce)`. */
  movimientoReducido: Map<string, string>;
  pares: Par[];
}

export const CAPAS = [1, 2, 3, 4, 5, 6, 7] as const;

const PAR = /contraste (texto|no-texto): (--[\w-]+) sobre (--[\w-]+)/g;
const DECLARACION = /^(--[\w-]+)\s*:\s*([\s\S]+)$/;

const CONTEXTOS = {
  ':root': 'claro',
  '@media (prefers-color-scheme: dark) > :root': 'oscuro',
  '@media (prefers-reduced-motion: reduce) > :root': 'movimientoReducido',
} as const;

function normalizar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

/** Expande «N» en los nombres de capa (`--capa-N-fondo`) a las capas 1 a 7. */
function expandir(par: Par): Par[] {
  const usaCapa = (nombre: string) => /^--capa-N-/.test(nombre);
  if (!usaCapa(par.primero) && !usaCapa(par.segundo)) return [par];
  return CAPAS.map((n) => ({
    tipo: par.tipo,
    primero: par.primero.replace('-N-', `-${n}-`),
    segundo: par.segundo.replace('-N-', `-${n}-`),
  }));
}

export function leerTokens(css: string): Tokens {
  const pares = [...css.matchAll(PAR)].flatMap(([, tipo, primero = '', segundo = '']) =>
    expandir({ tipo: tipo as TipoPar, primero, segundo }),
  );

  const tokens: Tokens = {
    claro: new Map(),
    oscuro: new Map(),
    movimientoReducido: new Map(),
    pares,
  };

  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const pila: string[] = [];
  let buffer = '';

  const procesar = () => {
    const [, nombre, valor] = DECLARACION.exec(normalizar(buffer)) ?? [];
    buffer = '';
    if (nombre === undefined || valor === undefined) return;
    const contexto = CONTEXTOS[pila.join(' > ') as keyof typeof CONTEXTOS];
    if (contexto) tokens[contexto].set(nombre, valor);
  };

  for (const caracter of sinComentarios) {
    if (caracter === '{') {
      pila.push(normalizar(buffer));
      buffer = '';
    } else if (caracter === '}') {
      procesar();
      pila.pop();
    } else if (caracter === ';') {
      procesar();
    } else {
      buffer += caracter;
    }
  }

  return tokens;
}

/** Variables del tema oscuro: las del claro con las redefiniciones aplicadas. */
export function temaOscuro(tokens: Tokens): Map<string, string> {
  return new Map([...tokens.claro, ...tokens.oscuro]);
}

/** Resuelve `var(--x)` encadenados hasta un valor literal. */
export function resolver(variables: Map<string, string>, nombre: string): string {
  const vistos = new Set<string>();
  let actual = nombre;
  for (;;) {
    if (vistos.has(actual)) throw new Error(`Referencia circular en ${nombre}`);
    vistos.add(actual);
    const valor = variables.get(actual);
    if (valor === undefined) throw new Error(`La variable ${actual} no está definida`);
    const [, referencia] = /^var\((--[\w-]+)\)$/.exec(valor) ?? [];
    if (referencia === undefined) return valor;
    actual = referencia;
  }
}
