import { describe, expect, it } from 'vitest';
import { escribirBits, hexABytes, leerBits } from './bytes';
import { checksumInternet, sumaComplementoAUno, verificarChecksum } from './checksum';

/*
 * Valores de referencia verificados con una herramienta independiente: Scapy 2.8.0
 * (`scapy.utils.checksum` y reconstrucción de `IP()` con `chksum = None`).
 */

describe('checksum de Internet (RFC 1071)', () => {
  it('reproduce el ejemplo numérico de RFC 1071 §3', () => {
    // Bytes 00 01 F2 03 F4 F5 F6 F7: suma en complemento a uno 0xDDF2 («Sum2» del RFC).
    const datos = hexABytes('00 01 F2 03 F4 F5 F6 F7');
    expect(sumaComplementoAUno(datos)).toBe(0xddf2);
    expect(checksumInternet(datos)).toBe(0x220d);
  });

  describe('encabezado IPv4 real (RFC 791 §3.1, campo Header Checksum)', () => {
    // 192.168.0.1 → 192.168.0.199, protocolo 17 (UDP), TTL 64, DF, Total Length 115.
    // El checksum va en los bytes 10 y 11 (bits 80 a 95).
    const conChecksum = hexABytes('4500 0073 0000 4000 4011 B861 C0A8 0001 C0A8 00C7');
    const sinChecksum = escribirBits(conChecksum, 80, 16, 0);

    it('calcula el mismo checksum que la herramienta independiente', () => {
      expect(checksumInternet(sinChecksum)).toBe(0xb861);
      expect(leerBits(conChecksum, 80, 16)).toBe(0xb861);
    });

    it('el encabezado con su checksum verifica a 0', () => {
      expect(checksumInternet(conChecksum)).toBe(0);
      expect(sumaComplementoAUno(conChecksum)).toBe(0xffff);
      expect(verificarChecksum(conChecksum)).toBe(true);
    });

    it('un bit cambiado hace fallar la verificación', () => {
      const ttlDistinto = escribirBits(conChecksum, 64, 8, 63);
      expect(verificarChecksum(ttlDistinto)).toBe(false);
    });
  });

  it('con longitud impar completa con un byte cero al final', () => {
    // 01 02 03 se suma como 0x0102 + 0x0300.
    const impar = hexABytes('01 02 03');
    expect(sumaComplementoAUno(impar)).toBe(0x0402);
    expect(checksumInternet(impar)).toBe(0xfbfd);
    expect(checksumInternet(impar)).toBe(checksumInternet(hexABytes('01 02 03 00')));
  });

  it('pliega el acarreo más de una vez', () => {
    // 0xFFFF + 0xFFFF + 0x0001 = 0x1FFFF → 0xFFFF + 0x1 = 0x10000 → 0x0001.
    const datos = hexABytes('FFFF FFFF 0001');
    expect(sumaComplementoAUno(datos)).toBe(0x0001);
    expect(checksumInternet(datos)).toBe(0xfffe);
  });

  it('soporta muchos acarreos acumulados', () => {
    // 1000 palabras 0xFFFF: en complemento a uno la suma sigue siendo 0xFFFF.
    const datos = new Uint8Array(2000).fill(0xff);
    expect(sumaComplementoAUno(datos)).toBe(0xffff);
    expect(checksumInternet(datos)).toBe(0);
  });

  it('el buffer vacío suma 0 y su checksum es 0xFFFF', () => {
    const vacio = new Uint8Array(0);
    expect(sumaComplementoAUno(vacio)).toBe(0);
    expect(checksumInternet(vacio)).toBe(0xffff);
    expect(verificarChecksum(vacio)).toBe(false);
  });
});
