# CircuitForge — Sitios de referencia para ingeniería inversa

**Fecha:** 2026-10-25
**Uso:** actividad 1 del cronograma (investigación y estado del arte → "Informe comparativo Tinkercad, SPICE, Wokwi") y como insumo directo para el MCP de ingeniería inversa.
**Estado:** propuesta, pendiente de aprobación del equipo antes de iniciar cualquier análisis.

---

## 0. Reglas de trabajo para la ingeniería inversa

Antes de la lista, tres reglas que el equipo debería acordar por escrito. Son la diferencia entre aprender de un producto y tener un problema legal.

1. **Solo se inspecciona lo observable públicamente y sin autenticación.** HTML servido, CSS público, peticiones de red de una sesión anónima, bundles de JavaScript públicos, documentación, changelogs, APIs abiertas.
2. **Nunca** se eluden autenticación, paywalls, controles de acceso, límites de tasa ni ofuscación; **nunca** se hace *scraping* masivo; **nunca** se copia código propietario, modelos 3D con licencia cerrada, ni se reproduce la identidad visual de otro producto.
3. **Se extraen *patrones* —flujos, estructura de datos, decisiones de UX, arquitectura de API— no activos.** El objetivo es informar nuestras propias decisiones arquitectónicas (ADR), no clonar. Toda skill o modelo que se reutilice debe tener licencia compatible y su autoría registrada.

**Nota sobre el MCP de ingeniería inversa:** úsalo primero sobre los sitios de **referencia técnica de código abierto** (sección 2), donde el análisis es legalmente limpio y directamente reutilizable, y sobre las **APIs públicas** de los productos cerrados (sección 3). Reserva el análisis de *bundles* de JavaScript solo para los productos cerrados de la sección 4, y documenta en el ADR qué patrón se observó y en qué se tradujo.

---

## 1. Prioridad 0 — El referente del video, para delimitar el objetivo

### Constructa (AltumX) — `constructa.altumx.io`

| Campo | Detalle |
|---|---|
| **Qué es** | El producto del video. Flujo integrado CAD → ELEC → WIRING → CODE → SIMULATE en el navegador. |
| **Qué observar** | (a) La estructura de las pestañas ELEC / Mech / Wiring y su taxonomía de categorías. (b) El modelo de datos implícito: cómo asocia un componente 3D a su símbolo electrónico y a sus pines. (c) El panel SIMULATE (ENVIRONMENT con Earth/Moon/Mars/Zero-G) y el HUD del viewport. (d) El editor de código y su serial monitor. |
| **Qué NO copiar** | Modelos 3D, paleta visual, marca, ni el motor de física. Es un producto con inversión; el nuestro tiene 890 h-persona. |
| **Cómo se traduce** | Valida la arquitectura **netlist-first** (D-1) y justifica mantener el 3D fuera del MVP. El panel SIMULATE es la referencia de UX para nuestra fase 2. |
| **Riesgo** | El video ya mostró un producto cerrado y completo. La tentación de igualar el alcance es el riesgo R-1 del análisis. |

**Entregable esperado:** una nota de una página sobre "qué hace Constructa que nosotros deliberadamente no haremos en 8 semanas".

---

## 2. Prioridad 1 — Referencias de código abierto (las de mayor valor real)

Aquí el análisis es legalmente limpio y el resultado es **directamente reutilizable**. Si solo se puede hacer ingeniería inversa de un grupo, que sea de este.

### 2.1 tscircuit — `tscircuit.com` · `github.com/tscircuit`

| Campo | Detalle |
|---|---|
| **Qué es** | Ecosistema de código abierto para definir circuitos **como código** (React/TSX) y renderizarlos. Mantiene el estándar **Circuit JSON**. |
| **Qué observar** | **`circuit-json-to-gltf`** (github.com/tscircuit/circuit-json-to-gltf): cómo convertir la descripción lógica de un circuito en una escena 3D. Es exactamente el puente que CircuitForge necesita para D-1 y la fase 2. Y **Circuit JSON** como candidato de formato de netlist. |
| **Cómo se traduce** | Valida la decisión D-6 (la biblioteca son datos declarativos) y ofrece un formato de serialización probado. Candidato directo para la Task 3 y la Task 13. |
| **Licencia** | Código abierto (verificar por paquete antes de reutilizar). |

### 2.2 circuit-json / netlist como estándar

| Campo | Detalle |
|---|---|
| **Qué observar** | La forma del *Circuit JSON*: cómo nombra componentes, pines, nets y parámetros; cómo versiona. |
| **Cómo se traduce** | Comparar contra nuestro `Project` de la Task 1. Si el formato encaja, adoptarlo en lugar de inventar uno propio ahorra el diseño de serialización completo. |

### 2.3 EEcircuit — `github.com/eelab-dev/EEcircuit`

