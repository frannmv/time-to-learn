import { describe, expect, it } from 'vitest';
import { CAPAS, type Capa } from '../../engine/core/capas';
import {
  COLUMNAS_COMPARACION,
  tablaComparacion,
  textoCapas,
  tituloComparacion,
  type ColumnaComparacion,
  type TablaComparacion,
} from './filas-comparacion';

/** Las celdas de una columna, de arriba abajo, como `texto/filas`. */
function columna(tabla: TablaComparacion, id: ColumnaComparacion): string[] {
  return tabla.filas.flatMap((fila) =>
    fila.celdas.filter((c) => c.columna === id).map((c) => `${c.texto}/${c.filas}`),
  );
}

/** La celda de una columna que empieza en la fila de una capa (la primera, si hay dos). */
function celda(tabla: TablaComparacion, id: ColumnaComparacion, texto: string) {
  const encontrada = tabla.filas
    .flatMap((f) => f.celdas)
    .find((c) => c.columna === id && c.texto === texto);
  if (encontrada === undefined) throw new Error(`No hay celda «${texto}» en ${id}`);
  return encontrada;
}

describe('tablaComparacion con todas las columnas', () => {
  const tabla = tablaComparacion();

  it('dibuja las columnas en orden fijo', () => {
    expect(tabla.columnas).toEqual(COLUMNAS_COMPARACION);
  });

  it('tiene una fila por capa, de la 7 a la 1, y dos para la capa 2 (LLC arriba, MAC abajo)', () => {
    expect(tabla.filas.map((f) => f.capa)).toEqual([7, 6, 5, 4, 3, 2, 2, 1]);
    expect(tabla.filas.map((f) => f.subcapa?.sigla)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'LLC',
      'MAC',
      undefined,
    ]);
  });

  it('el encabezado de la capa 2 abarca sus dos filas', () => {
    expect(tabla.filas.map((f) => f.encabezado?.filas)).toEqual([1, 1, 1, 1, 1, 2, undefined, 1]);
  });

  it('cada columna llena exactamente las 8 filas', () => {
    for (const id of tabla.columnas) {
      const total = tabla.filas
        .flatMap((f) => f.celdas)
        .filter((c) => c.columna === id)
        .reduce((suma, c) => suma + c.filas, 0);
      expect(total, id).toBe(tabla.filas.length);
    }
  });

  it('la aplicación de TCP/IP cubre las capas OSI 5 a 7, y el enlace, la 1 y la 2', () => {
    expect(columna(tabla, 'tcpip')).toEqual([
      'Aplicación/3',
      'Transporte/1',
      'Internet/1',
      'Enlace/3',
    ]);
    expect(celda(tabla, 'tcpip', 'Aplicación').capas).toEqual([5, 6, 7]);
    expect(celda(tabla, 'tcpip', 'Enlace').capas).toEqual([1, 2]);
    expect(celda(tabla, 'tcpip', 'Enlace').detalle).toBe('También: Interfaz de red');
  });

  it('la PDU de OSI se une en las dos filas de la capa 2', () => {
    expect(columna(tabla, 'pdu-osi')).toEqual([
      'A-PDU/1',
      'P-PDU/1',
      'S-PDU/1',
      'T-PDU/1',
      'N-PDU/1',
      'DL-PDU/2',
      'Bits/1',
    ]);
  });

  it('la PDU de TCP/IP se une donde se repite', () => {
    expect(columna(tabla, 'pdu-tcpip')).toEqual([
      'Datos de la aplicación/3',
      'Segmento TCP/1',
      'Datagrama IP/1',
      'Trama/2',
      'Bits/1',
    ]);
    expect(celda(tabla, 'pdu-tcpip', 'Datos de la aplicación').capas).toEqual([5, 6, 7]);
  });

  it('IEEE 802 deja fuera las capas 3 a 7 y parte la capa 2 en LLC y MAC', () => {
    expect(columna(tabla, 'ieee802')).toEqual([
      'Fuera de su alcance/5',
      'LLC/1',
      'MAC/1',
      'Física/1',
    ]);
    const fuera = celda(tabla, 'ieee802', 'Fuera de su alcance');
    expect(fuera.fueraDeAlcance).toBe(true);
    expect(fuera.capas).toEqual([3, 4, 5, 6, 7]);
    expect(celda(tabla, 'ieee802', 'LLC')).toMatchObject({
      capas: [2],
      detalle: 'Control de enlace lógico',
    });
    expect(celda(tabla, 'ieee802', 'MAC')).toMatchObject({
      capas: [2],
      detalle: 'Control de acceso al medio',
    });
  });
});

describe('tablaComparacion con menos columnas', () => {
  it('sin IEEE 802, la capa 2 ocupa una sola fila', () => {
    const tabla = tablaComparacion(['tcpip', 'pdu-tcpip']);
    expect(tabla.columnas).toEqual(['tcpip', 'pdu-tcpip']);
    expect(tabla.filas.map((f) => f.capa)).toEqual([...CAPAS].reverse());
    expect(tabla.filas.every((f) => f.encabezado?.filas === 1 && f.subcapa === undefined)).toBe(
      true,
    );
    expect(columna(tabla, 'tcpip')).toEqual([
      'Aplicación/3',
      'Transporte/1',
      'Internet/1',
      'Enlace/2',
    ]);
    expect(columna(tabla, 'pdu-tcpip')).toContain('Trama/1');
  });

  it('ignora el orden y las repeticiones de las columnas pedidas', () => {
    expect(tablaComparacion(['ieee802', 'pdu-osi', 'ieee802']).columnas).toEqual([
      'pdu-osi',
      'ieee802',
    ]);
  });

  it('sin columnas opcionales queda solo la de las capas OSI', () => {
    const tabla = tablaComparacion([]);
    expect(tabla.filas).toHaveLength(7);
    expect(tabla.filas.every((f) => f.celdas.length === 0)).toBe(true);
  });
});

describe('textoCapas', () => {
  it.each<[Capa[], string]>([
    [[2], 'capa OSI 2'],
    [[2, 1], 'capas OSI 1 y 2'],
    [[7, 5, 6], 'capas OSI 5 a 7'],
    [[1, 3, 5], 'capas OSI 1, 3 y 5'],
  ])('%j → %s', (capas, esperado) => {
    expect(textoCapas(capas)).toBe(esperado);
  });
});

describe('tituloComparacion', () => {
  it.each<[ColumnaComparacion[], string]>([
    [[...COLUMNAS_COMPARACION], 'Comparación de los modelos OSI, TCP/IP e IEEE 802'],
    [['tcpip', 'pdu-tcpip'], 'Comparación de los modelos OSI y TCP/IP'],
    [['pdu-osi', 'ieee802'], 'Comparación de los modelos OSI e IEEE 802'],
    [['pdu-osi'], 'Capas del modelo OSI'],
  ])('%j → %s', (columnas, esperado) => {
    expect(tituloComparacion(columnas)).toBe(esperado);
  });
});
