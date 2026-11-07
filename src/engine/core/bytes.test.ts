import { describe, expect, it } from 'vitest';
import { bytesAHex, escribirBits, hexABytes, leerBits, palabras16, toBinary, toHex } from './bytes';

// Tests que venían de hex.test.ts, sin cambios.
describe('toHex', () => {
  it('formatea el EtherType de IPv4 con dos bytes', () => {
    expect(toHex(0x0800, 2)).toBe('0x0800');
  });

  it('completa con ceros a la izquierda', () => {
    expect(toHex(1, 1)).toBe('0x01');
  });

  it('acepta el máximo valor representable', () => {
    expect(toHex(0xffff, 2)).toBe('0xFFFF');
  });

  it('rechaza valores que no entran en el ancho pedido', () => {
    expect(() => toHex(0x1_0000, 2)).toThrow(RangeError);
    expect(() => toHex(-1, 1)).toThrow(RangeError);
  });

  it('rechaza anchos inválidos', () => {
    expect(() => toHex(0, 0)).toThrow(RangeError);
  });
});

describe('toBinary', () => {
  it('completa con ceros a la izquierda', () => {
    expect(toBinary(5, 4)).toBe('0101');
  });

  it('acepta los extremos del ancho', () => {
    expect(toBinary(0, 1)).toBe('0');
    expect(toBinary(1, 1)).toBe('1');
    expect(toBinary(0xff, 8)).toBe('11111111');
  });

  it('rechaza valores fuera de rango y anchos inválidos', () => {
    expect(() => toBinary(2, 1)).toThrow(RangeError);
    expect(() => toBinary(-1, 4)).toThrow(RangeError);
    expect(() => toBinary(1.5, 4)).toThrow(RangeError);
    expect(() => toBinary(0, 0)).toThrow(RangeError);
    expect(() => toBinary(0, 54)).toThrow(RangeError);
  });
});

describe('hexABytes y bytesAHex', () => {
  it('ida y vuelta hex → bytes → hex', () => {
    const texto = '45 00 00 73 00 00 40 00';
    expect(bytesAHex(hexABytes(texto))).toBe(texto);
  });

  it('ida y vuelta bytes → hex → bytes', () => {
    const bytes = Uint8Array.from([0x00, 0x7f, 0x80, 0xff]);
    expect(hexABytes(bytesAHex(bytes))).toEqual(bytes);
  });

  it('acepta separadores comunes y minúsculas', () => {
    expect(hexABytes('00:1a:2B-3c 4d\n5E')).toEqual(
      Uint8Array.from([0x00, 0x1a, 0x2b, 0x3c, 0x4d, 0x5e]),
    );
  });

  it('el texto vacío da cero bytes', () => {
    expect(hexABytes('')).toEqual(new Uint8Array(0));
    expect(bytesAHex(new Uint8Array(0))).toBe('');
  });

  it('agrupa por palabra de 16 bits, con el último grupo corto si la longitud es impar', () => {
    expect(bytesAHex(hexABytes('45 00 00 73'), { agrupar: 'palabra' })).toBe('4500 0073');
    expect(bytesAHex(hexABytes('01 02 03'), { agrupar: 'palabra' })).toBe('0102 03');
  });

  it('usa el separador pedido', () => {
    expect(bytesAHex(hexABytes('00 1A 2B'), { separador: ':' })).toBe('00:1A:2B');
  });

  it('rechaza dígitos impares y caracteres no hexadecimales', () => {
    expect(() => hexABytes('ABC')).toThrow(RangeError);
    expect(() => hexABytes('0x45')).toThrow(RangeError);
    expect(() => hexABytes('GG')).toThrow(RangeError);
  });
});

describe('palabras16', () => {
  it('agrupa en orden de red', () => {
    expect(palabras16(hexABytes('45 00 00 73'))).toEqual([0x4500, 0x0073]);
  });

  it('completa con un byte cero a la derecha si la longitud es impar', () => {
    expect(palabras16(hexABytes('01 02 03'))).toEqual([0x0102, 0x0300]);
  });

  it('cero bytes dan cero palabras', () => {
    expect(palabras16(new Uint8Array(0))).toEqual([]);
  });
});

