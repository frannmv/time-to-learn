/**
 * Simulación de encapsulamiento y desencapsulamiento: un dato de aplicación baja por la
 * pila del host de origen, cruza el medio (y los equipos intermedios, si los hay) y sube
 * por la pila del host de destino.
 *
 * - En el origen, de la capa 7 a la 1, cada capa agrega su encabezado (y la capa 2, su
 *   cola). El paso explica qué agregó y cómo se llama la PDU.
 * - Cada equipo intermedio sube hasta su capa más alta y vuelve a bajar: un hub solo
 *   repite bits, un switch reenvía la trama sin cambiarla y un router arma una trama nueva
 *   para el enlace siguiente, con otras MAC, y deja el datagrama como estaba.
 * - En el destino, de la capa 1 a la 7, cada capa lee el encabezado que puso su capa par,
 *   usa el campo de demultiplexación para saber a quién entregar el contenido y lo quita.
 *   En cada capa, la PDU es la misma que armó su capa par en el origen.
 * - Si un enlace tiene un error, el primer equipo que llega a la capa 2 después de ese
 *   enlace ve que el control de errores no coincide y descarta la trama: las capas de
 *   arriba nunca la ven (IEEE 802.3 §3.4). La simulación termina ahí.
 *
 * Qué agrega cada capa y cómo se explica lo dice la pila (pilas.ts); acá solo está el
 * recorrido, que es igual para cualquier pila.
 *
 * Fuentes:
 * - ISO/IEC 7498-1:1994: cada capa se comunica con su capa par agregando su información de
 *   control a los datos de la capa de arriba.
 * - IEEE Std 802.3 §3.4: una trama con el FCS incorrecto es inválida y no se entrega a la
 *   capa de arriba.
 * - IEEE Std 802.1Q, cláusula 8: un bridge (un switch) reenvía la trama sin cambiar sus
 *   direcciones MAC.
 * - RFC 1812 §1 y §5.2: un router quita el encabezado de enlace de la trama que recibe,
 *   procesa el datagrama y le pone un encabezado de enlace nuevo para la interfaz de
 *   salida.
 * - RFC 5737 §3: direcciones IPv4 para documentación (192.0.2.0/24 y 198.51.100.0/24).
 * - RFC 9542 §2.1.4: direcciones MAC para documentación (00-00-5E-00-53-00 a
 *   00-00-5E-00-53-FF).
 *
 * Simplificaciones declaradas:
 * - Sin preámbulo ni SFD: la capa física transmite la trama tal cual.
 * - Sin relleno: el ejemplo TCP/IP no lo necesita (su trama mide más de 64 bytes).
 * - Sin establecimiento de la conexión TCP (Etapa 9) ni ARP (Etapa 7): la MAC del próximo
 *   salto se da por conocida, y el origen ya sabe si el destino está en su red o si tiene
 *   que mandarle la trama al router.
 * - El FCS no se calcula (el CRC-32 es de la Etapa 3): el error se modela como «no
 *   coincide», y se dice en el texto que es un ejemplo.
 * - El router no muestra el decremento del TTL ni el checksum nuevo del encabezado IPv4
 *   (Etapas 7 y 8): el datagrama queda igual en los campos que se muestran.
 * - El switch ya sabe por qué puerto se llega a cada MAC (el aprendizaje es de la Etapa 4)
 *   y recibe la trama entera antes de reenviarla.
 * - Un solo segmento, sin fragmentación.
 * - En TCP/IP las capas 5 y 6 no agregan encabezado: el paso de cada una lo aclara.
 */

import { CAPAS, NOMBRE_CAPA, type Capa } from '../core/capas';
import { longitudTotal } from '../core/pdu';
import {
  crearTimeline,
  type Encabezado,
  type Enlace,
  type Nodo,
  type Paquete,
  type Step,
  type Timeline,
  type Ubicacion,
} from '../core/timeline';
import { PILA_OSI, PILA_TCPIP, type ContextoDeCapa, type Equipo, type Pila } from './pilas';

