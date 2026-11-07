# Etapa 1 · Sistema base y componentes compartidos

> Plan de implementación. Versión objetivo: **v0.1.0**. Milestone: «Etapa 1 · Sistema base y
> componentes compartidos». Referencia: [LINEAMIENTOS.md](../LINEAMIENTOS.md), sección 8.

**Objetivo.** Construir el esqueleto visual y el motor genérico que van a usar todos los
módulos. Al terminar, el sitio publicado no tiene todavía módulos reales, pero sí todo lo
necesario para que la Etapa 2 sea solo contenido: tokens, layout, colección de módulos,
motor base y los componentes de la plantilla, todos visibles en una página de demostración.

La etapa se divide en **10 piezas**. Cada pieza es una sesión de trabajo, una issue en el
milestone y un PR. Dentro de cada sesión se sigue la regla de siempre: primero un plan breve
de la pieza, implementación solo después de aprobarlo.

---

## Antes de empezar

- [ ] Cerrar la Etapa 0: falta el tag `v0.0.1` (paso 6 de [github-setup.md](../github-setup.md)).
      Confirmar también que Pages, la protección de `main`, las etiquetas y los milestones
      estén creados.
- [ ] Crear una issue por pieza en el milestone «Etapa 1», con el título de la pieza y su
      checklist copiada de este documento.
- [ ] Actualizar `main` local (`git pull`) antes de crear cada rama.

---

## Decisiones transversales (propuestas)

