/**
 * Las dos pilas del ejemplo de encapsulamiento: el modelo OSI genérico y una pila TCP/IP
 * real (HTTP sobre TCP sobre IPv4 sobre Ethernet II).
 *
 * Una pila dice, para cada capa OSI: qué le agrega a la PDU (encabezado y, si tiene, cola),
 * cómo se llama la PDU después, cómo se explica lo que hace al enviar y al recibir, y qué
 * campo usa el receptor para saber a quién entregarle el contenido. La simulación
 * (encapsulamiento.ts) recorre esta información; no sabe nada de ningún protocolo.
 *
 * Fuentes:
 * - ISO/IEC 7498-1:1994 y el apunte de la cátedra «Introducción y Modelo OSI» (figura
 *   «Entorno OSI»): encabezados AH, PH, SH, TH, NH, LH y la cola LT del modelo genérico.
 * - IEEE Std 802.3, cláusula 3: formato de la trama Ethernet. §3.2.3: direcciones de 6
 *   bytes; §3.2.6: campo Length/Type de 2 bytes; §3.2.9: FCS de 4 bytes; §3.4: una trama
 *   con el FCS incorrecto es inválida y no se entrega a la capa de arriba. §4.4.2:
 *   minFrameSize, 512 bits (64 bytes).
 * - RFC 894: IPv4 sobre Ethernet, con el tipo 0x0800; el campo de datos mide al menos 46
 *   bytes. Registro de EtherType de la IEEE Registration Authority: 0x0800 es IPv4.
 * - RFC 791 §3.1: encabezado IPv4. Sin opciones, IHL = 5: 20 bytes.
 * - IANA, «Assigned Internet Protocol Numbers»: el protocolo 6 es TCP.
 * - RFC 9293 §3.1: encabezado TCP. Sin opciones, Data Offset = 5: 20 bytes.
 * - RFC 6335 §6: los puertos dinámicos van de 49152 a 65535.
 * - RFC 9110 §4.2.1: el puerto TCP 80 es el de HTTP por omisión.
 * - RFC 9112 §2.1, §3 y §3.2: formato del pedido HTTP/1.1 (línea de pedido, campo Host
 *   obligatorio, líneas terminadas en CRLF y una línea vacía al final).
 * - RFC 2606 §3: example.com está reservado para ejemplos.
 *
 * Simplificaciones declaradas:
 * - De cada encabezado TCP/IP se muestran solo las direcciones de origen y destino y el
 *   campo que dice a quién entregar el contenido. Los encabezados campo por campo llegan
 *   con sus etapas: Ethernet (3), IPv4 (7) y TCP (9).
 * - El FCS no se calcula (el CRC-32 es de la Etapa 3): la trama solo dice que lo lleva.
 * - En TCP/IP las capas 5 y 6 no agregan encabezado: sus funciones, si hacen falta, quedan
 *   dentro de la aplicación.
 * - El modelo OSI genérico no tiene tamaños ni campos: es el modelo, no un protocolo real.
 */

import type { Capa } from '../core/capas';
import type { Datos, Encabezado } from '../core/timeline';
import { PDU_OSI, PDU_TCPIP } from './modelos';

// ---------------------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------------------

/** Un equipo visto desde los encabezados: su nombre en el diagrama y sus direcciones. */
export interface Equipo {
  readonly etiqueta: string;
  /** Dirección MAC, con guiones («00-00-5E-00-53-0A»). */
  readonly mac?: string;
  /** Dirección IPv4 en notación decimal con puntos. */
  readonly ipv4?: string;
}

/** Lo que una capa necesita saber para armar su encabezado y explicar lo que hace. */
export interface ContextoDeCapa {
  /** Host que origina la comunicación. */
  readonly origen: Equipo;
  /** Host al que va la comunicación. */
  readonly destino: Equipo;
  /**
   * El salto de capa 2 en curso: quién arma la trama (un host o un router) y quién la
   * recibe (un router o el host de destino). Los hubs y los switches no cuentan: no
   * arman tramas.
   */
  readonly salto: { readonly emisor: Equipo; readonly receptor: Equipo };
}