| Campo | Detalle |
|---|---|
| **Qué es** | Simulador de circuitos del e-Lab (Universidad de Edimburgo). Existe también **EEsim**, del mismo grupo. [cite:db7b408d-2][cite:db7b408d-3] |
| **Qué observar** | Cómo estructura el análisis de circuitos y cómo presenta los resultados a un estudiante. Es un proyecto académico: su enfoque documental encaja con un entregable de asignatura. |
| **Cómo se traduce** | Referencia de UX educativa y de estructura del solver para la Task 5. |

### 2.4 ngspice compilado a WebAssembly — `github.com/z-wasm/ngspice-wasm`

| Campo | Detalle |
|---|---|
| **Qué es** | ngspice corriendo en el navegador. [cite:db7b408d-1] |
| **Qué observar** | Cómo se empaqueta y se comunica el motor con la interfaz (¿Web Worker? ¿WASI?). Es el camino alternativo de D-2 si el solver propio no alcanza el <10 %. |
| **Cómo se traduce** | Se documenta como **plan de escalado**, no como base del MVP. La decisión D-2 sigue siendo solver propio. |

### 2.5 spice-rs — `ferrite-systems.github.io/spice-rs`

| Campo | Detalle |
|---|---|
| **Qué es** | Implementación de SPICE en Rust. [cite:db7b408d-5] |
| **Qué observar** | La estructura interna de un solver SPICE moderno: cómo arma la matriz, cómo maneja los modelos no lineales. |
| **Cómo se traduce** | Referencia de arquitectura del solver, incluso aunque escribamos en TypeScript. Útil sobre todo cuando entren semiconductores (diodos, transistores) en la fase 2. |

### 2.6 CircuitVerse — `circuitverse.org`

| Campo | Detalle |
|---|---|
| **Qué es** | Simulador de lógica digital, código abierto, muy usado en docencia. |
| **Qué observar** | El kernel **digital** puro: cómo modela HIGH/LOW, cómo resuelve la propagación, cómo serializa un diseño digital. |
| **Cómo se traduce** | Referencia directa para la Task 6 (kernel digital y scheduler). Nuestro alcance digital es más simple que el suyo, pero su estructura de eventos discretos es exactamente la que necesitamos. |

### 2.7 protoboard-3d-experimentation — `github.com/lakip03/protoboard-3d-experimentation`

| Campo | Detalle |
|---|---|
| **Qué es** | Protoboard 3D experimental en el navegador. [cite:67e1984c-1] |
| **Qué observar** | Cómo representa agujeros de protoboard, pines y conexiones físicas en 3D con Three.js. |
| **Cómo se traduce** | Es el puente conceptual entre nuestro **netlist lógico** y el **wiring físico** de la fase 2. Léelo antes de diseñar `WireLayer` (Task 11). |

### 2.8 circuitiny — `github.com/mfranzon/circuitiny` · ProtoPulse — `github.com/wtyler2505/ProtoPulse`

| Campo | Detalle |
|---|---|
| **Qué observar** | Ambos son experimentos de simulación de circuitos en el navegador. [cite:67e1984c-3][cite:67e1984c-5] |
| **Cómo se traduce** | Comparar la representación de circuitos y el renderizado. Son de alcance pequeño, así que sirven como *sanity check* de que un solver propio es viable. |

### 2.9 OpenPCB — `github.com/andrejvysny/OpenPCB`

| Campo | Detalle |
|---|---|
| **Qué observar** | Cómo modela el editor de PCB los componentes, las capas y las conexiones. [cite:67e1984c-4] |
| **Cómo se traduce** | Referencia para la estructura de datos de un editor tipo CAD. Relevante solo si se considera la exportación a PCB más adelante (fuera del MVP). |

---

## 3. Prioridad 2 — Productos cerrados, perspectivas públicas

Se pueden estudiar sus flujos públicamente, sin autenticación ni ingeniería inversa de bundles. Son los mejores modelos de **UX y alcance**, no de implementación.

### 3.1 Tinkercad Circuits — `tinkercad.com`

| Campo | Detalle |
|---|---|
| **Qué observar** | El flujo de un principiante: arrastrar, conectar, simular en menos de un minuto. La paleta reducida y la jerarquía de selección. El editor de código con bloque/ texto y el serial monitor. |
| **Por qué importa** | Es el **umbral de usabilidad** que el OE-1 fija: RF-1.6 exige "<5 min sin ayuda". Tinkercad es la referencia contra la que se mide esa prueba. |
| **Cómo se traduce** | Restricciones concretas de diseño: pocos clics hasta el primer componente, valores predefinidos sensatos, validación que no bloquea el aprendizaje. |

### 3.2 Wokwi — `wokwi.com`