Afectan a varias piezas, por eso se fijan acá. Las marcadas con **(?)** están también en
[Preguntas abiertas](#preguntas-abiertas).

1. **Las líneas de tiempo se calculan en el build.** El MDX llama al motor en el frontmatter
   del componente Astro y pasa la timeline como props a la isla de React. Por eso todo `Step`
   tiene que ser **serializable a JSON** (sin clases, `Map`, `Date` ni funciones). Cuando un
   módulo necesite que el usuario elija parámetros (Etapa 4 en adelante), el mismo motor
   corre en el navegador: es TypeScript puro, así que funciona igual.
2. **La capa OSI es un tipo del motor** (`src/engine/core/capas.ts`). La usan el motor (cada
   encabezado de un paquete pertenece a una capa), el esquema de contenido y los componentes.
   Así hay una sola fuente de verdad y se respeta el sentido de las dependencias
   (componentes → motor, nunca al revés).
3. **La isla de simulación es una sola** (`Simulation`). Astro no puede pasar componentes
   React como hijos de una isla, así que `Simulation` recibe la timeline y decide qué vistas
   dibujar (`Topology`, `StateTable`, `Packet`) junto con `StepControls`.
4. **La página de demostración crece con cada pieza.** Se crea en la 1.1 (`/demo/`, con
   `noindex` y sin enlace desde la navegación) y cada pieza le agrega su sección con datos de
   ejemplo y sus tests e2e. La 1.10 solo verifica el conjunto.
5. **Playwright corre en tres proyectos desde la 1.1:** escritorio claro, escritorio oscuro
   (`colorScheme: 'dark'`) y celular (360 px de ancho). Así cada test e2e nuevo cubre
   automáticamente los dos temas y el ancho de celular que pide «Terminado cuando».
6. **Tema solo por preferencia del sistema** (`prefers-color-scheme`), como dicen los
   lineamientos. Un selector manual queda como issue «futuro».
7. **Sin fuentes web.** Pila de fuentes del sistema para texto y monoespaciada para bytes:
   cero dependencias y nada que descargar.
8. **Las preguntas del quiz van en el frontmatter** del módulo, validadas por el esquema
   (3 a 5 preguntas). La página de módulo dibuja el `Quiz` y las Fuentes después del cuerpo
   MDX, respetando el orden de la plantilla. Ventaja extra: el quiz integrador de la Etapa 14
   puede juntar las preguntas de todos los módulos sin duplicarlas. **(?)**
9. **Módulo de ejemplo oculto.** `src/content/modules/ejemplo.mdx` con `oculto: true`: se
   genera su página (para probar la plantilla y los e2e) pero no aparece en el índice, la
   navegación ni el progreso.
10. **Atajos de teclado con foco dentro de la simulación.** ← → y espacio solo actúan cuando
    el foco está dentro de la simulación, para no romper el scroll ni los lectores de
    pantalla. **(?)**

---

## Mapa de piezas

| #    | Pieza                                     | Rama                     | Depende de |
| ---- | ----------------------------------------- | ------------------------ | ---------- |
| 1.1  | Tokens de diseño y layout base            | `feat/design-tokens`     | —          |
| 1.2  | Motor: núcleo (timeline, bytes, checksum) | `feat/engine-core`       | —          |
| 1.3  | Content Collection de módulos             | `feat/module-collection` | 1.2        |
| 1.4  | Layout del sitio y página de módulo       | `feat/site-layout`       | 1.1, 1.3   |
| 1.5  | Simulación: StepControls y StateTable     | `feat/sim-controls`      | 1.1, 1.2   |
| 1.6  | Simulación: Topology y Packet             | `feat/sim-topology`      | 1.5        |
| 1.7  | HeaderFormat                              | `feat/header-format`     | 1.1, 1.2   |
| 1.8  | Quiz, Callout y WhatIf                    | `feat/learn-components`  | 1.4, 1.5   |
| 1.9  | Indicador de progreso TTL                 | `feat/ttl-progress`      | 1.4, 1.8   |
| 1.10 | Cierre de la etapa y release v0.1.0       | `chore/release-0.1.0`    | todas      |

### Orden sugerido

| Nivel | Piezas que se pueden empezar |
| ----- | ---------------------------- |
| 0     | 1.1, 1.2                     |
| 1     | 1.3, 1.5, 1.7                |
| 2     | 1.4, 1.6                     |
| 3     | 1.8                          |
| 4     | 1.9                          |
| 5     | 1.10                         |

Una pieza de un nivel solo necesita piezas de niveles anteriores. Trabajando solo, el orden lineal 1.1 → 1.2 → … → 1.10 respeta todas las dependencias. 1.1 y
1.2 no dependen de nada y se pueden hacer en cualquier orden; 1.7 se puede adelantar o
atrasar libremente después de 1.1 y 1.2.

### Trazabilidad con los entregables de la etapa

| Entregable de la Etapa 1 (LINEAMIENTOS §8)                       | Pieza      |
| ---------------------------------------------------------------- | ---------- |
| Tokens de diseño: colores por capa, tipografía, espaciado, temas | 1.1        |
| Layout: navegación por capas y bloque, inicio con índice, módulo | 1.4        |
| Content Collection con esquema validado                          | 1.3        |
| Motor: tipos Timeline y Step, utilidades de bytes y checksum     | 1.2        |
| StepControls, StateTable                                         | 1.5        |
| Topology, Packet                                                 | 1.6        |
| HeaderFormat                                                     | 1.7        |
| Quiz, Callout, WhatIf                                            | 1.8        |
| Indicador de progreso TTL                                        | 1.9        |
| Página de demostración interna                                   | 1.1 → 1.10 |
| `ModuleHeader` (plantilla de módulo, §6)                         | 1.4        |

---

## Checklist común a todas las piezas

Se copia en cada issue además de la checklist propia de la pieza.

- [ ] Issue en el milestone «Etapa 1», enlazada desde el PR (`Cierra #n`).
- [ ] Rama creada desde `main` actualizada, con el nombre de este plan.
- [ ] Plan breve de la pieza aprobado antes de implementar.
- [ ] `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm build` y `pnpm test:e2e` pasan en local y
      en la CI.
- [ ] El motor no importa React ni usa el DOM; los componentes no contienen lógica de
      protocolos.
- [ ] Todo código nuevo del motor tiene tests junto al código.
- [ ] Todo dato técnico cita su estándar o RFC; las simplificaciones están declaradas.
- [ ] Cada componente nuevo funciona con teclado, en tema claro y oscuro, a 360 px de ancho y
      con `prefers-reduced-motion: reduce`.
- [ ] La sección correspondiente de `/demo/` está agregada o actualizada.
- [ ] Commits en Conventional Commits; diff completo revisado; vista previa probada.
- [ ] Las ideas que surgieron fuera del alcance quedaron como issues «futuro».

---

## 1.1 · Tokens de diseño y layout base

**Rama:** `feat/design-tokens` · **Depende de:** — · **Commit tipo:** `feat(styles): …`

Base visual sobre la que se construye todo lo demás.

**Entregables**

- `src/styles/tokens.css`:
  - Un color por capa OSI (1 a 7), cada uno con variante de fondo y variante de
    texto/borde, en tema claro y oscuro.
  - Colores semánticos: fondo, superficie, texto, texto atenuado, borde, foco, correcto,
    incorrecto.
  - Tipografía: pila del sistema para texto, monoespaciada para bytes; escala de tamaños y
    alturas de línea.
  - Espaciado, radios, anchos máximos de contenido.
  - Duraciones de animación, que valen `0` con `prefers-reduced-motion: reduce`.
  - Tema oscuro con `@media (prefers-color-scheme: dark)`.
- `src/styles/global.css`: reset mínimo, estilos base de texto, foco visible en todo
  elemento interactivo.
- `src/layouts/BaseLayout.astro`: `<html lang="es">`, metadatos, favicon con `BASE_URL`,
  carga de los estilos globales. `src/pages/index.astro` pasa a usarlo.
- `src/pages/demo.astro`: página interna (`<meta name="robots" content="noindex">`, sin
  enlace) con la sección «Tokens»: muestras de las 7 capas y de los colores semánticos.
- Test de contraste (Vitest): lee los pares texto/fondo declarados en `tokens.css` y verifica
  4,5:1 para texto y 3:1 para elementos no textuales, en ambos temas.
- `playwright.config.ts`: proyectos claro, oscuro y celular (decisión transversal 5).
- e2e: `/demo/` carga y no tiene scroll horizontal en ninguno de los tres proyectos.

**Fuera de alcance:** navegación y encabezado del sitio (1.4); selector manual de tema
(issue «futuro»).

**Checklist**

- [ ] Las 7 capas tienen color propio, distinguible entre sí, en ambos temas.
- [ ] El test de contraste pasa para todos los pares declarados.
- [ ] Ningún valor de color, tamaño o espaciado queda escrito fuera de `tokens.css`.
- [ ] Con movimiento reducido, las duraciones valen `0`.
- [ ] `index.astro` usa `BaseLayout` y se ve igual o mejor que antes.
- [ ] `/demo/` no aparece enlazada en ningún lado y tiene `noindex`.
- [ ] Los e2e corren en los tres proyectos de Playwright.

---

## 1.2 · Motor: núcleo

**Rama:** `feat/engine-core` · **Depende de:** — · **Commit tipo:** `feat(engine): …`

Tipos base que comparten todas las simulaciones y utilidades de bytes.

**Entregables**

- `src/engine/core/capas.ts`: tipo `Capa` (1 a 7) y catálogo con el nombre de cada capa.
- `src/engine/core/timeline.ts`:
  - Tipos de escenario: `Nodo` (id, tipo —host, switch, router, hub, AP—, etiqueta,
    posición como dato de diagrama), `Enlace` (id, extremos), `Topologia`.
  - `Step`: índice, explicación de una o dos frases, ubicación de cada paquete (en un nodo o
    sobre un enlace con su sentido), contenido del paquete como pila de encabezados por
    capa, instantáneas de las tablas de estado con las filas nuevas o cambiadas marcadas,
    nodos y enlaces resaltados.
  - `Timeline`: lista ordenada e inmutable de `Step`.
  - Validador: índices consecutivos, referencias a nodos y enlaces que existen, al menos un
    paso.
- `src/engine/core/bytes.ts` (absorbe `hex.ts`): `toHex` (existente), `toBinary`, conversión
  entre texto hexadecimal y `Uint8Array`, agrupado en bytes y en palabras de 16 bits,
  lectura y escritura de campos de bits en orden de red (big-endian).
- `src/engine/core/checksum.ts`: checksum de Internet (RFC 1071): suma en complemento a uno
  de palabras de 16 bits, relleno de longitud impar y función de verificación.
- `src/engine/demo/`: escenario de juguete para la página de demostración (tres nodos A–B–C,
  un mensaje que atraviesa B y B anota una fila en una tabla). Se declara explícitamente que
  no es un protocolo real.

**Tests**

- Checksum: ejemplo numérico de RFC 1071 §3; un encabezado IPv4 de ejemplo cuyo checksum,
  calculado por el motor, coincide con el de una herramienta independiente y verifica a 0;
  longitud impar; acarreo múltiple; buffer vacío.
- Bytes: ida y vuelta hex ↔ bytes; campos de bits en los bordes (1 bit, 16 bits, campo que
  cruza bytes); errores por valores fuera de rango.
- Timeline: el validador rechaza referencias rotas e índices salteados; ida y vuelta por
  `JSON.stringify`/`JSON.parse` conserva la igualdad.
- Escenario demo: es determinístico (dos ejecuciones producen la misma timeline).

**Fuentes a citar en JSDoc:** RFC 1071 (cálculo del checksum), RFC 791 §3.1 (campo
Header Checksum).

**Checklist**

- [ ] Ningún archivo de `src/engine/` importa React, Astro ni usa el DOM (ESLint pasa).
- [ ] `Step` y `Timeline` son serializables a JSON (test de ida y vuelta).
- [ ] El checksum coincide con el ejemplo de RFC 1071 y con un encabezado real.
- [ ] `hex.ts` quedó integrado en `bytes.ts` sin perder sus tests.
- [ ] El escenario demo está marcado como ficticio en su código y en su explicación.
- [ ] Cobertura de casos borde documentada en los tests.

---

## 1.3 · Content Collection de módulos

**Rama:** `feat/module-collection` · **Depende de:** 1.2 · **Commit tipo:** `feat(content): …`

Esquema validado para que todos los módulos tengan los mismos metadatos.

**Entregables**

- Integración `@astrojs/mdx` (dependencia nueva).
- `src/content/schema.ts` (exportado aparte para poder testearlo) y `src/content.config.ts`
  con la colección `modules` sobre `src/content/modules/*.mdx`.
- Campos del esquema:
  - `titulo`, `descripcion` (una frase para el índice).
  - `capas`: lista no vacía de `Capa`; la primera es la principal y define el color.
  - `bloque`: `Fundamentos | LAN | Red | Transporte | Servicios | WAN | Cierre` (tabla de
    etapas, §8). **(?)**
  - `orden` (entero), `minutos` (tiempo estimado de lectura).
  - `prerrequisitos`: referencias a otros módulos.
  - `fuentes`: lista no vacía de `{ tipo: rfc | estandar | libro | apunte, id, titulo,
seccion?, url? }`.
  - `quiz`: 3 a 5 preguntas `{ pregunta, opciones, correcta, explicacion }`
    (decisión transversal 8).
  - `oculto` (opcional, `false` por defecto).
- `src/lib/modulos.ts`: obtiene los módulos visibles ordenados y valida lo que el esquema no
  puede ver por sí solo: `orden` único, un módulo no es prerrequisito de sí mismo,
  prerrequisitos sin ciclos. Si algo falla, el build falla con un mensaje claro.
- `src/content/modules/ejemplo.mdx` con `oculto: true`, que recorre la plantilla completa con
  texto marcado como ejemplo y cita RFC 1071 como fuente.

**Tests (Vitest)**

- El esquema acepta el frontmatter del ejemplo y rechaza: capa fuera de 1–7, bloque
  inexistente, `fuentes` vacía, quiz con 2 o 6 preguntas, `correcta` fuera de rango.
- `modulos.ts`: orden duplicado, autorreferencia y ciclo de prerrequisitos fallan; los
  ocultos no aparecen en la lista visible.

**Checklist**

- [ ] Un frontmatter inválido rompe `pnpm build` con un mensaje entendible.
- [ ] `Capa` se importa del motor, no se redefine.
- [ ] `fuentes` es obligatoria y no puede estar vacía.
- [ ] El módulo de ejemplo no tiene datos técnicos sin fuente.
- [ ] `pnpm check` reconoce los tipos de la colección.

---

## 1.4 · Layout del sitio y página de módulo

**Rama:** `feat/site-layout` · **Depende de:** 1.1, 1.3 · **Commit tipo:** `feat(layout): …`

**Entregables**

- `src/layouts/SiteLayout.astro` (extiende `BaseLayout`): encabezado con el nombre del sitio
  y un lugar reservado para el indicador TTL (lo completa la 1.9), navegación y pie con
  licencias.
- Navegación por bloque: cada módulo con una marca de su capa (color y número o nombre, no
  solo color). En celular, menú colapsable con `<details>`, sin JavaScript.
- Navegación por capa: página `/capas/` que agrupa los módulos por capa OSI (1 a 7).
- Inicio: índice de módulos agrupados por bloque y ordenados por `orden`. Como en la Etapa 1
  no hay módulos visibles, muestra un estado vacío («El primer módulo llega en la Etapa 2»).
- Página de módulo `src/pages/modulos/[slug].astro`:
  - `src/components/learn/ModuleHeader.astro`: título, capas con color y nombre, minutos,
    prerrequisitos enlazados.
  - Cuerpo MDX.
  - Lugar reservado para el `Quiz` (lo completa la 1.8) y sección Fuentes generada desde el
    frontmatter.
  - Enlaces anterior/siguiente según `orden`.
- `src/pages/404.astro` en español.
- Todos los enlaces internos usan `import.meta.env.BASE_URL`.

**Tests e2e**

- El inicio carga y muestra el estado vacío; el módulo de ejemplo no figura.
- `/modulos/ejemplo/` muestra el encabezado y las fuentes.
- `/capas/` lista las 7 capas.
- La navegación se recorre con Tab, con foco visible, y el menú de celular abre y cierra con
  teclado.

**Checklist**

- [ ] Navegación por bloque y por capa funcionando.
- [ ] La capa nunca se comunica solo con color.
- [ ] El menú de celular funciona sin JavaScript.
- [ ] Los enlaces funcionan con el `base` `/time-to-learn/` (probado con `pnpm preview`).
- [ ] Los módulos ocultos no aparecen en el índice ni en `/capas/`.
- [ ] La 404 se genera y respeta el layout.

---

## 1.5 · Simulación: StepControls y StateTable

**Rama:** `feat/sim-controls` · **Depende de:** 1.1, 1.2 · **Commit tipo:** `feat(sim): …`

Primera isla de React; fija el patrón que siguen las demás.

**Entregables**

- `src/components/sim/stepper.ts`: reducer puro del índice (anterior, siguiente, reiniciar,
  reproducir, pausar, llegar al final detiene la reproducción). Es estado de la interfaz, no
  lógica de protocolo.
- `src/components/sim/Simulation.tsx`: isla contenedora (decisión transversal 3). Recibe la
  timeline y las vistas a mostrar; muestra la explicación del paso actual en una región
  `aria-live="polite"`.
- `src/components/sim/StepControls.tsx`: botones anterior, siguiente, reiniciar y
  reproducir/pausar con nombres accesibles; «Paso n de N»; ← → y espacio con el foco dentro
  de la simulación (decisión transversal 10); botones deshabilitados en los bordes.
- `src/components/sim/StateTable.tsx`: `<table>` semántica con `<caption>`, filas nuevas o
  cambiadas resaltadas con color **y** con una marca de texto («nueva», «cambió»);
  desplazamiento horizontal propio en pantallas chicas.
- Estilos con CSS Modules usando solo tokens.
- `/demo/`: sección «Simulación» con el escenario de juguete de la 1.2.

**Tests**

- Vitest: el reducer en los bordes (anterior en el paso 0, siguiente en el último,
  reproducir en el último, reiniciar).
- e2e: los botones y las teclas avanzan y retroceden; espacio reproduce y pausa; la
  explicación cambia y está en la región `aria-live`; la tabla marca la fila nueva.

**Checklist**

- [ ] Los componentes no contienen lógica de protocolo: solo leen el `Step` actual.
- [ ] Todo se puede usar sin mouse.
- [ ] La reproducción automática se puede pausar en cualquier momento.
- [ ] La tabla se lee bien a 360 px.
- [ ] La isla se hidrata con `client:visible` y la página sin simulaciones no carga React.

---

## 1.6 · Simulación: Topology y Packet

**Rama:** `feat/sim-topology` · **Depende de:** 1.5 · **Commit tipo:** `feat(sim): …`

**Entregables**

- `src/components/sim/Topology.tsx`: SVG con `viewBox` calculado a partir de las posiciones
  del escenario; nodos con forma según su tipo y etiqueta de texto; enlaces; nodos y enlaces
  resaltados con algo más que color (grosor, trazo). Descripción accesible de la topología.
- `src/components/sim/Packet.tsx`: el paquete como pila de encabezados, cada uno con el
  color y el nombre de su capa. Se ubica en el nodo o sobre el enlace que indica el `Step`.
- Movimiento con Web Animations API al avanzar un paso. Al retroceder, saltar o reiniciar, y
  con movimiento reducido, el paquete cambia de posición sin desplazarse.
- En pantallas chicas el SVG escala; por debajo de un tamaño mínimo legible, el diagrama se
  desplaza horizontalmente dentro de su propio contenedor.
- Integración en `Simulation` y en la sección «Simulación» de `/demo/`.

**Tests e2e**

- Al avanzar, el paquete cambia de nodo o de enlace.
- Con `reducedMotion: 'reduce'` no hay animaciones en curso
  (`document.getAnimations()` vacío) después de avanzar.
- A 360 px la página no tiene scroll horizontal (el diagrama sí puede tenerlo).

**Checklist**

- [ ] Ninguna librería de animación agregada.
- [ ] Las posiciones vienen del escenario; el componente no calcula rutas ni decide nada.
- [ ] Movimiento reducido respetado.
- [ ] Contraste de etiquetas y encabezados del paquete en ambos temas.
- [ ] Se entiende el paso actual sin ver colores (texto de explicación y etiquetas).

---

## 1.7 · HeaderFormat

**Rama:** `feat/header-format` · **Depende de:** 1.1, 1.2 · **Commit tipo:** `feat(headers): …`

**Entregables**

- `src/engine/core/header.ts`: tipo `HeaderSpec` (nombre, capa, campos con nombre, tamaño en
  bits, valor de ejemplo, formato de presentación —hex, binario, decimal, texto— y
  descripción); validación (tamaños positivos, total múltiplo de 8 bits); cálculo del
  desplazamiento de cada campo y serialización a bytes.
- Datos de ejemplo para la demo: encabezado IPv4 de 20 bytes con valores válidos y checksum
  calculado por el motor (no escrito a mano). Fuente: RFC 791 §3.1.
- `src/components/headers/HeaderFormat.tsx`:
  - En escritorio, rejilla de 32 bits por fila (como los diagramas de los RFC), con el ancho
    de cada campo proporcional a sus bits.
  - En celular, lista de campos (nombre, tamaño, valor).
  - Cada campo es enfocable y muestra su descripción; selector de formato hex/binario/decimal
    que usa las utilidades de bytes del motor.
  - Borde con el color de la capa del encabezado.
- `/demo/`: sección «Formato».

**Tests**

- Vitest: el validador rechaza campos de 0 bits y totales que no cierran en bytes; los
  desplazamientos del encabezado IPv4 coinciden con RFC 791; la serialización da 20 bytes y
  el checksum verifica a 0.
- e2e: los campos se recorren con teclado; el cambio de formato actualiza los valores; a
  360 px se muestra la lista.

**Checklist**

- [ ] Los tamaños de los campos IPv4 coinciden con RFC 791 y la fuente está citada.
- [ ] El checksum del ejemplo lo calcula el motor.
- [ ] El componente no conoce ningún protocolo: dibuja cualquier `HeaderSpec`.
- [ ] La rejilla es legible en escritorio y la lista en celular.

---

## 1.8 · Quiz, Callout y WhatIf

**Rama:** `feat/learn-components` · **Depende de:** 1.4, 1.5 · **Commit tipo:** `feat(learn): …`

**Entregables**

- `src/components/learn/Callout.astro`: variantes `resumen`, `nota`, `simplificacion` (para
  declarar simplificaciones, como exige CLAUDE.md) y `advertencia`. Cada una con título de
  texto además del color y el ícono. Sin JavaScript.
- `src/components/learn/WhatIf.astro`: bloque «¿Qué pasa si…?» con la pregunta, la
  explicación y, opcionalmente, una `Simulation` con su propia timeline.
- `src/components/learn/Quiz.tsx`:
  - Preguntas de opción múltiple con una respuesta correcta, como grupo de radio accesible.
  - Al responder: «Correcta»/«Incorrecta» en texto (no solo color) y la explicación.
  - Resultado final y opción de reintentar.
- `src/lib/progreso.ts`: guarda en `localStorage` qué módulos se completaron y el mejor
  puntaje de cada uno; clave versionada; todo acceso dentro de `try/catch` (navegación
  privada o almacenamiento bloqueado no rompen la página); emite un evento para que otras
  islas se enteren. **(?)** qué cuenta como «completado».
- La página de módulo de la 1.4 dibuja el `Quiz` con las preguntas del frontmatter.
- `/demo/`: secciones «Callout», «Qué pasa si» y «Quiz».

**Tests**

- Vitest: `progreso.ts` con un almacenamiento falso (guardar, leer, versión vieja, datos
  corruptos, almacenamiento que lanza error).
- e2e: el quiz se responde con teclado; muestra la explicación; el resultado persiste al
  recargar; el quiz del módulo de ejemplo se dibuja desde su frontmatter.

**Checklist**

- [ ] Callout y WhatIf no cargan JavaScript propio.
- [ ] El quiz se puede completar sin mouse y sin depender del color.
- [ ] Sin almacenamiento disponible, el quiz funciona igual (solo no recuerda).
- [ ] El orden de la plantilla se respeta: Resumen → Quiz → Fuentes.

---

## 1.9 · Indicador de progreso TTL

**Rama:** `feat/ttl-progress` · **Depende de:** 1.4, 1.8 · **Commit tipo:** `feat(progress): …`

Cada módulo completado es un salto más en el recorrido.

**Entregables**

- `src/components/learn/TtlProgress.tsx`: isla chica en el encabezado del sitio (el lugar
  reservado en la 1.4). Muestra los saltos hechos sobre el total de módulos visibles
  («3 de 12 saltos») y una ruta de puntos, uno por módulo, con el color de su capa; los
  completados se rellenan y el texto accesible dice cuáles son. **(?)** contar hacia arriba
  o hacia abajo.
- Versión detallada en el inicio: cada módulo del índice indica si está completado.
- Se actualiza en vivo al completar un quiz (evento de la 1.8), sin recargar.
- Botón «Reiniciar progreso» con confirmación.
- Sin módulos visibles (caso real de la Etapa 1) muestra un estado vacío que no confunde. En
  `/demo/` se prueba con una lista de módulos de ejemplo pasada como prop.

**Tests e2e**

- En `/demo/`, completar el quiz suma un salto; el valor persiste al recargar; reiniciar lo
  vuelve a 0.
- Con almacenamiento bloqueado, el indicador muestra 0 y la página no falla.

**Checklist**

- [ ] El indicador no depende solo del color para indicar completado.
- [ ] Cuenta solo módulos visibles (no los ocultos).
- [ ] Se actualiza sin recargar.
- [ ] El JavaScript que agrega al encabezado es mínimo (isla chica, `client:idle`).

---

## 1.10 · Cierre de la etapa y release v0.1.0

**Rama:** `chore/release-0.1.0` · **Depende de:** todas · **Commit tipo:** `chore: …` /
`docs: …`

**Entregables**

- Recorrido de verificación de `/demo/` y de `/modulos/ejemplo/` en los tres proyectos de
  Playwright; correcciones menores que surjan (si son grandes, issue aparte).
- e2e consolidado `tests/e2e/demo.spec.ts` que recorre todas las secciones de la demo con
  teclado.
- Medición de Lighthouse en `/demo/` y en el inicio, registrada en el PR (el objetivo de 90 es
  de la Etapa 15; acá solo se mide).
- `CHANGELOG.md` nuevo con la entrada v0.1.0.
- `package.json` en versión `0.1.0`.
- README: qué incluye el sitio hoy. CLAUDE.md: convenciones nuevas que hayan surgido (por
  ejemplo, cómo declarar simplificaciones con `Callout`).
- Después del merge: tag `v0.1.0`, release en GitHub con el changelog y cierre del milestone.

**Checklist (Terminado cuando, LINEAMIENTOS §8)**

- [ ] Todos los componentes funcionan con teclado.
- [ ] Todos los componentes funcionan en tema claro y oscuro.
- [ ] Todos los componentes funcionan a 360 px de ancho.
- [ ] Las utilidades del motor tienen tests, incluido el checksum de Internet sobre un caso
      conocido.
- [ ] La plantilla de módulo completa se puede armar con los componentes existentes
      (`ejemplo.mdx` lo demuestra).
- [ ] El sitio publicado en GitHub Pages muestra el nuevo layout.
- [ ] Todas las issues del milestone «Etapa 1» están cerradas.
- [ ] Tag `v0.1.0` creado y release publicada.

---

## Preguntas abiertas

Conviene resolverlas antes de la pieza indicada.

| #   | Pregunta                                                                                                                                                               | Propuesta                                                                                             | Antes de |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| 1   | ¿Qué cuenta como «módulo completado»?                                                                                                                                  | Responder todas las preguntas del quiz, sin importar los aciertos; se guarda el mejor puntaje.        | 1.8      |
| 2   | ¿El indicador cuenta saltos hacia arriba o un TTL que baja?                                                                                                            | Hacia arriba: un TTL que llega a 0 significa que el paquete se descarta, mala metáfora para terminar. | 1.9      |
| 3   | La navegación de los lineamientos nombra cinco bloques (LAN, Red, Transporte, Servicios, WAN), pero la tabla de etapas usa también Fundamentos y Cierre. ¿Se muestran? | Sí, los siete, en el orden de la tabla de etapas.                                                     | 1.3      |
| 4   | ¿Preguntas del quiz en el frontmatter o como props en el MDX?                                                                                                          | Frontmatter (decisión transversal 8).                                                                 | 1.3      |
| 5   | ¿Atajos de teclado globales en la página o solo con foco en la simulación?                                                                                             | Solo con foco en la simulación (decisión transversal 10).                                             | 1.5      |
| 6   | ¿Agregar `@axe-core/playwright` para chequear accesibilidad automáticamente en los e2e?                                                                                | Sí, en la 1.1, para que cada pieza lo herede. Es una dependencia nueva, por eso se consulta.          | 1.1      |
