# Registro de cambios

Todos los cambios importantes del sitio se anotan acá. El formato sigue
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[Versionado Semántico](https://semver.org/lang/es/). Cada versión cierra una etapa de
[docs/LINEAMIENTOS.md](docs/LINEAMIENTOS.md#8-etapas-de-implementación).

## [0.1.0] - 2026-11-07

Etapa 1: sistema base y componentes compartidos. El sitio todavía no tiene módulos visibles;
el primero llega en la Etapa 2. Plan completo en [docs/etapas/etapa-1.md](docs/etapas/etapa-1.md).

### Agregado

- **Tokens de diseño** (`src/styles/tokens.css`): un color por capa OSI, colores semánticos,
  tipografía del sistema, espaciado, radios y duraciones, en tema claro y oscuro según la
  preferencia del sistema. Las duraciones valen 0 con movimiento reducido. Un test verifica
  el contraste de cada par texto/fondo.
- **Motor de simulación** (`src/engine/core/`): tipos `Timeline` y `Step` serializables a
  JSON, catálogo de capas OSI, utilidades de bytes y campos de bits, checksum de Internet
  (RFC 1071, probado con el ejemplo de §3 y con un encabezado IPv4) y `HeaderSpec` para
  describir encabezados.
- **Content Collection de módulos** con esquema validado: capas, bloque, orden,
  prerrequisitos, fuentes obligatorias y preguntas del quiz en el frontmatter. Un
  frontmatter inválido rompe el build con un mensaje claro.
- **Layout del sitio**: encabezado con navegación por bloque y por capa (`/capas/`), menú de
  celular sin JavaScript, enlace para saltar al contenido, inicio con el índice de módulos,
  página de módulo que sigue la plantilla y página 404.
- **Simulación**: `StepControls` (botones y atajos ← → y espacio con el foco en la
  simulación), `StateTable`, `Topology` en SVG y `Packet` como pila de encabezados, con
  movimiento por Web Animations API que respeta el movimiento reducido.
- **`HeaderFormat`**: encabezado campo por campo, con rejilla de bits en escritorio, lista en
  celular y valores en decimal, hexadecimal o binario.
- **`Quiz`, `Callout` y `WhatIf`**. El quiz se completa con teclado y guarda el mejor puntaje
  en el navegador; `Callout` y `WhatIf` no cargan JavaScript propio.
- **Indicador de progreso TTL** en el encabezado y marcas de completado en el inicio, con
  opción para reiniciar el progreso.
- **Página interna `/demo/`** (sin enlaces y con `noindex`) con una sección por componente.
- **Módulo de ejemplo oculto** (`/modulos/ejemplo/`) que arma la plantilla completa con los
  componentes compartidos.
- **Tests**: Vitest para el motor y la lógica de los componentes; Playwright en tema claro,
  tema oscuro y celular de 360 px, con revisión de accesibilidad (axe, WCAG 2.2 AA) y un
  recorrido de `/demo/` hecho solo con teclado.

[0.1.0]: https://github.com/frannmv/time-to-learn/releases/tag/v0.1.0