// ---------------------------------------------------------------------------------------
// Recorrido
// ---------------------------------------------------------------------------------------

/** Un host en un extremo de la comunicación. */
export interface Host extends Equipo {
  readonly id: string;
}

export type TipoIntermedio = 'hub' | 'switch' | 'router';

/** Un equipo entre los dos hosts. */
export interface Intermedio {
  readonly id: string;
  readonly etiqueta: string;
  readonly tipo: TipoIntermedio;
  /** Solo para un router: la MAC de la interfaz que da al origen y la de la que da al destino. */
  readonly macs?: { readonly haciaOrigen: string; readonly haciaDestino: string };
}

/** Por dónde viaja la PDU: dos hosts y, entre ellos, los equipos intermedios en orden. */
export interface Recorrido {
  readonly origen: Host;
  readonly intermedios?: readonly Intermedio[];
  readonly destino: Host;
  /**
   * Índice del enlace (desde 0, empezando por el del origen) donde una interferencia
   * cambia algunos bits. Sin este campo, no hay errores.
   */
  readonly enlaceConError?: number;
}

/** Capas que implementa cada tipo de equipo de la simulación. */
export const CAPAS_POR_TIPO: Readonly<Record<'host' | TipoIntermedio, readonly Capa[]>> = {
  host: CAPAS,
  hub: [1],
  switch: [1, 2],
  router: [1, 2, 3],
};

/** Distancia horizontal entre dos equipos en el diagrama (dato de dibujo, sin unidad). */
const SEPARACION = 200;

/** Id del único paquete de la simulación. */
export const ID_PDU = 'pdu';

// ---------------------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------------------

