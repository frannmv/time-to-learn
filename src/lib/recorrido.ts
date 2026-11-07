/**
 * Recorrido TTL: cada módulo completado es un salto más (LINEAMIENTOS, nombre del sitio). Acá
 * se cuenta y se pone en palabras; lo dibuja `src/components/learn/TtlProgress.tsx`.
 *
 * La cuenta va hacia arriba («3 de 12 saltos»), no como un TTL que baja: un TTL que llega a 0
 * significa que el paquete se descarta, mala metáfora para terminar (pregunta abierta 2 del plan
 * de la Etapa 1).
 *
 * Solo cuentan los módulos de la lista que se recibe, que es la de módulos visibles: un módulo
 * oculto o uno que ya no existe puede estar en el progreso guardado, pero no suma saltos.
 */
import type { Capa } from '../engine/core/capas';
import type { Progreso } from './progreso';

/** Lo que el indicador necesita de cada módulo. */
export interface ModuloRecorrido {
  readonly id: string;
  readonly titulo: string;
  /** Capa principal: da el color de su punto en la ruta. */
  readonly capa: Capa;
}

export interface PasoRecorrido {
  readonly modulo: ModuloRecorrido;
  readonly completado: boolean;
}

export interface Recorrido {
  /** Un paso por módulo, en el orden recibido. */
  readonly pasos: readonly PasoRecorrido[];
  /** Saltos hechos: módulos de la lista que están completados. */
  readonly hechos: number;
  /** Total de módulos de la lista. */
  readonly total: number;
}

/** Lo mínimo de una entrada de la colección de módulos para armar el recorrido. */
interface EntradaModulo {
  readonly id: string;
  readonly data: { readonly titulo: string; readonly capas: readonly Capa[] };
}

/**
 * Datos mínimos de cada módulo para pasarle al indicador (lo que viaja a la isla).
 *
 * @throws {RangeError} si un módulo no tiene capas (el esquema de la colección ya lo impide).
 */
export function modulosDelRecorrido(entradas: readonly EntradaModulo[]): ModuloRecorrido[] {
  return entradas.map(({ id, data }) => {
    const [capa] = data.capas;
    if (capa === undefined) throw new RangeError(`El módulo «${id}» no tiene capa principal.`);
    return { id, titulo: data.titulo, capa };
  });
}

/** Cruza la lista de módulos con el progreso guardado. */
export function resumirRecorrido(
  modulos: readonly ModuloRecorrido[],
  progreso: Progreso,
): Recorrido {
  const pasos = modulos.map((modulo) => ({
    modulo,
    completado: Object.hasOwn(progreso.modulos, modulo.id),
  }));
  return {
    pasos,
    hechos: pasos.filter((p) => p.completado).length,
    total: modulos.length,
  };
}

/** «3 de 12 saltos», «0 de 1 salto». Sin módulos devuelve `null`: no hay recorrido. */
export function textoSaltos({ hechos, total }: Recorrido): string | null {
  if (total === 0) return null;
  return `${hechos} de ${total} ${total === 1 ? 'salto' : 'saltos'}`;
}

const lista = new Intl.ListFormat('es', { type: 'conjunction' });

/** Qué módulos están completados, para lectores de pantalla (el color no lo dice). */
export function textoCompletados({ pasos }: Recorrido): string {
  const titulos = pasos.filter((p) => p.completado).map((p) => p.modulo.titulo);
  if (titulos.length === 0) return 'Todavía no completaste ningún módulo.';
  return `${titulos.length === 1 ? 'Completado' : 'Completados'}: ${lista.format(titulos)}.`;
}