/** El campo con el que el receptor sabe a quién entregar el contenido (demultiplexación). */
export interface Entrega {
  /** Nombre del campo, tal como aparece en el encabezado. */
  readonly campo: string;
  /** Valor del campo, tal como aparece en el encabezado. */
  readonly valor: string;
  /** Quién recibe el contenido («IPv4», «TCP», «el servidor web»). */
  readonly para: string;
}

type Generador<T> = (contexto: ContextoDeCapa) => T;

/** Lo que hace una capa de la pila. */
export interface CapaDePila {
  /** Nombre de la PDU en esta capa. */
  readonly pdu: string;
  /** El encabezado que agrega, si agrega uno. */
  readonly encabezado?: Generador<Encabezado>;
  /** La cola que agrega, si agrega una. Solo tiene sentido junto a un encabezado. */
  readonly cola?: Generador<Encabezado>;
  /** Qué hace al enviar, en una o dos frases. */
  readonly alEnviar: Generador<string>;
  /** Qué lee al recibir, en una frase. Lo que quita y a quién entrega lo agrega la simulación. */
  readonly alRecibir: Generador<string>;
  /** Campo que usa el receptor para saber a quién entregar el contenido. */
  readonly entrega?: Entrega;
  /** Qué hace un router en esta capa cuando la PDU no es para él. */
  readonly alReenviar?: Generador<string>;
  /** Qué hace la capa cuando el control de errores no coincide. Solo en la capa 2. */
  readonly alDescartar?: string;
}

export type IdPila = 'osi-generica' | 'tcpip';

export interface Pila {
  readonly id: IdPila;
  readonly nombre: string;
  /** Frase que abre la simulación: qué se muestra y, si es de ejemplo, que lo es. */
  readonly presentacion: Generador<string>;
  /** La carga que arma la aplicación de origen. */
  readonly datos: Datos;
  readonly capas: Readonly<Record<Capa, CapaDePila>>;
}

// ---------------------------------------------------------------------------------------
// Pila OSI genérica
// ---------------------------------------------------------------------------------------

/** Encabezado genérico, sin campos ni tamaño. */
const generico =
  (capa: Capa, nombre: string, parte: 'encabezado' | 'cola' = 'encabezado') =>
  (): Encabezado => ({
    capa,
    nombre,
    campos: [],
    ...(parte === 'cola' && { parte }),
  });

/** Capa OSI genérica que agrega un encabezado y nada más (capas 3 a 7). */
function capaGenerica(
  capa: Capa,
  sigla: string,
  queEs: string,
  nombreCapa: string,
  pduDeArriba: string,
): CapaDePila {
  return {
    pdu: PDU_OSI[capa],
    encabezado: generico(capa, sigla),
    alEnviar: () =>
      `La capa de ${nombreCapa} agrega ${sigla}, ${queEs}, adelante de ${pduDeArriba}.`,
    alRecibir: ({ origen }) =>
      `La capa de ${nombreCapa} lee ${sigla}, el encabezado que puso su capa par en ${origen.etiqueta}.`,
  };
}

/**
 * Modelo OSI genérico, con la notación del apunte de la cátedra: cada capa de la 2 a la 7
 * agrega su encabezado (su PCI, en ISO/IEC 7498-1) y la capa 2 agrega además una cola.
 * Es el modelo, no un protocolo real: no tiene tamaños ni campos.
 */
