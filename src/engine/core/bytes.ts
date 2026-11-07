/**
 * Utilidades de bytes: formato hexadecimal y binario, conversión entre texto y
 * `Uint8Array`, palabras de 16 bits y campos de bits.
 *
 * Todo sigue el orden de red (big-endian): el byte más significativo va primero y, dentro
 * de un campo, el bit 0 es el más significativo, como en los diagramas de encabezado de
 * RFC 791 §3.1.
 *
 * Ninguna función modifica los arreglos que recibe.
 */

/** Ancho máximo, en bits, de un campo que se lee o escribe con `leerBits`/`escribirBits`. */
export const MAX_BITS_CAMPO = 32;

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

/**
 * Formatea un entero no negativo en binario con un ancho fijo en bits.
 *
 * @example toBinary(5, 4) // "0101"
 */
export function toBinary(value: number, bits: number): string {
  if (!Number.isInteger(bits) || bits < 1 || bits > 53) {
    throw new RangeError(`bits debe ser un entero entre 1 y 53 (recibido: ${bits})`);
  }
  if (!Number.isSafeInteger(value) || value < 0 || value >= 2 ** bits) {
    throw new RangeError(`${value} no entra en ${bits} bit(s)`);
  }
  return value.toString(2).padStart(bits, '0');
}

/**
 * Convierte texto hexadecimal en bytes. Acepta espacios, `:` y `-` como separadores, en
 * mayúsculas o minúsculas, para poder pegar volcados («45 00 00 73») o direcciones MAC
 * («00:1A:2B:3C:4D:5E»).
 *
 * @throws {RangeError} si hay caracteres que no son hexadecimales o una cantidad impar de
 * dígitos.
 */
export function hexABytes(texto: string): Uint8Array {
  const digitos = texto.replace(/[\s:-]/g, '');
  if (!/^[0-9a-fA-F]*$/.test(digitos)) {
    throw new RangeError(`«${texto}» no es texto hexadecimal`);
  }
  if (digitos.length % 2 !== 0) {
    throw new RangeError(`«${texto}» tiene una cantidad impar de dígitos hexadecimales`);
  }
  const bytes = new Uint8Array(digitos.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(digitos.slice(2 * i, 2 * i + 2), 16);
  }
  return bytes;
}

export interface OpcionesHex {
  /** `'byte'` separa cada byte («45 00»); `'palabra'` agrupa de a 16 bits («4500»). */
  readonly agrupar?: 'byte' | 'palabra';
  /** Texto entre grupos. Por defecto, un espacio. */
  readonly separador?: string;
}

/**
 * Convierte bytes en texto hexadecimal en mayúsculas, agrupado por byte o por palabra de
 * 16 bits. Si se agrupa por palabra y la longitud es impar, el último grupo tiene un solo
 * byte.
 *
 * @example bytesAHex(hexABytes('4500 0073'), { agrupar: 'palabra' }) // "4500 0073"
 */
export function bytesAHex(bytes: Uint8Array, opciones: OpcionesHex = {}): string {
  const { agrupar = 'byte', separador = ' ' } = opciones;
  const tamaño = agrupar === 'palabra' ? 2 : 1;
  const grupos: string[] = [];
  for (let i = 0; i < bytes.length; i += tamaño) {
    let grupo = '';
    for (const byte of bytes.subarray(i, i + tamaño)) {
      grupo += byte.toString(16).toUpperCase().padStart(2, '0');
    }
    grupos.push(grupo);
  }
  return grupos.join(separador);
}

/**
 * Agrupa los bytes en palabras de 16 bits en orden de red. Si la longitud es impar, la
 * última palabra se completa con un byte cero a la derecha, como pide RFC 1071 §1 para el
 * checksum de Internet.
 *
 * @example palabras16(hexABytes('01 02 03')) // [0x0102, 0x0300]
 */
export function palabras16(bytes: Uint8Array): number[] {
  const palabras: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const alto = bytes[i] ?? 0;
    const bajo = bytes[i + 1] ?? 0;
    palabras.push((alto << 8) | bajo);
  }
  return palabras;
}

function validarCampo(bytes: Uint8Array, desdeBit: number, anchoBits: number): void {
  if (!Number.isInteger(anchoBits) || anchoBits < 1 || anchoBits > MAX_BITS_CAMPO) {
    throw new RangeError(
      `el ancho debe ser un entero entre 1 y ${MAX_BITS_CAMPO} bits (recibido: ${anchoBits})`,
    );
  }
  if (!Number.isInteger(desdeBit) || desdeBit < 0) {
    throw new RangeError(`el bit inicial debe ser un entero no negativo (recibido: ${desdeBit})`);
  }
  if (desdeBit + anchoBits > bytes.length * 8) {
    throw new RangeError(
      `el campo de ${anchoBits} bit(s) desde el bit ${desdeBit} se sale de ${bytes.length} byte(s)`,
    );
  }
}

/**
 * Lee un campo de bits sin signo en orden de red.
 *
 * @param desdeBit posición del primer bit, contando desde 0 en el bit más significativo del
 * primer byte.
 * @param anchoBits ancho del campo, de 1 a 32 bits.
 *
 * @example leerBits(hexABytes('45'), 0, 4) // 4 (campo Version de IPv4)
 */
export function leerBits(bytes: Uint8Array, desdeBit: number, anchoBits: number): number {
  validarCampo(bytes, desdeBit, anchoBits);
  let valor = 0;
  for (let i = 0; i < anchoBits; i++) {
    const posicion = desdeBit + i;
    const byte = bytes[Math.floor(posicion / 8)] ?? 0;
    const bit = (byte >> (7 - (posicion % 8))) & 1;
    // Multiplicar en vez de desplazar evita el desborde a negativo con campos de 32 bits.
    valor = valor * 2 + bit;
  }
  return valor;
}

/**
 * Escribe un campo de bits sin signo en orden de red y devuelve una copia nueva; el
 * arreglo original no cambia.
 *
 * @throws {RangeError} si el campo se sale del arreglo o el valor no entra en el ancho.
 *
 * @example escribirBits(new Uint8Array(1), 0, 4, 4) // Uint8Array [0x40]
 */
export function escribirBits(
  bytes: Uint8Array,
  desdeBit: number,
  anchoBits: number,
  valor: number,
): Uint8Array {
  validarCampo(bytes, desdeBit, anchoBits);
  if (!Number.isSafeInteger(valor) || valor < 0 || valor >= 2 ** anchoBits) {
    throw new RangeError(`${valor} no entra en ${anchoBits} bit(s)`);
  }
  const copia = Uint8Array.from(bytes);
  for (let i = 0; i < anchoBits; i++) {
    const posicion = desdeBit + i;
    const indice = Math.floor(posicion / 8);
    const mascara = 1 << (7 - (posicion % 8));
    const bit = Math.floor(valor / 2 ** (anchoBits - 1 - i)) % 2;
    const actual = copia[indice] ?? 0;
    copia[indice] = bit === 1 ? actual | mascara : actual & ~mascara;
  }
  return copia;
}
