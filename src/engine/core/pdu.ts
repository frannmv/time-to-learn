/**
 * Partes de una PDU en el orden en que viajan por el cable, con su tamaño y desde qué byte
 * empieza cada una.
 *
 * Cada capa envuelve la PDU de la capa de arriba: agrega su encabezado adelante y, si tiene
 * cola, la agrega atrás. Por eso en el cable salen primero los encabezados, de afuera hacia
 * adentro (el de la capa más baja primero), después los datos y al final las colas, de
 * adentro hacia afuera. Ejemplo con cola: en Ethernet, el FCS va después de los datos, al
 * final de la trama (IEEE 802.3, cláusula 3).
 *
 * El motor calcula este orden para que los componentes no tengan que saberlo.
 *
 * Simplificaciones declaradas:
 * - Cada parte es un bloque de bytes enteros, uno detrás del otro y sin huecos.
 * - El relleno no es una parte aparte: si un escenario lo necesita, lo anota como una
 *   parte más o dentro de los datos.
 */

import type { Capa } from './capas';
import type { Datos, Encabezado, Paquete, ParteEncabezado } from './timeline';

interface Medida {
  /** Tamaño en bytes, si se conoce. */
  readonly bytes?: number;
  /**
   * Byte donde empieza la parte, contando desde 0 al principio de la PDU. Queda indefinido
   * si alguna parte anterior no tiene tamaño.
   */
  readonly desplazamiento?: number;
}

/** Un encabezado o una cola, con su posición en `paquete.encabezados`. */
export interface ParteDeCapa extends Medida {
  readonly tipo: ParteEncabezado;
  readonly capa: Capa;
  readonly encabezado: Encabezado;
  readonly indice: number;
}

/** La carga de la capa más alta. No pertenece a ninguna capa del paquete. */
export interface ParteDatos extends Medida {
  readonly tipo: 'datos';
  readonly datos: Datos;
}

export type ParteEnElCable = ParteDeCapa | ParteDatos;

/** Lo que hace falta de un paquete para ordenar sus partes. */
export type ContenidoPdu = Pick<Paquete, 'encabezados' | 'datos'>;

/**
 * Partes de la PDU en el orden del cable: encabezados de afuera hacia adentro, datos (si
 * los hay) y colas de adentro hacia afuera. Cada parte lleva su desplazamiento en bytes.
 */
export function partesEnElCable(pdu: ContenidoPdu): ParteEnElCable[] {
  type SinMedida =
    Omit<ParteDeCapa, 'bytes' | 'desplazamiento'> | Omit<ParteDatos, 'bytes' | 'desplazamiento'>;

  const deCapa = pdu.encabezados.map((encabezado, indice) => ({
    tipo: encabezado.parte ?? 'encabezado',
    capa: encabezado.capa,
    encabezado,
    indice,
  }));
  const ordenadas: SinMedida[] = [
    ...deCapa.filter((p) => p.tipo === 'encabezado'),
    ...(pdu.datos === undefined ? [] : [{ tipo: 'datos' as const, datos: pdu.datos }]),
    ...deCapa.filter((p) => p.tipo === 'cola').reverse(),
  ];

  let desplazamiento: number | undefined = 0;
  return ordenadas.map((parte) => {
    const bytes = parte.tipo === 'datos' ? parte.datos.bytes : parte.encabezado.bytes;
    const medida: Medida = {
      ...(bytes !== undefined && { bytes }),
      ...(desplazamiento !== undefined && { desplazamiento }),
    };
    desplazamiento =
      desplazamiento !== undefined && bytes !== undefined ? desplazamiento + bytes : undefined;
    return { ...parte, ...medida };
  });
}

/**
 * Longitud total de la PDU en bytes. Queda indefinida si alguna parte no tiene tamaño o si
 * la PDU no tiene ninguna parte. Sin `datos`, es la suma de sus encabezados y colas.
 */
export function longitudTotal(pdu: ContenidoPdu): number | undefined {
  const partes = partesEnElCable(pdu);
  if (partes.length === 0) return undefined;
  let total = 0;
  for (const { bytes } of partes) {
    if (bytes === undefined) return undefined;
    total += bytes;
  }
  return total;
}
