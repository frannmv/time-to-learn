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
  /**
   * Capas que implementa el equipo, de abajo hacia arriba y sin repetir (un host, de la 1
   * a la 7; un router, de la 1 a la 3). Es lo que dibuja la vista de pila. Sin este campo,
   * el escenario no dice nada sobre la pila del equipo.
   */
  readonly capas?: readonly Capa[];
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

/**
 * Dónde va lo que una capa agrega: antes de los datos (`'encabezado'`) o después
 * (`'cola'`), como el FCS de Ethernet.
 */
export type ParteEncabezado = 'encabezado' | 'cola';

export const PARTES_ENCABEZADO: readonly ParteEncabezado[] = Object.freeze(['encabezado', 'cola']);

/** Lo que una capa le agrega a un paquete: un encabezado o una cola. */
export interface Encabezado {
  readonly capa: Capa;
  readonly nombre: string;
  readonly campos: readonly Campo[];
  /** Tamaño en bytes, entero positivo. Sin este campo, el tamaño no se conoce. */
  readonly bytes?: number;
  /** `'encabezado'` si no se indica. */
  readonly parte?: ParteEncabezado;
}

/** Carga de la capa más alta del paquete. */
export interface Datos {
  /** Qué son los datos, en texto (por ejemplo, el mensaje de la aplicación). */
  readonly descripcion: string;
  /** Tamaño en bytes, entero positivo. Sin este campo, el tamaño no se conoce. */
  readonly bytes?: number;
}

/** Dónde está un paquete: en un nodo, o sobre un enlace yendo de un extremo al otro. */
export type Ubicacion =
  | {
      readonly tipo: 'nodo';
      readonly nodo: string;
      /** En qué capa de la pila del nodo está la PDU, si el paso lo dice. */
      readonly capa?: Capa;
    }
  | {
      readonly tipo: 'enlace';
      readonly enlace: string;
      readonly desde: string;
      readonly hacia: string;
    };

/**
 * Un paquete en un paso.
 *
 * Los encabezados van de afuera hacia adentro: primero el de la capa más baja. Una cola
 * se anota al lado del encabezado de su capa, por ejemplo `[Ethernet, FCS, IPv4, TCP]`.
 * En qué orden viaja cada parte por el cable lo calcula `partesEnElCable` (pdu.ts).
 */
export interface Paquete {
  readonly id: string;
  readonly ubicacion: Ubicacion;
  readonly encabezados: readonly Encabezado[];
  /** Nombre de la PDU en este punto («Segmento TCP», «Trama Ethernet», «T-PDU»). */
  readonly pdu?: string;
  /** Carga de la capa más alta. */
  readonly datos?: Datos;
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

/** Un tamaño en bytes válido: un entero positivo. */
function esTamano(valor: unknown): boolean {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0;
}

function validarCapasNodo(capas: readonly Capa[], ruta: string, errores: string[]): void {
  if (capas.length === 0) errores.push(`${ruta}: la lista de capas está vacía`);
  for (const capa of capas) {
    if (!esCapa(capa)) errores.push(`${ruta}: la capa ${String(capa)} no existe`);
  }
  for (const capa of duplicados(capas.map(String))) {
    errores.push(`${ruta}: la capa ${capa} está repetida`);
  }
  const validas = capas.filter(esCapa);
  if (validas.some((capa, i) => i > 0 && capa < (validas[i - 1] ?? capa))) {
    errores.push(`${ruta}: las capas tienen que ir de abajo hacia arriba`);
  }
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
    if (nodo.capas !== undefined) validarCapasNodo(nodo.capas, ruta, errores);
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

function validarPartes(paquete: Paquete, rutaPaquete: string, errores: string[]): void {
  const capasConEncabezado = new Set(
    paquete.encabezados
      .filter((e) => (e.parte ?? 'encabezado') === 'encabezado')
      .map((e) => e.capa),
  );
  paquete.encabezados.forEach((encabezado, k) => {
    const ruta = `${rutaPaquete}.encabezados[${k}]`;
    if (!esCapa(encabezado.capa)) {
      errores.push(`${ruta}: la capa ${String(encabezado.capa)} no existe`);
    }
    if (encabezado.bytes !== undefined && !esTamano(encabezado.bytes)) {
      errores.push(
        `${ruta}: el tamaño es ${String(encabezado.bytes)} y tiene que ser un entero positivo`,
      );
    }
    if (encabezado.parte !== undefined && !PARTES_ENCABEZADO.includes(encabezado.parte)) {
      errores.push(`${ruta}: la parte «${String(encabezado.parte)}» no existe`);
    }
    if (
      encabezado.parte === 'cola' &&
      esCapa(encabezado.capa) &&
      !capasConEncabezado.has(encabezado.capa)
    ) {
      errores.push(
        `${ruta}: es una cola de la capa ${encabezado.capa} y el paquete no tiene un encabezado de esa capa`,
      );
    }
  });

  if (paquete.pdu?.trim() === '') {
    errores.push(`${rutaPaquete}: el nombre de la PDU está vacío`);
  }
  const { datos } = paquete;
  if (datos !== undefined) {
    if (datos.descripcion.trim() === '') {
      errores.push(`${rutaPaquete}.datos: la descripción está vacía`);
    }
    if (datos.bytes !== undefined && !esTamano(datos.bytes)) {
      errores.push(
        `${rutaPaquete}.datos: el tamaño es ${String(datos.bytes)} y tiene que ser un entero positivo`,
      );
    }
  }
}

function validarPaso(
  paso: Step,
  i: number,
  nodos: ReadonlyMap<string, Nodo>,
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
      const nodo = nodos.get(ubicacion.nodo);
      if (nodo === undefined) {
        errores.push(`${rutaPaquete}: el nodo «${ubicacion.nodo}» no existe`);
      }
      const { capa } = ubicacion;
      if (capa !== undefined) {
        if (!esCapa(capa)) {
          errores.push(`${rutaPaquete}: la capa ${String(capa)} de la ubicación no existe`);
        } else if (nodo?.capas !== undefined && !nodo.capas.includes(capa)) {
          errores.push(`${rutaPaquete}: el nodo «${nodo.id}» no implementa la capa ${capa}`);
        }
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
    validarPartes(paquete, rutaPaquete, errores);
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
 * También revisa las PDU: que la capa de una ubicación exista y esté en la pila del nodo
 * (si el nodo la declara), que los tamaños sean enteros positivos y que toda cola tenga en
 * el mismo paquete un encabezado de su capa.
 */
export function validarTimeline(timeline: Timeline): string[] {
  const errores: string[] = [];
  validarTopologia(timeline.topologia, errores);

  if (timeline.pasos.length === 0) {
    errores.push('pasos: la línea de tiempo necesita al menos un paso');
  }

  const nodos = new Map(timeline.topologia.nodos.map((n) => [n.id, n]));
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
