/**
 * ESCENARIO FICTICIO de demostración. No representa ningún protocolo real.
 *
 * Sirve para probar los componentes de simulación en la página interna `/demo/`: tres
 * nodos en línea (A, B y C), un mensaje que va de A a C pasando por B, y B que anota una
 * fila en una tabla. En el último paso, C lee el mensaje en su capa 7 y se ven sus partes
 * con tamaños y una cola. El «encabezado» del mensaje, su cola, los tamaños y la tabla de B
 * son inventados a propósito; ningún módulo del sitio debe usarlos como referencia técnica.
 *
 * Tiene una variante más corta, también ficticia, para probar el selector de escenarios
 * (pieza 2.4): B recibe el mensaje, lo anota y lo descarta en lugar de reenviarlo.
 */

import {
  crearTimeline,
  type Encabezado,
  type Paquete,
  type Step,
  type Timeline,
  type Topologia,
} from '../core/timeline';

/** Datos de entrada del escenario de demostración. */
export interface EscenarioDemo {
  readonly topologia: Topologia;
  /** Texto del mensaje que A le manda a C. */
  readonly mensaje: string;
}

/** Topología fija del escenario: A — B — C. */
export const TOPOLOGIA_DEMO: Topologia = {
  nodos: [
    { id: 'a', tipo: 'host', etiqueta: 'A', posicion: { x: 0, y: 0 } },
    { id: 'b', tipo: 'router', etiqueta: 'B', posicion: { x: 200, y: 0 } },
    { id: 'c', tipo: 'host', etiqueta: 'C', posicion: { x: 400, y: 0 } },
  ],
  enlaces: [
    { id: 'a-b', extremos: ['a', 'b'] },
    { id: 'b-c', extremos: ['b', 'c'] },
  ],
};

export const ESCENARIO_DEMO: EscenarioDemo = {
  topologia: TOPOLOGIA_DEMO,
  mensaje: 'Hola, C',
};

const ID_MENSAJE = 'mensaje';
const ID_TABLA = 'registro-b';
const COLUMNAS = ['Mensaje', 'Origen', 'Destino'];

/** Tamaños inventados del encabezado y de la cola del mensaje de juguete, en bytes. */
export const BYTES_ENCABEZADO_DEMO = 4;
export const BYTES_COLA_DEMO = 2;

/** Bytes que ocupa un texto codificado en UTF-8. */
const bytesUtf8 = (texto: string) => new TextEncoder().encode(texto).length;

/** Encabezado del mensaje de juguete (inventado), el mismo en las dos variantes. */
function encabezadosDemo(escenario: EscenarioDemo): Encabezado[] {
  return [
    {
      capa: 7,
      nombre: 'Mensaje de juguete (ficticio)',
      campos: [
        { nombre: 'Origen', valor: 'A' },
        { nombre: 'Destino', valor: 'C' },
        { nombre: 'Texto', valor: escenario.mensaje },
      ],
    },
  ];
}

const tablaVacia = { id: ID_TABLA, titulo: 'Registro de B', nodo: 'b', columnas: COLUMNAS };

/**
 * Corre el escenario ficticio de demostración y devuelve su línea de tiempo de seis pasos.
 * Es determinístico: el mismo escenario siempre da la misma timeline.
 */
