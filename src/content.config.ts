import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { crearEsquemaModulo } from './content/schema';

const modules = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/modules' }),
  schema: crearEsquemaModulo(reference('modules')),
});

export const collections = { modules };
