import { describe, expect, it } from 'vitest';
import { calcularTramos } from './tramos';

describe('calcularTramos', () => {
  it('ubica campos que entran en una fila', () => {
    expect(
      calcularTramos([
        { nombre: 'a', desdeBit: 0, bits: 4 },
        { nombre: 'b', desdeBit: 4, bits: 28 },
        { nombre: 'c', desdeBit: 32, bits: 32 },
      ]),
    ).toEqual([
      { campo: 0, fila: 0, columna: 0, ancho: 4, continua: false },
      { campo: 1, fila: 0, columna: 4, ancho: 28, continua: false },
      { campo: 2, fila: 1, columna: 0, ancho: 32, continua: false },
    ]);
  });

  it('parte en tramos un campo que cruza de fila', () => {
    // Un campo de 48 bits (como una dirección MAC) que empieza en el bit 16.
    expect(
      calcularTramos([
        { nombre: 'a', desdeBit: 0, bits: 16 },
        { nombre: 'mac', desdeBit: 16, bits: 48 },
      ]),
    ).toEqual([
      { campo: 0, fila: 0, columna: 0, ancho: 16, continua: false },
      { campo: 1, fila: 0, columna: 16, ancho: 16, continua: false },
      { campo: 1, fila: 1, columna: 0, ancho: 32, continua: true },
    ]);
  });

  it('acepta otro ancho de fila', () => {
    expect(calcularTramos([{ nombre: 'a', desdeBit: 0, bits: 12 }], 8)).toEqual([
      { campo: 0, fila: 0, columna: 0, ancho: 8, continua: false },
      { campo: 0, fila: 1, columna: 0, ancho: 4, continua: true },
    ]);
  });
});
