# TimeToLearn · TTL

> Proyecto · Redes de Computadoras
>
> Sitio web interactivo para entender cómo funcionan los protocolos de red.
> Lineamientos, stack tecnológico y plan de implementación por etapas.
>
> Fuente: `docs/time-to-learn-lineamientos.pdf` (convertido a Markdown para versionarlo y consultarlo).

| Ítem        | Definición                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Qué es      | Un sitio estático con módulos interactivos: cada protocolo se explica con una simulación paso a paso, el formato real de sus encabezados y un quiz de repaso. |
| Para quién  | Estudiantes de Redes (la materia actual como primer público). Debe servir para estudiar antes de un parcial y para explicarle un tema a otra persona. |
| Dónde vive  | Repositorio público en GitHub, publicado con GitHub Pages y desplegado automáticamente en cada cambio a la rama principal.                        |
| Cómo avanza | En 16 etapas (0 a 15). Cada etapa termina con un release versionado y un sitio funcionando.                                                       |

El nombre juega con el campo TTL (Time To Live) de IPv4: cada módulo completado es un salto más en el recorrido. Repositorio sugerido: `time-to-learn`.

---

## 1. Visión y objetivos

El proyecto busca que una persona pueda ver lo que pasa dentro de una red: qué bytes se agregan en cada capa, cómo un switch decide por qué puerto reenviar una trama, por qué TCP necesita tres mensajes para abrir una conexión. Los apuntes explican; el sitio muestra.

### Objetivos concretos

- Cubrir el programa de la materia: modelo OSI, Ethernet, switches, Spanning Tree, VLAN, IP y ARP, ruteo e ICMP, TCP y UDP, DHCP y DNS, Wireless LAN y tecnologías WAN (HDLC, Frame Relay, ATM, MPLS).
- Que cada módulo tenga una simulación que el usuario controla paso a paso, no una animación que pasa sola.
- Que todo dato técnico (tamaños de campos, valores, comportamientos) coincida con el estándar o RFC correspondiente.
- Que el proyecto sea un repositorio profesional: código tipado, tests, integración continua, issues y releases. Sirve también como pieza de portfolio.
- Que agregar un protocolo nuevo sea predecible: misma estructura, mismos componentes, mismo nivel de detalle.

### Fuera de alcance (por ahora)

- Capturar tráfico real de la red del usuario. Todo es simulado y determinístico.
- Cuentas de usuario, backend o base de datos. El progreso del quiz se guarda solo en el navegador.
- Protocolos de capa de aplicación en profundidad (HTTP, TLS, correo). Pueden ser una extensión futura.

---

## 2. Principios pedagógicos

| Principio                    | Qué significa en la práctica                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Interacción antes que texto  | Cada concepto se puede manipular: elegir el destino de una trama, desconectar un cable, perder un segmento TCP. El texto acompaña a la simulación, no al revés. |
| El usuario maneja el ritmo   | Controles de paso: anterior, siguiente, reiniciar, reproducir. Cada paso tiene una explicación de una o dos frases.                           |
| Bytes reales                 | Los encabezados se muestran con sus campos, tamaños en bits o bytes y valores de ejemplo válidos (MAC, EtherType, TTL, flags TCP).            |
| Casos «qué pasa si»          | Cada módulo incluye al menos un escenario de falla o borde: colisión, MAC desconocida, VLAN distinta, paquete perdido, nodo oculto.          |
| Repaso activo                | Quiz corto al final de cada módulo, con explicación de la respuesta correcta.                                                                 |
| Una idea por pantalla        | Cada sección explica una sola cosa. Si un módulo crece demasiado, se divide.                                                                  |

---

## 3. Stack tecnológico

El criterio general: herramientas estándar de la industria, que se puedan desplegar gratis y que no exijan un servidor. El sitio es estático; toda la lógica corre en el navegador.

