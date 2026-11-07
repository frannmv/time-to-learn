// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // Publicado en GitHub Pages como sitio de proyecto: https://frannmv.github.io/time-to-learn/
  site: 'https://frannmv.github.io',
  base: '/time-to-learn/',
  trailingSlash: 'ignore',
  integrations: [mdx(), react()],
});
