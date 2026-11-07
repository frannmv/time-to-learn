import { describe, expect, it } from 'vitest';
import { bytesAHex } from '../core/bytes';
import { checksumInternet, verificarChecksum } from '../core/checksum';
import { desplazamientos, serializar, validarEncabezado } from '../core/header';
import { CAMPO_CHECKSUM_IPV4, ENCABEZADO_IPV4, ipv4ANumero, numeroAIpv4 } from './encabezado-ipv4';

describe('ENCABEZADO_IPV4', () => {
  it('es un encabezado válido de la capa de red', () => {
    expect(() => validarEncabezado(ENCABEZADO_IPV4)).not.toThrow();
    expect(ENCABEZADO_IPV4.capa).toBe(3);
  });

  it('tiene los campos, tamaños y desplazamientos de RFC 791 §3.1', () => {
    expect(desplazamientos(ENCABEZADO_IPV4).map(({ desdeBit, bits }) => [desdeBit, bits])).toEqual([
      [0, 4], // Version
      [4, 4], // IHL
      [8, 8], // Type of Service
      [16, 16], // Total Length
      [32, 16], // Identification
      [48, 3], // Flags
      [51, 13], // Fragment Offset
      [64, 8], // Time to Live
      [72, 8], // Protocol
      [80, 16], // Header Checksum
      [96, 32], // Source Address
      [128, 32], // Destination Address
    ]);
  });

  it('se serializa en 20 bytes, como indica IHL = 5', () => {
    const bytes = serializar(ENCABEZADO_IPV4);
    expect(bytes).toHaveLength(20);
    expect(ENCABEZADO_IPV4.campos.find((c) => c.nombre === 'IHL')?.valor).toBe(bytes.length / 4);
  });

  it('el checksum verifica a 0', () => {
    const bytes = serializar(ENCABEZADO_IPV4);
    expect(checksumInternet(bytes)).toBe(0);
    expect(verificarChecksum(bytes)).toBe(true);
  });

  it('el checksum no es 0 y está en los bytes 10 y 11', () => {
    const checksum = ENCABEZADO_IPV4.campos.find((c) => c.nombre === CAMPO_CHECKSUM_IPV4);
    const bytes = serializar(ENCABEZADO_IPV4);
    expect(checksum?.valor).not.toBe(0);
    expect(((bytes[10] ?? 0) << 8) | (bytes[11] ?? 0)).toBe(checksum?.valor);
  });

  it('coincide byte a byte con los valores declarados', () => {
    const hex = bytesAHex(serializar(ENCABEZADO_IPV4));
    // Versión 4, IHL 5, ToS 0, longitud 84, id 0x1C46, DF, TTL 64, ICMP, checksum, origen y
    // destino (192.0.2.10 = C0 00 02 0A, 198.51.100.20 = C6 33 64 14).
    expect(hex.slice(0, 29)).toBe('45 00 00 54 1C 46 40 00 40 01');
    expect(hex.slice(36)).toBe('C0 00 02 0A C6 33 64 14');
  });

  it('las direcciones se muestran como texto generado por el motor', () => {
    const origen = ENCABEZADO_IPV4.campos.find((c) => c.nombre === 'Dirección de origen');
    expect(origen?.formato).toBe('texto');
    expect(origen?.texto).toBe('192.0.2.10');
  });
});

describe('ipv4ANumero y numeroAIpv4', () => {
  it('convierten en los dos sentidos', () => {
    expect(ipv4ANumero('192.0.2.10')).toBe(0xc000020a);
    expect(numeroAIpv4(0xc6336414)).toBe('198.51.100.20');
    expect(numeroAIpv4(ipv4ANumero('255.255.255.255'))).toBe('255.255.255.255');
    expect(numeroAIpv4(0)).toBe('0.0.0.0');
  });

  it('rechazan direcciones mal formadas', () => {
    for (const texto of ['192.0.2', '192.0.2.256', '1.2.3.4.5', '01.2.3.4', 'a.b.c.d', '']) {
      expect(() => ipv4ANumero(texto), texto).toThrow(RangeError);
    }
    expect(() => numeroAIpv4(2 ** 32)).toThrow(RangeError);
    expect(() => numeroAIpv4(-1)).toThrow(RangeError);
  });
});
