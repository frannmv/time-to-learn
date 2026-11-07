/**
 * Encabezado IPv4 de ejemplo para la página de demostración.
 *
 * Fuentes:
 * - RFC 791, «Internet Protocol», §3.1: campos, tamaños y orden del encabezado.
 * - RFC 1071: checksum de Internet, que calcula el motor (`conChecksum`).
 * - RFC 2474 §3 y RFC 3168 §5: redefinición del octeto Type of Service como DSCP y ECN.
 * - RFC 5737 §3: bloques de direcciones reservados para documentación.
 * - IANA, «Assigned Internet Protocol Numbers»: el número de protocolo 1 es ICMP.
 *
 * Simplificaciones declaradas:
 * - Sin opciones: IHL vale 5 (20 bytes), el mínimo.
 * - El octeto de tipo de servicio se muestra como un solo campo de 8 bits, como en RFC 791;
 *   la descripción aclara que hoy se divide en DSCP y ECN.
 * - Los datos que siguen al encabezado (un mensaje ICMP de 64 bytes) no se incluyen.
 * - El valor de Identificación es arbitrario: cualquier valor de 16 bits es válido.
 */

import { conChecksum, type HeaderSpec } from '../core/header';

/** Convierte una dirección IPv4 en notación decimal con puntos a su valor de 32 bits. */
export function ipv4ANumero(texto: string): number {
  const partes = texto.split('.');
  if (partes.length !== 4 || !partes.every((p) => /^(?:0|[1-9]\d{0,2})$/.test(p))) {
    throw new RangeError(`«${texto}» no es una dirección IPv4`);
  }
  return partes.reduce((valor, parte) => {
    const octeto = Number(parte);
    if (octeto > 255) throw new RangeError(`«${texto}» no es una dirección IPv4`);
    return valor * 256 + octeto;
  }, 0);
}

/** Convierte un valor de 32 bits en notación decimal con puntos. */
export function numeroAIpv4(valor: number): string {
  if (!Number.isSafeInteger(valor) || valor < 0 || valor > 0xffff_ffff) {
    throw new RangeError(`${valor} no es una dirección IPv4`);
  }
  return [24, 16, 8, 0].map((corrimiento) => Math.floor(valor / 2 ** corrimiento) % 256).join('.');
}

function direccion(nombre: string, texto: string, descripcion: string) {
  const valor = ipv4ANumero(texto);
  return {
    nombre,
    bits: 32,
    valor,
    formato: 'texto',
    texto: numeroAIpv4(valor),
    descripcion,
  } as const;
}

/** Nombre del campo de checksum, para calcularlo y para los tests. */
export const CAMPO_CHECKSUM_IPV4 = 'Checksum del encabezado';

const SIN_CHECKSUM: HeaderSpec = {
  nombre: 'Encabezado IPv4',
  capa: 3,
  campos: [
    {
      nombre: 'Versión',
      bits: 4,
      valor: 4,
      formato: 'decimal',
      descripcion: 'Versión del protocolo IP. Para IPv4 vale 4.',
    },
    {
      nombre: 'IHL',
      bits: 4,
      valor: 5,
      formato: 'decimal',
      descripcion:
        'Internet Header Length: largo del encabezado en palabras de 32 bits. El mínimo es 5 ' +
        '(20 bytes, sin opciones), que es el caso de este ejemplo.',
    },
    {
      nombre: 'Tipo de servicio',
      bits: 8,
      valor: 0,
      formato: 'hex',
      descripcion:
        'RFC 791 lo llama Type of Service e indica la calidad de servicio pedida. RFC 2474 y ' +
        'RFC 3168 lo redefinieron: los 6 primeros bits son el DSCP (servicios diferenciados) ' +
        'y los 2 últimos, ECN (aviso de congestión). Acá vale 0: servicio normal.',
    },
    {
      nombre: 'Longitud total',
      bits: 16,
      valor: 84,
      formato: 'decimal',
      descripcion:
        'Largo del datagrama completo en bytes, encabezado más datos; como mucho 65 535. ' +
        'Acá: 20 bytes de encabezado más 64 de un mensaje ICMP.',
    },
    {
      nombre: 'Identificación',
      bits: 16,
      valor: 0x1c46,
      formato: 'hex',
      descripcion:
        'Número que pone el emisor para que el destino pueda juntar los fragmentos de un ' +
        'mismo datagrama. El valor del ejemplo es arbitrario.',
    },
    {
      nombre: 'Indicadores',
      corto: 'Flags',
      bits: 3,
      valor: 0b010,
      formato: 'binario',
      descripcion:
        'Tres bits de control de fragmentación: el primero está reservado y vale 0; el ' +
        'segundo, DF (Don’t Fragment), prohíbe fragmentar; el tercero, MF (More Fragments), ' +
        'avisa que vienen más fragmentos. Acá: 010, DF activo.',
    },
    {
      nombre: 'Desplazamiento de fragmento',
      corto: 'Despl. de fragmento',
      bits: 13,
      valor: 0,
      formato: 'decimal',
      descripcion:
        'Posición de este fragmento dentro del datagrama original, en unidades de 8 bytes. ' +
        'Un datagrama sin fragmentar tiene 0.',
    },
    {
      nombre: 'Tiempo de vida',
      corto: 'TTL',
      bits: 8,
      valor: 64,
      formato: 'decimal',
      descripcion:
        'Time to Live. RFC 791 lo mide en segundos, pero cada módulo que procesa el ' +
        'datagrama lo baja al menos en 1, así que en la práctica cuenta saltos. Si llega a 0, ' +
        'el datagrama se descarta.',
    },
    {
      nombre: 'Protocolo',
      bits: 8,
      valor: 1,
      formato: 'decimal',
      descripcion:
        'Qué protocolo va en los datos, según el registro de números de protocolo de IANA. ' +
        'Acá vale 1: ICMP.',
    },
    {
      nombre: CAMPO_CHECKSUM_IPV4,
      corto: 'Checksum',
      bits: 16,
      valor: 0,
      formato: 'hex',
      descripcion:
        'Checksum de Internet (RFC 1071) calculado solo sobre el encabezado, con este campo ' +
        'en 0. Como el tiempo de vida cambia en cada salto, cada router lo vuelve a calcular. ' +
        'El valor de este ejemplo lo calcula el motor.',
    },
    direccion(
      'Dirección de origen',
      '192.0.2.10',
      'Dirección IPv4 del emisor. 192.0.2.0/24 (TEST-NET-1) es un bloque reservado para ' +
        'documentación (RFC 5737).',
    ),
    direccion(
      'Dirección de destino',
      '198.51.100.20',
      'Dirección IPv4 del destinatario. 198.51.100.0/24 (TEST-NET-2) es un bloque reservado ' +
        'para documentación (RFC 5737).',
    ),
  ],
};

/** Encabezado IPv4 de 20 bytes con el checksum calculado por el motor. */
export const ENCABEZADO_IPV4: HeaderSpec = conChecksum(SIN_CHECKSUM, CAMPO_CHECKSUM_IPV4);
