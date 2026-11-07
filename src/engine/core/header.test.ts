import { describe, expect, it } from 'vitest';
import { bytesAHex } from './bytes';
import { verificarChecksum } from './checksum';
import {
  conChecksum,
  desplazamientos,
  formatearValor,
  longitudEnBytes,
  serializar,
  validarEncabezado,
  type CampoSpec,
  type HeaderSpec,
} from './header';

function campo(nombre: string, bits: number, valor = 0, extra: Partial<CampoSpec> = {}): CampoSpec {
  return { nombre, bits, valor, formato: 'decimal', descripcion: `Campo ${nombre}`, ...extra };
}

function encabezado(...campos: CampoSpec[]): HeaderSpec {
  return { nombre: 'Prueba', capa: 3, campos };
}

describe('validarEncabezado', () => {
  it('acepta un encabezado que cierra en bytes', () => {
    expect(() => validarEncabezado(encabezado(campo('a', 4), campo('b', 12)))).not.toThrow();
  });

  it('rechaza campos de 0 bits', () => {
    expect(() => validarEncabezado(encabezado(campo('a', 0), campo('b', 8)))).toThrow(
      /«a».*entre 1 y 32/,
    );
  });

  it('rechaza tamaños negativos, fraccionarios o de más de 32 bits', () => {
    expect(() => validarEncabezado(encabezado(campo('a', -8)))).toThrow(RangeError);
    expect(() => validarEncabezado(encabezado(campo('a', 7.5), campo('b', 0.5)))).toThrow(
      RangeError,
    );
    expect(() => validarEncabezado(encabezado(campo('a', 40)))).toThrow(RangeError);
  });

  it('rechaza totales que no cierran en bytes', () => {
    expect(() => validarEncabezado(encabezado(campo('a', 4), campo('b', 8)))).toThrow(
      /12 bits.*múltiplo de 8/,
    );
  });

  it('rechaza valores que no entran en el campo', () => {
    expect(() => validarEncabezado(encabezado(campo('a', 4, 16), campo('b', 4)))).toThrow(
      /16 no entra en 4/,
    );
    expect(() => validarEncabezado(encabezado(campo('a', 8, -1)))).toThrow(RangeError);
  });

  it('rechaza encabezados sin campos, nombres vacíos o repetidos', () => {
    expect(() => validarEncabezado(encabezado())).toThrow(/no tiene campos/);
    expect(() => validarEncabezado(encabezado(campo(' ', 8)))).toThrow(/sin nombre/);
    expect(() => validarEncabezado(encabezado(campo('a', 4), campo('a', 4)))).toThrow(/repite/);
  });

  it('rechaza el formato texto sin texto', () => {
    expect(() => validarEncabezado(encabezado(campo('a', 8, 1, { formato: 'texto' })))).toThrow(
      /necesita el texto/,
    );
  });

  it('rechaza una capa que no es OSI', () => {
    const spec = { ...encabezado(campo('a', 8)), capa: 9 } as unknown as HeaderSpec;
    expect(() => validarEncabezado(spec)).toThrow(/no es una capa/);
  });
});

describe('desplazamientos y longitud', () => {
  it('pone cada campo a continuación del anterior', () => {
    const spec = encabezado(campo('a', 4), campo('b', 4), campo('c', 16), campo('d', 8));
    expect(desplazamientos(spec)).toEqual([
      { nombre: 'a', desdeBit: 0, bits: 4 },
      { nombre: 'b', desdeBit: 4, bits: 4 },
      { nombre: 'c', desdeBit: 8, bits: 16 },
      { nombre: 'd', desdeBit: 24, bits: 8 },
    ]);
    expect(longitudEnBytes(spec)).toBe(4);
  });
});

describe('serializar', () => {
  it('escribe los campos en orden de red', () => {
    const spec = encabezado(campo('a', 4, 4), campo('b', 4, 5), campo('c', 3, 2), campo('d', 13));
    expect(bytesAHex(serializar(spec))).toBe('45 40 00');
  });

  it('valida antes de serializar', () => {
    expect(() => serializar(encabezado(campo('a', 4)))).toThrow(RangeError);
  });
});

describe('conChecksum', () => {
  // Las cuatro palabras de 16 bits del ejemplo numérico de RFC 1071 §3, más un campo de
  // checksum: el resultado es 0x220D.
  const spec = encabezado(
    campo('p1', 16, 0x0001),
    campo('p2', 16, 0xf203),
    campo('p3', 16, 0xf4f5),
    campo('p4', 16, 0xf6f7),
    campo('checksum', 16, 0xbeef),
  );

  it('calcula el checksum con el campo en cero y lo guarda', () => {
    const resultado = conChecksum(spec, 'checksum');
    expect(resultado.campos.at(-1)?.valor).toBe(0x220d);
    expect(verificarChecksum(serializar(resultado))).toBe(true);
  });

  it('no modifica el encabezado original', () => {
    conChecksum(spec, 'checksum');
    expect(spec.campos.at(-1)?.valor).toBe(0xbeef);
  });

  it('rechaza campos que no existen o que no tienen 16 bits', () => {
    expect(() => conChecksum(spec, 'otro')).toThrow(/no tiene el campo/);
    expect(() => conChecksum(encabezado(campo('a', 8)), 'a')).toThrow(/ocupa 16/);
  });
});

describe('formatearValor', () => {
  it('formatea en hexadecimal con los dígitos que pide el tamaño', () => {
    expect(formatearValor(campo('v', 4, 4), 'hex')).toBe('0x4');
    expect(formatearValor(campo('f', 3, 2), 'hex')).toBe('0x2');
    expect(formatearValor(campo('o', 13, 0x1abc), 'hex')).toBe('0x1ABC');
    expect(formatearValor(campo('t', 8, 64), 'hex')).toBe('0x40');
    expect(formatearValor(campo('d', 32, 0xc0000201), 'hex')).toBe('0xC0000201');
  });

  it('formatea en binario con un dígito por bit', () => {
    expect(formatearValor(campo('f', 3, 2), 'binario')).toBe('010');
    expect(formatearValor(campo('v', 4, 4), 'binario')).toBe('0100');
  });

  it('formatea en decimal', () => {
    expect(formatearValor(campo('l', 16, 84), 'decimal')).toBe('84');
  });

  it('usa el texto del campo, o el decimal si no tiene', () => {
    expect(formatearValor(campo('d', 8, 1, { texto: 'uno' }), 'texto')).toBe('uno');
    expect(formatearValor(campo('d', 8, 1), 'texto')).toBe('1');
  });
});