describe('leerBits', () => {
  // Primer byte del encabezado IPv4: Version (4 bits) = 4 e IHL (4 bits) = 5.
  const ipv4 = hexABytes('45 00 00 73 00 00 40 00');

  it('lee campos de medio byte', () => {
    expect(leerBits(ipv4, 0, 4)).toBe(4);
    expect(leerBits(ipv4, 4, 4)).toBe(5);
  });

  it('lee un campo de 1 bit (flag DF del encabezado IPv4, bit 49)', () => {
    expect(leerBits(ipv4, 49, 1)).toBe(1);
    expect(leerBits(ipv4, 48, 1)).toBe(0);
  });

  it('lee un campo de 16 bits (Total Length)', () => {
    expect(leerBits(ipv4, 16, 16)).toBe(0x0073);
  });

  it('lee un campo que cruza bytes (Fragment Offset, 13 bits desde el bit 51)', () => {
    expect(leerBits(hexABytes('00 00 00 00 00 00 1F FF'), 51, 13)).toBe(0x1fff);
    expect(leerBits(hexABytes('0F F0'), 4, 8)).toBe(0xff);
  });

  it('lee un campo de 32 bits sin volverse negativo', () => {
    expect(leerBits(hexABytes('FF FF FF FF'), 0, 32)).toBe(0xffffffff);
  });

  it('rechaza campos que se salen del arreglo o con ancho inválido', () => {
    expect(() => leerBits(ipv4, 60, 8)).toThrow(RangeError);
    expect(() => leerBits(ipv4, 0, 0)).toThrow(RangeError);
    expect(() => leerBits(ipv4, 0, 33)).toThrow(RangeError);
    expect(() => leerBits(ipv4, -1, 4)).toThrow(RangeError);
    expect(() => leerBits(ipv4, 0.5, 4)).toThrow(RangeError);
  });
});

describe('escribirBits', () => {
  it('escribe un campo de 1 bit sin tocar los vecinos', () => {
    expect(escribirBits(hexABytes('00'), 0, 1, 1)).toEqual(hexABytes('80'));
    expect(escribirBits(hexABytes('FF'), 7, 1, 0)).toEqual(hexABytes('FE'));
  });

  it('escribe un campo de 16 bits', () => {
    expect(escribirBits(new Uint8Array(4), 16, 16, 0x0073)).toEqual(hexABytes('00 00 00 73'));
  });

  it('escribe un campo que cruza bytes', () => {
    expect(escribirBits(hexABytes('F0 0F'), 4, 8, 0xab)).toEqual(hexABytes('FA BF'));
  });

  it('escribe un campo de 32 bits', () => {
    expect(escribirBits(new Uint8Array(4), 0, 32, 0xc0a80001)).toEqual(hexABytes('C0 A8 00 01'));
  });

  it('no modifica el arreglo original', () => {
    const original = hexABytes('00 00');
    escribirBits(original, 0, 8, 0xff);
    expect(original).toEqual(hexABytes('00 00'));
  });

  it('ida y vuelta con leerBits', () => {
    const bytes = escribirBits(new Uint8Array(3), 5, 13, 0x1234);
    expect(leerBits(bytes, 5, 13)).toBe(0x1234);
  });

  it('rechaza valores que no entran en el ancho', () => {
    expect(() => escribirBits(new Uint8Array(1), 0, 4, 16)).toThrow(RangeError);
    expect(() => escribirBits(new Uint8Array(1), 0, 4, -1)).toThrow(RangeError);
    expect(() => escribirBits(new Uint8Array(1), 0, 4, 1.5)).toThrow(RangeError);
  });

  it('rechaza campos que se salen del arreglo', () => {
    expect(() => escribirBits(new Uint8Array(1), 4, 8, 0)).toThrow(RangeError);
  });
});
