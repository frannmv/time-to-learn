import { describe, expect, it } from 'vitest';
import { CAPAS, NOMBRE_CAPA, esCapa } from './capas';

describe('capas OSI', () => {
  it('hay siete capas, ordenadas de abajo hacia arriba', () => {
    expect(CAPAS).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('cada capa tiene nombre', () => {
    for (const capa of CAPAS) {
      expect(NOMBRE_CAPA[capa]).toBeTruthy();
    }
    expect(NOMBRE_CAPA[1]).toBe('Física');
    expect(NOMBRE_CAPA[7]).toBe('Aplicación');
  });

  it('el catálogo no se puede modificar', () => {
    expect(Object.isFrozen(CAPAS)).toBe(true);
    expect(Object.isFrozen(NOMBRE_CAPA)).toBe(true);
  });

  // Casos borde: los extremos válidos, uno de cada lado fuera de rango, no enteros y
  // valores que no son números.
  it('esCapa acepta 1 a 7 y rechaza todo lo demás', () => {
    expect(esCapa(1)).toBe(true);
    expect(esCapa(7)).toBe(true);
    expect(esCapa(0)).toBe(false);
    expect(esCapa(8)).toBe(false);
    expect(esCapa(2.5)).toBe(false);
    expect(esCapa('3')).toBe(false);
    expect(esCapa(null)).toBe(false);
  });
});
