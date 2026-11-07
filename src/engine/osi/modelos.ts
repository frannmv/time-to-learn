/**
 * Modelos de capas: OSI, TCP/IP e IEEE 802, y el nombre de la PDU en cada capa.
 *
 * Cada capa de un modelo dice qué capas OSI cubre, así que los tres se pueden comparar fila
 * por fila contra el modelo OSI (lo dibuja la tabla comparativa de la pieza 2.5).
 *
 * Fuentes:
 * - ISO/IEC 7498-1:1994, modelo de referencia OSI: las siete capas y la noción de
 *   (N)-PDU, formada por la información de control de la capa, (N)-PCI, más los datos que
 *   recibe de la capa de arriba, (N)-SDU. La notación AH, PH… y A-PDU, P-PDU… es la del
 *   apunte de la cátedra («Introducción y Modelo OSI», figura «Entorno OSI»): el encabezado
 *   de cada capa es su PCI.
 * - RFC 1122, «Requirements for Internet Hosts», §1.1.3: las cuatro capas de TCP/IP
 *   (aplicación, transporte, internet y enlace). §1.3.3: segmento, datagrama IP y trama.
 * - IEEE Std 802-2014, «Overview and Architecture»: el modelo de referencia IEEE 802 cubre
 *   las capas 1 y 2 de OSI, y divide la capa 2 en las subcapas LLC y MAC.
 * - IEEE Std 802.2: subcapa de control de enlace lógico (LLC).
 * - Apunte de la cátedra «Introducción y Modelo OSI», figura «Arquitectura TCP/IP»: la
 *   correspondencia entre las capas de TCP/IP y las de OSI. RFC 1122 no la define.
 *
 * Simplificaciones declaradas:
 * - La correspondencia entre TCP/IP y OSI es aproximada: TCP/IP no se diseñó sobre el
 *   modelo OSI. Se usa la del apunte de la cátedra.
 * - Los nombres de PDU de TCP/IP son los del ejemplo de la etapa (TCP sobre IPv4 sobre
 *   Ethernet): con UDP, la PDU de transporte no sería un segmento.
 */

import { CAPAS, NOMBRE_CAPA, type Capa } from '../core/capas';

/** Subcapa de una capa de un modelo, como LLC y MAC dentro de la capa 2 de IEEE 802. */
export interface Subcapa {
  readonly id: string;
  /** Sigla con que se la conoce («LLC»). */
  readonly sigla: string;
  /** Nombre completo en español. */
  readonly nombre: string;
}

/** Una capa de un modelo, con las capas OSI que cubre. */
export interface CapaDeModelo {
  readonly id: string;
  readonly nombre: string;
  /** Otros nombres con que aparece en la bibliografía. */
  readonly otrosNombres?: readonly string[];
  /** Capas OSI que cubre, de abajo hacia arriba. */
  readonly cubre: readonly Capa[];
  /** Subcapas, de abajo hacia arriba. */
  readonly subcapas?: readonly Subcapa[];
}

export type IdModelo = 'osi' | 'tcpip' | 'ieee802';

export interface ModeloDeCapas {
  readonly id: IdModelo;
  readonly nombre: string;
  /** Capas del modelo, de abajo hacia arriba. */
  readonly capas: readonly CapaDeModelo[];
  /**
   * Capas OSI que el modelo describe. OSI y TCP/IP describen las siete; IEEE 802, solo
   * las dos de abajo.
   */
  readonly alcance: readonly Capa[];
}

/** Modelo de referencia OSI (ISO/IEC 7498-1): siete capas. */
export const MODELO_OSI: ModeloDeCapas = {
  id: 'osi',
  nombre: 'Modelo OSI',
  capas: CAPAS.map((capa) => ({
    id: `osi-${capa}`,
    nombre: NOMBRE_CAPA[capa],
    cubre: [capa],
  })),
  alcance: CAPAS,
};

/**
 * Modelo TCP/IP en cuatro capas, como RFC 1122 §1.1.3 y el apunte de la cátedra. Las capas
 * OSI que cubre cada una salen del apunte.
 */
export const MODELO_TCPIP: ModeloDeCapas = {
  id: 'tcpip',
  nombre: 'Modelo TCP/IP',
  capas: [
    {
      id: 'tcpip-enlace',
      nombre: 'Enlace',
      otrosNombres: ['Interfaz de red'],
      cubre: [1, 2],
    },
    { id: 'tcpip-internet', nombre: 'Internet', cubre: [3] },
    { id: 'tcpip-transporte', nombre: 'Transporte', cubre: [4] },
    { id: 'tcpip-aplicacion', nombre: 'Aplicación', cubre: [5, 6, 7] },
  ],
  alcance: CAPAS,
};

/**
 * Modelo de referencia IEEE 802 (IEEE Std 802-2014): la capa física y la capa de enlace
 * de datos, dividida en LLC (IEEE 802.2), arriba, y MAC, abajo. Las capas 3 a 7 quedan
 * fuera del alcance de IEEE 802.
 */
export const MODELO_IEEE802: ModeloDeCapas = {
  id: 'ieee802',
  nombre: 'Modelo IEEE 802',
  capas: [
    { id: 'ieee802-fisica', nombre: 'Física', cubre: [1] },
    {
      id: 'ieee802-enlace',
      nombre: 'Enlace de datos',
      cubre: [2],
      subcapas: [
        { id: 'ieee802-mac', sigla: 'MAC', nombre: 'Control de acceso al medio' },
        { id: 'ieee802-llc', sigla: 'LLC', nombre: 'Control de enlace lógico' },
      ],
    },
  ],
  alcance: [1, 2],
};

/** Los tres modelos, en el orden en que se comparan. */
export const MODELOS: readonly ModeloDeCapas[] = [MODELO_OSI, MODELO_TCPIP, MODELO_IEEE802];

/**
 * Nombre de la PDU en cada capa del modelo OSI genérico, con la notación del apunte de la
 * cátedra: la (N)-PDU de ISO/IEC 7498-1 con la inicial de la capa. La capa física no arma
 * una PDU con encabezado: transmite bits.
 */
export const PDU_OSI: Readonly<Record<Capa, string>> = {
  1: 'Bits',
  2: 'DL-PDU',
  3: 'N-PDU',
  4: 'T-PDU',
  5: 'S-PDU',
  6: 'P-PDU',
  7: 'A-PDU',
};

/**
 * Nombre de la PDU en cada capa OSI cuando la pila es TCP/IP con TCP sobre IPv4 sobre
 * Ethernet. Segmento, datagrama IP y trama siguen las definiciones de RFC 1122 §1.3.3. La
 * aplicación cubre las capas 5 a 7, así que en las tres la PDU son los datos de la
 * aplicación.
 */
export const PDU_TCPIP: Readonly<Record<Capa, string>> = {
  1: 'Bits',
  2: 'Trama',
  3: 'Datagrama IP',
  4: 'Segmento TCP',
  5: 'Datos de la aplicación',
  6: 'Datos de la aplicación',
  7: 'Datos de la aplicación',
};

/** Capas OSI que cubre el modelo, en el orden de sus capas (puede tener repetidas). */
export function capasCubiertas(modelo: ModeloDeCapas): Capa[] {
  return modelo.capas.flatMap((capa) => capa.cubre);
}

/** La capa del modelo que cubre una capa OSI, o `undefined` si queda fuera de su alcance. */
export function capaDelModelo(modelo: ModeloDeCapas, capa: Capa): CapaDeModelo | undefined {
  return modelo.capas.find((c) => c.cubre.includes(capa));
}
