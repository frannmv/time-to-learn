import { describe, expect, it } from 'vitest';
import type { Paquete, Topologia } from '../../engine/core/timeline';
import { simularDemo, TOPOLOGIA_DEMO } from '../../engine/demo/escenario';
import { simularPilaDemo, TOPOLOGIA_PILA_DEMO } from '../../engine/demo/pila';
import {
  describirCapas,
  describirPaquete,
  describirPaso,
  describirPasoEnPila,
  describirPilas,
  describirTopologia,
  enumerar,
} from './descripcion';

describe('enumerar', () => {
  it('une listas en español', () => {
    expect(enumerar([])).toBe('');
    expect(enumerar(['A'])).toBe('A');
    expect(enumerar(['A', 'B'])).toBe('A y B');
    expect(enumerar(['A', 'B', 'C'])).toBe('A, B y C');
  });
});

describe('describirTopologia', () => {
  it('nombra los nodos con su tipo y los enlaces con sus etiquetas', () => {
    expect(describirTopologia(TOPOLOGIA_DEMO)).toBe(
      '3 nodos: A (host), B (router) y C (host). 2 enlaces: A con B y B con C.',
    );
  });

  it('usa singular y avisa cuando no hay enlaces', () => {
    const uno: Topologia = {
      nodos: [{ id: 'x', tipo: 'ap', etiqueta: 'AP1', posicion: { x: 0, y: 0 } }],
      enlaces: [],
    };
    expect(describirTopologia(uno)).toBe('1 nodo: AP1 (punto de acceso). Sin enlaces.');
  });
});

describe('describirPaquete', () => {
  const base: Omit<Paquete, 'ubicacion'> = {
    id: 'p',
    encabezados: [
      { capa: 2, nombre: 'Ethernet II', campos: [] },
      { capa: 3, nombre: 'IPv4', campos: [] },
    ],
  };

  it('dice los encabezados y el nodo donde está', () => {
    expect(
      describirPaquete({ ...base, ubicacion: { tipo: 'nodo', nodo: 'b' } }, TOPOLOGIA_DEMO),
    ).toBe('Paquete con Ethernet II (capa 2, Enlace de datos) y IPv4 (capa 3, Red): en B.');
  });

  it('con PDU y capa, dice el nombre de la PDU y en qué capa de qué nodo está', () => {
    const segmento: Paquete = {
      id: 's',
      ubicacion: { tipo: 'nodo', nodo: 'a', capa: 4 },
      pdu: 'Segmento TCP',
      encabezados: [{ capa: 4, nombre: 'TCP', campos: [] }],
    };
    expect(describirPaquete(segmento, TOPOLOGIA_DEMO)).toBe(
      'Segmento TCP con TCP (capa 4, Transporte): en la capa 4 de A.',
    );
  });

  it('nombra las colas como colas y en el orden del cable', () => {
    const trama: Paquete = {
      id: 't',
      ubicacion: { tipo: 'nodo', nodo: 'b' },
      pdu: 'Trama Ethernet',
      encabezados: [
        { capa: 2, nombre: 'Ethernet II', campos: [] },
        { capa: 2, nombre: 'FCS', campos: [], parte: 'cola' },
        { capa: 3, nombre: 'IPv4', campos: [] },
      ],
      datos: { descripcion: '[Ejemplo] Carga' },
    };
    expect(describirPaquete(trama, TOPOLOGIA_DEMO)).toBe(
      'Trama Ethernet con Ethernet II (capa 2, Enlace de datos), IPv4 (capa 3, Red) y FCS (cola de la capa 2, Enlace de datos): en B.',
    );
  });

  it('dice el sentido cuando está sobre un enlace', () => {
    const paquete: Paquete = {
      ...base,
      encabezados: [],
      ubicacion: { tipo: 'enlace', enlace: 'b-c', desde: 'c', hacia: 'b' },
    };
    expect(describirPaquete(paquete, TOPOLOGIA_DEMO)).toBe(
      'Paquete sin encabezados: sobre el enlace de C hacia B.',
    );
  });
});

describe('describirPaso', () => {
  it('describe cada paquete del paso', () => {
    const [primero] = simularDemo().pasos;
    expect(primero && describirPaso(primero, TOPOLOGIA_DEMO)).toBe(
      'Paquete con Mensaje de juguete (ficticio) (capa 7, Aplicación): en A.',
    );
  });

  it('avisa cuando no hay paquetes', () => {
    const [primero] = simularDemo().pasos;
    if (primero === undefined) throw new Error('el demo no tiene pasos');
    expect(describirPaso({ ...primero, paquetes: [] }, TOPOLOGIA_DEMO)).toBe(
      'No hay paquetes en este paso.',
    );
  });
});

describe('vista de pila', () => {
  const pila = simularPilaDemo();

  it('describirCapas usa rangos y avisa los huecos', () => {
    expect(describirCapas([1])).toBe('capa 1');
    expect(describirCapas([1, 2, 3])).toBe('capas 1 a 3');
    expect(describirCapas([1, 2, 4])).toBe('capas 1, 2 y 4');
  });

  it('describirPilas dice la pila de cada equipo, o que no la declara', () => {
    expect(describirPilas(TOPOLOGIA_PILA_DEMO.nodos)).toBe(
      'Pila de cada equipo: A (host), capas 1 a 4; B (router), capas 1 a 3; C (host), capas 1 a 4.',
    );
    expect(describirPilas(TOPOLOGIA_DEMO.nodos.slice(0, 1))).toBe(
      'Pila de cada equipo: A (host), sin pila declarada.',
    );
    expect(describirPilas([])).toBe('Sin equipos.');
  });

  it('describirPasoEnPila dice equipo, capa y PDU', () => {
    const texto = (i: number) => {
      const paso = pila.pasos[i];
      if (paso === undefined) throw new Error(`falta el paso ${i}`);
      return describirPasoEnPila(paso, pila.topologia);
    };
    expect(texto(2)).toBe('Trama de juguete en la capa 2 (Enlace de datos) de A.');
    expect(texto(4)).toBe('Bits de juguete sobre el enlace de A hacia B.');
    expect(texto(7)).toBe('Paquete de juguete en la capa 3 (Red) de B.');
  });

  it('sin capa ni nombre de PDU, dice «PDU» y el equipo', () => {
    const paso = simularDemo().pasos[0];
    if (paso === undefined) throw new Error('falta el paso');
    expect(describirPasoEnPila(paso, TOPOLOGIA_DEMO)).toBe('PDU en A.');
    expect(describirPasoEnPila({ ...paso, paquetes: [] }, TOPOLOGIA_DEMO)).toBe(
      'No hay PDU en este paso.',
    );
  });
});
