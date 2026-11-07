/**
 * Acceso a la colección de módulos desde las páginas. Toda página que liste módulos pasa por
 * acá, así una colección inválida rompe el build con un mensaje claro.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { modulosVisibles, validarModulos } from './validar-modulos';

export type Modulo = CollectionEntry<'modules'>;

/** Módulos visibles (no ocultos), validados y ordenados por `orden`. */
export async function obtenerModulos(): Promise<Modulo[]> {
  return modulosVisibles(await getCollection('modules'));
}

/** Todos los módulos, ocultos incluidos, validados y ordenados por `orden`. */
export async function obtenerTodosLosModulos(): Promise<Modulo[]> {
  const todos = await getCollection('modules');
  validarModulos(todos);
  return todos.sort((a, b) => a.data.orden - b.data.orden);
}
