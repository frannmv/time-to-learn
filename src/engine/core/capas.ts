/**
 * Capas del modelo de referencia OSI.
 *
 * Fuente: ISO/IEC 7498-1 (modelo de referencia OSI). Los nombres en español siguen la
 * terminología de Stallings, bibliografía de la cátedra.
 *
 * Es la única fuente de verdad sobre las capas: la usan el motor (cada encabezado de un
 * paquete pertenece a una capa), el esquema de contenido y los componentes.
 */

/** Número de capa OSI, de 1 (física) a 7 (aplicación). */
export type Capa = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Las siete capas, de abajo hacia arriba. */
export const CAPAS: readonly Capa[] = Object.freeze([1, 2, 3, 4, 5, 6, 7] as const);

/** Nombre de cada capa en español. */
export const NOMBRE_CAPA: Readonly<Record<Capa, string>> = Object.freeze({
  1: 'Física',
  2: 'Enlace de datos',
  3: 'Red',
  4: 'Transporte',
  5: 'Sesión',
  6: 'Presentación',
  7: 'Aplicación',
});

/** Indica si un valor cualquiera es un número de capa OSI válido. */
export function esCapa(valor: unknown): valor is Capa {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 7;
}
