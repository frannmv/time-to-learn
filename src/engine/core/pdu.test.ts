import { describe, expect, it } from 'vitest';
import { longitudTotal, partesEnElCable, type ContenidoPdu } from './pdu';
import type { Encabezado } from './timeline';

// Tamaños de Ethernet II (14 bytes), su FCS (4) e IPv4 sin opciones (20). La carga es de
// ejemplo: con 26 bytes la trama mide 64, el mínimo de IEEE 802.3.
const ethernet: Encabezado = { capa: 2, nombre: 'Ethernet II', campos: [], bytes: 14 };
const fcs: Encabezado = { capa: 2, nombre: 'FCS', campos: [], bytes: 4, parte: 'cola' };
const ipv4: Encabezado = { capa: 3, nombre: 'IPv4', campos: [], bytes: 20 };
const trama: ContenidoPdu = {
  encabezados: [ethernet, fcs, ipv4],
  datos: { descripcion: '[Ejemplo] Carga', bytes: 26 },
};

/** Resumen legible de cada parte: tipo, nombre y desplazamiento. */
const resumen = (pdu: ContenidoPdu) =>
  partesEnElCable(pdu).map((p) => [
    p.tipo,
    p.tipo === 'datos' ? p.datos.descripcion : p.encabezado.nombre,
    p.desplazamiento,
  ]);

describe('partesEnElCable', () => {
  it('ordena encabezados de afuera hacia adentro, datos y colas, con sus desplazamientos', () => {
    expect(resumen(trama)).toEqual([
      ['encabezado', 'Ethernet II', 0],
      ['encabezado', 'IPv4', 14],
      ['datos', '[Ejemplo] Carga', 34],
      ['cola', 'FCS', 60],
    ]);
  });

  it('conserva la capa, el tamaño y la posición de cada parte en la lista', () => {
    const [primera, , , ultima] = partesEnElCable(trama);
    expect(primera).toEqual({
      tipo: 'encabezado',
      capa: 2,
      encabezado: ethernet,
      indice: 0,
      bytes: 14,
      desplazamiento: 0,
    });
    expect(ultima).toEqual({
      tipo: 'cola',
      capa: 2,
      encabezado: fcs,
      indice: 1,
      bytes: 4,
      desplazamiento: 60,
    });
  });

  it('saca las colas de adentro hacia afuera', () => {
    // [Ejemplo] Dos capas con cola: la de la capa 3 está más adentro y sale primero.
    const pdu: ContenidoPdu = {
      encabezados: [
        { capa: 2, nombre: 'E2', campos: [], bytes: 2 },
        { capa: 2, nombre: 'C2', campos: [], bytes: 1, parte: 'cola' },
        { capa: 3, nombre: 'E3', campos: [], bytes: 3 },
        { capa: 3, nombre: 'C3', campos: [], bytes: 1, parte: 'cola' },
      ],
      datos: { descripcion: 'D', bytes: 5 },
    };
    expect(resumen(pdu)).toEqual([
      ['encabezado', 'E2', 0],
      ['encabezado', 'E3', 2],
      ['datos', 'D', 5],
      ['cola', 'C3', 10],
      ['cola', 'C2', 11],
    ]);
  });

  it('sin tamaño en una parte, los desplazamientos siguientes quedan indefinidos', () => {
    const pdu: ContenidoPdu = {
      ...trama,
      encabezados: [ethernet, fcs, { ...ipv4, bytes: undefined }],
    };
    const partes = partesEnElCable(pdu);
    expect(partes.map((p) => p.desplazamiento)).toEqual([0, 14, undefined, undefined]);
    // La parte sin tamaño no tiene la propiedad, así sobrevive igual la ida por JSON.
    expect(partes[1]).not.toHaveProperty('bytes');
    expect(partes[2]).not.toHaveProperty('desplazamiento');
  });

  it('sin datos, pasa de los encabezados a las colas', () => {
    expect(resumen({ encabezados: [ethernet, fcs, ipv4] })).toEqual([
      ['encabezado', 'Ethernet II', 0],
      ['encabezado', 'IPv4', 14],
      ['cola', 'FCS', 34],
    ]);
  });

  it('un paquete vacío no tiene partes', () => {
    expect(partesEnElCable({ encabezados: [] })).toEqual([]);
  });
});

describe('longitudTotal', () => {
  it('suma todas las partes', () => {
    expect(longitudTotal(trama)).toBe(64);
    expect(longitudTotal({ encabezados: [ethernet, fcs, ipv4] })).toBe(38);
  });

  it('queda indefinida si falta un tamaño, en un encabezado, una cola o los datos', () => {
    expect(longitudTotal({ ...trama, datos: { descripcion: '[Ejemplo] Carga' } })).toBeUndefined();
    expect(
      longitudTotal({ ...trama, encabezados: [ethernet, { ...fcs, bytes: undefined }, ipv4] }),
    ).toBeUndefined();
    expect(longitudTotal({ encabezados: [{ ...ethernet, bytes: undefined }] })).toBeUndefined();
  });

  it('queda indefinida si no hay partes', () => {
    expect(longitudTotal({ encabezados: [] })).toBeUndefined();
  });
});