| Área                       | Tecnología                                  | Por qué                                                                                                                                  |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Framework del sitio        | Astro                                       | Genera un sitio estático rápido. Permite escribir contenido en MDX y montar componentes interactivos solo donde hacen falta («islas»).   |
| Componentes interactivos   | React                                       | El estándar más difundido para interfaces. Se usa solo dentro de las simulaciones, no en todo el sitio.                                  |
| Lenguaje                   | TypeScript (modo estricto)                  | Los formatos de trama y paquete se modelan como tipos; el compilador atrapa errores como un campo de tamaño incorrecto.                  |
| Contenido                  | MDX + Content Collections de Astro          | Texto en Markdown con componentes embebidos. Los metadatos de cada módulo (orden, capa, fuentes) se validan con un esquema.              |
| Estilos                    | CSS nativo con variables (tokens) y CSS Modules | Sin dependencias extra. Los tokens definen colores por capa OSI, tipografía y espaciado, con tema claro y oscuro.                     |
| Gráficos y animación       | SVG generado desde React + Web Animations API | Los diagramas de red y los paquetes en movimiento se dibujan en SVG. Sin librerías de animación pesadas.                               |
| Tests de lógica            | Vitest                                      | Prueba el motor de simulación: que el switch aprenda la MAC correcta, que el checksum dé lo esperado, etc.                              |
| Tests de punta a punta     | Playwright                                  | Verifica que cada página cargue y que los controles de las simulaciones respondan.                                                       |
| Calidad de código          | ESLint, Prettier, `astro check`             | Estilo uniforme y chequeo de tipos en cada cambio.                                                                                       |
| Gestor de paquetes         | pnpm                                        | Rápido y con lockfile estricto. Node.js en su versión LTS vigente.                                                                       |
| Integración continua       | GitHub Actions                              | En cada Pull Request: lint, tipos, tests y build. Si algo falla, no se puede mergear.                                                    |
| Hosting                    | GitHub Pages                                | Gratis, integrado con el repositorio, despliegue automático desde la rama `main`.                                                        |
| Asistencia de desarrollo   | Claude Code                                 | Implementa cada etapa a partir de este documento y del archivo `CLAUDE.md` del repositorio. Ver sección 9.                              |

### Alternativas descartadas

- **Next.js**: más potente, pero orientado a aplicaciones con servidor. Para un sitio de contenido estático, Astro es más simple.
- **Tailwind CSS**: útil, pero agrega una capa de aprendizaje. Con pocos componentes, CSS nativo con tokens alcanza.
- **Librerías de simulación de redes** (por ejemplo, emuladores completos): exceden el objetivo. Un motor propio y chico es más fácil de explicar y de testear.

---

## 4. Arquitectura

La decisión más importante del proyecto es separar la lógica de los protocolos de su visualización.

### Motor de simulación

Código TypeScript puro, sin React ni DOM. Recibe un escenario (topología, tramas a enviar, eventos) y devuelve una línea de tiempo: una lista ordenada de pasos. Cada paso describe qué paquete está dónde, qué cambió en el estado (por ejemplo, una entrada nueva en la tabla MAC) y una explicación en texto. Es determinístico: el mismo escenario siempre produce los mismos pasos, y por eso se puede testear con Vitest.

### Capa visual

Componentes React que reciben la línea de tiempo y la dibujan. No saben nada de protocolos: solo muestran el paso actual. Los controles (anterior, siguiente, reproducir) mueven un índice sobre la lista de pasos.

### Ventajas

- Un error en el comportamiento del protocolo se detecta en un test, no mirando una animación.
- Retroceder un paso es trivial: se muestra el paso anterior de la lista.
- Los mismos componentes visuales (topología, paquete, tabla de estado) sirven para todos los módulos.

### Estructura del repositorio

