import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPAS, NOMBRE_CAPA } from '../../engine/core/capas';
import type { Enlace, Nodo, Paquete, Timeline } from '../../engine/core/timeline';
import { simularDemo } from '../../engine/demo/escenario';
import { simularPilaDemo } from '../../engine/demo/pila';
import { simularRouterEnElMedio } from '../../engine/osi/encapsulamiento';
import { leerTokens } from '../../styles/leer-tokens';
import type { Caja } from './geometria';
import {
  MEDIDAS_PILA,
  cajaPestana,
  centroDe,
  claveEnPila,
  geometriaPila,
  lineasCapa,
  marcaUbicacion,
  nivelesEnlaces,
  ordenColumnas,
  textoFicha,
} from './geometria-pila';

const tokens = leerTokens(
  readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8'),
);
const pxDeRem = (valor: string | undefined) => Number.parseFloat(valor ?? '') * 16;

const M = MEDIDAS_PILA;
const contiene = (afuera: Caja, adentro: Caja) =>
  adentro.x >= afuera.x &&
  adentro.y >= afuera.y &&
  adentro.x + adentro.ancho <= afuera.x + afuera.ancho &&
  adentro.y + adentro.alto <= afuera.y + afuera.alto;

const nodo = (id: string, x: number, y = 0, capas?: Nodo['capas']): Nodo => ({
  id,
  tipo: 'host',
  etiqueta: id.toUpperCase(),
  posicion: { x, y },
  ...(capas !== undefined && { capas }),
});
const enlace = (a: string, b: string): Enlace => ({ id: `${a}-${b}`, extremos: [a, b] });

describe('MEDIDAS_PILA', () => {
  it('usa los mismos tamaños de texto que los tokens', () => {
    expect(pxDeRem(tokens.claro.get('--texto-sm'))).toBe(M.textoNombre);
    expect(pxDeRem(tokens.claro.get('--texto-xs'))).toBe(M.textoChico);
  });

  it('el nombre de cualquier capa entra en la columna', () => {
    for (const capa of CAPAS) {
      const texto = NOMBRE_CAPA[capa].length * M.textoNombre * M.caracterNombre;
      expect(M.franja + 2 * M.relleno + texto, NOMBRE_CAPA[capa]).toBeLessThanOrEqual(
        M.anchoColumna,
      );
    }
  });

  it('la pestaña «PDU» entra entre dos columnas y en su propio alto', () => {
    expect(M.anchoPestana).toBeLessThan(M.separacion);
    expect('PDU'.length * M.textoChico * M.caracterMono + 2 * M.relleno).toBeLessThanOrEqual(
      M.anchoPestana,
    );
    expect(M.altoPestana).toBeLessThanOrEqual(M.altoCapa);
  });
});

describe('lineasCapa', () => {
  it('dice el número y el nombre de la capa', () => {
    expect(lineasCapa(2)).toEqual(['Capa 2', 'Enlace de datos']);
  });
});

