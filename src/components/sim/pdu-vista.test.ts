import { describe, expect, it } from 'vitest';
import type { Encabezado } from '../../engine/core/timeline';
import { simularPilaDemo } from '../../engine/demo/pila';
import { partesVista, textoBytes, textoRango, tituloPdu } from './pdu-vista';

const ethernet: Encabezado = { capa: 2, nombre: 'Ethernet II', campos: [], bytes: 14 };
const fcs: Encabezado = { capa: 2, nombre: 'FCS', campos: [], bytes: 4, parte: 'cola' };
const ipv4: Encabezado = { capa: 3, nombre: 'IPv4', campos: [], bytes: 20 };

describe('textoBytes y textoRango', () => {
  it('usan el singular para un byte', () => {
    expect(textoBytes(1)).toBe('1 byte');
    expect(textoBytes(14)).toBe('14 bytes');
    expect(textoRango(5, 1)).toBe('byte 5');
    expect(textoRango(0, 14)).toBe('bytes 0 a 13');
  });
});

describe('partesVista', () => {
  it('sigue el orden del cable: encabezados, datos y al final la cola', () => {
    const partes = partesVista({
      encabezados: [ethernet, fcs, ipv4],
      datos: { descripcion: 'Hola', bytes: 4 },
    });
    expect(partes.map((p) => [p.tipo, p.nombre, p.rango])).toEqual([
      ['encabezado', 'Ethernet II', 'bytes 0 a 13'],
      ['encabezado', 'IPv4', 'bytes 14 a 33'],
      ['datos', 'Datos', 'bytes 34 a 37'],
      ['cola', 'FCS', 'bytes 38 a 41'],
    ]);
  });

  it('dice la capa en texto y aclara cuál es la cola', () => {
    const [eth, datos, cola] = partesVista({
      encabezados: [ethernet, fcs],
      datos: { descripcion: 'Hola' },
    });
    expect(eth).toMatchObject({ capa: 2, detalle: 'Capa 2 · Enlace de datos', tamano: '14 bytes' });
    expect(datos).toEqual({ tipo: 'datos', nombre: 'Datos', detalle: 'Hola' });
    expect(cola).toMatchObject({ capa: 2, detalle: 'Cola · capa 2 · Enlace de datos' });
  });

  it('sin tamaños no inventa tamaños ni rangos', () => {
    const [parte] = partesVista({ encabezados: [{ capa: 7, nombre: 'X', campos: [] }] });
    expect(parte).not.toHaveProperty('tamano');
    expect(parte).not.toHaveProperty('rango');
  });

  it('después de una parte sin tamaño, las siguientes no tienen rango', () => {
    const partes = partesVista({
      encabezados: [{ capa: 2, nombre: 'Sin tamaño', campos: [] }, ipv4],
    });
    expect(partes[1]).toMatchObject({ tamano: '20 bytes' });
    expect(partes[1]).not.toHaveProperty('rango');
  });

  it('una PDU vacía no tiene partes', () => {
    expect(partesVista({ encabezados: [] })).toEqual([]);
  });
});

describe('tituloPdu', () => {
  it('lleva el nombre de la PDU y su longitud total', () => {
    const trama = simularPilaDemo().pasos[2]?.paquetes[0];
    if (trama === undefined) throw new Error('falta la trama');
    expect(tituloPdu(trama)).toEqual({ nombre: 'Trama de juguete', longitud: '27 bytes en total' });
  });

  it('sin nombre ni tamaños dice «PDU» y no muestra longitud', () => {
    expect(tituloPdu({ encabezados: [ipv4, { capa: 4, nombre: 'Y', campos: [] }] })).toEqual({
      nombre: 'PDU',
    });
  });
});
