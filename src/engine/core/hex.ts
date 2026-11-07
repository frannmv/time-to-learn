/**
 * Formatea un entero no negativo como hexadecimal con un ancho fijo en bytes.
 *
 * @example toHex(0x0800, 2) // "0x0800" (EtherType de IPv4)
 */
export function toHex(value: number, bytes: number): string {
  if (!Number.isInteger(bytes) || bytes < 1) {
    throw new RangeError(`bytes debe ser un entero positivo (recibido: ${bytes})`);
  }
  const max = 2 ** (8 * bytes) - 1;
  if (!Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${value} no entra en ${bytes} byte(s)`);
  }
  return `0x${value
    .toString(16)
    .toUpperCase()
    .padStart(bytes * 2, '0')}`;
}