export const PILA_OSI: Pila = {
  id: 'osi-generica',
  nombre: 'Modelo OSI',
  presentacion: () =>
    'Este escenario muestra el modelo OSI, no un protocolo real: cada capa agrega un encabezado genérico, sin tamaño ni campos.',
  datos: { descripcion: 'Datos del usuario' },
  capas: {
    7: capaGenerica(7, 'AH', 'el encabezado de aplicación', 'aplicación', 'los datos del usuario'),
    6: capaGenerica(6, 'PH', 'el encabezado de presentación', 'presentación', 'la A-PDU'),
    5: capaGenerica(5, 'SH', 'el encabezado de sesión', 'sesión', 'la P-PDU'),
    4: capaGenerica(4, 'TH', 'el encabezado de transporte', 'transporte', 'la S-PDU'),
    3: capaGenerica(3, 'NH', 'el encabezado de red', 'red', 'la T-PDU'),
    2: {
      pdu: PDU_OSI[2],
      encabezado: generico(2, 'LH'),
      cola: generico(2, 'LT', 'cola'),
      alEnviar: () =>
        'La capa de enlace agrega LH, el encabezado de enlace, adelante de la N-PDU, y LT, una cola, al final. En la cola va el control de errores.',
      alRecibir: ({ salto }) =>
        `La capa de enlace lee LH, el encabezado que puso la capa de enlace de ${salto.emisor.etiqueta}, y revisa LT: el control de errores coincide.`,
      alDescartar:
        'La capa de enlace revisa LT, la cola con el control de errores, y no coincide: la DL-PDU llegó con errores y se descarta.',
    },
    1: {
      pdu: PDU_OSI[1],
      alEnviar: () =>
        'La capa física no agrega encabezado: convierte la DL-PDU en bits y los pone en el medio.',
      alRecibir: () =>
        'La capa física recibe los bits y se los pasa a la capa de enlace como una DL-PDU.',
    },
  },
};

// ---------------------------------------------------------------------------------------
// Pila TCP/IP real
// ---------------------------------------------------------------------------------------

/** Tamaño de una dirección MAC, en bytes (IEEE 802.3 §3.2.3). */
export const BYTES_MAC = 6;

/** Tamaño del campo Length/Type de Ethernet, en bytes (IEEE 802.3 §3.2.6). */
export const BYTES_ETHERTYPE = 2;

/** Encabezado Ethernet II: MAC de destino, MAC de origen y tipo (IEEE 802.3, cláusula 3). */
export const BYTES_ETHERNET = BYTES_MAC + BYTES_MAC + BYTES_ETHERTYPE;

/** FCS de Ethernet: un CRC de 32 bits al final de la trama (IEEE 802.3 §3.2.9). */
export const BYTES_FCS = 4;

/** Encabezado IPv4 sin opciones: IHL = 5 palabras de 32 bits (RFC 791 §3.1). */
export const BYTES_IPV4 = 20;

/** Encabezado TCP sin opciones: Data Offset = 5 palabras de 32 bits (RFC 9293 §3.1). */
export const BYTES_TCP = 20;

/** Trama Ethernet mínima, sin preámbulo ni SFD: minFrameSize (IEEE 802.3 §4.4.2). */
export const BYTES_TRAMA_MINIMA = 64;

/** EtherType de IPv4 (RFC 894; registro de EtherType de la IEEE Registration Authority). */
export const ETHERTYPE_IPV4 = '0x0800';

/** Número de protocolo de TCP (IANA, «Assigned Internet Protocol Numbers»). */
export const PROTOCOLO_TCP = 6;

/** Puerto TCP de HTTP por omisión (RFC 9110 §4.2.1). */
export const PUERTO_HTTP = 80;

/** Puerto de origen del cliente: el primero del rango dinámico (RFC 6335 §6). */
export const PUERTO_CLIENTE = 49152;

/**
 * [Ejemplo] Pedido HTTP/1.1 de la página principal de example.com (RFC 2606 §3): línea de
 * pedido, campo Host (obligatorio en HTTP/1.1) y la línea vacía que cierra los
 * encabezados, cada línea terminada en CRLF (RFC 9112 §2.1, §3 y §3.2). Mide 37 bytes.
 */
export const MENSAJE_HTTP = 'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n';

