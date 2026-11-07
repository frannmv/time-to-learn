/**
 * Validaciones de la colección de módulos que el esquema no puede hacer solo, porque miran
 * varios módulos a la vez. Es código puro (sin `astro:content`) para poder testearlo.
 */

/** Lo mínimo de una entrada de la colección que necesitan las validaciones. */
export interface EntradaModulo {
  id: string;
  data: {
    orden: number;
    oculto: boolean;
    prerrequisitos: readonly { id: string }[];
  };
}

/** Error de la colección de módulos. Su mensaje lista todos los problemas encontrados. */
export class ErrorColeccionModulos extends Error {
  readonly problemas: readonly string[];

  constructor(problemas: readonly string[]) {
    super(
      `La colección de módulos tiene ${problemas.length === 1 ? 'un problema' : `${problemas.length} problemas`}:\n` +
        problemas.map((p) => `  - ${p}`).join('\n'),
    );
    this.name = 'ErrorColeccionModulos';
    this.problemas = problemas;
  }
}

/**
 * Verifica que:
 * - `orden` no se repita entre módulos (ocultos incluidos);
 * - cada prerrequisito exista;
 * - ningún módulo sea prerrequisito de sí mismo;
 * - los prerrequisitos no formen ciclos.
 *
 * @throws {ErrorColeccionModulos} con todos los problemas encontrados.
 */
export function validarModulos(entradas: readonly EntradaModulo[]): void {
  const problemas: string[] = [];
  const ids = new Set(entradas.map((e) => e.id));

  const porOrden = new Map<number, string[]>();
  for (const { id, data } of entradas) {
    porOrden.set(data.orden, [...(porOrden.get(data.orden) ?? []), id]);
  }
  for (const [orden, conEseOrden] of porOrden) {
    if (conEseOrden.length > 1) {
      problemas.push(`«orden: ${orden}» se repite en: ${conEseOrden.sort().join(', ')}.`);
    }
  }

  for (const { id, data } of entradas) {
    for (const { id: prerrequisito } of data.prerrequisitos) {
      if (prerrequisito === id) {
        problemas.push(`«${id}» figura como prerrequisito de sí mismo.`);
      } else if (!ids.has(prerrequisito)) {
        problemas.push(`«${id}» tiene como prerrequisito a «${prerrequisito}», que no existe.`);
      }
    }
  }

  for (const ciclo of buscarCiclos(entradas, ids)) {
    problemas.push(`Los prerrequisitos forman un ciclo: ${ciclo.join(' → ')}.`);
  }

  if (problemas.length > 0) throw new ErrorColeccionModulos(problemas);
}

/**
 * Busca ciclos de dos o más módulos en el grafo de prerrequisitos (las autorreferencias y los
 * prerrequisitos inexistentes se reportan aparte). Cada ciclo se devuelve una sola vez, como
 * la lista de ids que lo recorre y vuelve al primero.
 */
function buscarCiclos(entradas: readonly EntradaModulo[], ids: ReadonlySet<string>): string[][] {
  const vecinos = new Map<string, string[]>();
  for (const { id, data } of [...entradas].sort((a, b) => a.id.localeCompare(b.id))) {
    vecinos.set(
      id,
      data.prerrequisitos.map((p) => p.id).filter((p) => p !== id && ids.has(p)),
    );
  }

  const ciclos: string[][] = [];
  const estado = new Map<string, 'visitando' | 'listo'>();
  const camino: string[] = [];

  const visitar = (id: string): void => {
    estado.set(id, 'visitando');
    camino.push(id);
    for (const vecino of vecinos.get(id) ?? []) {
      const estadoVecino = estado.get(vecino);
      if (estadoVecino === 'visitando') {
        ciclos.push([...camino.slice(camino.indexOf(vecino)), vecino]);
      } else if (estadoVecino === undefined) {
        visitar(vecino);
      }
    }
    camino.pop();
    estado.set(id, 'listo');
  };

  for (const id of vecinos.keys()) {
    if (!estado.has(id)) visitar(id);
  }
  return ciclos;
}

/**
 * Valida la colección y devuelve los módulos visibles (no ocultos) ordenados por `orden`.
 *
 * @throws {ErrorColeccionModulos} si la colección no es válida.
 */
export function modulosVisibles<T extends EntradaModulo>(entradas: readonly T[]): T[] {
  validarModulos(entradas);
  return entradas.filter((e) => !e.data.oculto).sort((a, b) => a.data.orden - b.data.orden);
}
