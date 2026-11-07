/**
 * ESCENARIO FICTICIO de demostración. No representa ningún protocolo real.
 *
 * Sirve para probar los componentes de simulación en la página interna `/demo/`: tres
 * nodos en línea (A, B y C), un mensaje que va de A a C pasando por B, y B que anota una
 * fila en una tabla. El «encabezado» del mensaje y la tabla de B son inventados a
 * propósito; ningún módulo del sitio debe usarlos como referencia técnica.
 */

import {
  crearTimeline,
  type Encabezado,
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

/**
 * Corre el escenario ficticio y devuelve su línea de tiempo de cinco pasos. Es
 * determinístico: el mismo escenario siempre da la misma timeline.
 */
export function simularDemo(escenario: EscenarioDemo = ESCENARIO_DEMO): Timeline {
  const encabezados: Encabezado[] = [
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
  const fila = [escenario.mensaje, 'A', 'C'];
  const tablaVacia = { id: ID_TABLA, titulo: 'Registro de B', nodo: 'b', columnas: COLUMNAS };

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
      explicacion: 'C recibe el mensaje. Fin del escenario de demostración.',
      paquetes: [{ id: ID_MENSAJE, ubicacion: { tipo: 'nodo', nodo: 'c' }, encabezados }],
      tablas: [{ ...tablaVacia, filas: [{ celdas: fila }] }],
      resaltados: { nodos: ['c'], enlaces: [] },
    },
  ];

  return crearTimeline(escenario.topologia, pasos);
}
