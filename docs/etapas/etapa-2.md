# Etapa 2 · Modelo OSI y encapsulamiento

> Plan de implementación. Versión objetivo: **v0.2.0**. Milestone: «Etapa 2 · Modelo OSI y
> encapsulamiento». Referencia: [LINEAMIENTOS.md](../LINEAMIENTOS.md), sección 8.

**Objetivo.** Publicar el primer contenido real del sitio: ver cómo un dato de aplicación se
envuelve capa por capa hasta convertirse en bits, y cómo se desenvuelve del otro lado. Este
contenido es el **piloto** de la plantilla de módulo: si no sirve para estudiar, la plantilla
se ajusta antes de pasar a la Etapa 3.

La etapa se divide en **9 piezas**. Cada pieza es una sesión de trabajo, una issue en el
milestone y un PR. Dentro de cada sesión se sigue la regla de siempre: primero un plan breve
de la pieza, implementación solo después de aprobarlo.

Las primeras seis piezas suman al motor y a los componentes lo que la Etapa 1 no tenía y
este tema necesita: saber en qué capa de qué equipo está una PDU, cuánto mide cada parte,
dibujar la pila de protocolos y elegir entre escenarios. Las dos siguientes son el contenido
y la última cierra la etapa.

---

## Antes de empezar

- [ ] Terminar lo pendiente de la Etapa 0: el milestone «Etapa 0» sigue abierto (sin issues)
      y no existe el tag `v0.0.1`. Decidir si se crea el tag sobre el commit que cerró la
      Etapa 0 o si se cierra el milestone sin tag.
