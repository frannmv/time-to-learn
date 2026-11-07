import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { longitudTotal, partesEnElCable } from '../core/pdu';
import { validarTimeline } from '../core/timeline';
import {
  BYTES_COLA_DEMO,
  BYTES_ENCABEZADO_DEMO,
  ESCENARIO_DEMO,
  simularDemo,
  simularDescarteDemo,
} from './escenario';

describe('escenario de demostración (ficticio)', () => {
  it('es determinístico: dos ejecuciones producen la misma timeline', () => {
    expect(simularDemo()).toStrictEqual(simularDemo());
    expect(JSON.stringify(simularDemo())).toBe(JSON.stringify(simularDemo()));
  });

  it('produce una timeline válida de seis pasos', () => {
    const timeline = simularDemo();
    expect(validarTimeline(timeline)).toEqual([]);
    expect(timeline.pasos).toHaveLength(6);
  });

  // Así, el test de arriba cubre las timelines de /demo/ y del módulo de ejemplo.
  it('/demo/ y el módulo de ejemplo usan esta misma timeline', () => {
    for (const archivo of ['../../pages/demo.astro', '../../content/modules/ejemplo.mdx']) {
      const texto = readFileSync(new URL(archivo, import.meta.url), 'utf8');
      expect(texto, archivo).toMatch(/simularDemo\(\)/);
      expect(texto, archivo).not.toMatch(/simularDemo\([^)]/);
    }
  });

  it('el mensaje va de A a C pasando por B y termina en la capa 7 de C', () => {
    const ubicaciones = simularDemo().pasos.map((paso) => paso.paquetes[0]?.ubicacion);
    expect(ubicaciones).toEqual([
      { tipo: 'nodo', nodo: 'a' },
      { tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' },
      { tipo: 'nodo', nodo: 'b' },
      { tipo: 'enlace', enlace: 'b-c', desde: 'b', hacia: 'c' },
      { tipo: 'nodo', nodo: 'c' },
      { tipo: 'nodo', nodo: 'c', capa: 7 },
    ]);
  });

  it('los primeros cinco pasos no tienen tamaños, colas ni PDU', () => {
    for (const paso of simularDemo().pasos.slice(0, 5)) {
      const [paquete] = paso.paquetes;
      expect(paquete).not.toHaveProperty('pdu');
      expect(paquete).not.toHaveProperty('datos');
      for (const e of paquete?.encabezados ?? []) {
        expect(e).not.toHaveProperty('bytes');
        expect(e).not.toHaveProperty('parte');
      }
    }
  });

  it('el último paso mide el mensaje parte por parte, con una cola', () => {
    const paquete = simularDemo().pasos[5]?.paquetes[0];
    if (paquete === undefined) throw new Error('el último paso no tiene paquete');
    expect(paquete.pdu).toBe('Mensaje de juguete');
    expect(partesEnElCable(paquete).map((p) => [p.tipo, p.bytes, p.desplazamiento])).toEqual([
      ['encabezado', BYTES_ENCABEZADO_DEMO, 0],
      ['datos', 7, BYTES_ENCABEZADO_DEMO],
      ['cola', BYTES_COLA_DEMO, BYTES_ENCABEZADO_DEMO + 7],
    ]);
    expect(longitudTotal(paquete)).toBe(BYTES_ENCABEZADO_DEMO + 7 + BYTES_COLA_DEMO);
    expect(paquete.encabezados[1]?.nombre).toMatch(/ficticio/);
    expect(simularDemo().pasos[5]?.explicacion).toMatch(/ficticios/);
  });

  it('los datos miden lo que mide el texto en UTF-8', () => {
    // «Señal» tiene 5 caracteres y 6 bytes: la «ñ» ocupa dos.
    const paquete = simularDemo({ ...ESCENARIO_DEMO, mensaje: 'Señal' }).pasos[5]?.paquetes[0];
    expect(paquete?.datos).toEqual({ descripcion: 'Señal', bytes: 6 });
  });

  it('B anota una fila nueva al recibir el mensaje y después deja de marcarla', () => {
    const filas = simularDemo().pasos.map((paso) => paso.tablas[0]?.filas);
    expect(filas[0]).toEqual([]);
    expect(filas[1]).toEqual([]);
    expect(filas[2]).toEqual([{ celdas: ['Hola, C', 'A', 'C'], marca: 'nueva' }]);
    expect(filas[3]).toEqual([{ celdas: ['Hola, C', 'A', 'C'] }]);
  });

  it('declara en el primer paso y en el encabezado que es ficticio', () => {
    const [primero] = simularDemo().pasos;
    expect(primero?.explicacion).toMatch(/ficticio/);
    expect(primero?.paquetes[0]?.encabezados[0]?.nombre).toMatch(/ficticio/);
  });

  it('usa el texto del mensaje que recibe', () => {
    const timeline = simularDemo({ ...ESCENARIO_DEMO, mensaje: 'Chau' });
    expect(timeline.pasos[4]?.tablas[0]?.filas[0]?.celdas[0]).toBe('Chau');
  });

  it('sobrevive la ida y vuelta por JSON', () => {
    const timeline = simularDemo();
    expect(JSON.parse(JSON.stringify(timeline))).toStrictEqual(structuredClone(timeline));
  });
});

describe('variante ficticia: B descarta el mensaje', () => {
  it('es determinística y produce una timeline válida de cuatro pasos', () => {
    const timeline = simularDescarteDemo();
    expect(timeline).toStrictEqual(simularDescarteDemo());
    expect(validarTimeline(timeline)).toEqual([]);
    expect(timeline.pasos).toHaveLength(4);
  });

  it('tiene otra cantidad de pasos que el escenario principal, sobre la misma topología', () => {
    expect(simularDescarteDemo().pasos.length).not.toBe(simularDemo().pasos.length);
    expect(simularDescarteDemo().topologia).toStrictEqual(simularDemo().topologia);
  });

  it('el mensaje llega a B y después desaparece: nunca llega a C', () => {
    const ubicaciones = simularDescarteDemo().pasos.map((paso) => paso.paquetes[0]?.ubicacion);
    expect(ubicaciones).toEqual([
      { tipo: 'nodo', nodo: 'a' },
      { tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' },
      { tipo: 'nodo', nodo: 'b' },
      undefined,
    ]);
  });

  it('B anota el mensaje antes de descartarlo', () => {
    const filas = simularDescarteDemo().pasos.map((paso) => paso.tablas[0]?.filas);
    expect(filas[2]).toEqual([{ celdas: ['Hola, C', 'A', 'C'], marca: 'nueva' }]);
    expect(filas[3]).toEqual([{ celdas: ['Hola, C', 'A', 'C'] }]);
  });

  it('declara que es ficticia y explica el descarte', () => {
    const pasos = simularDescarteDemo().pasos;
    expect(pasos[0]?.explicacion).toMatch(/ficticia/);
    expect(pasos[0]?.paquetes[0]?.encabezados[0]?.nombre).toMatch(/ficticio/);
    expect(pasos[3]?.explicacion).toMatch(/descarta/);
  });

  it('/demo/ la usa sin parámetros', () => {
    const texto = readFileSync(new URL('../../pages/demo.astro', import.meta.url), 'utf8');
    expect(texto).toMatch(/simularDescarteDemo\(\)/);
    expect(texto).not.toMatch(/simularDescarteDemo\([^)]/);
  });

  it('sobrevive la ida y vuelta por JSON', () => {
    const timeline = simularDescarteDemo();
    expect(JSON.parse(JSON.stringify(timeline))).toStrictEqual(structuredClone(timeline));
  });
});
