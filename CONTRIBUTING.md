# Cómo contribuir

¡Gracias por querer sumar! Este proyecto sigue los [lineamientos](docs/LINEAMIENTOS.md); acá
va lo esencial.

## Flujo de trabajo (GitHub Flow)

1. Abrí o elegí una issue. Una issue por tarea concreta.
2. Creá una rama desde `main`: `feat/…`, `fix/…`, `docs/…`, `test/…`, `refactor/…` o `chore/…`.
   Ejemplo: `feat/switch-mac-table`.
3. Hacé commits con [Conventional Commits](https://www.conventionalcommits.org/es/):
   `feat`, `fix`, `docs`, `test`, `refactor`, `chore` (para CI: `chore(ci)`).
   Ejemplo: `feat(switching): agregar aging de entradas MAC`.
4. Abrí un Pull Request contra `main`. La CI (lint, tipos, tests y build) tiene que pasar.
5. Revisá el diff antes de mergear. `main` está protegida: no se commitea directo.

## Antes de abrir el PR

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

## Reglas del código

- **El motor (`src/engine/`) es TypeScript puro**: no importa React, Astro ni el DOM. ESLint
  lo verifica.
- **Los componentes no contienen lógica de protocolos**: solo dibujan el paso actual.
- Todo código del motor lleva tests (`*.test.ts` junto al código).

## Reglas del contenido

- Cada módulo sigue la plantilla de la [sección 6](docs/LINEAMIENTOS.md#6-estándar-de-cada-módulo).
- No se inventan valores: todo dato técnico se respalda con un estándar o RFC citado en el
  frontmatter. La terminología sigue a Stallings.
- Las simplificaciones se declaran.
- Se escribe con palabras propias: no se copian párrafos, figuras ni tablas de libros.
- La carpeta `fuentes/` (material de la cátedra) **nunca se commitea**.

## Errores técnicos

Si un dato no coincide con el estándar o con lo visto en clase, abrí una issue con la plantilla
«Error técnico en el contenido», indicando la fuente.