/** Bytes que ocupa un texto codificado en UTF-8. */
const bytesUtf8 = (texto: string) => new TextEncoder().encode(texto).length;

/** Devuelve el valor o lanza un error que dice qué dato del escenario falta. */
function requerir(valor: string | undefined, que: string): string {
  if (valor === undefined) throw new Error(`La pila TCP/IP necesita ${que}`);
  return valor;
}

const ENTREGA_ETHERNET: Entrega = { campo: 'EtherType', valor: ETHERTYPE_IPV4, para: 'IPv4' };
const ENTREGA_IPV4: Entrega = { campo: 'Protocolo', valor: String(PROTOCOLO_TCP), para: 'TCP' };
const ENTREGA_TCP: Entrega = {
  campo: 'Puerto destino',
  valor: String(PUERTO_HTTP),
  para: 'el servidor web (HTTP)',
};

const ipOrigen = (c: ContextoDeCapa) => requerir(c.origen.ipv4, `la IPv4 de ${c.origen.etiqueta}`);
const ipDestino = (c: ContextoDeCapa) =>
  requerir(c.destino.ipv4, `la IPv4 de ${c.destino.etiqueta}`);
const macEmisor = (c: ContextoDeCapa) =>
  requerir(c.salto.emisor.mac, `la MAC de ${c.salto.emisor.etiqueta}`);
const macReceptor = (c: ContextoDeCapa) =>
  requerir(c.salto.receptor.mac, `la MAC de ${c.salto.receptor.etiqueta}`);

/**
 * Pila TCP/IP real: un pedido HTTP [Ejemplo] dentro de un segmento TCP, dentro de un
 * datagrama IPv4, dentro de una trama Ethernet II con FCS. Los campos de cada encabezado
 * van en el orden en que aparecen en el encabezado real.
 */
