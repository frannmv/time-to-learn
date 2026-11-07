# TimeToLearn (TTL)

Sitio estático e interactivo para aprender protocolos de red. Público: estudiantes de
Redes de Computadoras; sirve para estudiar antes de un parcial y para explicarle un tema
a otra persona. Idioma del sitio: español.

Lineamientos completos: [docs/LINEAMIENTOS.md](docs/LINEAMIENTOS.md). Ante la duda, manda
ese documento; si algo es ambiguo, preguntar antes de decidir.

## Stack

Astro (sitio estático, islas) · React (solo dentro de simulaciones) · TypeScript estricto ·
MDX + Content Collections · CSS nativo con tokens + CSS Modules · SVG + Web Animations API ·
Vitest · Playwright · ESLint + Prettier + `astro check` · pnpm · Node 26 LTS ·
GitHub Actions · GitHub Pages.

## Regla de arquitectura

- `src/engine/` es TypeScript puro: **no importa React ni usa el DOM**. Recibe un escenario y
  devuelve una línea de tiempo (lista ordenada de pasos). Es determinístico. ESLint lo verifica.
- `src/components/` dibuja el paso actual: **no contiene lógica de protocolos**.
- Todo código del motor lleva tests (`*.test.ts` junto al código).

## Plantilla de módulo (`src/content/modules/*.mdx`)

Encabezado (`ModuleHeader`) → Idea central (texto MDX) → Simulación (`Topology` +
`StepControls` + `StateTable`) → Formato (`HeaderFormat`) → Qué pasa si (`WhatIf`) →
Resumen (`Callout`) → Quiz (`Quiz`) → Fuentes (frontmatter).

## Precisión técnica

- No inventar valores. Todo dato técnico se respalda con un estándar o RFC citado en el
  frontmatter. Terminología, notación y ejemplos resueltos siguen a Stallings.
- Si un apunte y un estándar difieren, se sigue al estándar y se aclara en el módulo.
- Las simplificaciones se declaran. Los valores de ejemplo son válidos (checksums reales).

## Derechos de autor

- `fuentes/` tiene material con copyright: se puede leer, **nunca se commitea** (está en
  `.gitignore`).
- El contenido se escribe con palabras propias; no se copian párrafos, figuras ni tablas.

## Convenciones

- GitHub Flow: `main` siempre publicable, sin commits directos; una rama por tarea
  (`feat/…`, `fix/…`, `docs/…`, `chore/…`).
- Conventional Commits con los tipos `feat`, `fix`, `docs`, `test`, `refactor`, `chore`
  (CI: `chore(ci): …`).
- Primero un plan breve; implementar solo después de que se apruebe.
- Ideas fuera de la etapa en curso van a una issue con etiqueta «futuro», no al código.

## Comandos

| Comando         | Qué hace                            |
| --------------- | ----------------------------------- |
| `pnpm dev`      | Servidor de desarrollo              |
| `pnpm build`    | Build estático en `dist/`           |
| `pnpm test`     | Tests del motor (Vitest)            |
| `pnpm test:e2e` | Tests de punta a punta (Playwright) |
| `pnpm lint`     | ESLint + Prettier (chequeo)         |
| `pnpm check`    | Chequeo de tipos (`astro check`)    |
| `pnpm format`   | Formatea con Prettier               |