export function simularDemo(escenario: EscenarioDemo = ESCENARIO_DEMO): Timeline {
  const encabezados = encabezadosDemo(escenario);
  // Último paso: el mismo mensaje, medido parte por parte y con una cola.
  const medido: Paquete = {
    id: ID_MENSAJE,
    ubicacion: { tipo: 'nodo', nodo: 'c', capa: 7 },
    pdu: 'Mensaje de juguete',
    encabezados: [
      ...encabezados.map((e) => ({ ...e, bytes: BYTES_ENCABEZADO_DEMO })),
      {
        capa: 7,
        nombre: 'Cierre de juguete (ficticio)',
        campos: [],
        bytes: BYTES_COLA_DEMO,
        parte: 'cola',
      },
    ],
    datos: { descripcion: escenario.mensaje, bytes: bytesUtf8(escenario.mensaje) },
  };
  const fila = [escenario.mensaje, 'A', 'C'];

  const pasos: Step[] = [
    {
      indice: 0,
      explicacion:
        'A prepara un mensaje para C. Este escenario es ficticio: no representa ningún protocolo real.',
      paquetes: [{ id: ID_MENSAJE, ubicacion: { tipo: 'nodo', nodo: 'a' }, encabezados }],
      tablas: [{ ...tablaVacia, filas: [] }],
      resaltados: { nodos: ['a'], enlaces: [] },
    },
    {
      indice: 1,
      explicacion: 'El mensaje viaja por el enlace de A hacia B.',
      paquetes: [
        {
          id: ID_MENSAJE,
          ubicacion: { tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' },
          encabezados,
        },
      ],
      tablas: [{ ...tablaVacia, filas: [] }],
      resaltados: { nodos: [], enlaces: ['a-b'] },
    },
    {
      indice: 2,
      explicacion: 'B recibe el mensaje y anota en su registro quién lo mandó y para quién es.',
      paquetes: [{ id: ID_MENSAJE, ubicacion: { tipo: 'nodo', nodo: 'b' }, encabezados }],
      tablas: [{ ...tablaVacia, filas: [{ celdas: fila, marca: 'nueva' }] }],
      resaltados: { nodos: ['b'], enlaces: [] },
    },
    {
      indice: 3,
      explicacion: 'B reenvía el mensaje por el enlace hacia C.',
      paquetes: [
        {
          id: ID_MENSAJE,
          ubicacion: { tipo: 'enlace', enlace: 'b-c', desde: 'b', hacia: 'c' },
          encabezados,
        },
      ],
      tablas: [{ ...tablaVacia, filas: [{ celdas: fila }] }],
      resaltados: { nodos: [], enlaces: ['b-c'] },
    },
    {
      indice: 4,
      explicacion: 'C recibe el mensaje.',
      paquetes: [{ id: ID_MENSAJE, ubicacion: { tipo: 'nodo', nodo: 'c' }, encabezados }],
      tablas: [{ ...tablaVacia, filas: [{ celdas: fila }] }],
      resaltados: { nodos: ['c'], enlaces: [] },
    },
    {
      indice: 5,
      explicacion:
        'C lee el mensaje en su capa 7: un encabezado, el texto y una cola que lo cierra, cada parte con su tamaño en bytes. Los tamaños también son ficticios. Fin del escenario de demostración.',
      paquetes: [medido],
      tablas: [{ ...tablaVacia, filas: [{ celdas: fila }] }],
      resaltados: { nodos: ['c'], enlaces: [] },
    },
  ];

  return crearTimeline(escenario.topologia, pasos);
}

/**
 * Variante ficticia y más corta del escenario de demostración, de cuatro pasos: el mensaje
 * llega a B, B lo anota y lo descarta, así que nunca llega a C. Existe para probar el
 * selector de escenarios con dos líneas de tiempo de distinta longitud. Es determinística.
 */
export function simularDescarteDemo(escenario: EscenarioDemo = ESCENARIO_DEMO): Timeline {
  const encabezados = encabezadosDemo(escenario);
  const fila = [escenario.mensaje, 'A', 'C'];

  const pasos: Step[] = [
    {
      indice: 0,
      explicacion:
        'A prepara un mensaje para C. Esta variante también es ficticia: no representa ningún protocolo real.',
      paquetes: [{ id: ID_MENSAJE, ubicacion: { tipo: 'nodo', nodo: 'a' }, encabezados }],
      tablas: [{ ...tablaVacia, filas: [] }],
      resaltados: { nodos: ['a'], enlaces: [] },
    },
    {
      indice: 1,
      explicacion: 'El mensaje viaja por el enlace de A hacia B.',
      paquetes: [
        {
          id: ID_MENSAJE,
          ubicacion: { tipo: 'enlace', enlace: 'a-b', desde: 'a', hacia: 'b' },
          encabezados,
        },
      ],
      tablas: [{ ...tablaVacia, filas: [] }],
      resaltados: { nodos: [], enlaces: ['a-b'] },
    },
    {
      indice: 2,
      explicacion: 'B recibe el mensaje y anota en su registro quién lo mandó y para quién es.',
      paquetes: [{ id: ID_MENSAJE, ubicacion: { tipo: 'nodo', nodo: 'b' }, encabezados }],
      tablas: [{ ...tablaVacia, filas: [{ celdas: fila, marca: 'nueva' }] }],
      resaltados: { nodos: ['b'], enlaces: [] },
    },
    {
      indice: 3,
      explicacion:
        'B descarta el mensaje en lugar de reenviarlo: C nunca lo recibe. Fin de la variante ficticia.',
      paquetes: [],
      tablas: [{ ...tablaVacia, filas: [{ celdas: fila }] }],
      resaltados: { nodos: ['b'], enlaces: [] },
    },
  ];

  return crearTimeline(escenario.topologia, pasos);
}
