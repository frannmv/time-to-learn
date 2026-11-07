/**
 * ESCENARIO FICTICIO de demostración para la vista de pila de protocolos. No representa
 * ningún protocolo real.
 *
 * Sirve para probar `ProtocolStack` y `Pdu` en la página interna `/demo/` sin depender de
 * los escenarios del módulo OSI: dos hosts de juguete (A y C) con cuatro capas y un router
 * de juguete (B) con tres, en línea. Un mensaje baja por la pila de A, cruza a B, sube hasta
 * su capa 3, vuelve a bajar, cruza a C y sube por su pila.
 *
 * Los nombres de los encabezados, de la cola y de las PDU, sus tamaños y las pilas de cuatro
 * capas son inventados a propósito; ningún módulo del sitio debe usarlos como referencia
 * técnica.
 *
 * Simplificaciones declaradas:
 * - Las pilas tienen solo las capas 1 a 4: alcanza para ver cómo se suman y se quitan partes.
 * - El router de juguete arma una trama nueva igual a la que recibió (mismos nombres y
 *   tamaños); no hay direcciones.
 */

import type { Capa } from '../core/capas';
import {
  crearTimeline,
  type Encabezado,
  type Step,
  type Timeline,
  type Topologia,
  type Ubicacion,
} from '../core/timeline';

/** Topología fija del escenario: A — B — C, con la pila de cada equipo. */
export const TOPOLOGIA_PILA_DEMO: Topologia = {
  nodos: [
    { id: 'a', tipo: 'host', etiqueta: 'A', posicion: { x: 0, y: 0 }, capas: [1, 2, 3, 4] },
    { id: 'b', tipo: 'router', etiqueta: 'B', posicion: { x: 200, y: 0 }, capas: [1, 2, 3] },
    { id: 'c', tipo: 'host', etiqueta: 'C', posicion: { x: 400, y: 0 }, capas: [1, 2, 3, 4] },
  ],
  enlaces: [
    { id: 'a-b', extremos: ['a', 'b'] },
    { id: 'b-c', extremos: ['b', 'c'] },
  ],
};

/** Texto del mensaje de juguete. */
export const MENSAJE_PILA_DEMO = 'Hola, C';

/** Id del único paquete del escenario. */
export const ID_PDU_PILA_DEMO = 'pdu';

/** Tamaños inventados de lo que agrega cada capa, en bytes. */
export const BYTES_PILA_DEMO = Object.freeze({ capa4: 4, capa3: 8, capa2: 6, cola2: 2 });

/** Lo que agrega cada capa, de afuera hacia adentro dentro de la capa (encabezado y cola). */
const AGREGA: Readonly<Partial<Record<Capa, readonly Encabezado[]>>> = {
  4: [{ capa: 4, nombre: 'E4 (ficticio)', campos: [], bytes: BYTES_PILA_DEMO.capa4 }],
  3: [{ capa: 3, nombre: 'E3 (ficticio)', campos: [], bytes: BYTES_PILA_DEMO.capa3 }],
  2: [
    { capa: 2, nombre: 'E2 (ficticio)', campos: [], bytes: BYTES_PILA_DEMO.capa2 },
    { capa: 2, nombre: 'C2 (ficticia)', campos: [], bytes: BYTES_PILA_DEMO.cola2, parte: 'cola' },
  ],
};

/** Nombre inventado de la PDU en cada capa. */
export const PDU_PILA_DEMO: Readonly<Record<1 | 2 | 3 | 4, string>> = Object.freeze({
  4: 'Bloque de juguete',
  3: 'Paquete de juguete',
  2: 'Trama de juguete',
  1: 'Bits de juguete',
});

type CapaDemo = keyof typeof PDU_PILA_DEMO;

/** Encabezados de la PDU en una capa: lo que agregaron esa capa y las de arriba. */
function encabezadosDesde(capa: CapaDemo): Encabezado[] {
  return ([1, 2, 3, 4] as const).filter((c) => c >= capa).flatMap((c) => AGREGA[c] ?? []);
}

/**
 * Corre el escenario ficticio y devuelve su línea de tiempo de 15 pasos. Es determinístico:
 * siempre da la misma timeline.
 */
export function simularPilaDemo(): Timeline {
  const pasos: Step[] = [];
  const agregar = (explicacion: string, ubicacion: Ubicacion, capa: CapaDemo) => {
    pasos.push({
      indice: pasos.length,
      explicacion,
      paquetes: [
        {
          id: ID_PDU_PILA_DEMO,
          ubicacion,
          pdu: PDU_PILA_DEMO[capa],
          encabezados: encabezadosDesde(capa),
          datos: {
            descripcion: MENSAJE_PILA_DEMO,
            bytes: new TextEncoder().encode(MENSAJE_PILA_DEMO).length,
          },
        },
      ],
      tablas: [],
      resaltados:
        ubicacion.tipo === 'nodo'
          ? { nodos: [ubicacion.nodo], enlaces: [] }
          : { nodos: [], enlaces: [ubicacion.enlace] },
    });
  };
  const en = (nodo: string, capa: CapaDemo): Ubicacion => ({ tipo: 'nodo', nodo, capa });

  agregar(
    'A, capa 4: agrega E4 al mensaje. Este escenario es ficticio: las capas, los nombres y los tamaños son inventados.',
    en('a', 4),
    4,
  );
  agregar('A, capa 3: agrega E3.', en('a', 3), 3);
  agregar('A, capa 2: agrega E2 adelante y la cola C2 atrás.', en('a', 2), 2);
  agregar('A, capa 1: transmite la trama como bits.', en('a', 1), 1);
  agregar(
    'Los bits viajan por el enlace de A a B.',
    { tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' },
    1,
  );
  agregar('B, capa 1: recibe los bits y arma la trama.', en('b', 1), 1);
  agregar('B, capa 2: lee E2 y C2, los quita y pasa el resto a la capa 3.', en('b', 2), 2);
  agregar('B, capa 3: lee E3 y decide reenviar el paquete hacia C.', en('b', 3), 3);
  agregar('B, capa 2: arma una trama nueva con E2 y C2.', en('b', 2), 2);
  agregar('B, capa 1: transmite la trama como bits.', en('b', 1), 1);
  agregar(
    'Los bits viajan por el enlace de B a C.',
    { tipo: 'enlace', enlace: 'b-c', desde: 'b', hacia: 'c' },
    1,
  );
  agregar('C, capa 1: recibe los bits y arma la trama.', en('c', 1), 1);
  agregar('C, capa 2: lee E2 y C2 y los quita.', en('c', 2), 2);
  agregar('C, capa 3: lee E3 y lo quita.', en('c', 3), 3);
  agregar(
    `C, capa 4: lee E4, lo quita y entrega el mensaje: «${MENSAJE_PILA_DEMO}». Fin del escenario de demostración.`,
    en('c', 4),
    4,
  );

  return crearTimeline(TOPOLOGIA_PILA_DEMO, pasos);
}
