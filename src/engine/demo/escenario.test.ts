import { describe, expect, it } from 'vitest';
import { validarTimeline } from '../core/timeline';
import { ESCENARIO_DEMO, simularDemo } from './escenario';

describe('escenario de demostración (ficticio)', () => {
  it('es determinístico: dos ejecuciones producen la misma timeline', () => {
    expect(simularDemo()).toStrictEqual(simularDemo());
    expect(JSON.stringify(simularDemo())).toBe(JSON.stringify(simularDemo()));
  });

  it('produce una timeline válida de cinco pasos', () => {
    const timeline = simularDemo();
    expect(validarTimeline(timeline)).toEqual([]);
    expect(timeline.pasos).toHaveLength(5);
  });

  it('el mensaje va de A a C pasando por B', () => {
    const ubicaciones = simularDemo().pasos.map((paso) => paso.paquetes[0]?.ubicacion);
    expect(ubicaciones).toEqual([
      { tipo: 'nodo', nodo: 'a' },
      { tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' },
      { tipo: 'nodo', nodo: 'b' },
      { tipo: 'enlace', enlace: 'b-c', desde: 'b', hacia: 'c' },
      { tipo: 'nodo', nodo: 'c' },
    ]);
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
