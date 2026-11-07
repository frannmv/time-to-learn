# TimeToLearn · TTL

Sitio web interactivo para entender cómo funcionan los protocolos de red. Cada protocolo se
explica con una simulación que se controla paso a paso, el formato real de sus encabezados y
un quiz de repaso.

El nombre juega con el campo TTL (Time To Live) de IPv4: cada módulo completado es un salto
más en el recorrido.

> **Estado:** Etapa 0 (fundaciones del repositorio). El primer módulo llega en la Etapa 2.
> Hoja de ruta completa en [docs/LINEAMIENTOS.md](docs/LINEAMIENTOS.md#8-etapas-de-implementación).

## Para quién

Estudiantes de Redes de Computadoras: para estudiar antes de un parcial y para explicarle un
tema a otra persona.

## Stack

[Astro](https://astro.build) · React · TypeScript estricto · MDX · CSS nativo con tokens ·
Vitest · Playwright · ESLint · Prettier · pnpm · GitHub Actions · GitHub Pages.

## Desarrollo local

Requisitos: Node.js 26 (ver `.nvmrc`) y pnpm 10.

```bash
pnpm install
pnpm dev
```

El sitio queda en <http://localhost:4321/time-to-learn/>.

| Comando         | Qué hace                               |
| --------------- | -------------------------------------- |
| `pnpm dev`      | Servidor de desarrollo                 |
| `pnpm build`    | Build estático en `dist/`              |
| `pnpm preview`  | Sirve el build localmente              |
| `pnpm test`     | Tests del motor de simulación (Vitest) |
| `pnpm test:e2e` | Tests de punta a punta (Playwright)    |
| `pnpm lint`     | ESLint y chequeo de formato            |
| `pnpm check`    | Chequeo de tipos                       |
| `pnpm format`   | Formatea el código con Prettier        |

Para los tests de punta a punta hace falta instalar el navegador una vez
(`pnpm exec playwright install chromium`) y correr `pnpm build` antes.

## Arquitectura en una línea

El motor de simulación (`src/engine/`) es TypeScript puro que genera una línea de tiempo de
pasos; los componentes React (`src/components/`) solo la dibujan. Detalle en
[docs/LINEAMIENTOS.md](docs/LINEAMIENTOS.md#4-arquitectura).

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

- Código: [MIT](LICENSE).
- Contenido educativo (textos, diagramas, quizzes): [CC BY-SA 4.0](LICENSE-CONTENT.md).
