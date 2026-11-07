import { describe, expect, it } from 'vitest';
import { contraste, deltaE, luminancia, parseHex } from './color';

describe('parseHex', () => {
  it('lee #rrggbb y #rgb', () => {
    expect(parseHex('#1d4ed8')).toEqual({ r: 0x1d, g: 0x4e, b: 0xd8 });
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('rechaza formatos que no son hexadecimales', () => {
    expect(() => parseHex('red')).toThrow();
    expect(() => parseHex('#12345')).toThrow();
    expect(() => parseHex('rgb(0, 0, 0)')).toThrow();
  });
});

describe('luminancia (WCAG 2.2)', () => {
  it('vale 0 para el negro y 1 para el blanco', () => {
    expect(luminancia('#000000')).toBe(0);
    expect(luminancia('#ffffff')).toBeCloseTo(1, 10);
  });
});

describe('contraste (WCAG 2.2)', () => {
  it('blanco sobre negro es 21:1, el máximo', () => {
    expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 10);
  });

  it('un color sobre sí mismo es 1:1', () => {
    expect(contraste('#1d4ed8', '#1d4ed8')).toBe(1);
  });

  it('es simétrico', () => {
    expect(contraste('#555b66', '#ffffff')).toBe(contraste('#ffffff', '#555b66'));
  });

  it('#767676 sobre blanco queda justo por encima de 4,5:1', () => {
    // Valor de referencia habitual: el gris más claro que cumple AA sobre blanco.
    expect(contraste('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(contraste('#777777', '#ffffff')).toBeLessThan(4.5);
  });
});

describe('deltaE (CIE76)', () => {
  it('es 0 entre colores iguales', () => {
    expect(deltaE('#1d4ed8', '#1d4ed8')).toBe(0);
  });

  it('entre negro y blanco es 100 (diferencia de luminosidad L*)', () => {
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(100, 1);
  });
});
