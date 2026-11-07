/**
 * Tipos base de las simulaciones: el escenario (topología) y la línea de tiempo que el
 * motor devuelve.
 *
 * Todo es serializable a JSON (sin clases, `Map`, `Date`, funciones ni `Uint8Array`),
 * porque las líneas de tiempo se calculan en el build y llegan como props a la isla de
 * React. Los valores de los campos de un encabezado se guardan ya formateados como texto.
 */

import { esCapa, type Capa } from './capas';

// ---------------------------------------------------------------------------------------
// Escenario
// ---------------------------------------------------------------------------------------

/** Tipos de dispositivo que se pueden dibujar. `ap` es un punto de acceso inalámbrico. */
export type TipoNodo = 'host' | 'switch' | 'router' | 'hub' | 'ap';

export const TIPOS_NODO: readonly TipoNodo[] = Object.freeze([
  'host',
  'switch',
  'router',
  'hub',
  'ap',
]);

/** Posición en el diagrama. Es un dato de dibujo, sin unidad física. */
export interface Posicion {
  readonly x: number;
  readonly y: number;
}

export interface Nodo {
  readonly id: string;
  readonly tipo: TipoNodo;
  readonly etiqueta: string;
  readonly posicion: Posicion;
}

/** Enlace entre dos nodos. El orden de los extremos no importa. */
export interface Enlace {
  readonly id: string;
  readonly extremos: readonly [string, string];
}

export interface Topologia {
  readonly nodos: readonly Nodo[];
  readonly enlaces: readonly Enlace[];
}

// ---------------------------------------------------------------------------------------
// Paso
// ---------------------------------------------------------------------------------------

/** Un campo de un encabezado, con su valor ya formateado (por ejemplo, «0x0800»). */
export interface Campo {
  readonly nombre: string;
  readonly valor: string;
}

/** Encabezado de una capa dentro de un paquete. */
export interface Encabezado {
  readonly capa: Capa;
  readonly nombre: string;
  readonly campos: readonly Campo[];
}

/** Dónde está un paquete: en un nodo, o sobre un enlace yendo de un extremo al otro. */
export type Ubicacion =
  | { readonly tipo: 'nodo'; readonly nodo: string }
  | {
      readonly tipo: 'enlace';
      readonly enlace: string;
      readonly desde: string;
      readonly hacia: string;
    };

/**
 * Un paquete en un paso. Los encabezados van de afuera hacia adentro, en el orden en que
 * viajan por el cable: primero el de la capa más baja.
 */
export interface Paquete {
  readonly id: string;
  readonly ubicacion: Ubicacion;
  readonly encabezados: readonly Encabezado[];
}

/** Marca de una fila respecto del paso anterior. Sin marca, la fila no cambió. */
export type MarcaFila = 'nueva' | 'cambio';

export interface FilaTabla {
  readonly celdas: readonly string[];
  readonly marca?: MarcaFila;
}

/** Instantánea de una tabla de estado (tabla MAC, tabla ARP, tabla de ruteo…). */
export interface TablaEstado {
  readonly id: string;
  readonly titulo: string;
  /** Nodo dueño de la tabla, si tiene uno. */
  readonly nodo?: string;
  readonly columnas: readonly string[];
  readonly filas: readonly FilaTabla[];
}

export interface Resaltados {
  readonly nodos: readonly string[];
  readonly enlaces: readonly string[];
}

/** Un paso de la simulación. */
export interface Step {
  /** Posición en la línea de tiempo, desde 0. */
  readonly indice: number;
  /** Explicación de una o dos frases de lo que pasa en este paso. */
  readonly explicacion: string;
  readonly paquetes: readonly Paquete[];
  readonly tablas: readonly TablaEstado[];
  readonly resaltados: Resaltados;
}

/**
 * Resultado del motor: la topología del escenario y la lista ordenada de pasos. La
 * topología viaja junto a los pasos porque los pasos se refieren a sus nodos y enlaces.
 */
export interface Timeline {
  readonly topologia: Topologia;
  readonly pasos: readonly Step[];
}

// ---------------------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------------------

/** Error que lanza `crearTimeline` con la lista completa de problemas encontrados. */
export class TimelineInvalidaError extends Error {
  readonly errores: readonly string[];

  constructor(errores: readonly string[]) {
    super(`Timeline inválida:\n- ${errores.join('\n- ')}`);
    this.name = 'TimelineInvalidaError';
    this.errores = errores;
  }
}

function duplicados(ids: readonly string[]): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const id of ids) {
    if (vistos.has(id)) repetidos.add(id);
    vistos.add(id);
  }
  return [...repetidos];
}

function validarTopologia(topologia: Topologia, errores: string[]): void {
  for (const id of duplicados(topologia.nodos.map((n) => n.id))) {
    errores.push(`topologia.nodos: el id «${id}» está repetido`);
  }
  for (const id of duplicados(topologia.enlaces.map((e) => e.id))) {
    errores.push(`topologia.enlaces: el id «${id}» está repetido`);
  }

  topologia.nodos.forEach((nodo, i) => {
    const ruta = `topologia.nodos[${i}]`;
    if (nodo.id.trim() === '') errores.push(`${ruta}: el id está vacío`);
    if (!TIPOS_NODO.includes(nodo.tipo)) {
      errores.push(`${ruta}: el tipo «${String(nodo.tipo)}» no existe`);
    }
    if (!Number.isFinite(nodo.posicion.x) || !Number.isFinite(nodo.posicion.y)) {
      errores.push(`${ruta}: la posición tiene que ser un par de números finitos`);
    }
  });

  const nodos = new Set(topologia.nodos.map((n) => n.id));
  topologia.enlaces.forEach((enlace, i) => {
    const ruta = `topologia.enlaces[${i}]`;
    if (enlace.id.trim() === '') errores.push(`${ruta}: el id está vacío`);
    for (const extremo of enlace.extremos) {
      if (!nodos.has(extremo)) errores.push(`${ruta}: el nodo «${extremo}» no existe`);
    }
    if (enlace.extremos[0] === enlace.extremos[1]) {
      errores.push(`${ruta}: los dos extremos son el mismo nodo`);
    }
  });
}

