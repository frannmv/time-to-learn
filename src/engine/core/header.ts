/**
 * Formato de un encabezado: sus campos, en orden, con su tamaño en bits y un valor de
 * ejemplo.
 *
 * Los campos van uno detrás del otro, sin huecos, en orden de red (big-endian): el primer
 * campo empieza en el bit 0, que es el más significativo del primer byte, como en los
 * diagramas de encabezado de RFC 791 §3.1. Un `HeaderSpec` es serializable a JSON, así que
 * se puede calcular en el build y pasar como props a una isla.
 *
 * Simplificación declarada: cada campo tiene como máximo 32 bits (`MAX_BITS_CAMPO`), porque
 * su valor se guarda como un número de JavaScript. Los campos más anchos (direcciones MAC
 * o IPv6) quedan para más adelante.
 */

import { escribirBits, MAX_BITS_CAMPO, toBinary, toHex } from './bytes';
import { checksumInternet } from './checksum';
import { esCapa, type Capa } from './capas';

/** Cómo se presenta el valor de un campo. */
export type FormatoCampo = 'hex' | 'binario' | 'decimal' | 'texto';

/** Formatos que se pueden calcular a partir del número, sin texto propio del campo. */
export const FORMATOS_NUMERICOS = Object.freeze(['hex', 'binario', 'decimal'] as const);
export type FormatoNumerico = (typeof FORMATOS_NUMERICOS)[number];

/** Un campo del encabezado. */
export interface CampoSpec {
  readonly nombre: string;
  /** Nombre corto opcional para cuando el campo se dibuja angosto (por ejemplo, «TTL»). */
  readonly corto?: string;
  /** Tamaño en bits, de 1 a `MAX_BITS_CAMPO`. */
  readonly bits: number;
  /** Valor de ejemplo, entero sin signo que entra en `bits`. */
  readonly valor: number;
  /** Formato en que se presenta el valor por defecto. */
  readonly formato: FormatoCampo;
  /**
   * Presentación textual del valor (por ejemplo, «192.0.2.10»). Obligatoria si el formato
   * es `'texto'`. Debe generarla el motor a partir de `valor`, no escribirse a mano.
   */
  readonly texto?: string;
  readonly descripcion: string;
}

/** Un encabezado completo: a qué capa pertenece y sus campos en orden. */
export interface HeaderSpec {
  readonly nombre: string;
  readonly capa: Capa;
  readonly campos: readonly CampoSpec[];
}

/** Ubicación de un campo dentro del encabezado. */
export interface Desplazamiento {
  readonly nombre: string;
  /** Primer bit del campo, contando desde 0. */
  readonly desdeBit: number;
  readonly bits: number;
}

/**
 * Verifica que el encabezado esté bien formado: al menos un campo, nombres no vacíos y
 * distintos, tamaños enteros de 1 a 32 bits, valores que entran en su tamaño, texto
 * presente cuando el formato es `'texto'` y un total que cierra en bytes.
 *
 * @throws {RangeError} con un mensaje que nombra el campo con problemas.
 */
export function validarEncabezado(spec: HeaderSpec): void {
  if (spec.nombre.trim() === '') {
    throw new RangeError('el encabezado necesita un nombre');
  }
  if (!esCapa(spec.capa)) {
    throw new RangeError(`«${spec.nombre}»: ${String(spec.capa)} no es una capa OSI`);
  }
  if (spec.campos.length === 0) {
    throw new RangeError(`«${spec.nombre}» no tiene campos`);
  }
  const nombres = new Set<string>();
  let total = 0;
  for (const campo of spec.campos) {
    if (campo.nombre.trim() === '') {
      throw new RangeError(`«${spec.nombre}» tiene un campo sin nombre`);
    }
    if (nombres.has(campo.nombre)) {
      throw new RangeError(`«${spec.nombre}» repite el campo «${campo.nombre}»`);
    }
    nombres.add(campo.nombre);
    if (!Number.isInteger(campo.bits) || campo.bits < 1 || campo.bits > MAX_BITS_CAMPO) {
      throw new RangeError(
        `«${campo.nombre}»: el tamaño debe ser un entero entre 1 y ${MAX_BITS_CAMPO} bits ` +
          `(recibido: ${campo.bits})`,
      );
    }
    if (!Number.isSafeInteger(campo.valor) || campo.valor < 0 || campo.valor >= 2 ** campo.bits) {
      throw new RangeError(`«${campo.nombre}»: ${campo.valor} no entra en ${campo.bits} bit(s)`);
    }
    if (campo.formato === 'texto' && (campo.texto === undefined || campo.texto === '')) {
      throw new RangeError(`«${campo.nombre}»: el formato «texto» necesita el texto del valor`);
    }
    total += campo.bits;
  }
  if (total % 8 !== 0) {
    throw new RangeError(
      `«${spec.nombre}» suma ${total} bits, que no es un múltiplo de 8 (no cierra en bytes)`,
    );
  }
}