/** «a», «a y b», «a, b y c». */
function enumerar(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1) ?? ''}`;
}

/** «el encabezado TCP», «la cola FCS». */
function nombrar(encabezado: Encabezado): string {
  return encabezado.parte === 'cola'
    ? `la cola ${encabezado.nombre}`
    : `el encabezado ${encabezado.nombre}`;
}

const enCapa = (equipo: Equipo, capa: Capa) =>
  `${equipo.etiqueta}, capa ${capa} (${NOMBRE_CAPA[capa]}):`;

// ---------------------------------------------------------------------------------------
// Simulación
// ---------------------------------------------------------------------------------------

interface EquipoDelRecorrido {
  readonly equipo: Host | Intermedio;
  readonly tipo: 'host' | TipoIntermedio;
}

/**
 * Corre el encapsulamiento de la pila a lo largo del recorrido y devuelve la línea de
 * tiempo. Es determinística: la misma pila y el mismo recorrido dan la misma timeline.
 *
 * @throws {RangeError} si `enlaceConError` no es el índice de un enlace del recorrido.
 * @throws {Error} si la pila necesita una dirección que el recorrido no trae.
 */
export function simularEncapsulamiento(pila: Pila, recorrido: Recorrido): Timeline {
  const { origen, destino, intermedios = [], enlaceConError } = recorrido;
  const equipos: EquipoDelRecorrido[] = [
    { equipo: origen, tipo: 'host' },
    ...intermedios.map((equipo) => ({ equipo, tipo: equipo.tipo })),
    { equipo: destino, tipo: 'host' },
  ];

  const nodos: Nodo[] = equipos.map(({ equipo, tipo }, i) => ({
    id: equipo.id,
    tipo,
    etiqueta: equipo.etiqueta,
    posicion: { x: i * SEPARACION, y: 0 },
    capas: CAPAS_POR_TIPO[tipo],
  }));
  const enlaces: Enlace[] = nodos.slice(1).map((nodo, i) => {
    const anterior = nodos[i]?.id ?? '';
    return { id: `${anterior}-${nodo.id}`, extremos: [anterior, nodo.id] };
  });

  if (
    enlaceConError !== undefined &&
    !(Number.isInteger(enlaceConError) && enlaceConError >= 0 && enlaceConError < enlaces.length)
  ) {
    throw new RangeError(
      `enlaceConError vale ${enlaceConError} y tiene que ser un índice de enlace, de 0 a ${enlaces.length - 1}`,
    );
  }

  /** El salto de capa 2 al que pertenece el enlace i: quién arma la trama y quién la recibe. */
  function saltoDelEnlace(i: number): ContextoDeCapa['salto'] {
    let emisor: Equipo = origen;
    for (const { equipo } of equipos.slice(1, i + 1)) {
      if ('tipo' in equipo && equipo.tipo === 'router') {
        emisor = { etiqueta: equipo.etiqueta, mac: equipo.macs?.haciaDestino };
      }
    }
    let receptor: Equipo = destino;
    for (const { equipo } of equipos.slice(i + 1, -1)) {
      if ('tipo' in equipo && equipo.tipo === 'router') {
        receptor = { etiqueta: equipo.etiqueta, mac: equipo.macs?.haciaOrigen };
        break;
      }
    }
    return { emisor, receptor };
  }

  const contexto = (enlace: number): ContextoDeCapa => ({
    origen,
    destino,
    salto: saltoDelEnlace(enlace),
  });

  // Lo que agregó cada capa, tal como viaja ahora.
  const porCapa = new Map<Capa, Encabezado[]>();
  const armarCapa = (capa: Capa, ctx: ContextoDeCapa) => {
    const { encabezado, cola } = pila.capas[capa];
    porCapa.set(
      capa,
      [encabezado?.(ctx), cola?.(ctx)].filter((e): e is Encabezado => e !== undefined),
    );
  };
  /** La PDU de la capa indicada: lo que agregaron esa capa y las de arriba. */
  const encabezadosDesde = (capa: Capa) =>
    CAPAS.filter((c) => c >= capa).flatMap((c) => porCapa.get(c) ?? []);

  const pasos: Step[] = [];
  function agregarPaso(
    explicacion: string,
    ubicacion: Ubicacion,
    pdu: Paquete['pdu'],
    desde: Capa,
  ) {
    const paquete: Paquete = {
      id: ID_PDU,
      ubicacion,
      pdu,
      encabezados: encabezadosDesde(desde),
      datos: pila.datos,
    };
    pasos.push({
      indice: pasos.length,
      explicacion,
      paquetes: [paquete],
      tablas: [],
      resaltados:
        ubicacion.tipo === 'nodo'
          ? { nodos: [ubicacion.nodo], enlaces: [] }
          : { nodos: [], enlaces: [ubicacion.enlace] },
    });
  }
  const enNodo = (equipo: Host | Intermedio, capa: Capa): Ubicacion => ({
    tipo: 'nodo',
    nodo: equipo.id,
    capa,
  });

  /** Frase sobre la PDU después de que la capa la arma. */
  function fraseDeLaPdu(capa: Capa, agrego: boolean, primero: boolean): string {
    const { pdu } = pila.capas[capa];
    if (!agrego && !primero) {
      return capa < 7 && pila.capas[(capa + 1) as Capa].pdu === pdu
        ? ` La PDU sigue siendo «${pdu}».`
        : '';
    }
    const bytes = longitudTotal({ encabezados: encabezadosDesde(capa), datos: pila.datos });
    const medida = bytes === undefined ? '' : ` y mide ${bytes} bytes`;
    return ` ${agrego ? 'Ahora la' : 'La'} PDU se llama «${pdu}»${medida}.`;
  }

  /** Paso de una capa que arma la PDU y se la pasa a la de abajo. */
  function bajar(equipo: Host | Intermedio, capa: Capa, ctx: ContextoDeCapa, intro = '') {
    armarCapa(capa, ctx);
    const agrego = (porCapa.get(capa)?.length ?? 0) > 0;
    const primero = pasos.length === 0;
    const texto = `${intro}${enCapa(equipo, capa)} ${pila.capas[capa].alEnviar(ctx)}${fraseDeLaPdu(capa, agrego, primero)}`;
    agregarPaso(texto, enNodo(equipo, capa), pila.capas[capa].pdu, capa);
  }

  /** Paso de una capa que lee su encabezado, lo quita y entrega el resto a la de arriba. */
  function subir(equipo: Host | Intermedio, capa: Capa, ctx: ContextoDeCapa) {
    const datosCapa = pila.capas[capa];
    let texto = `${enCapa(equipo, capa)} ${datosCapa.alRecibir(ctx)}`;
    if (datosCapa.entrega !== undefined) {
      const { campo, valor, para } = datosCapa.entrega;
      texto += ` El campo ${campo} vale ${valor}: el contenido es para ${para}.`;
    }
    const propias = porCapa.get(capa) ?? [];
    if (propias.length > 0) {
      const quita = `Quita ${enumerar(propias.map(nombrar))}`;
      texto +=
        capa < 7
          ? ` ${quita} y le pasa a la capa ${capa + 1} lo que queda: «${pila.capas[(capa + 1) as Capa].pdu}».`
          : ` ${quita}.`;
    }
    if (equipo === destino && capa === 7) {
      texto += ` ${destino.etiqueta} recibe los mismos datos que envió ${origen.etiqueta}: «${pila.datos.descripcion}».`;
    }
    agregarPaso(texto, enNodo(equipo, capa), datosCapa.pdu, capa);
  }

  // Origen: de la capa 7 a la 1.
  const ctxInicial = contexto(0);
  for (const capa of [...CAPAS].reverse()) {
    bajar(origen, capa, ctxInicial, capa === 7 ? `${pila.presentacion(ctxInicial)} ` : '');
  }

  let hayError = false;
  for (const [i, enlace] of enlaces.entries()) {
    const [desde, hacia] = [equipos[i]?.equipo, equipos[i + 1]];
    if (desde === undefined || hacia === undefined) break;
    const ctx = contexto(i);
    const llega = hacia.equipo;

    // Los bits cruzan el medio.
    let texto = `Los bits viajan por el enlace de ${desde.etiqueta} a ${llega.etiqueta}.`;
    if (i === enlaceConError) {
      hayError = true;
      texto += ' [Ejemplo] En el camino, una interferencia cambia algunos bits.';
    }
    agregarPaso(
      texto,
      { tipo: 'enlace', enlace: enlace.id, desde: desde.id, hacia: llega.id },
      pila.capas[1].pdu,
      1,
    );

    if (hacia.tipo === 'hub') {
      agregarPaso(
        `${enCapa(llega, 1)} El hub recibe los bits y los repite por sus otros puertos. No arma la trama ni mira su contenido: trabaja solo en la capa física.${hayError ? ' Los bits cambiados pasan igual.' : ''}`,
        enNodo(llega, 1),
        pila.capas[1].pdu,
        1,
      );
      continue;
    }

    // Llegan los bits y suben a la capa 2.
    subir(llega, 1, ctx);
    if (hayError) {
      const alDescartar = pila.capas[2].alDescartar ?? 'El control de errores no coincide.';
      agregarPaso(
        `${enCapa(llega, 2)} ${alDescartar} Ninguna capa de arriba de ${llega.etiqueta} la ve.`,
        enNodo(llega, 2),
        pila.capas[2].pdu,
        2,
      );
      return crearTimeline({ nodos, enlaces }, pasos);
    }

    if (hacia.tipo === 'host') {
      for (const capa of CAPAS.slice(1)) subir(llega, capa, ctx);
      break;
    }

    const siguiente = equipos[i + 2]?.equipo.etiqueta ?? destino.etiqueta;
    if (hacia.tipo === 'switch') {
      const { receptor } = ctx.salto;
      const mac = receptor.mac === undefined ? '' : ` (${receptor.mac})`;
      agregarPaso(
        `${enCapa(llega, 2)} El switch lee la dirección de destino de la trama, la de ${receptor.etiqueta}${mac}, y la reenvía por el puerto que lleva hacia ${siguiente}. No le cambia nada: la trama sale igual que llegó.`,
        enNodo(llega, 2),
        pila.capas[2].pdu,
        2,
      );
      bajar(llega, 1, contexto(i + 1));
      continue;
    }

    // Router: sube hasta la capa 3 y arma una trama nueva para el enlace siguiente.
    subir(llega, 2, ctx);
    const reenviar =
      pila.capas[3].alReenviar?.(ctx) ??
      `El router lee la dirección de destino de la PDU: no es la suya, así que la reenvía hacia ${destino.etiqueta} sin cambiarla.`;
    agregarPaso(`${enCapa(llega, 3)} ${reenviar}`, enNodo(llega, 3), pila.capas[3].pdu, 3);
    const ctxSalida = contexto(i + 1);
    bajar(llega, 2, ctxSalida, `Trama nueva para el enlace hacia ${siguiente}. `);
    bajar(llega, 1, ctxSalida);
  }

  return crearTimeline({ nodos, enlaces }, pasos);
}

// ---------------------------------------------------------------------------------------
// Escenarios listos para el contenido
// ---------------------------------------------------------------------------------------

/**
 * Host A, en la red 192.0.2.0/24 (TEST-NET-1, RFC 5737 §3). Su MAC es del bloque para
 * documentación de RFC 9542 §2.1.4.
 */
export const HOST_A: Host = {
  id: 'a',
  etiqueta: 'A',
  mac: '00-00-5E-00-53-0A',
  ipv4: '192.0.2.10',
};

/** Host B en la misma red que A (TEST-NET-1, RFC 5737 §3; MAC de RFC 9542 §2.1.4). */
export const HOST_B: Host = {
  id: 'b',
  etiqueta: 'B',
  mac: '00-00-5E-00-53-0B',
  ipv4: '192.0.2.11',
};

/** Host B en otra red, 198.51.100.0/24 (TEST-NET-2, RFC 5737 §3; MAC de RFC 9542 §2.1.4). */
export const HOST_B_OTRA_RED: Host = { ...HOST_B, ipv4: '198.51.100.11' };

/** Router R entre las dos redes, con una MAC por interfaz (RFC 9542 §2.1.4). */
export const ROUTER_R: Intermedio = {
  id: 'r',
  etiqueta: 'R',
  tipo: 'router',
  macs: { haciaOrigen: '00-00-5E-00-53-01', haciaDestino: '00-00-5E-00-53-02' },
};

/** Modelo OSI genérico de A a B, por un solo enlace: 15 pasos. */
export function simularModeloOsi(): Timeline {
  return simularEncapsulamiento(PILA_OSI, { origen: HOST_A, destino: HOST_B });
}

/** [Ejemplo] Pedido HTTP de A a B con TCP/IP real, por un solo enlace: 15 pasos. */
export function simularTcpIp(): Timeline {
  return simularEncapsulamiento(PILA_TCPIP, { origen: HOST_A, destino: HOST_B });
}

/** [Ejemplo] El mismo pedido, pero la trama llega con errores y B la descarta: 10 pasos. */
export function simularTramaConError(): Timeline {
  return simularEncapsulamiento(PILA_TCPIP, {
    origen: HOST_A,
    destino: HOST_B,
    enlaceConError: 0,
  });
}

/** [Ejemplo] El mismo pedido, con B en otra red y el router R en el medio: 21 pasos. */
export function simularRouterEnElMedio(): Timeline {
  return simularEncapsulamiento(PILA_TCPIP, {
    origen: HOST_A,
    intermedios: [ROUTER_R],
    destino: HOST_B_OTRA_RED,
  });
}