```text
time-to-learn/
├── .github/
│   ├── workflows/ci.yml      # lint, tipos, tests, build
│   ├── workflows/deploy.yml  # publica en GitHub Pages
│   └── ISSUE_TEMPLATE/       # plantillas: módulo, bug, error técnico
├── src/
│   ├── engine/               # motor puro (sin React)
│   │   ├── core/             # timeline, tipos base, utilidades de bytes
│   │   ├── ethernet/         # trama, MAC, CSMA/CD
│   │   ├── switching/        # bridge, switch, tabla MAC
│   │   ├── stp/ vlan/ ip/ arp/ routing/ icmp/
│   │   ├── tcp/ udp/ dhcp/ dns/ wlan/ wan/
│   │   └── **/*.test.ts      # tests junto al código
│   ├── components/
│   │   ├── sim/              # Topology, Packet, StepControls, StateTable
│   │   ├── headers/          # HeaderFormat (campos y tamaños)
│   │   └── learn/            # Quiz, Callout, WhatIf
│   ├── content/modules/      # un .mdx por módulo
│   └── layouts/ pages/ styles/tokens.css
├── tests/e2e/                # Playwright
├── fuentes/                  # PDFs de la cátedra (en .gitignore, nunca se sube)
├── CLAUDE.md                 # reglas del proyecto para Claude Code
└── CONTRIBUTING.md LICENSE README.md
```

---

## 5. Flujo de trabajo en GitHub

