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

Encabezado (`ModuleHeader`) → Idea central (texto MDX) → Simulación (`Simulation`, que dibuja
`Topology` + `StepControls` + `StateTable`) → Formato (`HeaderFormat`) → Qué pasa si
(`WhatIf`) → Resumen (`Callout variante="resumen"`) → Quiz (`Quiz`) → Fuentes (`SourceList`).

- El MDX escribe desde Idea central hasta Resumen. La página de módulo dibuja el encabezado,
  el quiz y las fuentes a partir del frontmatter (las preguntas del quiz van ahí, de 3 a 5).
- La línea de tiempo se calcula en el build (`timeline={simular…()}`) y llega como props a
  la isla, así que todo `Step` es serializable a JSON. Las islas del contenido usan
  `client:visible`.
- `src/content/modules/ejemplo.mdx` (oculto) muestra la plantilla completa armada.

## Precisión técnica

- No inventar valores. Todo dato técnico se respalda con un estándar o RFC citado en el
  frontmatter. Terminología, notación y ejemplos resueltos siguen a Stallings.
- Si un apunte y un estándar difieren, se sigue al estándar y se aclara en el módulo.
- Las simplificaciones se declaran. Los valores de ejemplo son válidos (checksums reales).
  - En un módulo, con `<Callout variante="simplificacion">` cerca de lo simplificado.
  - En el motor, en el comentario inicial del archivo, bajo «Simplificaciones declaradas»,
    junto a las fuentes.
- Los escenarios y datos inventados para probar se marcan como ficticios en el código y en
  el texto («[Ejemplo]»); ningún módulo los usa como referencia técnica.

## Componentes y pruebas

- Estilos solo con tokens de `src/styles/tokens.css` (CSS Modules en las islas). La capa
  nunca se comunica solo con color: siempre va con su número o su nombre.
- Atajos de teclado solo con el foco dentro del componente, nunca globales.
- Cada componente nuevo suma su sección en `/demo/` (página interna con `noindex`) y sus e2e.
- Playwright corre cada e2e en tres proyectos: claro, oscuro y celular de 360 px. Los e2e
  revisan accesibilidad con `revisarAccesibilidad` (axe, WCAG 2.2 AA) y el desborde con
  `sinScrollHorizontal` (`tests/e2e/ayudas.ts`).
- `tests/e2e/demo.spec.ts` recorre todo `/demo/` con teclado: si un componente nuevo tiene
  partes interactivas, se suma a ese recorrido.

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
- Cada etapa cierra con una versión `0.N.0`: entrada en `CHANGELOG.md`, versión en
  `package.json`, tag `vX.Y.Z` y release en GitHub después del merge.

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