function validarPaso(
  paso: Step,
  i: number,
  nodos: ReadonlySet<string>,
  enlaces: ReadonlyMap<string, Enlace>,
  errores: string[],
): void {
  const ruta = `pasos[${i}]`;

  if (paso.indice !== i) {
    errores.push(`${ruta}: el índice es ${paso.indice} y debería ser ${i}`);
  }
  if (paso.explicacion.trim() === '') {
    errores.push(`${ruta}: la explicación está vacía`);
  }

  for (const id of duplicados(paso.paquetes.map((p) => p.id))) {
    errores.push(`${ruta}.paquetes: el id «${id}» está repetido`);
  }
  paso.paquetes.forEach((paquete, j) => {
    const rutaPaquete = `${ruta}.paquetes[${j}]`;
    const ubicacion = paquete.ubicacion;
    if (ubicacion.tipo === 'nodo') {
      if (!nodos.has(ubicacion.nodo)) {
        errores.push(`${rutaPaquete}: el nodo «${ubicacion.nodo}» no existe`);
      }
    } else {
      const enlace = enlaces.get(ubicacion.enlace);
      if (enlace === undefined) {
        errores.push(`${rutaPaquete}: el enlace «${ubicacion.enlace}» no existe`);
      } else {
        const [a, b] = enlace.extremos;
        const sentidoValido =
          (ubicacion.desde === a && ubicacion.hacia === b) ||
          (ubicacion.desde === b && ubicacion.hacia === a);
        if (!sentidoValido) {
          errores.push(
            `${rutaPaquete}: «${ubicacion.desde}» → «${ubicacion.hacia}» no son los extremos del enlace «${enlace.id}»`,
          );
        }
      }
    }
    paquete.encabezados.forEach((encabezado, k) => {
      if (!esCapa(encabezado.capa)) {
        errores.push(
          `${rutaPaquete}.encabezados[${k}]: la capa ${String(encabezado.capa)} no existe`,
        );
      }
    });
  });

  for (const id of duplicados(paso.tablas.map((t) => t.id))) {
    errores.push(`${ruta}.tablas: el id «${id}» está repetido`);
  }
  paso.tablas.forEach((tabla, j) => {
    const rutaTabla = `${ruta}.tablas[${j}]`;
    if (tabla.nodo !== undefined && !nodos.has(tabla.nodo)) {
      errores.push(`${rutaTabla}: el nodo «${tabla.nodo}» no existe`);
    }
    tabla.filas.forEach((fila, k) => {
      if (fila.celdas.length !== tabla.columnas.length) {
        errores.push(
          `${rutaTabla}.filas[${k}]: tiene ${fila.celdas.length} celda(s) y la tabla tiene ${tabla.columnas.length} columna(s)`,
        );
      }
    });
  });

  for (const nodo of paso.resaltados.nodos) {
    if (!nodos.has(nodo)) errores.push(`${ruta}.resaltados: el nodo «${nodo}» no existe`);
  }
  for (const enlace of paso.resaltados.enlaces) {
    if (!enlaces.has(enlace)) {
      errores.push(`${ruta}.resaltados: el enlace «${enlace}» no existe`);
    }
  }
}

/**
 * Revisa una línea de tiempo y devuelve la lista de problemas, vacía si es válida.
 *
 * Comprueba que haya al menos un paso, que los índices sean consecutivos desde 0, que los
 * ids no se repitan y que toda referencia a un nodo o enlace exista en la topología.
 */
export function validarTimeline(timeline: Timeline): string[] {
  const errores: string[] = [];
  validarTopologia(timeline.topologia, errores);

  if (timeline.pasos.length === 0) {
    errores.push('pasos: la línea de tiempo necesita al menos un paso');
  }

  const nodos = new Set(timeline.topologia.nodos.map((n) => n.id));
  const enlaces = new Map(timeline.topologia.enlaces.map((e) => [e.id, e]));
  timeline.pasos.forEach((paso, i) => validarPaso(paso, i, nodos, enlaces, errores));

  return errores;
}

function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    for (const hijo of Object.values(valor)) congelar(hijo);
    Object.freeze(valor);
  }
  return valor;
}

/**
 * Arma una línea de tiempo validada e inmutable. Copia los datos recibidos, así que
 * modificarlos después no afecta a la timeline.
 *
 * @throws {TimelineInvalidaError} si `validarTimeline` encuentra algún problema.
 */
export function crearTimeline(topologia: Topologia, pasos: readonly Step[]): Timeline {
  const timeline: Timeline = { topologia, pasos };
  const errores = validarTimeline(timeline);
  if (errores.length > 0) throw new TimelineInvalidaError(errores);
  return congelar(structuredClone(timeline));
}
