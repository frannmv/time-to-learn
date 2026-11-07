/**
 * Esquema del frontmatter de los módulos (`src/content/modules/*.mdx`).
 *
 * Vive aparte de `src/content.config.ts` para poder testearlo sin el módulo virtual
 * `astro:content`: el esquema se arma con una función que recibe cómo validar cada
 * prerrequisito. La configuración de la colección le pasa `reference('modules')`; los tests,
 * un esquema equivalente.
 *
 * Lo que el esquema no puede ver por sí solo (orden único, prerrequisitos existentes y sin
 * ciclos) lo valida `src/lib/modulos.ts`.
 */
import { z } from 'astro/zod';
import { esCapa, type Capa } from '../engine/core/capas';

/**
 * Bloques temáticos del sitio, en el orden de la tabla de etapas de los lineamientos (§8).
 * La navegación los muestra en este mismo orden.
 */
export const BLOQUES = [
  'Fundamentos',
  'LAN',
  'Red',
  'Transporte',
  'Servicios',
  'WAN',
  'Cierre',
] as const;

export type Bloque = (typeof BLOQUES)[number];

/** Tipos de fuente que puede citar un módulo. */
export const TIPOS_FUENTE = ['rfc', 'estandar', 'libro', 'apunte'] as const;

export type TipoFuente = (typeof TIPOS_FUENTE)[number];

/** Cantidad de preguntas del quiz (decisión transversal 8 del plan de la Etapa 1). */
export const PREGUNTAS_QUIZ = { min: 3, max: 5 } as const;

/** Cantidad de opciones de cada pregunta del quiz. */
export const OPCIONES_PREGUNTA = { min: 2, max: 5 } as const;

const textoNoVacio = (campo: string) =>
  z
    .string({ error: `«${campo}» tiene que ser un texto.` })
    .trim()
    .min(1, { error: `«${campo}» no puede estar vacío.` });

const capa = z.custom<Capa>(esCapa, {
  error: 'Cada capa tiene que ser un número entero de 1 (física) a 7 (aplicación).',
});

const fuente = z.strictObject({
  tipo: z.enum(TIPOS_FUENTE, {
    error: `«tipo» de la fuente tiene que ser uno de: ${TIPOS_FUENTE.join(', ')}.`,
  }),
  /** Identificador corto: «RFC 1071», «IEEE 802.3», «Stallings, 10.ª ed.». */
  id: textoNoVacio('fuentes.id'),
  titulo: textoNoVacio('fuentes.titulo'),
  /** Sección, capítulo o página concreta que respalda el contenido. */
  seccion: textoNoVacio('fuentes.seccion').optional(),
  url: z.url({ error: '«url» de la fuente tiene que ser una URL válida.' }).optional(),
});

const pregunta = z
  .strictObject({
    pregunta: textoNoVacio('quiz.pregunta'),
    opciones: z
      .array(textoNoVacio('quiz.opciones'))
      .min(OPCIONES_PREGUNTA.min, {
        error: `Cada pregunta necesita al menos ${OPCIONES_PREGUNTA.min} opciones.`,
      })
      .max(OPCIONES_PREGUNTA.max, {
        error: `Cada pregunta admite como mucho ${OPCIONES_PREGUNTA.max} opciones.`,
      })
      .refine((opciones) => new Set(opciones).size === opciones.length, {
        error: 'Las opciones de una pregunta no pueden repetirse.',
      }),
    /** Índice (desde 0) de la opción correcta dentro de `opciones`. */
    correcta: z
      .number({ error: '«correcta» tiene que ser un número.' })
      .int({ error: '«correcta» tiene que ser un entero (índice desde 0).' })
      .nonnegative({ error: '«correcta» no puede ser negativo (índice desde 0).' }),
    explicacion: textoNoVacio('quiz.explicacion'),
  })
  .check((ctx) => {
    const { opciones, correcta } = ctx.value;
    if (correcta >= opciones.length) {
      ctx.issues.push({
        code: 'custom',
        input: correcta,
        path: ['correcta'],
        message: `«correcta» vale ${correcta}, pero la pregunta tiene ${opciones.length} opciones (índices 0 a ${opciones.length - 1}).`,
      });
    }
  });

/**
 * Arma el esquema del frontmatter de un módulo.
 *
 * @param prerrequisito Esquema de cada elemento de `prerrequisitos`. En la colección es
 *   `reference('modules')`, que convierte el id en `{ id, collection }`.
 */
export function crearEsquemaModulo<P extends z.ZodType>(prerrequisito: P) {
  return z.strictObject({
    titulo: textoNoVacio('titulo'),
    /** Una frase para el índice de módulos. */
    descripcion: textoNoVacio('descripcion'),
    /** Capas que toca el módulo. La primera es la principal y define el color. */
    capas: z
      .array(capa)
      .min(1, { error: '«capas» tiene que tener al menos una capa (la principal).' }),
    bloque: z.enum(BLOQUES, {
      error: `«bloque» tiene que ser uno de: ${BLOQUES.join(', ')}.`,
    }),
    /** Posición del módulo en el recorrido del sitio. Única entre todos los módulos. */
    orden: z
      .number({ error: '«orden» tiene que ser un número.' })
      .int({ error: '«orden» tiene que ser un entero.' })
      .nonnegative({ error: '«orden» no puede ser negativo.' }),
    /** Tiempo estimado de lectura, en minutos. */
    minutos: z
      .number({ error: '«minutos» tiene que ser un número.' })
      .int({ error: '«minutos» tiene que ser un entero.' })
      .positive({ error: '«minutos» tiene que ser mayor que 0.' }),
    prerrequisitos: z.array(prerrequisito).default([]),
    fuentes: z
      .array(fuente)
      .min(1, { error: '«fuentes» es obligatoria: cada módulo cita al menos una fuente.' }),
    quiz: z
      .array(pregunta)
      .min(PREGUNTAS_QUIZ.min, {
        error: `El quiz necesita al menos ${PREGUNTAS_QUIZ.min} preguntas.`,
      })
      .max(PREGUNTAS_QUIZ.max, {
        error: `El quiz admite como mucho ${PREGUNTAS_QUIZ.max} preguntas.`,
      }),
    /** Si es `true`, se genera la página pero no aparece en el índice ni en el progreso. */
    oculto: z.boolean().default(false),
  });
}