/** Calcula dónde empieza cada campo. Valida el encabezado antes. */
export function desplazamientos(spec: HeaderSpec): Desplazamiento[] {
  validarEncabezado(spec);
  let desdeBit = 0;
  return spec.campos.map(({ nombre, bits }) => {
    const ubicacion = { nombre, desdeBit, bits };
    desdeBit += bits;
    return ubicacion;
  });
}

/** Longitud del encabezado en bytes. Valida el encabezado antes. */
export function longitudEnBytes(spec: HeaderSpec): number {
  validarEncabezado(spec);
  return spec.campos.reduce((suma, campo) => suma + campo.bits, 0) / 8;
}

/** Serializa el encabezado a bytes en orden de red. Valida el encabezado antes. */
export function serializar(spec: HeaderSpec): Uint8Array {
  let bytes: Uint8Array = new Uint8Array(longitudEnBytes(spec));
  for (const [i, ubicacion] of desplazamientos(spec).entries()) {
    const campo = spec.campos[i];
    if (campo === undefined) continue;
    bytes = escribirBits(bytes, ubicacion.desdeBit, ubicacion.bits, campo.valor);
  }
  return bytes;
}

/**
 * Devuelve una copia del encabezado con el checksum de Internet (RFC 1071) calculado en el
 * campo indicado: pone ese campo en cero, serializa, calcula y guarda el resultado. Así el
 * checksum de un ejemplo lo calcula el motor y no se escribe a mano.
 *
 * @throws {RangeError} si el campo no existe o no tiene 16 bits.
 */
export function conChecksum(spec: HeaderSpec, nombreCampo: string): HeaderSpec {
  const indice = spec.campos.findIndex((campo) => campo.nombre === nombreCampo);
  const campo = spec.campos[indice];
  if (campo === undefined) {
    throw new RangeError(`«${spec.nombre}» no tiene el campo «${nombreCampo}»`);
  }
  if (campo.bits !== 16) {
    throw new RangeError(`«${nombreCampo}» tiene ${campo.bits} bits; el checksum ocupa 16`);
  }
  const conCampo = (valor: number): HeaderSpec => ({
    ...spec,
    campos: spec.campos.map((c, i) => (i === indice ? { ...c, valor } : c)),
  });
  return conCampo(checksumInternet(serializar(conCampo(0))));
}

/**
 * Formatea el valor de un campo. Con `'hex'` usa tantos dígitos como pida el tamaño del
 * campo (un campo de 4 bits da «0x4»); con `'binario'`, un dígito por bit. Con `'texto'`
 * devuelve el texto del campo, o el decimal si no tiene.
 */
export function formatearValor(campo: CampoSpec, formato: FormatoCampo): string {
  switch (formato) {
    case 'binario':
      return toBinary(campo.valor, campo.bits);
    case 'decimal':
      return String(campo.valor);
    case 'texto':
      return campo.texto ?? String(campo.valor);
    case 'hex': {
      if (campo.bits % 8 === 0) return toHex(campo.valor, campo.bits / 8);
      // Campos que no ocupan bytes enteros: un dígito por cada 4 bits (o fracción).
      const digitos = Math.ceil(campo.bits / 4);
      return `0x${toHex(campo.valor, Math.ceil(campo.bits / 8))
        .slice(2)
        .slice(-digitos)}`;
    }
  }
}