export const PILA_TCPIP: Pila = {
  id: 'tcpip',
  nombre: 'TCP/IP real',
  presentacion: ({ origen, destino }) =>
    `[Ejemplo] ${origen.etiqueta} le pide una página web a ${destino.etiqueta} con HTTP sobre TCP, IPv4 y Ethernet.`,
  datos: {
    descripcion: '[Ejemplo] Pedido HTTP: GET / HTTP/1.1, Host: example.com',
    bytes: bytesUtf8(MENSAJE_HTTP),
  },
  capas: {
    7: {
      pdu: PDU_TCPIP[7],
      alEnviar: ({ destino }) =>
        `La aplicación arma un pedido HTTP para el servidor web de ${destino.etiqueta}. El pedido entero, con sus propias líneas de encabezado HTTP, son los datos que bajan por la pila.`,
      alRecibir: () => 'El servidor web recibe los datos.',
    },
    6: {
      pdu: PDU_TCPIP[6],
      alEnviar: () =>
        'En TCP/IP no hay una capa de presentación aparte: si hay que dar formato, cifrar o comprimir los datos, lo hace la aplicación. No se agrega ningún encabezado.',
      alRecibir: () =>
        'No hay encabezado de presentación que leer: los datos suben tal cual a la aplicación.',
    },
    5: {
      pdu: PDU_TCPIP[5],
      alEnviar: () =>
        'Tampoco hay una capa de sesión aparte: en TCP/IP, la aplicación cubre las capas 5 a 7 de OSI. No se agrega ningún encabezado.',
      alRecibir: () => 'No hay encabezado de sesión que leer: los datos suben tal cual.',
    },
    4: {
      pdu: PDU_TCPIP[4],
      encabezado: () => ({
        capa: 4,
        nombre: 'TCP',
        bytes: BYTES_TCP,
        campos: [
          { nombre: 'Puerto origen', valor: String(PUERTO_CLIENTE) },
          { nombre: ENTREGA_TCP.campo, valor: ENTREGA_TCP.valor },
        ],
      }),
      alEnviar: ({ destino }) =>
        `TCP agrega su encabezado de ${BYTES_TCP} bytes. Entre otros campos, lleva el puerto de origen (${PUERTO_CLIENTE}) y el de destino (${PUERTO_HTTP}, el de HTTP), que le dice a ${destino.etiqueta} a qué aplicación entregar los datos.`,
      alRecibir: () => 'TCP lee su encabezado.',
      entrega: ENTREGA_TCP,
    },
    3: {
      pdu: PDU_TCPIP[3],
      encabezado: (c) => ({
        capa: 3,
        nombre: 'IPv4',
        bytes: BYTES_IPV4,
        campos: [
          { nombre: ENTREGA_IPV4.campo, valor: ENTREGA_IPV4.valor },
          { nombre: 'IP origen', valor: ipOrigen(c) },
          { nombre: 'IP destino', valor: ipDestino(c) },
        ],
      }),
      alEnviar: (c) =>
        `IPv4 agrega su encabezado de ${BYTES_IPV4} bytes, con la dirección IP de origen (${ipOrigen(c)}), la de destino (${ipDestino(c)}) y el campo Protocolo en ${PROTOCOLO_TCP}, que avisa que adentro va TCP.`,
      alRecibir: (c) =>
        `IPv4 lee su encabezado: la dirección de destino, ${ipDestino(c)}, es la de ${c.destino.etiqueta}.`,
      entrega: ENTREGA_IPV4,
      alReenviar: (c) =>
        `IPv4 lee su encabezado: la dirección de destino, ${ipDestino(c)}, no es del router, así que el datagrama sigue viaje hacia ${c.destino.etiqueta}. El router elige por qué interfaz sacarlo y se lo pasa a la capa 2 de esa interfaz, sin cambiar ninguno de los campos que se muestran.`,
    },
    2: {
      pdu: PDU_TCPIP[2],
      encabezado: (c) => ({
        capa: 2,
        nombre: 'Ethernet',
        bytes: BYTES_ETHERNET,
        campos: [
          { nombre: 'MAC destino', valor: macReceptor(c) },
          { nombre: 'MAC origen', valor: macEmisor(c) },
          { nombre: ENTREGA_ETHERNET.campo, valor: ENTREGA_ETHERNET.valor },
        ],
      }),
      cola: () => ({ capa: 2, nombre: 'FCS', bytes: BYTES_FCS, campos: [], parte: 'cola' }),
      alEnviar: (c) => {
        const { emisor, receptor } = c.salto;
        const otraRed =
          receptor.etiqueta === c.destino.etiqueta
            ? ''
            : ` La MAC de destino es la del router ${receptor.etiqueta}, porque ${c.destino.etiqueta} está en otra red.`;
        return `Ethernet agrega adelante su encabezado de ${BYTES_ETHERNET} bytes: la MAC de destino (la de ${receptor.etiqueta}), la de origen (la de ${emisor.etiqueta}) y el EtherType ${ETHERTYPE_IPV4}, que avisa que adentro va IPv4. Al final agrega el FCS, de ${BYTES_FCS} bytes, para detectar errores.${otraRed}`;
      },
      alRecibir: (c) =>
        `Ethernet lee su encabezado: la MAC de destino es la de ${c.salto.receptor.etiqueta}. El FCS coincide, así que la trama llegó sin errores.`,
      entrega: ENTREGA_ETHERNET,
      alDescartar:
        'Ethernet calcula el FCS de la trama que llegó y no coincide con el que trae: la trama tiene errores y se descarta.',
    },
    1: {
      pdu: PDU_TCPIP[1],
      alEnviar: () =>
        'La capa física no agrega encabezado: transmite la trama bit por bit por el medio.',
      alRecibir: () => 'La capa física recibe los bits y se los pasa a la capa 2 como una trama.',
    },
  },
};

/** Las dos pilas, en el orden en que se comparan. */
export const PILAS: readonly Pila[] = [PILA_OSI, PILA_TCPIP];