| Campo | Detalle |
|---|---|
| **Qué observar** | El estado del arte en ejecución de firmware en el navegador: cómo separa *editor de circuito*, *editor de código* y *consola*; cómo muestra la instrumentación (serial monitor, analizadores lógicos). |
| **Por qué importa** | Es lo que Constructa hace junto con el CAD, y lo que CircuitForge hará en la fase 2. |
| **Cómo se traduce** | Referencia de UX para el panel de simulación de la Task 12: lecturas en vivo, consola y estados claros. |

### 3.3 CircuitVerse (versión hospedada) — `circuitverse.org`

| Campo | Detalle |
|---|---|
| **Qué observar** | Cómo un simulador académico presenta la biblioteca de componentes y la jerarquía de categorías a estudiantes de electrónica digital. |
| **Cómo se traduce** | Candidato directo para ordenar la paleta de la Task 10 por categoría y frecuencia de uso. |

### 3.4 Velxio — `velxio.dev/spice-simulator`

| Campo | Detalle |
|---|---|
| **Qué observar** | Cómo un producto moderno presenta SPICE en el navegador: qué muestra, qué esconde. [cite:db7b408d-4] |
| **Cómo se traduce** | Referencia de la *capa de presentación* del solver: cómo hacer que voltajes y corrientes sean legibles sin intimidar. |

---

## 4. Prioridad 3 — Comparativas publicadas (para el informe de estado del arte)

Estas fuentes ya hicieron parte del trabajo comparativo. Son el punto de partida de la **actividad 1** y evitan repetir investigación ajena.

| Fuente | Qué aporta |
|---|---|
| DigiSim — *Free Online Circuit Simulators Compared (2026)* [cite:c6179d29-1] | Comparativa de simuladores libres: alcance y limitaciones de cada uno. |
| Mokxi — *Tinkercad Circuits Alternatives, Compared Honestly* [cite:c6179d29-2] | Alternativas a Tinkercad con sus críticas concretas. Es exactamente el encuadre de "Tinkercad ya no es suficiente". |
| Zipdo — *Best Online Circuit Simulation Software (2026)* [cite:c6179d29-3] | Panorama general del mercado. |
| DigiSim — *Best Digital Logic Simulators in 2026* [cite:c6179d29-4] | Simuladores de lógica digital: útil para posicionar nuestro kernel digital (Task 6). |
| RottenWifi — *Free Virtual Arduino Simulator Online: Wokwi vs Tinkercad (2026)* [cite:c6179d29-5] | Comparativa directa Wokwi vs Tinkercad para Arduino: la decisión de firmware de la fase 2. |
| AtumX — *Free robot simulator with real physics (Constructa)* [cite:ea61562d-1] | La descripción oficial del producto del video, en sus propias palabras: útil para delimitarlo. |

---

## 5. Orden de trabajo sugerido para el análisis

| Fase | Sitios | Objetivo | Salida |
|---|---|---|---|
| **A** | tscircuit, circuit-json-to-gltf, circuit-json | Elegir o validar el formato del netlist (D-1, D-6) | **ADR-001: formato del netlist** → alimenta la Task 1 y la Task 13 |
| **B** | EEcircuit, EEsim, spice-rs, ngspice-wasm | Validar la viabilidad del solver propio (D-2) | **ADR-002: motor de simulación** → alimenta las Tasks 4–5 |
| **C** | CircuitVerse, DigiSim logic | Definir el kernel digital (Task 6) | **ADR-003: kernel digital** → alimenta la Task 6 |
| **D** | Tinkercad, Wokwi, Constructa, Velxio | Fijar la UX del editor y de la simulación | **ADR-004: UX del editor** → alimenta las Tasks 9–12 y los prompts de Stitch |
| **E** | protoboard-3d, OpenPCB, circuit-json-to-gltf | Diseñar el puente al 3D de la fase 2 | **ADR-005: hoja de ruta al 3D** → alimenta la decisión de aplazar el 3D |

**Regla de cierre:** cada fase termina en un ADR que dice qué patrón se adoptó, de qué sitio se observó y por qué. Un ADR sin esa trazabilidad no cierra la fase.

---

## 6. Lo que la ingeniería inversa NO puede resolver por nosotros

Conviene decirlo explícitamente, porque es donde estará el trabajo real:

- **No hay un producto del que copiar la política de validación de pines.** Las reglas V-1..V-6 y la tipificación de pines son nuestra decisión de diseño, derivada del OE-1.
- **No hay una skill ni un producto que ofrezca el solver MNA en TypeScript listo para el navegador.** `ngspice-wasm` y `spice-rs` son otras tecnologías; el puente lo escribimos nosotros.
- **Nadie publica la "conexión adecuada" como algoritmo.** Ni Constructa ni Tinkercad exponen el motor de sugerencia. RF-1.7 es diseño propio sobre reglas deterministas (D-4).
- **El catálogo de 60 componentes con fichas correctas es trabajo original de recopilación de hojas de datos.** No se puede importar.