describe('ordenColumnas', () => {
  it('ordena por x y, a igual x, por y, sin cambiar el orden de los empates', () => {
    const nodos = [nodo('c', 200), nodo('b', 100, 50), nodo('a', 100, 0), nodo('d', 300)];
    expect(ordenColumnas(nodos).map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(nodos.map((n) => n.id)).toEqual(['c', 'b', 'a', 'd']);
  });
});

describe('nivelesEnlaces', () => {
  const indice = new Map(['a', 'b', 'c', 'd', 'e'].map((id, i) => [id, i]));

  it('los enlaces entre columnas vecinas van en el nivel 0', () => {
    const niveles = nivelesEnlaces([enlace('a', 'b'), enlace('b', 'c')], indice);
    expect([...niveles]).toEqual([
      ['a-b', 0],
      ['b-c', 0],
    ]);
  });

  it('un enlace que salta columnas baja a su nivel; si se superpone con otro, más abajo', () => {
    const niveles = nivelesEnlaces(
      [enlace('a', 'c'), enlace('b', 'd'), enlace('d', 'e'), enlace('c', 'e')],
      indice,
    );
    expect(Object.fromEntries(niveles)).toEqual({ 'a-c': 1, 'b-d': 2, 'c-e': 1, 'd-e': 0 });
  });

  it('ignora enlaces con extremos que no están en las columnas', () => {
    expect(nivelesEnlaces([enlace('a', 'x')], indice).size).toBe(0);
  });
});

describe('geometriaPila con el escenario de juguete', () => {
  const timeline = simularPilaDemo();
  const geo = geometriaPila(timeline);
  const [a, b, c] = geo.columnas;
  if (a === undefined || b === undefined || c === undefined) throw new Error('faltan columnas');
  const capa = (col: typeof a, n: number) => col.capas.find((x) => x.capa === n)?.caja;

  it('una columna por nodo, de izquierda a derecha, sin superponerse', () => {
    expect(geo.columnas.map((col) => col.nodo.id)).toEqual(['a', 'b', 'c']);
    expect(b.rotulo.x - (a.rotulo.x + a.rotulo.ancho)).toBe(M.separacion);
  });

  it('las capas se alinean por número y la más alta va arriba', () => {
    expect(capa(a, 3)?.y).toBe(capa(b, 3)?.y);
    expect(capa(a, 1)?.y).toBe(capa(c, 1)?.y);
    expect(capa(a, 4)?.y ?? Infinity).toBeLessThan(capa(a, 3)?.y ?? 0);
    expect(capa(b, 4)).toBeUndefined();
  });

  it('el rótulo va arriba de la capa más alta de cada equipo', () => {
    expect(a.rotulo.y + a.rotulo.alto).toBe(capa(a, 4)?.y);
    expect(b.rotulo.y + b.rotulo.alto).toBe(capa(b, 3)?.y);
  });

  it('el medio corre debajo de la capa 1 y une las columnas vecinas en línea recta', () => {
    const pie = (capa(a, 1)?.y ?? 0) + M.altoCapa;
    expect(a.base).toBe(pie);
    expect(geo.yMedio).toBe(pie + M.medio);
    expect(geo.tramos.map((t) => [t.enlace.id, t.nivel, t.puntos])).toEqual([
      [
        'a-b',
        0,
        [
          { x: a.centro, y: geo.yMedio },
          { x: b.centro, y: geo.yMedio },
        ],
      ],
      [
        'b-c',
        0,
        [
          { x: b.centro, y: geo.yMedio },
          { x: c.centro, y: geo.yMedio },
        ],
      ],
    ]);
  });

  it('marca la capa donde está la PDU, o la ficha sobre el enlace', () => {
    const paquete = (i: number) => {
      const p = timeline.pasos[i]?.paquetes[0];
      if (p === undefined) throw new Error(`falta el paso ${i}`);
      return p;
    };
    expect(marcaUbicacion(paquete(2), geo)).toEqual({ tipo: 'capa', caja: capa(a, 2) });
    const enEnlace = marcaUbicacion(paquete(4), geo);
    expect(enEnlace?.tipo).toBe('enlace');
    expect(centroDe(enEnlace?.caja ?? a.rotulo)).toEqual(geo.tramos[0]?.centro);
  });

  it('la ficha de los bits apunta hacia donde van', () => {
    const p = timeline.pasos[4]?.paquetes[0];
    if (p === undefined) throw new Error('falta el paso');
    expect(textoFicha(p, geo)).toBe('Bits de juguete →');
    const vuelta: Pick<Paquete, 'pdu' | 'ubicacion'> = {
      ubicacion: { tipo: 'enlace', enlace: 'a-b', desde: 'b', hacia: 'a' },
    };
    expect(textoFicha(vuelta, geo)).toBe('← Bits');
  });

  it('la pestaña de la última columna queda dentro del dibujo', () => {
    const ultima = capa(c, 4);
    if (ultima === undefined) throw new Error('falta la capa');
    expect(contiene(geo.caja, cajaPestana(ultima))).toBe(true);
  });
});

describe('caja de la pila', () => {
  const casos: [string, Timeline][] = [
    ['juguete', simularPilaDemo()],
    ['router en el medio', simularRouterEnElMedio()],
  ];

  it.each(casos)('contiene columnas, pestañas y fichas en todos los pasos (%s)', (_, t) => {
    const geo = geometriaPila(t);
    for (const columna of geo.columnas) {
      expect(contiene(geo.caja, columna.rotulo)).toBe(true);
      for (const { caja } of columna.capas)
        expect(contiene(geo.caja, cajaPestana(caja))).toBe(true);
    }
    for (const paso of t.pasos) {
      for (const paquete of paso.paquetes) {
        const marca = marcaUbicacion(paquete, geo);
        expect(marca, `paso ${paso.indice}`).toBeDefined();
        if (marca !== undefined) expect(contiene(geo.caja, marca.caja)).toBe(true);
      }
    }
  });

  it('sin pila declarada, la columna es solo el rótulo y la PDU se marca ahí', () => {
    const t = simularDemo();
    const geo = geometriaPila(t);
    expect(geo.columnas.every((col) => col.capas.length === 0)).toBe(true);
    const p = t.pasos[0]?.paquetes[0];
    if (p === undefined) throw new Error('falta el paso');
    expect(marcaUbicacion(p, geo)).toEqual({ tipo: 'nodo', caja: geo.columnas[0]?.rotulo });
    expect(geo.columnas[0]?.base).toBe(geo.yMedio - M.medio);
  });

  it('una topología vacía da una caja vacía', () => {
    const geo = geometriaPila({ topologia: { nodos: [], enlaces: [] }, pasos: [] });
    expect(geo.caja).toEqual({ x: 0, y: 0, ancho: 0, alto: 0 });
  });
});

describe('claveEnPila', () => {
  it('nombra el nodo y la capa, o el enlace', () => {
    expect(claveEnPila({ tipo: 'nodo', nodo: 'a', capa: 3 })).toBe('a:3');
    expect(claveEnPila({ tipo: 'nodo', nodo: 'a' })).toBe('a');
    expect(claveEnPila({ tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' })).toBe(
      'enlace:a-b',
    );
  });
});

describe('ancho del diagrama', () => {
  it('tres equipos entran en la columna de lectura (42rem menos el relleno de la simulación)', () => {
    const ancho = geometriaPila(simularRouterEnElMedio()).caja.ancho;
    expect(ancho).toBeLessThanOrEqual(42 * 16 - 2 * 16);
  });
});
