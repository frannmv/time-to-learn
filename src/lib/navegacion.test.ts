import { describe, expect, it } from 'vitest';
import type { Capa } from '../engine/core/capas';
import type { Bloque } from '../content/schema';
import {
  agruparPorBloque,
  agruparPorCapa,
  anteriorSiguiente,
  ruta,
  rutaModulo,
  type ModuloNavegable,
} from './navegacion';

const modulo = (id: string, orden: number, bloque: Bloque, capas: Capa[]): ModuloNavegable => ({
  id,
  data: { titulo: id, orden, bloque, capas },
});

// Desordenados a propósito: las funciones tienen que ordenar por `orden`.
const MODULOS = [
  modulo('tcp', 30, 'Transporte', [4, 3]),
  modulo('ethernet', 10, 'LAN', [2, 1]),
  modulo('ip', 20, 'Red', [3]),
  modulo('arp', 15, 'LAN', [2, 3]),
];

const ids = (modulos: readonly ModuloNavegable[]) => modulos.map((m) => m.id);

describe('ruta', () => {
  it('antepone el base del sitio', () => {
    expect(ruta('/time-to-learn/', 'capas/')).toBe('/time-to-learn/capas/');
    expect(ruta('/time-to-learn/')).toBe('/time-to-learn/');
  });

  it('no duplica ni pierde barras', () => {
    expect(ruta('/time-to-learn', 'capas/')).toBe('/time-to-learn/capas/');
    expect(ruta('/time-to-learn/', '/capas/')).toBe('/time-to-learn/capas/');
    expect(ruta('/', 'capas/')).toBe('/capas/');
  });

  it('arma la ruta de un módulo', () => {
    expect(rutaModulo('/time-to-learn/', 'ejemplo')).toBe('/time-to-learn/modulos/ejemplo/');
  });
});

describe('agruparPorBloque', () => {
  it('agrupa en el orden de los bloques y ordena cada grupo por orden', () => {
    const grupos = agruparPorBloque(MODULOS);
    expect(grupos.map((g) => g.bloque)).toEqual(['LAN', 'Red', 'Transporte']);
    expect(ids(grupos[0]?.modulos ?? [])).toEqual(['ethernet', 'arp']);
  });

  it('sin módulos no devuelve grupos', () => {
    expect(agruparPorBloque([])).toEqual([]);
  });
});

describe('agruparPorCapa', () => {
  it('incluye siempre las siete capas, aunque estén vacías', () => {
    expect(agruparPorCapa([]).map((g) => g.capa)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(agruparPorCapa([]).every((g) => g.modulos.length === 0)).toBe(true);
  });

  it('pone cada módulo en todas sus capas y marca la principal', () => {
    const red = agruparPorCapa(MODULOS).find((g) => g.capa === 3);
    expect(red?.modulos.map(({ modulo, principal }) => [modulo.id, principal])).toEqual([
      ['arp', false],
      ['ip', true],
      ['tcp', false],
    ]);
  });
});

describe('anteriorSiguiente', () => {
  it('devuelve los vecinos según orden', () => {
    const { anterior, siguiente } = anteriorSiguiente(MODULOS, 'arp');
    expect(anterior?.id).toBe('ethernet');
    expect(siguiente?.id).toBe('ip');
  });

  it('el primero no tiene anterior y el último no tiene siguiente', () => {
    expect(anteriorSiguiente(MODULOS, 'ethernet').anterior).toBeUndefined();
    expect(anteriorSiguiente(MODULOS, 'tcp').siguiente).toBeUndefined();
  });

  it('un módulo fuera de la lista (por ejemplo, oculto) no tiene vecinos', () => {
    expect(anteriorSiguiente(MODULOS, 'ejemplo')).toEqual({});
  });
});