| Práctica      | Regla                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ramas         | `main` siempre publicable y protegida (no se commitea directo). Cada tarea en una rama: `feat/switch-mac-table`, `fix/tcp-seq-number`, `docs/readme`.          |
| Pull Requests | Todo cambio entra por PR. La CI tiene que pasar. Aunque trabajes solo, revisá el diff antes de mergear: es donde se detectan errores de Claude Code.          |
| Commits       | Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`. Ejemplo: «feat(switching): agregar aging de entradas MAC».                    |
| Issues        | Una issue por tarea concreta. Plantillas para «nuevo módulo», «bug» y «error técnico en el contenido».                                                        |
| Milestones    | Un milestone por etapa (Etapa 0, Etapa 1, …). Una etapa se cierra cuando todas sus issues están cerradas.                                                     |
| Tablero       | GitHub Projects con columnas Pendiente / En curso / En revisión / Hecho.                                                                                      |
| Releases      | Un tag por etapa terminada: v0.1.0 (Etapa 1), v0.2.0 (Etapa 2)… v1.0.0 al cerrar la Etapa 15. Changelog en cada release.                                      |
| Licencias     | Código bajo MIT. Contenido educativo (textos, diagramas) bajo CC BY-SA 4.0.                                                                                   |

---

## 6. Estándar de cada módulo

Todos los módulos siguen la misma plantilla. Esto hace que el sitio se sienta como un todo y que agregar uno nuevo sea mecánico.

| Sección       | Contenido                                                                     | Componente                              |
| ------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| Encabezado    | Nombre, capa OSI (con su color), tiempo estimado de lectura, temas previos recomendados. | `ModuleHeader`               |
| Idea central  | Dos o tres frases: qué problema resuelve el protocolo.                        | Texto MDX                               |
| Simulación    | Escenario interactivo paso a paso, con explicación por paso.                  | `Topology` + `StepControls` + `StateTable` |
| Formato       | Encabezado real con campos, tamaños y un ejemplo con valores válidos.         | `HeaderFormat`                          |
| Qué pasa si…  | Uno o más escenarios de falla o caso borde.                                   | `WhatIf`                                |
| Resumen       | Tres a cinco puntos para repasar.                                             | `Callout`                               |
| Quiz          | Tres a cinco preguntas con explicación.                                       | `Quiz`                                  |
| Fuentes       | Estándar o RFC y capítulo de la bibliografía de la cátedra.                   | Frontmatter                             |

### Precisión técnica

- Referencia principal: William Stallings, que es la bibliografía que usa la cátedra. La terminología, la notación y los ejemplos resueltos (fragmentación con MTU de 620 bytes, crédito en TCP, operación de HDLC) siguen a Stallings.
- Cada dato técnico se apoya además en una fuente primaria: IEEE 802.3 (Ethernet), 802.1D y 802.1w (bridges y STP), 802.1Q (VLAN), 802.11 (WLAN), RFC 791 (IPv4), RFC 826 (ARP), RFC 792 (ICMP), RFC 768 (UDP), RFC 9293 (TCP), RFC 2131 (DHCP), RFC 1034 y 1035 (DNS), RFC 4301 (IPsec), RFC 3031 y 3032 (MPLS), ISO/IEC 13239 (HDLC).
- Los apuntes de la materia en Notion y los PDFs de la cátedra definen el alcance y el orden. Si un apunte y un estándar difieren, se sigue al estándar y se aclara la diferencia en el módulo.
- Las simplificaciones se declaran. Ejemplo: «este simulador no modela el preámbulo de Ethernet».
- Los valores de ejemplo son válidos: MAC con formato correcto, EtherType 0x0800 para IPv4, checksums calculados de verdad.

### Material de referencia y derechos de autor

- Los PDFs de la cátedra y los capítulos de Stallings van en la carpeta `fuentes/` del proyecto. Claude Code los puede leer mientras trabaja.
- `fuentes/` está en el `.gitignore` desde la Etapa 0. Como el repositorio es público, ese material no se sube nunca: tiene derechos de autor de la cátedra y de la editorial.
- Los apuntes de Notion se consultan conectando Notion a Claude Code, sin copiarlos al repositorio.
- El contenido del sitio se escribe con palabras propias. No se copian párrafos, figuras ni tablas de los libros; se citan como fuente en el frontmatter del módulo.

---

## 7. Diseño y accesibilidad

- **Color por capa**: cada capa OSI tiene un color fijo que se usa en todo el sitio (en la navegación, en los encabezados de los paquetes, en los diagramas). Así se reconoce de un vistazo qué parte de un paquete pertenece a qué capa.
- **Tema claro y oscuro**, siguiendo la preferencia del sistema operativo.
- **Responsive**: las simulaciones funcionan en el celular. En pantallas chicas los diagramas se apilan o permiten desplazamiento horizontal propio.
- **Teclado**: las simulaciones se controlan con flechas izquierda y derecha y la barra espaciadora.
- **Movimiento reducido**: si el sistema pide menos animación, los paquetes cambian de posición sin desplazarse.
- **Contraste**: texto con contraste AA como mínimo; el color nunca es la única forma de transmitir información.
- **Rendimiento**: cada página carga JavaScript solo para sus simulaciones. Objetivo de Lighthouse: 90 o más en todas las categorías.

---

## 8. Etapas de implementación

Cada etapa es una unidad cerrada: al terminarla, el sitio publicado funciona y suma algo visible. No se empieza una etapa sin cerrar la anterior. Las etapas 2 a 13 cubren el programa de la materia según los apuntes en Notion; si en clase el orden cambia, se reordenan.

| Etapa | Nombre                                 | Bloque      | Versión |
| ----- | -------------------------------------- | ----------- | ------- |
| 0     | Fundaciones del repositorio            | Base        | v0.0.1  |
| 1     | Sistema base y componentes compartidos | Base        | v0.1.0  |
| 2     | Modelo OSI y encapsulamiento           | Fundamentos | v0.2.0  |
| 3     | Ethernet                               | LAN         | v0.3.0  |
| 4     | Bridges y switches                     | LAN         | v0.4.0  |
| 5     | Spanning Tree Protocol                 | LAN         | v0.5.0  |
| 6     | VLAN                                   | LAN         | v0.6.0  |
| 7     | IP, ARP y subnetting                   | Red         | v0.7.0  |
| 8     | Ruteo, ICMP y VPN                      | Red         | v0.8.0  |
| 9     | TCP y UDP                              | Transporte  | v0.9.0  |
| 10    | DHCP y DNS                             | Servicios   | v0.10.0 |
| 11    | Wireless LAN                           | LAN         | v0.11.0 |
| 12    | WAN, HDLC y Frame Relay                | WAN         | v0.12.0 |
| 13    | ATM y MPLS                             | WAN         | v0.13.0 |
| 14    | Escenario integrador                   | Cierre      | v0.14.0 |
| 15    | Pulido y lanzamiento                   | Cierre      | v1.0.0  |

### Etapa 0 · Fundaciones del repositorio

**Objetivo.** Tener el proyecto creado, con calidad automatizada, aunque todavía muestre solo una página de inicio. Se empieza en una carpeta local y se sube a GitHub cuando haga falta publicar.

**Entregables**

- Carpeta `time-to-learn` con git inicializado, README, LICENSE, CONTRIBUTING.md y `.gitignore` (que incluye la carpeta `fuentes/`).
- Proyecto Astro + React + TypeScript estricto, gestionado con pnpm.
- ESLint, Prettier, Vitest y Playwright configurados, con un test de ejemplo de cada tipo.
- Workflow de CI (lint, tipos, tests, build) y workflow de deploy a GitHub Pages, listos para cuando exista el repositorio remoto.
- `CLAUDE.md` con las reglas de este documento (ver sección 9).
- Al subir a GitHub: rama `main` protegida, plantillas de issues y milestones de todas las etapas.

**Terminado cuando**

- Correr `pnpm install` y `pnpm dev` funciona sin pasos extra.
- `git status` no muestra nada de `fuentes/` aunque haya PDFs adentro.
- Una vez en GitHub, el sitio está publicado y un PR con un test roto queda bloqueado por la CI.

### Etapa 1 · Sistema base y componentes compartidos

**Objetivo.** Construir el esqueleto visual y el motor genérico que van a usar todos los módulos.

**Entregables**

- Tokens de diseño: colores por capa OSI, tipografía, espaciado, tema claro y oscuro.
- Layout del sitio: navegación por capas y por bloque (LAN, Red, Transporte, Servicios, WAN), página de inicio con índice de módulos, página de módulo.
- Content Collection de módulos con esquema validado (título, capa, bloque, orden, fuentes, prerrequisitos).
- Motor: tipos base de Timeline y Step, utilidades de bytes (hex, binario, checksum).
- Componentes: StepControls, Topology (nodos y enlaces en SVG), Packet, StateTable, HeaderFormat, Quiz, Callout, WhatIf.
- Indicador de progreso con la metáfora del TTL: cada módulo completado es un salto.
- Página de demostración interna con todos los componentes y datos de ejemplo.

**Terminado cuando**

- Todos los componentes funcionan con teclado, en tema claro y oscuro, y en ancho de celular.
- Las utilidades del motor tienen tests (por ejemplo, el checksum de Internet sobre un caso conocido).

### Etapa 2 · Modelo OSI y encapsulamiento

**Objetivo.** Primer módulo real: ver cómo un dato de aplicación se envuelve capa por capa hasta convertirse en bits, y cómo se desenvuelve del otro lado.

**Entregables**

- Clasificación de redes (PAN, LAN, MAN, WAN) y conmutación de circuitos frente a paquetes.
- Simulación de encapsulamiento y desencapsulamiento entre dos hosts, con el aporte de cada capa resaltado en su color.
- Comparación OSI frente a TCP/IP y modelo IEEE 802 (LLC y MAC) frente a OSI.
- Nombre de la PDU en cada capa.
- Quiz del módulo.

**Terminado cuando**

- El módulo cumple la plantilla completa de la sección 6.
- Los tamaños de encabezado mostrados coinciden con los mínimos reales (20 bytes TCP, 20 bytes IPv4, 14 bytes Ethernet más 4 de FCS).

**Notas.** Este módulo sirve de piloto. Si el formato no resulta útil para estudiar, se ajusta la plantilla antes de seguir.

### Etapa 3 · Ethernet

**Objetivo.** Explicar la trama Ethernet, el direccionamiento MAC y el acceso al medio compartido.

**Entregables**

- Formato de trama Ethernet II y 802.3 con todos sus campos, incluido el cálculo del FCS (CRC-32).
- Direcciones MAC: OUI, unicast frente a multicast y broadcast, bit U/L.
- Simulación de CSMA/CD en un bus compartido: detección de portadora, colisión, señal de jam, backoff exponencial binario.
- Qué pasa si: dos estaciones transmiten a la vez; trama más corta que 64 bytes.

**Terminado cuando**

- El motor genera colisiones y backoff reproducibles (con semilla fija) y testeados.
- El CRC-32 calculado coincide con el de un ejemplo de referencia.

**Notas.** Al terminar esta etapa conviene crear la skill «nuevo-modulo» (ver sección 9), porque ya hay dos módulos de referencia.

### Etapa 4 · Bridges y switches

**Objetivo.** Mostrar cómo un switch aprende direcciones y decide por dónde reenviar.

**Entregables**

- Simulación de aprendizaje de la tabla MAC: filtrado, reenvío y flooding.
- Aging de entradas de la tabla.
- Diferencia entre hub, bridge y switch; dominios de colisión frente a dominios de broadcast.
- Modos de conmutación: store-and-forward, cut-through y fragment-free.
- Qué pasa si: destino desconocido; trama broadcast.

**Terminado cuando**

- El usuario puede elegir origen y destino y ver cómo cambia la tabla en cada paso.
- Tests del motor cubren aprendizaje, reenvío, flooding y expiración.

### Etapa 5 · Spanning Tree Protocol

**Objetivo.** Mostrar por qué los bucles son un problema en una LAN conmutada y cómo STP los elimina sin perder redundancia.

**Entregables**

- Simulación de tormenta de broadcast en una topología con bucle y sin STP.
- Elección del root bridge por Bridge ID (prioridad y MAC).
- Cálculo de costos de camino, root port y designated port; puertos bloqueados.
- Estados de los puertos (blocking, listening, learning, forwarding) y BPDU.
- Qué pasa si: se cae un enlace activo y la topología reconverge.
- Mención de RSTP (802.1w) y sus diferencias principales.

**Terminado cuando**

- El motor elige el mismo root bridge y los mismos roles de puerto que un ejemplo resuelto en los apuntes.
- El usuario puede cortar un enlace y ver la reconvergencia paso a paso.

### Etapa 6 · VLAN

**Objetivo.** Explicar cómo se segmenta una LAN en varias redes lógicas sobre el mismo hardware.

**Entregables**

- Etiqueta 802.1Q: TPID 0x8100, PCP, DEI, VID de 12 bits.
- Puertos access frente a trunk; VLAN nativa; VLAN de management.
- Simulación con dos switches unidos por un trunk y hosts en distintas VLAN.
- Qué pasa si: un host intenta comunicarse con otra VLAN sin router.

**Terminado cuando**

- La simulación muestra cuándo se agrega y cuándo se quita la etiqueta.
- El broadcast queda contenido en su VLAN y esto está cubierto por tests.

### Etapa 7 · IP, ARP y subnetting

**Objetivo.** Pasar de la capa de enlace a la de red: direcciones IP, resolución de MAC y decisión de entrega.

**Entregables**

- Formato del datagrama IPv4 con checksum calculado.
- Clases, CIDR, direcciones privadas y especiales.
- Calculadora de subnetting interactiva (red, broadcast, rango de hosts, CIDR y máscara), incluido VLSM.
- Simulación de ARP: request en broadcast, reply en unicast, caché ARP.
- Decisión «misma red o gateway» y decremento de TTL.
- Fragmentación IPv4, usando el ejemplo de Stallings del enlace con MTU de 620 bytes.
- Introducción a IPv6: formato de dirección y encabezado.

**Terminado cuando**

- La calculadora de subnetting tiene tests con casos borde (/31, /32, /0).
- La fragmentación reproduce los offsets y flags del ejemplo de Stallings.

### Etapa 8 · Ruteo, ICMP y VPN

**Objetivo.** Mostrar cómo un paquete encuentra su camino entre redes y cómo se informan los errores.

**Entregables**

- Tabla de ruteo: rutas directas, estáticas y por defecto; coincidencia de prefijo más largo.
- Simulación de un paquete atravesando varios routers, con TTL decrementando en cada salto.
- Ruteo dinámico: vector distancia frente a estado de enlace, en versión conceptual.
- ICMP: tipos de mensaje principales; ping y traceroute (que funciona jugando con el TTL).
- VPN con IPsec: modo túnel frente a transporte, AH y ESP, qué parte del paquete se cifra.
- NAT y PAT.

**Terminado cuando**

- La simulación de traceroute genera los mensajes «Time Exceeded» correctos en cada salto.
- La coincidencia de prefijo más largo tiene tests con rutas superpuestas.

### Etapa 9 · TCP y UDP

**Objetivo.** Mostrar cómo TCP construye un canal confiable sobre una red que no lo es, y cuándo alcanza con UDP.

**Entregables**

- Formato del segmento TCP y sus flags; formato del datagrama UDP.
- Puertos y sockets; multiplexación.
- Three-way handshake con intercambio de opciones (MSS, Window Scale) y cierre con FIN.
- Números de secuencia y ACK avanzando con los datos.
- Control de flujo por crédito y ventana deslizante, siguiendo el ejemplo de Stallings.
- Pérdida de segmento, timeout y retransmisión; control de congestión en versión conceptual.
- Comparación TCP frente a UDP con casos de uso.

**Terminado cuando**

- El usuario puede «perder» un segmento elegido y ver la retransmisión.
- Los números de secuencia, ACK y crédito coinciden con el ejemplo de referencia.

### Etapa 10 · DHCP y DNS

**Objetivo.** Explicar los dos servicios que hacen que una red sea usable sin configurar todo a mano.

**Entregables**

- DHCP: secuencia DORA (Discover, Offer, Request, Ack), leases y relay agent.
- DNS: jerarquía de dominios, servidores raíz, TLD y autoritativos; resolución recursiva frente a iterativa; caché y tipos de registro.
- Simulación de una PC que arranca sin configuración, obtiene IP por DHCP y resuelve un nombre por DNS.
- Qué pasa si: no hay servidor DHCP en la subred; la respuesta DNS está en caché.

**Terminado cuando**

- La secuencia DHCP usa broadcast y unicast donde corresponde.
- La resolución DNS muestra cada consulta y cada respuesta con su servidor.

### Etapa 11 · Wireless LAN

**Objetivo.** Explicar qué cambia cuando el medio es el aire.

**Entregables**

- Arquitectura 802.11: estación, punto de acceso, BSS, ESS.
- Bandas de 2,4 GHz y 5 GHz, canales y superposición.
- CSMA/CA y por qué no se usa CSMA/CD en redes inalámbricas.
- Problema del nodo oculto y del nodo expuesto; solución con RTS/CTS.
- Trama 802.11 y sus cuatro campos de dirección.
- Adaptación dinámica de velocidad y fragmentación en 802.11.

**Terminado cuando**

- La simulación del nodo oculto muestra la colisión sin RTS/CTS y su ausencia con RTS/CTS.
- El significado de cada dirección de la trama cambia correctamente según los bits To DS y From DS.

### Etapa 12 · WAN, HDLC y Frame Relay

**Objetivo.** Pasar de la LAN a los enlaces de larga distancia.

**Entregables**

- Tecnologías WAN: líneas dedicadas, conmutación de circuitos y de paquetes, circuitos virtuales.
- HDLC: formato de trama, bit stuffing, tipos de trama (I, S, U) y modos de operación.
- Simulación de intercambio HDLC con números de secuencia, siguiendo los ejemplos de Stallings.
- Frame Relay: DLCI, CIR y ráfagas, bits FECN, BECN y DE.

**Terminado cuando**

- El bit stuffing tiene tests de ida y vuelta.
- El intercambio HDLC coincide con un ejemplo de referencia.

### Etapa 13 · ATM y MPLS

**Objetivo.** Cerrar el bloque WAN con conmutación de celdas y de etiquetas.

**Entregables**

- ATM: celda de 53 bytes (5 de encabezado y 48 de carga), VPI y VCI, clases de servicio.
- MPLS: etiqueta de 32 bits, LSR y LER, operaciones push, swap y pop.
- Simulación de un paquete atravesando un dominio MPLS con intercambio de etiquetas.
- Comparación entre conmutación por etiquetas y ruteo IP tradicional.

**Terminado cuando**

- La simulación MPLS muestra la tabla de etiquetas de cada router y la operación aplicada en cada salto.

### Etapa 14 · Escenario integrador

**Objetivo.** Unir todo en un recorrido completo: una PC que arranca, obtiene IP, resuelve un nombre y abre una conexión TCP con un servidor en otra red.

**Entregables**

- Escenario de punta a punta que reutiliza los motores de las etapas anteriores (DHCP, DNS, ARP, switching, VLAN, ruteo, TCP).
- Vista que permite ver el mismo envío desde distintas capas.
- Quiz integrador que mezcla preguntas de todos los módulos, útil para repasar antes del final.

**Terminado cuando**

- El escenario no duplica lógica: llama a los motores existentes.
- Un recorrido completo se puede seguir paso a paso de principio a fin.

### Etapa 15 · Pulido y lanzamiento

**Objetivo.** Dejar el proyecto listo para compartir con compañeros y para mostrar como portfolio.

**Entregables**

- Revisión técnica de todos los módulos contra sus fuentes.
- Auditoría de accesibilidad y rendimiento (Lighthouse 90 o más).
- Glosario de términos enlazado desde los módulos.
- README final con capturas, cómo contribuir y hoja de ruta futura.
- Release v1.0.0.

**Terminado cuando**

- No hay issues abiertas en el milestone.
- Al menos una persona que cursa la materia lo probó y sus comentarios se registraron como issues.

---

## 9. Cómo trabajar con Claude Code

Claude Code se usa como desarrollador del proyecto. Vos sos quien decide, revisa y aprueba. Estas reglas evitan que el proyecto se desordene.

### CLAUDE.md

Archivo en la raíz del repositorio que Claude Code lee al empezar cada sesión. Debe contener, en forma breve:

- Qué es el proyecto y su público.
- El stack y la regla de arquitectura: el motor no importa React; los componentes no contienen lógica de protocolos.
- La plantilla de módulo de la sección 6.
- Convenciones: Conventional Commits, una rama por tarea, tests obligatorios para todo código del motor.
- Comandos: `pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm build`.
- Regla de precisión: no inventar valores; citar estándar o RFC en el frontmatter.

### Skill «nuevo-modulo»

Después de la Etapa 3, con dos módulos de referencia hechos, se crea una skill del proyecto que describe paso a paso cómo agregar un módulo: crear la carpeta del motor, escribir los tipos y los tests, crear el MDX con la plantilla, registrar las fuentes y agregar el quiz. Desde la Etapa 4 cada módulo nuevo se pide usando esa skill.

### Agentes

No hacen falta para el día a día. Pueden ser útiles en la Etapa 15 para una revisión independiente: un agente que audite la precisión técnica de un módulo sin haber participado en escribirlo.

### Ritmo de trabajo sugerido

- Una sesión de Claude Code por issue o por grupo chico de issues, no por etapa entera.
- Pedir primero un plan breve, aprobarlo y después pedir la implementación.
- Cada sesión termina en un PR. Revisás el diff, probás la vista previa y mergeás.
- Si algo técnico no te cierra con lo que viste en clase, abrí una issue de «error técnico» antes de mergear.

---

## 10. Riesgos y cómo manejarlos

| Riesgo                              | Mitigación                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Errores técnicos en el contenido    | Fuentes obligatorias por módulo, tests del motor contra ejemplos de referencia y revisión en la Etapa 15.          |
| El alcance crece sin control        | Cada etapa tiene entregables cerrados. Las ideas nuevas van a issues con la etiqueta «futuro», no a la etapa en curso. |
| Simulaciones demasiado complejas    | Empezar con el caso feliz, después agregar un «qué pasa si». Declarar simplificaciones.                             |
| Abandono a mitad de camino          | Cada etapa deja algo publicado y útil. Aunque el proyecto se frene en la Etapa 5, lo hecho sirve para estudiar.     |
| Código generado que no entendés     | Revisar cada PR. Si una parte no se entiende, pedir que se explique antes de mergear.                               |

---

## 11. Decisiones tomadas

| Decisión          | Resultado                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Nombre            | TimeToLearn (TTL). Repositorio: `time-to-learn`.                                                                                |
| Inicio            | Carpeta local con git inicializado; se sube a GitHub cuando haga falta publicar.                                                |
| Visibilidad       | Público al subirlo, porque GitHub Pages gratuito lo requiere. Claude Code funciona igual con repositorios privados o solo locales. |
| Bibliografía      | Stallings, más los apuntes en Notion y los PDFs de la cátedra (en `fuentes/`, fuera de git).                                    |
| Orden de módulos  | El de la sección 8, confirmado.                                                                                                 |

### Pendiente

- Idioma del sitio: español solamente, o español con inglés más adelante.
- Conectar Notion a Claude Code para que pueda leer los apuntes.
