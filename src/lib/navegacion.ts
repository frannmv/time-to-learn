/**
 * Navegación del sitio: rutas internas y agrupaciones de módulos por bloque y por capa.
 *
 * Es código puro (sin `astro:content` ni DOM) para poder testearlo con listas de módulos
 * inventadas: en la Etapa 1 el sitio no tiene módulos visibles.
 */
import { CAPAS, type Capa } from '../engine/core/capas';
import { BLOQUES, type Bloque } from '../content/schema';

/** Lo mínimo de un módulo que necesita la navegación. */
export interface ModuloNavegable {
  id: string;
  data: {
    titulo: string;
    bloque: Bloque;
    capas: readonly Capa[];
    orden: number;
  };
}

/**
 * Arma una ruta interna a partir del `base` del sitio (`import.meta.env.BASE_URL`).
 *
 * @example ruta('/time-to-learn/', 'capas/') // '/time-to-learn/capas/'
 */
export function ruta(base: string, camino = ''): string {
  const raiz = base.endsWith('/') ? base : `${base}/`;
  return `${raiz}${camino.replace(/^\/+/, '')}`;
}

/** Ruta de la página de un módulo. */
export function rutaModulo(base: string, id: string): string {
  return ruta(base, `modulos/${id}/`);
}

const porOrden = <T extends ModuloNavegable>(a: T, b: T) => a.data.orden - b.data.orden;

/** Módulos de un bloque, ordenados por `orden`. */
export interface GrupoBloque<T extends ModuloNavegable> {
  bloque: Bloque;
  modulos: T[];
}

/**
 * Agrupa los módulos por bloque, en el orden de `BLOQUES`. Omite los bloques sin módulos.
 */
export function agruparPorBloque<T extends ModuloNavegable>(
  modulos: readonly T[],
): GrupoBloque<T>[] {
  return BLOQUES.map((bloque) => ({
    bloque,
    modulos: modulos.filter((m) => m.data.bloque === bloque).sort(porOrden),
  })).filter((grupo) => grupo.modulos.length > 0);
}

/** Módulos que tocan una capa, ordenados por `orden`. */
export interface GrupoCapa<T extends ModuloNavegable> {
  capa: Capa;
  modulos: { modulo: T; principal: boolean }[];
}

/**
 * Agrupa los módulos por capa OSI, de la 1 a la 7. Incluye siempre las siete capas, aunque
 * no tengan módulos. Un módulo aparece en cada capa que toca; `principal` indica si esa es
 * su capa principal (la primera de `capas`).
 */
export function agruparPorCapa<T extends ModuloNavegable>(modulos: readonly T[]): GrupoCapa<T>[] {
  const ordenados = [...modulos].sort(porOrden);
  return CAPAS.map((capa) => ({
    capa,
    modulos: ordenados
      .filter((m) => m.data.capas.includes(capa))
      .map((modulo) => ({ modulo, principal: modulo.data.capas[0] === capa })),
  }));
}

/** Módulos vecinos de uno dado en el recorrido. */
export interface Vecinos<T extends ModuloNavegable> {
  anterior?: T;
  siguiente?: T;
}

/**
 * Devuelve el módulo anterior y el siguiente según `orden`, dentro de la lista recibida
 * (normalmente, los módulos visibles). Si el módulo no está en la lista, no tiene vecinos.
 */
export function anteriorSiguiente<T extends ModuloNavegable>(
  modulos: readonly T[],
  id: string,
): Vecinos<T> {
  const ordenados = [...modulos].sort(porOrden);
  const posicion = ordenados.findIndex((m) => m.id === id);
  if (posicion === -1) return {};
  return { anterior: ordenados[posicion - 1], siguiente: ordenados[posicion + 1] };
}
