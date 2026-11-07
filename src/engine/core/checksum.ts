/**
 * Checksum de Internet.
 *
 * Fuentes:
 * - RFC 1071, «Computing the Internet Checksum», §1: el checksum es el complemento a uno
 *   de la suma en complemento a uno de los datos tomados como palabras de 16 bits; si la
 *   cantidad de bytes es impar, se agrega un byte cero al final solo para el cálculo. Para
 *   verificar, se suma todo (checksum incluido) y el resultado tiene que ser todos unos.
 * - RFC 1071 §3: ejemplo numérico que se usa en los tests.
 * - RFC 791 §3.1, campo Header Checksum de IPv4: se calcula sobre el encabezado con el
 *   campo de checksum en cero.
 *
 * El mismo algoritmo lo usan ICMP, UDP y TCP.
 */

import { palabras16 } from './bytes';

/**
 * Suma en complemento a uno de 16 bits: suma las palabras y vuelve a sumar cada acarreo
 * que sale del bit 15 («end-around carry»), tantas veces como haga falta.
 */
export function sumaComplementoAUno(bytes: Uint8Array): number {
  let suma = 0;
  for (const palabra of palabras16(bytes)) {
    suma += palabra;
  }
  // Puede hacer falta plegar más de una vez: 0x1FFFF → 0xFFFF + 0x1 = 0x10000 → 0x0001.
  while (suma > 0xffff) {
    suma = (suma & 0xffff) + Math.floor(suma / 0x1_0000);
  }
  return suma;
}

/**
 * Checksum de Internet: complemento a uno de `sumaComplementoAUno`.
 *
 * Para calcular el de un encabezado, el campo de checksum tiene que estar en cero.
 *
 * @example checksumInternet(hexABytes('00 01 F2 03 F4 F5 F6 F7')) // 0x220D (RFC 1071 §3)
 */
export function checksumInternet(bytes: Uint8Array): number {
  return ~sumaComplementoAUno(bytes) & 0xffff;
}

/**
 * Verifica datos que ya incluyen su checksum: la suma en complemento a uno de todo tiene
 * que dar 0xFFFF, es decir, el checksum calculado sobre el conjunto da 0.
 */
export function verificarChecksum(bytes: Uint8Array): boolean {
  return checksumInternet(bytes) === 0;
}