- [x] Resolver las [preguntas de la etapa](#preguntas-resueltas): el 2026-11-07 se aceptaron
      todas las propuestas.
- [ ] Indicar qué edición de Stallings usa la cátedra y copiar en `fuentes/` los capítulos
      que correspondan a esta etapa (pregunta 5). Hoy `fuentes/` tiene los apuntes de la
      cátedra, pero ningún capítulo de Stallings.
- [ ] Abrir la issue «futuro» de la pregunta 8 (organizaciones de normalización, topologías y
      primitivas de servicio).
- [ ] Crear una issue por pieza en el milestone «Etapa 2», con el título de la pieza y su
      checklist copiada de este documento.
- [ ] Actualizar `main` local (`git pull`) antes de crear cada rama.

---

## Decisiones transversales

Afectan a varias piezas, por eso se fijan acá. Las marcadas con **(P n)** salieron de una
de las [preguntas resueltas](#preguntas-resueltas).

1. **Dos módulos en la etapa (P 1).** Los entregables de la etapa juntan dos ideas: cómo se
   clasifican las redes y cómo comparten sus enlaces (circuitos frente a paquetes), y cómo se
   organiza la comunicación en capas (OSI, TCP/IP, encapsulamiento). Siguiendo el principio
   «una idea por pantalla» (LINEAMIENTOS §2), la etapa publica dos módulos del bloque
   Fundamentos:
   - «Redes: tipos y conmutación» (`orden: 1`).
   - «Modelo OSI y encapsulamiento» (`orden: 2`), el módulo central de la etapa.

2. **Ajuste de la plantilla de módulo (P 2).** Es lo que la nota de la etapa espera del
   piloto:
   - Simulación sigue yendo justo después de Idea central (interacción antes que texto).
   - Formato es obligatorio solo si el tema tiene un encabezado propio. Si no, se omite y se
     dice por qué en un comentario del MDX.
   - Entre Formato (o Simulación, si no hay Formato) y ¿Qué pasa si…? un módulo puede sumar
     secciones propias, una idea cada una (por ejemplo, «OSI, TCP/IP e IEEE 802»).

   Se documenta en `CLAUDE.md` en la 2.7. La revisión del piloto (2.9) puede ajustar más.

3. **Extensiones del `Step` compatibles con lo existente.** Todo campo nuevo del núcleo es
   opcional: el escenario de `/demo/` y el módulo de ejemplo siguen siendo válidos sin
   cambios. Los cambios al núcleo se hacen en una pieza (2.1), no dentro de cada módulo.

4. **El motor dice qué capas tiene cada equipo.** La vista de pila no sabe que un router
   llega hasta la capa 3: lo recibe en el escenario (`Nodo.capas`). Se mantiene la regla de
   la Etapa 1: los componentes no contienen lógica de protocolos.

5. **Escenarios precalculados con selector.** El usuario elige entre escenarios calculados en
   el build («Modelo OSI» o «TCP/IP real»; «Circuitos» o «Paquetes»). Correr el motor en el
   navegador con parámetros elegidos por el usuario queda para la Etapa 4, que es la primera
   que lo pide.

6. **Tamaños con fuente y test, no encabezados campo por campo.** El módulo OSI muestra la PDU
   completa por bloques (encabezado de cada capa, datos y cola, con sus tamaños en bytes) y,
   de cada encabezado, solo el campo que dice a quién entregar el contenido. Los encabezados
   campo por campo con `HeaderFormat` llegan con sus etapas: Ethernet (3), IPv4 (7) y TCP
   (9). Por eso las issues «futuro» #25 (campos de más de 32 bits) y #26 (derivar `Packet`
   desde `HeaderSpec`) siguen abiertas; la #25 le va a hacer falta a la Etapa 3.

7. **Valores reservados para documentación.** Direcciones IPv4 de RFC 5737 y MAC de
   RFC 9542 (que reemplazó a RFC 7042); EtherType, número de protocolo y puerto según sus
   registros. Lo que sea inventado (el escenario de conmutación, el texto del mensaje de
   aplicación) se marca «[Ejemplo]» en el código y en el texto.

8. **Carpetas nuevas del motor:** `src/engine/osi/` (modelos de capas y encapsulamiento) y
   `src/engine/conmutacion/` (circuitos y paquetes). Se usa `conmutacion` y no `switching`
   porque `switching/` queda reservada para bridges y switches (Etapa 4, LINEAMIENTOS §4).

---

## Mapa de piezas

| #   | Pieza                                         | Rama                            | Depende de    |
| --- | --------------------------------------------- | ------------------------------- | ------------- |
| 2.1 | Motor: PDU con tamaños, colas y pila por nodo | `feat/engine-pdu`               | —             |
| 2.2 | Motor: modelos de capas y encapsulamiento     | `feat/engine-encapsulation`     | 2.1           |
| 2.3 | Vista: pila de protocolos y PDU               | `feat/sim-protocol-stack`       | 2.1           |
| 2.4 | Simulación con varios escenarios              | `feat/sim-scenarios`            | —             |
| 2.5 | Tabla comparativa de modelos                  | `feat/model-comparison`         | 2.2           |
| 2.6 | Motor: conmutación de circuitos y de paquetes | `feat/circuit-packet-switching` | —             |
| 2.7 | Módulo «Modelo OSI y encapsulamiento»         | `feat/module-osi`               | 2.2–2.5       |
| 2.8 | Módulo «Redes: tipos y conmutación»           | `feat/module-network-types`     | 2.4, 2.6, 2.7 |
| 2.9 | Cierre: revisión del piloto y release v0.2.0  | `chore/release-0.2.0`           | todas         |

### Orden sugerido

| Nivel | Piezas que se pueden empezar |
| ----- | ---------------------------- |
| 0     | 2.1, 2.4, 2.6                |
| 1     | 2.2, 2.3                     |
| 2     | 2.5                          |
| 3     | 2.7                          |
| 4     | 2.8                          |
| 5     | 2.9                          |

Una pieza de un nivel solo necesita piezas de niveles anteriores. Trabajando solo, el orden
lineal 2.1 → 2.2 → … → 2.9 respeta todas las dependencias.

Si se trabaja en paralelo, ojo con los archivos compartidos: 2.3 y 2.4 modifican
`Simulation.tsx`, y 2.1 y 2.6 modifican `timeline.ts`. Conviene hacer cada par uno después
del otro.

### Trazabilidad con los entregables de la etapa

| Entregable de la Etapa 2 (LINEAMIENTOS §8)                         | Pieza                   |
| ------------------------------------------------------------------ | ----------------------- |
| Clasificación de redes (PAN, LAN, MAN, WAN)                        | 2.8                     |
| Conmutación de circuitos frente a paquetes                         | 2.6, 2.8                |
| Simulación de encapsulamiento y desencapsulamiento, color por capa | 2.1, 2.2, 2.3, 2.4, 2.7 |
| Comparación OSI frente a TCP/IP; IEEE 802 (LLC y MAC) frente a OSI | 2.2, 2.5, 2.7           |
| Nombre de la PDU en cada capa                                      | 2.2, 2.3, 2.5, 2.7      |
| Quiz del módulo                                                    | 2.7, 2.8                |
| Terminado: el módulo cumple la plantilla completa                  | 2.7, 2.8, 2.9           |
| Terminado: tamaños 20 B TCP, 20 B IPv4, 14 B Ethernet + 4 B FCS    | 2.2 (tests), 2.7 (e2e)  |
| Nota: el módulo es piloto; se ajusta la plantilla si hace falta    | 2.7, 2.9                |

---

## Checklist común a todas las piezas

Se copia en cada issue además de la checklist propia de la pieza.

- [ ] Issue en el milestone «Etapa 2», enlazada desde el PR (`Cierra #n`).
- [ ] Rama creada desde `main` actualizada, con el nombre de este plan.
- [ ] Plan breve de la pieza aprobado antes de implementar.
- [ ] `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm build` y `pnpm test:e2e` pasan en local y
      en la CI.
- [ ] El motor no importa React ni usa el DOM; los componentes no contienen lógica de
      protocolos.
- [ ] Todo código nuevo del motor tiene tests junto al código.
- [ ] Todo dato técnico cita su estándar o RFC. Las simplificaciones están declaradas: en el
      motor, en el comentario inicial del archivo bajo «Simplificaciones declaradas»; en un
      módulo, con `<Callout variante="simplificacion">` cerca de lo simplificado.
- [ ] Los escenarios y datos inventados están marcados como ficticios («[Ejemplo]») en el
      código y en el texto.
- [ ] Cada componente nuevo tiene su sección en `/demo/` y sus e2e (`revisarAccesibilidad` y
      `sinScrollHorizontal`), funciona con teclado, en tema claro y oscuro, a 360 px y con
      `prefers-reduced-motion: reduce`. Si tiene partes interactivas, está sumado al
      recorrido de `tests/e2e/demo.spec.ts`.
- [ ] Nada de `fuentes/` aparece en el diff; el contenido está escrito con palabras propias.
- [ ] Commits en Conventional Commits; diff completo revisado; vista previa probada.
- [ ] Las ideas que surgieron fuera del alcance quedaron como issues «futuro».

---

## 2.1 · Motor: PDU con tamaños, colas y pila por nodo

**Rama:** `feat/engine-pdu` · **Depende de:** — · **Commit tipo:** `feat(engine): …`

Extensiones del núcleo que necesitan las simulaciones de la etapa. Todas son opcionales
(decisión transversal 3).

**Entregables**

- `src/engine/core/timeline.ts`:
  - `Nodo.capas?`: capas que implementa el equipo (un host, de la 1 a la 7; un router, de la
    1 a la 3). La vista de pila de la 2.3 dibuja esa lista.
  - `Ubicacion` de tipo `nodo` con `capa?`: en qué capa de la pila del nodo está la PDU.
  - `Encabezado.bytes?` (tamaño, entero positivo) y `Encabezado.parte?`: `'encabezado'` (por
    defecto) o `'cola'`, para lo que va después de los datos, como el FCS de Ethernet.
  - `Paquete.pdu?`: nombre de la PDU en ese punto («Segmento TCP», «Trama Ethernet»,
    «T-PDU»). `Paquete.datos?`: `{ descripcion, bytes? }`, la carga de la capa más alta.
  - Validador: la capa de una ubicación existe y está entre las `capas` del nodo (si el nodo
    las declara); los tamaños son enteros positivos; toda cola pertenece a una capa que
    también tiene encabezado en el mismo paquete.
  - Funciones puras: orden de las partes de un paquete en el cable (encabezados de afuera
    hacia adentro, datos, colas de adentro hacia afuera) con el desplazamiento en bytes de
    cada una, y longitud total (indefinida si alguna parte no tiene tamaño).
- `Packet.tsx`: dibuja las colas, marcadas «cola» en texto, y el nombre de la PDU si lo hay.
  `descripcion.ts`: la descripción accesible menciona la capa y la PDU («Segmento TCP en la
  capa 4 de A»). Una ubicación con capa se sigue dibujando en su nodo dentro de `Topology`.
- `/demo/`: el escenario de juguete suma un paso con tamaños y una cola, marcado como
  ficticio.

**Tests**

- Vitest: el validador rechaza una capa inexistente o fuera de la pila del nodo, tamaños 0,
  negativos o con decimales, y una cola sin el encabezado de su capa; orden en el cable y
  desplazamientos de un paquete con dos encabezados, datos y una cola; longitud indefinida si
  falta un tamaño; ida y vuelta por JSON; la timeline de `/demo/` y la del módulo de ejemplo
  siguen siendo válidas.
- e2e: el paquete de `/demo/` muestra la cola con texto y no solo con color.

**Checklist**

- [ ] Todos los campos nuevos son opcionales y los escenarios existentes no cambiaron.
- [ ] `Step` y `Timeline` siguen siendo serializables a JSON.
- [ ] El orden de las partes en el cable lo calcula el motor, no el componente.
- [ ] La cola se distingue sin depender del color.

---

## 2.2 · Motor: modelos de capas y encapsulamiento

**Rama:** `feat/engine-encapsulation` · **Depende de:** 2.1 · **Commit tipo:** `feat(osi): …`

Toda la lógica del módulo OSI: los modelos de capas, las dos pilas del ejemplo y la
simulación de encapsulamiento y desencapsulamiento.

**Entregables**

- `src/engine/osi/modelos.ts`:
  - Modelo OSI (las 7 capas de `capas.ts`), modelo TCP/IP (pregunta 4) y modelo IEEE 802
    (LLC como subcapa superior de la capa 2, MAC como subcapa inferior, y la capa física).
    Cada capa de TCP/IP e IEEE 802 indica qué capas OSI cubre.
  - Nombre de la PDU por capa: en OSI genérico (pregunta 6) y en TCP/IP (datos de la
    aplicación, segmento TCP, datagrama IP, trama, bits).
  - Fuentes: ISO/IEC 7498-1, RFC 1122 §1.3.1, IEEE Std 802 (Overview and Architecture) e
    IEEE 802.2.
- `src/engine/osi/pilas.ts`:
  - **Pila OSI genérica**: un encabezado por capa (AH, PH, SH, TH, NH, LH) más la cola LT,
    sin tamaños. Se declara que es el modelo y no un protocolo real.
  - **Pila TCP/IP real**: datos de aplicación (pregunta 7), TCP, IPv4 y Ethernet II con FCS.
    Tamaños como constantes con su fuente: Ethernet 14 bytes (destino 6, origen 6, tipo 2) y
    FCS 4 (IEEE 802.3, cláusula 3); IPv4 20 (RFC 791 §3.1, IHL = 5); TCP 20 (RFC 9293 §3.1,
    Data Offset = 5).
  - Campos que se muestran en el paquete: direcciones de origen y destino (decisión
    transversal 7) y el campo que dice a quién entregar el contenido: EtherType `0x0800`
    (IPv4; RFC 894 y registro de EtherType de la IEEE), Protocolo `6` (TCP; registro de IANA)
    y Puerto destino `80` (HTTP; RFC 9110 §4.2.1).
  - El mensaje de aplicación mide al menos 6 bytes: 14 + 20 + 20 + 4 = 58, y la trama mínima
    es de 64 bytes (IEEE 802.3), así que no hace falta relleno.
- `src/engine/osi/encapsulamiento.ts`: una función que recibe la pila y el recorrido (host de
  origen, equipos intermedios opcionales con su pila, host de destino) y devuelve la
  timeline:
  - En el origen, de la capa 7 a la 1: cada capa agrega su encabezado (y la capa 2, su cola).
    Cada paso explica qué agregó y cómo se llama la PDU.
  - Los bits cruzan el medio.
  - Cada equipo intermedio sube hasta su capa más alta y vuelve a bajar: un hub solo repite
    bits, un switch reenvía la trama sin cambiarla, un router arma una trama nueva con otras
    direcciones MAC y deja el datagrama igual en los campos que se muestran.
  - En el destino, de la capa 1 a la 7: cada capa lee su encabezado, usa el campo de
    demultiplexación para saber a quién entregar y lo quita. Al final, la aplicación recibe
    el mismo mensaje que se envió.
  - Error en un enlace (opcional): el receptor ve en la capa 2 que el FCS no coincide y
    descarta la trama; las capas de arriba nunca la ven (IEEE 802.3, §3.4).
  - Funciones listas para el contenido: escenario OSI genérico, TCP/IP real, trama con error y
    router en el medio.
- **Simplificaciones declaradas** (comentario inicial del archivo): sin preámbulo ni SFD; sin
  relleno; sin establecimiento de la conexión TCP (Etapa 9) ni ARP (Etapa 7), así que la MAC
  de destino se da por conocida; el FCS no se calcula (el CRC-32 es de la Etapa 3) y el error
  se modela como «no coincide»; el router no muestra el decremento del TTL ni el checksum
  nuevo (Etapas 7 y 8); un solo segmento, sin fragmentación. En TCP/IP las capas 5 y 6 no
  agregan encabezado, y la explicación del paso lo aclara.

**Tests**

- Tamaños: Ethernet 14 + FCS 4, IPv4 20, TCP 20; la trama completa mide al menos 64 bytes
  (criterio «Terminado cuando» de la etapa).
- Encapsulamiento: cada capa agrega exactamente su parte; el orden en el cable es Ethernet,
  IPv4, TCP, datos, FCS; al desencapsular las partes se quitan en orden inverso.
- El destino entrega a cada capa según el campo correcto (`0x0800` → IPv4, `6` → TCP,
  `80` → aplicación).
- Equipos intermedios: el hub no mira la trama, el switch no la cambia, el router cambia las
  MAC y no el datagrama.
- Error: después del descarte en la capa 2 no hay pasos en las capas 3 a 7 del destino.
- Modelos: cada capa OSI queda cubierta exactamente una vez por cada modelo; hay nombre de
  PDU para las 7 capas.
- Determinismo, `crearTimeline` no lanza e ida y vuelta por JSON.

**Fuera de alcance:** encabezados campo por campo (Etapas 3, 7 y 9); campos de más de
32 bits (#25); derivar los encabezados desde `HeaderSpec` (#26).

**Checklist**

- [ ] Cada tamaño y cada valor (EtherType, protocolo, puerto, direcciones) cita su fuente en
      el JSDoc.
- [ ] Las direcciones son de los bloques para documentación.
- [ ] Las simplificaciones están en el comentario inicial, bajo «Simplificaciones
      declaradas».
- [ ] El mensaje de aplicación está marcado «[Ejemplo]».
- [ ] La pila de cada equipo (`Nodo.capas`) la define el motor.

---

## 2.3 · Vista: pila de protocolos y PDU

**Rama:** `feat/sim-protocol-stack` · **Depende de:** 2.1 · **Commit tipo:** `feat(sim): …`

La vista nueva de la simulación: el encapsulamiento se ve en vertical, dentro de cada
equipo, y no sobre la topología. Es genérica: la Etapa 14 la puede reusar para «ver el mismo
envío desde distintas capas».

**Entregables**

- `src/components/sim/ProtocolStack.tsx`: una columna por nodo, en el orden de sus
  posiciones, con las capas de `Nodo.capas`. Cada capa lleva su color, su número y su nombre.
  La capa donde está la PDU se marca con borde y texto, no solo con color. El medio físico
  une las columnas según los enlaces de la topología, y los bits en tránsito se dibujan sobre
  él.
- `src/components/sim/Pdu.tsx`: la PDU en horizontal, en el orden del cable que calcula el
  motor (2.1). Cada parte lleva el color y el nombre de su capa y, si lo tiene, su tamaño en
  bytes. Arriba va el nombre de la PDU y, si se conoce, la longitud total.
  - Se puede usar sola en un MDX sin hidratar (HTML estático, sin JavaScript), con los
    desplazamientos en bytes de cada parte: es lo que usa la sección Formato del módulo OSI.
  - A 360 px pasa a una lista vertical, como `HeaderFormat`.
- `Simulation`: vista nueva `'pila'` (`ProtocolStack` más la `Pdu` del paso actual).
- Movimiento con Web Animations API: al avanzar, la PDU baja o sube de capa. Al retroceder,
  saltar o reiniciar, y con movimiento reducido, cambia de lugar sin desplazarse (mismo
  criterio que `Topology`).
- Descripción accesible del paso: equipo, capa y PDU.
- `/demo/`: sección «Pila de protocolos» con un escenario de juguete propio en
  `src/engine/demo/` (ficticio, para no depender de la 2.2) y una `Pdu` estática.

**Tests**

- Vitest: lo que se calcule fuera del JSX (geometría de las columnas, por ejemplo).
- e2e: al avanzar cambia la capa marcada y la PDU suma o pierde una parte, con su nombre y
  su capa en texto; la `Pdu` estática no carga JavaScript; con `reducedMotion: 'reduce'` no
  quedan animaciones en curso; a 360 px no hay scroll horizontal en la página; axe.

**Checklist**

- [ ] El componente no sabe qué capas tiene un router ni qué agrega cada capa: todo viene
      del `Step`.
- [ ] La capa actual y cada parte de la PDU se entienden sin ver colores.
- [ ] La `Pdu` estática funciona sin JavaScript.
- [ ] Movimiento reducido respetado.
- [ ] Contraste de textos sobre los colores de capa en ambos temas.

---

## 2.4 · Simulación con varios escenarios

**Rama:** `feat/sim-scenarios` · **Depende de:** — · **Commit tipo:** `feat(sim): …`

Permite comparar casos con la misma simulación: «Modelo OSI» frente a «TCP/IP real», o
«Circuitos» frente a «Paquetes» (decisión transversal 5).

**Entregables**

- `Simulation` acepta `escenarios: { id, etiqueta, timeline }[]` como alternativa a
  `timeline` (una cosa o la otra, con un tipo que lo obliga).
- Selector como grupo de radio con su leyenda, arriba de los controles. Cambiar de escenario
  vuelve al paso 1, pausa la reproducción y lo anuncia en la región `aria-live`.
- Teclado: dentro del grupo de radio, las flechas cambian de escenario (comportamiento
  nativo) y no de paso; con el foco en el resto de la simulación, ← → y espacio funcionan
  como antes.
- `stepper.ts`: acción para empezar de nuevo con otra cantidad de pasos.
- `/demo/`: la sección «Simulación» suma un segundo escenario de juguete; el recorrido de
  `demo.spec.ts` pasa por el selector.

**Tests**

- Vitest: la acción nueva del reducer (cambio a un escenario más corto o más largo, cambio
  durante la reproducción).
- e2e: cambiar de escenario vuelve al paso 1 y cambia la explicación; las flechas dentro del
  selector no cambian de paso; el cambio se anuncia; axe; 360 px.

**Checklist**

- [ ] Una simulación con un solo `timeline` funciona igual que antes.
- [ ] El escenario elegido se lee en texto, no solo por el estado visual del control.
- [ ] Los atajos siguen funcionando solo con el foco dentro de la simulación.

---

## 2.5 · Tabla comparativa de modelos

**Rama:** `feat/model-comparison` · **Depende de:** 2.2 · **Commit tipo:** `feat(learn): …`

Comparación de OSI con TCP/IP y con IEEE 802, y nombre de la PDU en cada capa, en una sola
tabla.

**Entregables**

- `src/components/learn/ModelComparison.astro`, sin JavaScript: `<table>` semántica con
  `<caption>` y una fila por capa OSI (la capa 2 ocupa dos filas para mostrar LLC y MAC).
  Columnas: capa OSI (número, nombre y color), PDU en OSI, capa TCP/IP (con `rowspan` cuando
  cubre varias capas OSI), PDU en TCP/IP, IEEE 802. Una prop elige qué columnas mostrar.
- Los datos salen de `src/engine/osi/modelos.ts` (2.2): el componente no define capas ni
  nombres, solo calcula cómo dibujarlos.
- A 360 px la tabla se desplaza dentro de su propio contenedor, enfocable y con nombre
  accesible, como `StateTable`.
- `/demo/`: sección «Comparación de modelos», sumada al recorrido de `demo.spec.ts` (el
  contenedor desplazable recibe foco).

**Tests e2e**

- La aplicación de TCP/IP cubre las capas OSI 5 a 7; LLC y MAC quedan dentro de la capa 2.
- La tabla tiene encabezados de fila y de columna; axe.
- A 360 px la página no tiene scroll horizontal (la tabla sí puede tenerlo).

**Checklist**

- [ ] La capa se comunica con número o nombre, no solo con color.
- [ ] Sin JavaScript.
- [ ] Un lector de pantalla puede recorrer la tabla celda por celda y entender a qué capa
      OSI corresponde cada una.

---

## 2.6 · Motor: conmutación de circuitos y de paquetes

**Rama:** `feat/circuit-packet-switching` · **Depende de:** — · **Commit tipo:**
`feat(conmutacion): …`

La simulación del módulo «Redes: tipos y conmutación»: el mismo envío por una red de
circuitos y por una red de paquetes.

**Entregables**

- `src/engine/conmutacion/`:
  - Escenario «[Ejemplo]»: dos estaciones (A y B) unidas por cuatro nodos de conmutación con
    dos caminos posibles.
  - Circuitos: establecimiento (la solicitud avanza nodo por nodo y cada uno reserva un canal
    en su enlace de salida, que aparece en su tabla «Circuitos»), transferencia (los datos
    siguen el camino reservado, sin decisiones nuevas) y liberación.
  - Paquetes (datagramas): tres paquetes numerados salen de A; cada nodo decide por separado;
    uno toma el otro camino; llegan a B en otro orden y la explicación aclara que reordenar
    es tarea de los extremos.
  - ¿Qué pasa si se cae un enlace? Con circuitos, el circuito se corta y hay que establecer
    otro; con datagramas, los paquetes que siguen toman el camino que queda.
  - **Simplificaciones declaradas:** escenario ficticio; tiempos sin unidades; los motivos de
    cada decisión de ruta son datos del escenario; los circuitos virtuales quedan para la
    Etapa 12.
  - Fuentes: Stallings (pregunta 5) y apunte de la cátedra «Introducción y Modelo OSI».
- `timeline.ts`: tipo de nodo genérico «nodo de conmutación», para no dibujar un router en
  una red de circuitos. `Topology` le da su forma.
- `Topology`: varios paquetes en el mismo nodo o enlace se dibujan separados (cierra la
  issue «futuro» #23).
- `/demo/`: un paso con dos paquetes en el mismo lugar y el nodo nuevo.

**Tests**

- Vitest: determinismo; la transferencia usa exactamente los enlaces que reservó el
  establecimiento; después de la liberación no quedan reservas; con datagramas, los tres
  paquetes llegan a B y al menos uno por otro camino; enlace caído en los dos modos;
  validación e ida y vuelta por JSON.
- e2e: dos paquetes en el mismo enlace no se superponen; el nodo nuevo se identifica por
  texto.

**Checklist**

- [ ] El escenario está marcado como ficticio en su código y en sus explicaciones.
- [ ] Ninguna decisión de ruta la toma un componente.
- [ ] #23 queda cerrada desde el PR.

Si la pieza crece demasiado, el cambio de `Topology` (#23 y la forma nueva) pasa a un PR
propio antes del motor.

---

## 2.7 · Módulo «Modelo OSI y encapsulamiento»

**Rama:** `feat/module-osi` · **Depende de:** 2.2, 2.3, 2.4, 2.5 · **Commit tipo:**
`feat(content): …`

El módulo central de la etapa y el primero visible en el sitio.

**Entregables**

- `src/content/modules/modelo-osi.mdx`:
  - Frontmatter: título, descripción, capas, bloque `Fundamentos`, `orden: 2`, minutos,
    fuentes y quiz de 3 a 5 preguntas con explicación. Fuentes: ISO/IEC 7498-1, RFC 1122,
    IEEE Std 802, IEEE 802.2, IEEE 802.3, RFC 791, RFC 9293, RFC 894, registro de números de
    protocolo de IANA, RFC 9110, RFC 5737, RFC 9542, Stallings (pregunta 5) y el apunte de la
    cátedra «Introducción y Modelo OSI».
  - Idea central.
  - Simulación: `Simulation` con los escenarios «Modelo OSI» y «TCP/IP real» y la vista
    `'pila'`.
  - Formato: la trama completa con `Pdu` estática (partes, tamaños y desplazamientos) y, de
    cada encabezado, el campo que identifica la capa de arriba.
  - Sección propia «OSI, TCP/IP e IEEE 802» con `ModelComparison` (decisión transversal 2).
  - ¿Qué pasa si…?: llega una trama con error (se descarta en la capa 2) y hay un router en
    el medio (sube solo hasta la capa 3).
  - Un `Callout variante="simplificacion"` cerca de cada simplificación.
  - Resumen con 3 a 5 puntos.
- `CLAUDE.md`: plantilla ajustada (decisión transversal 2).
- `tests/e2e/ayudas.ts`: `revisarPlantilla(page)`, que comprueba que las secciones de una
  página de módulo están en el orden de la plantilla. La van a usar todos los módulos que
  vengan (y la skill «nuevo-modulo» de la Etapa 3).
- e2e del módulo: la página carga; `revisarPlantilla`; los tamaños mostrados son 14, 20, 20 y
  4 bytes; la simulación se recorre con teclado en los dos escenarios; axe; 360 px.
- e2e que suponían que no había módulos visibles (`layout.spec.ts`, `progreso.spec.ts`): el
  estado vacío se sigue probando en `/demo/` (sección «Sin módulos»); el inicio y `/capas/`
  muestran el módulo; el indicador TTL dice «0 de 1 salto».

**Checklist**

- [ ] El módulo sigue la plantilla (con el ajuste aprobado).
- [ ] Cada dato técnico del texto, de la simulación y del quiz tiene su fuente en el
      frontmatter.
- [ ] Ningún párrafo, figura ni tabla copiados del apunte ni de Stallings.
- [ ] Las diferencias entre el apunte y los estándares (por ejemplo, cuántas capas tiene
      TCP/IP) están aclaradas en el módulo.
- [ ] El módulo aparece en el inicio, en `/capas/` y en el indicador TTL; el de ejemplo
      sigue oculto.
- [ ] Las islas usan `client:visible`; `Pdu` y `ModelComparison` no cargan JavaScript.

---

## 2.8 · Módulo «Redes: tipos y conmutación»

**Rama:** `feat/module-network-types` · **Depende de:** 2.4, 2.6, 2.7 · **Commit tipo:**
`feat(content): …`

Depende de la 2.7 porque usa el ajuste de plantilla y `revisarPlantilla`, y porque la 2.7 ya
adaptó los e2e al primer módulo visible.

**Entregables**

- `src/content/modules/redes-y-conmutacion.mdx`:
  - Frontmatter: bloque `Fundamentos`, `orden: 1`, capas (propuesta: `[3]`, porque el apunte
    ubica las funciones de conmutación en la capa de red), fuentes y quiz.
  - Idea central.
  - Simulación: `Simulation` con los escenarios «Circuitos» y «Paquetes».
  - Formato: se omite, porque el tema no tiene un encabezado propio (pregunta 2).
  - Sección propia «Redes según su extensión» (pregunta 3), con sus fuentes.
  - ¿Qué pasa si se cae un enlace?, con los dos escenarios de la 2.6.
  - Resumen con 3 a 5 puntos.
- El módulo OSI pasa a tenerlo como prerrequisito.
- e2e del módulo: `revisarPlantilla` (con Formato opcional); navegación anterior/siguiente
  entre los dos módulos; el indicador TTL dice «0 de 2 saltos»; axe; teclado; 360 px.

**Checklist**

- [ ] Los alcances de cada tipo de red se describen sin cifras inventadas: solo las que da
      una fuente citada.
- [ ] La simulación se entiende sin ver colores.
- [ ] El orden de los módulos en el sitio sigue al de la cátedra: primero este, después OSI.

---

## 2.9 · Cierre de la etapa: revisión del piloto y release v0.2.0

**Rama:** `chore/release-0.2.0` · **Depende de:** todas · **Commit tipo:** `chore: …` /
`docs: …`

**Entregables**

- **Revisión del piloto** (nota de la etapa en LINEAMIENTOS §8): estudiar con los módulos
  publicados, idealmente explicándole el tema a otra persona, y anotar qué no sirvió. Los
  ajustes chicos de la plantilla se hacen acá y se documentan en `CLAUDE.md`; los grandes van
  a una issue que se resuelve antes de empezar la Etapa 3.
- **Revisión técnica**: cada dato de los dos módulos contra su fuente (tamaños, EtherType,
  número de protocolo, puerto, direcciones de documentación, nombres de PDU, terminología de
  Stallings).
- Medición de Lighthouse en las dos páginas de módulo, registrada en el PR (el objetivo de
  90 es de la Etapa 15; acá solo se mide).
- `/demo/` y el recorrido de `demo.spec.ts` incluyen todas las secciones nuevas.
- `CHANGELOG.md` con la entrada v0.2.0; `package.json` en `0.2.0`; README («Qué incluye
  hoy»: los primeros módulos); `CLAUDE.md` con las convenciones nuevas (escenarios, vista de
  pila, secciones propias, Formato opcional).
- Después del merge: tag `v0.2.0`, release en GitHub con el changelog y cierre del milestone.

**Checklist (Terminado cuando, LINEAMIENTOS §8)**

- [ ] Los módulos cumplen la plantilla completa (con el ajuste aprobado).
- [ ] Los tamaños de encabezado mostrados coinciden con los mínimos reales: 20 bytes TCP,
      20 bytes IPv4, 14 bytes Ethernet más 4 de FCS.
- [ ] La revisión del piloto está registrada (ajustes hechos o issues abiertas).
- [ ] El sitio publicado en GitHub Pages muestra los módulos.
- [ ] Todas las issues del milestone «Etapa 2» están cerradas.
- [ ] Tag `v0.2.0` creado y release publicada.

---

## Preguntas resueltas

Se resolvieron el 2026-11-07 aceptando todas las propuestas. La columna «Antes de» indica qué
pieza necesita cada decisión.

| #   | Pregunta                                                                                                                                                          | Decisión                                                                                                                                                                                                                        | Antes de |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | ¿Uno o dos módulos?                                                                                                                                               | Dos: «Redes: tipos y conmutación» y «Modelo OSI y encapsulamiento» (decisión transversal 1).                                                                                                                                    | 2.7      |
| 2   | ¿Se ajusta la plantilla (Formato opcional, secciones propias)?                                                                                                    | Sí, como dice la decisión transversal 2. Es lo que la nota de la etapa le pide al piloto.                                                                                                                                       | 2.7      |
| 3   | Clasificación de redes: los lineamientos dicen PAN, LAN, MAN y WAN; el apunte y las notas de la cátedra, LAN, WAN y GAN. ¿Cuáles se muestran?                     | Las cinco, de menor a mayor alcance, marcando las tres que usa la cátedra. PAN y MAN se respaldan con IEEE Std 802 e IEEE 802.15.                                                                                               | 2.8      |
| 4   | ¿TCP/IP en 4 o en 5 capas?                                                                                                                                        | 4, como el apunte de la cátedra y RFC 1122 §1.3.1 (aplicación, transporte, internet, enlace). Si Stallings usa otra división, se aclara en una nota del módulo.                                                                 | 2.2      |
| 5   | ¿Qué edición de Stallings usa la cátedra y qué capítulos corresponden? En `fuentes/` no hay ninguno.                                                              | Se indica la edición y se copian los capítulos a `fuentes/` (pendiente en «Antes de empezar»). Mientras tanto, el motor cita estándares y RFC; la cita de Stallings en el frontmatter se completa antes del merge de 2.7 y 2.8. | 2.2      |
| 6   | Notación del modelo OSI genérico.                                                                                                                                 | La del apunte (AH, PH, SH, TH, NH, LH y LT; A-PDU a DL-PDU), con la equivalencia de ISO/IEC 7498-1 ((N)-PCI, (N)-PDU) en una nota. Si Stallings usa otra, manda Stallings.                                                      | 2.2      |
| 7   | ¿Qué aplicación usa el ejemplo TCP/IP?                                                                                                                            | Un pedido HTTP corto (puerto 80, RFC 9110), marcado «[Ejemplo]», de al menos 6 bytes.                                                                                                                                           | 2.2      |
| 8   | El apunte también trae organizaciones de normalización, topologías (bus, anillo, estrella) y primitivas de servicio, que no están en los entregables de la etapa. | Quedan fuera de la etapa (regla de alcance) y van a una issue «futuro» para decidir dónde entran.                                                                                                                               | 2.7      |
