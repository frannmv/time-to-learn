import { describe, expect, it } from 'vitest';
import { longitudTotal, partesEnElCable } from '../core/pdu';
import { validarTimeline } from '../core/timeline';
import { BYTES_PILA_DEMO, PDU_PILA_DEMO, TOPOLOGIA_PILA_DEMO, simularPilaDemo } from './pila';

const paquetes = () => simularPilaDemo().pasos.map((paso) => paso.paquetes[0]);

describe('escenario de demostración de la pila (ficticio)', () => {
  it('es determinístico y sobrevive la ida y vuelta por JSON', () => {
    const timeline = simularPilaDemo();
    expect(simularPilaDemo()).toStrictEqual(timeline);
    expect(JSON.parse(JSON.stringify(timeline))).toStrictEqual(structuredClone(timeline));
  });

  it('produce una timeline válida de 15 pasos', () => {
    const timeline = simularPilaDemo();
    expect(validarTimeline(timeline)).toEqual([]);
    expect(timeline.pasos).toHaveLength(15);
  });

  it('cada equipo declara su pila: los hosts hasta la capa 4 y el router hasta la 3', () => {
    expect(TOPOLOGIA_PILA_DEMO.nodos.map((n) => [n.id, n.capas])).toEqual([
      ['a', [1, 2, 3, 4]],
      ['b', [1, 2, 3]],
      ['c', [1, 2, 3, 4]],
    ]);
  });

  it('baja por A, cruza a B, sube hasta la capa 3, baja, cruza a C y sube', () => {
    const recorrido = paquetes().map((p) => {
      const u = p?.ubicacion;
      return u?.tipo === 'nodo' ? `${u.nodo}${u.capa}` : u?.enlace;
    });
    expect(recorrido).toEqual([
      'a4',
      'a3',
      'a2',
      'a1',
      'a-b',
      'b1',
      'b2',
      'b3',
      'b2',
      'b1',
      'b-c',
      'c1',
      'c2',
      'c3',
      'c4',
    ]);
  });

  it('al bajar, cada capa suma sus partes; al subir, las quita', () => {
    const cantidad = paquetes().map((p) => p?.encabezados.length);
    expect(cantidad).toEqual([1, 2, 4, 4, 4, 4, 4, 2, 4, 4, 4, 4, 4, 2, 1]);
  });

  it('la trama lleva la cola al final, después de los datos', () => {
    const trama = paquetes()[2];
    if (trama === undefined) throw new Error('falta el paso 3');
    expect(trama.pdu).toBe(PDU_PILA_DEMO[2]);
    expect(partesEnElCable(trama).map((p) => [p.tipo, p.bytes, p.desplazamiento])).toEqual([
      ['encabezado', BYTES_PILA_DEMO.capa2, 0],
      ['encabezado', BYTES_PILA_DEMO.capa3, 6],
      ['encabezado', BYTES_PILA_DEMO.capa4, 14],
      ['datos', 7, 18],
      ['cola', BYTES_PILA_DEMO.cola2, 25],
    ]);
    expect(longitudTotal(trama)).toBe(27);
  });

  it('declara en el primer paso y en cada parte que es ficticio', () => {
    const timeline = simularPilaDemo();
    expect(timeline.pasos[0]?.explicacion).toMatch(/ficticio/);
    for (const e of timeline.pasos[2]?.paquetes[0]?.encabezados ?? []) {
      expect(e.nombre).toMatch(/\(fictici[oa]\)$/);
    }
  });
});
