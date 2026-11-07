import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/',
    '.astro/',
    'node_modules/',
    'playwright-report/',
    'test-results/',
    'fuentes/',
    // Worktrees de otras sesiones de Claude Code: tienen su propio código en curso.
    '.claude/',
  ]),

  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  {
    files: ['**/*.{tsx,jsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },

  // Regla de arquitectura: el motor es TypeScript puro, sin React ni DOM.
  {
    files: ['src/engine/**/*.ts'],
    languageOptions: {
      globals: {},
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'astro', 'astro:*'],
              message: 'El motor (src/engine) no puede depender de React ni de Astro.',
            },
            {
              group: ['**/components/**', '**/pages/**', '**/layouts/**'],
              message: 'El motor (src/engine) no puede importar la capa visual.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'El motor no usa el DOM.' },
        { name: 'document', message: 'El motor no usa el DOM.' },
      ],
    },
  },

  eslintConfigPrettier,
]);
