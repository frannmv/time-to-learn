/**
 * Reparte los campos de un encabezado en filas de la rejilla, como en los diagramas de los
 * RFC: cada fila tiene `BITS_POR_FILA` columnas y cada campo ocupa tantas columnas como
 * bits. Un campo que no entra en lo que queda de la fila sigue en la siguiente, en un tramo
 * marcado como continuación.
 *
 * Es solo cálculo de diseño: no sabe nada de protocolos.
 */
import type { Desplazamiento } from '../../engine/core/header';

/** Bits por fila de la rejilla, como en los diagramas de encabezado de RFC 791 §3.1. */
export const BITS_POR_FILA = 32;

export interface Tramo {
  /** Posición del campo en el encabezado. */
  readonly campo: number;
  /** Fila de la rejilla, desde 0. */
  readonly fila: number;
  /** Primera columna, de 0 a `BITS_POR_FILA - 1`. */
  readonly columna: number;
  /** Cantidad de columnas (bits) del tramo. */
  readonly ancho: number;
  /** `true` si es la continuación de un tramo de la fila anterior. */
  readonly continua: boolean;
}

export function calcularTramos(
  desplazamientos: readonly Desplazamiento[],
  bitsPorFila = BITS_POR_FILA,
): Tramo[] {
  const tramos: Tramo[] = [];
  desplazamientos.forEach(({ desdeBit, bits }, campo) => {
    let bit = desdeBit;
    const fin = desdeBit + bits;
    while (bit < fin) {
      const columna = bit % bitsPorFila;
      const ancho = Math.min(fin - bit, bitsPorFila - columna);
      tramos.push({
        campo,
        fila: Math.floor(bit / bitsPorFila),
        columna,
        ancho,
        continua: bit !== desdeBit,
      });
      bit += ancho;
    }
  });
  return tramos;
}
