import { describe, expect, it } from 'vitest';
import { PROGRESO_VACIO, type Progreso } from './progreso';
import {
  modulosDelRecorrido,
  resumirRecorrido,
  textoCompletados,
  textoSaltos,
  type ModuloRecorrido,
} from './recorrido';

const MODULOS: ModuloRecorrido[] = [
  { id: 'ethernet', titulo: 'Ethernet', capa: 2 },
  { id: 'ipv4', titulo: 'IPv4', capa: 3 },
  { id: 'tcp', titulo: 'TCP', capa: 4 },
];

const completados = (...ids: string[]): Progreso => ({
  modulos: Object.fromEntries(ids.map((id) => [id, { completado: true, mejor: 1, total: 3 }])),
});

describe('modulosDelRecorrido', () => {
  it('toma el id, el título y la capa principal de cada entrada, en orden', () => {
    expect(
      modulosDelRecorrido([
        { id: 'tcp', data: { titulo: 'TCP', capas: [4, 3] } },
        { id: 'dns', data: { titulo: 'DNS', capas: [7] } },
      ]),
    ).toEqual([
      { id: 'tcp', titulo: 'TCP', capa: 4 },
      { id: 'dns', titulo: 'DNS', capa: 7 },
    ]);
  });

  it('rechaza un módulo sin capas', () => {
    expect(() => modulosDelRecorrido([{ id: 'x', data: { titulo: 'X', capas: [] } }])).toThrow(
      RangeError,
    );
  });
});

describe('resumirRecorrido', () => {
  it('sin progreso, ningún salto hecho', () => {
    const recorrido = resumirRecorrido(MODULOS, PROGRESO_VACIO);
    expect(recorrido.hechos).toBe(0);
    expect(recorrido.total).toBe(3);
    expect(recorrido.pasos.map((p) => p.completado)).toEqual([false, false, false]);
  });

  it('marca los completados respetando el orden de la lista', () => {
    const recorrido = resumirRecorrido(MODULOS, completados('tcp', 'ethernet'));
    expect(recorrido.hechos).toBe(2);
    expect(recorrido.pasos.map((p) => [p.modulo.id, p.completado])).toEqual([
      ['ethernet', true],
      ['ipv4', false],
      ['tcp', true],
    ]);
  });

  it('no cuenta módulos guardados que no están en la lista (ocultos o que ya no existen)', () => {
    const recorrido = resumirRecorrido(MODULOS, completados('ipv4', 'ejemplo', 'viejo'));
    expect(recorrido.hechos).toBe(1);
    expect(recorrido.total).toBe(3);
  });

  it('no confunde ids con propiedades heredadas de los objetos', () => {
    const raros: ModuloRecorrido[] = [{ id: 'toString', titulo: 'Raro', capa: 1 }];
    expect(resumirRecorrido(raros, PROGRESO_VACIO).hechos).toBe(0);
  });

  it('sin módulos, el recorrido está vacío', () => {
    expect(resumirRecorrido([], completados('ipv4'))).toEqual({ pasos: [], hechos: 0, total: 0 });
  });
});

describe('textoSaltos', () => {
  it('cuenta hacia arriba sobre el total', () => {
    expect(textoSaltos(resumirRecorrido(MODULOS, PROGRESO_VACIO))).toBe('0 de 3 saltos');
    expect(textoSaltos(resumirRecorrido(MODULOS, completados('ipv4')))).toBe('1 de 3 saltos');
    expect(textoSaltos(resumirRecorrido(MODULOS, completados('ipv4', 'tcp', 'ethernet')))).toBe(
      '3 de 3 saltos',
    );
  });

  it('con un solo módulo usa el singular', () => {
    expect(textoSaltos(resumirRecorrido(MODULOS.slice(0, 1), PROGRESO_VACIO))).toBe('0 de 1 salto');
  });

  it('sin módulos no hay texto de saltos', () => {
    expect(textoSaltos(resumirRecorrido([], PROGRESO_VACIO))).toBeNull();
  });
});

describe('textoCompletados', () => {
  it('sin completados lo dice', () => {
    expect(textoCompletados(resumirRecorrido(MODULOS, PROGRESO_VACIO))).toBe(
      'Todavía no completaste ningún módulo.',
    );
  });

  it('nombra los completados en el orden del recorrido', () => {
    expect(textoCompletados(resumirRecorrido(MODULOS, completados('ipv4')))).toBe(
      'Completado: IPv4.',
    );
    expect(textoCompletados(resumirRecorrido(MODULOS, completados('tcp', 'ethernet')))).toBe(
      'Completados: Ethernet y TCP.',
    );
    expect(
      textoCompletados(resumirRecorrido(MODULOS, completados('tcp', 'ipv4', 'ethernet'))),
    ).toBe('Completados: Ethernet, IPv4 y TCP.');
  });
});
