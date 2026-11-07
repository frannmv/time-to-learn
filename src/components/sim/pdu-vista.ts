/**
 * Textos de la vista `Pdu`: qué dice cada parte de la PDU, en el orden del cable.
 *
 * El orden y los desplazamientos los calcula el motor (`partesEnElCable`, pdu.ts); acá solo
 * se convierten en texto. Cada parte dice su capa en palabras, así no depende del color.
 */
import { NOMBRE_CAPA, type Capa } from '../../engine/core/capas';
import { longitudTotal, partesEnElCable } from '../../engine/core/pdu';
import type { Paquete } from '../../engine/core/timeline';

/** Lo que hace falta de un paquete para dibujar su PDU. */
export type PduDibujada = Pick<Paquete, 'encabezados' | 'datos' | 'pdu'>;

export interface ParteVista {
  readonly tipo: 'encabezado' | 'cola' | 'datos';
  /** Capa de la parte. Los datos no tienen. */
  readonly capa?: Capa;
  /** Nombre del encabezado o de la cola; «Datos» para la carga. */
  readonly nombre: string;
  /** «Capa 2 · Enlace de datos», «Cola · capa 2 · Enlace de datos» o qué son los datos. */
  readonly detalle: string;
  /** «14 bytes», si se conoce el tamaño. */
  readonly tamano?: string;
  /** «bytes 0 a 13», si se conoce dónde empieza y cuánto mide. */
  readonly rango?: string;
}

/** «1 byte», «14 bytes». */
export function textoBytes(bytes: number): string {
  return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`;
}

/** «byte 5» o «bytes 0 a 13». */
export function textoRango(desde: number, bytes: number): string {
  return bytes === 1 ? `byte ${desde}` : `bytes ${desde} a ${desde + bytes - 1}`;
}

/** Partes de la PDU en el orden en que viajan por el cable, ya en texto. */
export function partesVista(pdu: PduDibujada): ParteVista[] {
  return partesEnElCable(pdu).map((parte) => {
    const { bytes, desplazamiento } = parte;
    const medida = {
      ...(bytes !== undefined && { tamano: textoBytes(bytes) }),
      ...(bytes !== undefined &&
        desplazamiento !== undefined && { rango: textoRango(desplazamiento, bytes) }),
    };
    if (parte.tipo === 'datos') {
      return { tipo: 'datos', nombre: 'Datos', detalle: parte.datos.descripcion, ...medida };
    }
    const capa = `${parte.capa} · ${NOMBRE_CAPA[parte.capa]}`;
    return {
      tipo: parte.tipo,
      capa: parte.capa,
      nombre: parte.encabezado.nombre,
      detalle: parte.tipo === 'cola' ? `Cola · capa ${capa}` : `Capa ${capa}`,
      ...medida,
    };
  });
}

/** Título de la PDU: su nombre («PDU» si el paso no lo dice) y, si se conoce, su longitud. */
export function tituloPdu(pdu: PduDibujada): {
  readonly nombre: string;
  readonly longitud?: string;
} {
  const total = longitudTotal(pdu);
  return {
    nombre: pdu.pdu ?? 'PDU',
    ...(total !== undefined && { longitud: `${textoBytes(total)} en total` }),
  };
}
