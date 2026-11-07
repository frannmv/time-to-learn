import { describe, expect, it } from 'vitest';
import { toHex } from './hex';

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
