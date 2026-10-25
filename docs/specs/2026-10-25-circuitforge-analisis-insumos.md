# CircuitForge — Análisis de insumos (documento de avance + video de referencia)

**Fecha:** 2026-10-25
**Autor:** análisis asistido
**Insumos analizados:**

| Insumo | Ruta | Naturaleza |
|---|---|---|
| `circuitForgeDocAvance.docx` | `C:\ProyectoSoftwareGestion\ContextoProyecto\` | Documento de gestión: estimación de personal, tiempo y costos |
| `visualPaginaRefencia.mp4` | `C:\ProyectoSoftwareGestion\SitioReferencia\` | Video vertical 720×1280, 22.98 s, 30 fps — demo de producto |

---

## 1. Qué es lo que hay realmente en cada insumo

### 1.1 `circuitForgeDocAvance.docx` — qué es y qué NO es

Es un documento de **gestión de proyecto** (asignatura *Gestión de Desarrollo de Software*, ITS Uruapan). No es un documento de requerimientos ni de arquitectura.

Contiene, y solo contiene:

- **Resumen ejecutivo** en clave económica: `CTP = $2,068.23 MXN` (octubre 2026).
- **Sección 3 — Personal:** 4 integrantes, 4 roles, **890 horas-persona** (R1 Líder/Arquitecto 108 h, R2 Backend/Motor 420 h, R3 Frontend/UX 250 h, R4 QA/DevOps 112 h).
- **Sección 4 — Tiempo:** **8 semanas calendario**, 14 actividades, con cronograma y entregables por actividad.
- **Secciones 5–6 — Costos:** precios de proveedores mexicanos (hosting, dominio, internet, CFE), y el desglose directo/indirecto. Costo de operación en producción: **≈$64.91 MXN/mes**.
- **Secciones 7–8:** supuestos, limitaciones y fuentes.

**Lo único técnicamente aprovechable** son tres cosas, y son la base de cualquier especificación:

1. **Los tres objetivos específicos (OE-1, OE-2, OE-3)**, que sí son verificables y traen criterio de aceptación (sección 2).
2. **El desglose de actividades 1–14** con horas y entregables (secciones 4.2 y 4.3), que sirve como esqueleto de plan.
3. **El *stack* ya declarado** en 5.4: React + Node.js + PostgreSQL, desplegado en Vercel, con Supabase y Resend en planes gratuitos. Licencias en $0.00.

> **Conclusión clave:** el documento fija *cuánto cuesta, quién lo hace y cuándo*, pero **no fija qué se construye**. No hay ni un requisito funcional enumerado (RF-xx), ni un modelo de datos, ni un contrato de API, ni un diagrama de arquitectura. La actividad 2 lo lista como pendiente: "ERD v1.0: RF/RNF, casos de uso". **Eso es exactamente el hueco que hay que llenar antes de escribir código.**

### 1.2 Los objetivos específicos, extraídos verbatim del documento

| ID | Objetivo | Criterio de aceptación textual |
|---|---|---|
| **OE-1** | Editor web *drag & drop*: colocar, mover, rotar, conectar y **configurar al menos 40 tipos de componentes** sobre un **lienzo con cuadrícula**, con **validación de conexiones en tiempo real**. | Un usuario nuevo construye y cablea "fuente + resistencia + LED" en **<5 minutos sin ayuda**; el sistema **impide o advierte** conexiones inválidas (cortocircuitos, pines incompatibles). |
| **OE-2** | **Motor de simulación modular**: estado eléctrico (V, I, P), comportamiento digital/temporal (HIGH/LOW, PWM, temporizadores) y modelos conductuales de sensores, actuadores y energía. | **Error <10 %** frente a cálculos teóricos en circuitos DC; **batería de 15 casos de prueba automatizados** con tolerancias documentadas. |
| **OE-3** | **Biblioteca parametrizable** de **≥60 componentes en 9 categorías** (pasivos, semiconductores, microcontroladores, sensores, actuadores/motores, ESC, fuentes, baterías, conectividad básica). | Cada componente con **símbolo, pines tipados, parámetros editables y modelo asociado**; fichas de parámetros verificables. |

### 1.3 `visualPaginaRefencia.mp4` — qué es

El video **no es un mockup ni una propuesta del equipo**. Es un video corto de redes sociales (formato vertical, subtítulos grandes superpuestos, cierre con logo y CTA "Completely free — link in bio") que **promociona un producto de terceros llamado Constructa** (`constructa.altumx.io`, de AltumX / atumx.in).

Narrativa del video, en el orden en que aparecen los rótulos:

| t | Rótulo | Lo que se ve en pantalla |
|---|---|---|
| 0–2 s | *"POV: Tinkercad isn't enough anymore"* | Editor 3D con Arduino UNO azul, dos servos amarillos, chasis rosa sobre cuadrícula. Panel izquierdo "Quick Tools" (Rotate, Align, Extrude, Mirror, Scale, Snap, **Add**), panel derecho **CAD / Library**, ATTACH, EDIT (Name, Position, Rotation, **Size**) |
| 3–6 s | *"Actual electronics"* ✅ | La placa Arduino UNO se ve **renderizada con detalle real** (pines, silkscreen) junto a una protoboard y un sensor. Panel derecho: **ELEC / Elec, Mech, Wiring**, con categorías anidadas — *Sensors* (Color Sensor TCS3200 RGB, LDR, DHT11), *Displays* (OLED I2C), *Actuators* (Servo Motor, DC Motor, BO Motor, LED, Buzzer) |
| 7–8 s | *"CAD"* ✅ | Robot bípedo articulado, vista perspectiva, `Sketchbot.ts`, secciones ID/Pos/Size/Rot del panel derecho |
| 9–11 s | *"Code"* ✅ | Editor de código C++/Arduino con fondo oscuro: `analogWrite(lm, 220)`, `analogWrite(rm, 220)`, `delay(2000)`, `analogRead(lm)`, comentario `// if sensor sees BLACK line -> Turn left to move away from the line`. Barra **Run / Stop**, instrumentación en vivo (`95, 2, 11, 1, 0, 2.1 ms`) y **Serial monitor** (`Distance: 207.40 cm`) |
| 12–14 s | *"Stimulate"* (sic, *Simulate*) ✅ | Panel **SIMULATE / Simulator** con pestañas **Simulation · Robot · Physics**. Botón "Stop Simulation", descripción "Running with physics. Drive & robot controls appear in the viewport HUD". **ENVIRONMENT: Earth · Moon · Mars · Zero-G**, con `Gravity: -9.81 m/s²` |
| 15–21 s | *"All in one browser"* | Simulación corriendo dentro del viewport: HUD con gravedad y masa (`g = -9.81 m/s²`, `mass: 1.44 kg`), "Quick reference" con `analogWrite(11, 1023)`, `analogWrite(10, 0)`, `analogRead(5, 0)` — **el circuito y el código corriendo juntos**. Escena de robo-sumo con contrapeso. |
| 22–23 s | *(cierre)* | Logo **CONSTRUCTA**, subtítulo "**Completely free** — Try it now - link in bio" |

**Traducción a lenguaje de producto.** Constructa demuestra un flujo de **cinco pasos integrados en una sola pestaña del navegador**:

```
CAD (modelar el chasis en 3D)
  → ELEC (colocar la electrónica: placa, sensores, actuadores)
    → WIRING (cablear)
      → CODE (escribir y ejecutar firmware Arduino)
        → SIMULATE (física + electrónica + firmware, con HUD en vivo)
```

Y su mensaje de posicionamiento es literalmente **el mismo que CircuitForge busca**: *"Tinkercad ya no es suficiente"* — es decir, el diferenciador no es *tener* un simulador de circuitos, sino **unificar CAD + electrónica + cableado + código + simulación con física** en el navegador.

---

## 2. Brecha entre lo que hay (documento) y lo que se pide (video)

Esta es la tensión central del proyecto y hay que resolverla antes de escribir código:

| Dimensión | Documento (OE-1 a OE-3) | Video de referencia (Constructa) |
|---|---|---|
| Lienzo | **2D**, sobre **cuadrícula** | **3D**, con vista perspectiva y cámara orbital |
| Componentes | **Símbolos** esquemáticos | **Modelos 3D** realistas renderizados |
| Conexiones | **Alambre esquemático** entre pines | **Wiring** físico sobre protoboard/placa |
| Alcance | Editor + motor de simulación eléctrica/digital | Editor + motor + **firmware Arduino** + **física de cuerpo rígido** + **CAD de chasis** |
| Objetivo de error | **<10 %** vs cálculo teórico DC | No declara precisión; apuesta a la *experiencia* |

**Interpretación correcta:** el video **no invalida el documento, lo tensiona**. El documento es el *contrato académico* (lo que la profesora evalúa); el video es la *ambición de producto* (lo que el usuario quiere que se sienta). La resolución razonable es:

> **Construir el MVP 2D del documento como núcleo verificable, sobre una arquitectura que permita el visor 3D y el cableado físico como capa posterior.** El usuario pidió explícitamente "sitio estilo Tinkercad con modelos 3D de componentes electrónicos, con apoyo de IA o algoritmos para hacer la conexión adecuada".

Esto significa que la decisión arquitectónica más importante del proyecto es: **separar el modelo lógico del circuito (netlist + pines tipados) de su representación visual (2D esquemático hoy, 3D mañana)**. Si esa separación se hace bien desde el día 1, el 3D se agrega sin reescribir el motor. Si se hace mal (geometría como fuente de verdad), el 3D obliga a tirar todo el código.

---

## 3. Riesgos detectados (ordenados por severidad)

| # | Riesgo | Evidencia | Impacto | Mitigación propuesta |
|---|---|---|---|---|
| **R-1** | **La ambición 3D + física + firmware no cabe en 890 horas ni en 8 semanas.** Constructa es un producto con equipo e inversión; el video muestra CAD de chasis, física de cuerpo rígido, entorno de firmware y multiplayer de robo-sumo. | Video completo | **Crítico** — entregar nada completo | Congelar alcance: MVP 2D + motor + catálogo (esto es lo que el OE evalúa). Registrar el 3D como *fase 2* con ADR. **No** prometer física en la entrega. |
| **R-2** | **El documento no tiene un solo requisito funcional enumerado.** OE-1..3 son objetivos, no requisitos. | Sección 2 vs actividad 2 | Alto — el plan no tiene de dónde derivar tareas | Escribir el spec de RF/RNF + casos de uso antes de planear (ver `docs/specs/...especificacion.md`). |
| **R-3** | **El motor de simulación está subestimado.** La actividad 9 da 120 h al "Motor eléctrico + digital", pero un solver DC por análisis nodal (MNA) con 15 casos de prueba, más un kernel digital con PWM y temporizadores, es un componente de riesgo alto en una sola persona. | Sección 4.3, rol R2 | Alto | Empezar el motor **con casos de prueba en la semana 1**, no en la 5. Usar TDD con la batería de 15 casos del OE-2 como especificación ejecutable. |
| **R-4** | **"Validación de conexiones" e "IA/ algoritmos de conexión" son requisitos sin definir.** El OE-1 pide "impedir o advertir cortocircuitos y pines incompatibles"; el usuario pide "apoyo de IA para hacer la conexión adecuada". | OE-1 + petición del usuario | Medio-Alto | Definir el **sistema de pines tipados** (`power`, `gnd`, `digital`, `analog`, `pwm`, `i2c_sda`, …) y reglas de net. La "IA" se resuelve primero con **algoritmo determinista** (autoconexión sugerida), no con modelo generativo. |
| **R-5** | **Cobertura de 60 componentes en 9 categorías con modelo asociado es mucho trabajo de datos**, no de código. | OE-3 | Medio | Modelar la biblioteca como **datos declarativos** (JSON/YAML), no como código. Un componente = una ficha. Así 60 fichas son contenidibles. |
| **R-6** | Las fuentes de precios del documento están fechadas a octubre 2026 y describen mayormente *infraestructura*, no *esfuerzo*. | Secciones 5–8 | Bajo | Sin acción técnica. Solo no confundir el CTP ($2,068 MXN) con costo de desarrollo: **la mano de obra no está costeada**, son 890 h de esfuerzo no remunerado. |
| **R-7** | El stack declarado (Vercel + Supabase free) tiene límites que la simulación puede romper. | Sección 6.6 | Bajo-Medio | Ejecutar el solver **en el cliente** (navegador), no en el servidor. Así el costo de cómputo es del usuario y el plan gratuito de Vercel no se excede. |

---

## 4. Decisiones que hay que tomar antes de tocar código

Estas son decisiones abiertas; cada una debería terminar en un ADR:

| # | Decisión | Opciones | Recomendación preliminar |
|---|---|---|---|
| **D-1** | **Fuente de verdad del circuito** | (a) geometría/posición en el lienzo · (b) **netlist + pines tipados** | **(b)**. Es la única opción que permite 2D hoy y 3D después sin reescribir. El lienzo es una *vista* de la netlist. |
| **D-2** | **Motor de simulación** | (a) ngspice compilado a WebAssembly · (b) **solver propio por Análisis Nodal Modificado (MNA) en TS** · (c) spice-rs | **(b)** para DC + digital, con tolerancia <10 % del OE-2. ngspice-wasm es potente pero pesado de integrar y de depurar en 8 semanas; y no aporta al kernel digital. Dejar (a) como escalado futuro. |
| **D-3** | **Render del lienzo** | (a) SVG · (b) Canvas 2D · (c) **Three.js / React Three Fiber** | **(c) desde el inicio, en modo ortográfico 2D sobre cuadrícula.** Satisface el OE-1 ("lienzo con cuadrícula") *y* deja la puerta abierta al 3D del video cambiando solo la cámara. Evita construir sobre SVG y rehacer después. |
| **D-4** | **"IA para conexión adecuada"** | (a) LLM generativo · (b) **reglas deterministas sobre pines tipados + grafo** | **(b) primero.** Determinista, testeable, explicable y gratis. Un LLM puede *sugerir* después sobre el mismo motor de reglas. |
| **D-5** | **Dónde corre el solver** | (a) servidor (Node) · (b) **cliente (Web Worker)** | **(b)**. Protege los planes gratuitos y da latencia interactiva. |

---

## 5. Cómo se cubre esto con los entregables producidos

| Entregable | Archivo | Qué resuelve |
|---|---|---|
| Especificación (RF/RNF, modelo de datos, contratos) | `docs/specs/2026-10-25-circuitforge-especificacion.md` | Cierra R-2 y fija D-1..D-5 |
| Plan de implementación por tareas | `docs/superpowers/plans/2026-10-25-circuitforge-mvp.md` | Convierte el spec en tareas ejecutables y testeables |
| Prompts de UI (Stitch) | `docs/design/2026-10-25-stitch-prompts.md` | Actividad 3 (UX y mockups) |
| Sitios de referencia para ingeniería inversa | `docs/referencias/2026-10-25-ingenieria-inversa.md` | Actividad 1 (estado del arte) + insumo para el MCP de ingeniería inversa |
| Recomendación de skills instalables | sección 6 de este documento | Capacidad del agente para este proyecto |

---

## 6. Skills del ecosistema relevantes para CircuitForge (find-skills)

Búsquedas realizadas: `3d cad web viewer three.js`, `circuit simulation electronics`, `arduino simulator embedded`, `react three fiber 3d scene`.

⚠️ **Aviso de seguridad:** una skill es **código de terceros que se ejecuta con los permisos completos del agente**. Antes de instalar cualquiera, revisa su `SKILL.md` y sus scripts en el enlace de revisión. No instalo nada sin que lo pidas explícitamente.

### Recomendadas (alta confianza, muchas instalaciones y fuente reconocida)

| Skill | Autor | Instalaciones | Para qué sirve aquí |
|---|---|---|---|
| `react-three-fiber` | **vercel-labs** | **2,290** | Base del lienzo 3D/2D con Three.js. Es la pieza que sostiene D-3. |
| `threejs-animation` | iart-ai | 1,335 | Animación en la escena: rotación de componentes, flujo de corriente, cableado. |
| `3d-web-experience` | davila7 | 1,302 | Patrones de experiencia 3D web: cámara, interacción, rendimiento. |
| `threejs-r3f` | athevon | 1,018 | Refuerzo de patrones R3F; alternativa/complemento a la de Vercel. |

Revisión: https://skills.sh/vercel-labs/json-render/react-three-fiber · https://skills.sh/iart-ai/webgl-animation-skills/threejs-animation · https://skills.sh/davila7/claude-code-templates/3d-web-experience

### Específicas de dominio (baja adopción — **revisar antes de instalar**)

| Skill | Autor | Instalaciones | Nota |
|---|---|---|---|
| `hardware-tdd` | wedsamuel1230 | 53 | TDD para firmware/hardware embebido. Es la de mejor adopción del grupo de nicho y encaja con el kernel digital del OE-2. |
| `electronics-engineering` | mriabov | 4 | Conocimiento de ingeniería electrónica. Adopción muy baja: tratar como referencia, no como autoridad. |
| `semiconductor-models` / `solver-numerics` / `simulation-verification` | lgili | 6 / 2 / 3 | Modelos de semiconductor, numérica de solvers y verificación de simulación. Adopción muy baja; solo si vas a fondo con D-2(b). |
| `cad-3d-ui-review` | cad-dev-skills | 1 | Revisión de UI tipo CAD. Adopción 1: no recomendable sin revisión manual. |
| `glb-web-export` | pascalorg | 12 | Exportar glTF/GLB al web. Útil cuando entren los modelos 3D reales. |

**Recomendación:** instalar **solo** `react-three-fiber` (vercel-labs) al arrancar la fase de lienzo, y evaluar `hardware-tdd` cuando empiece el kernel digital. El resto, dejarlas como referencia bibliográfica.

**Vacío detectado:** **no existe una skill empaquetada para "motor de simulación de circuitos"**. No hay nada publicado que resuelva MNA, netlist o validación de pines. Esa parte se escribe a medida — y es, precisamente, el núcleo diferencial del proyecto.

---

## 7. Resumen en una página

- El **docx** es gestión, no ingeniería: define 890 h, 8 semanas, 4 roles y $2,068 MXN. Sus únicos activos técnicos son **OE-1, OE-2, OE-3**, el **desglose de 14 actividades** y el **stack** (React/Node/PostgreSQL).
- El **video** es una demo de **Constructa** (producto de terceros, AltumX), no un mockup del equipo. Muestra el flujo **CAD → ELEC → WIRING → CODE → SIMULATE** en el navegador, con física y firmware.
- El **conflicto a resolver** es 2D esquemático (contrato del documento) vs 3D + física + firmware (ambición del video). Se resuelve con una **arquitectura netlist-first**: el modelo lógico del circuito manda, y el 2D/3D son vistas intercambiables.
- El **mayor riesgo** no es técnico, es de alcance: querer el producto del video en 8 semanas. El MVP debe ser el del documento, con el 3D como fase 2 registrada en un ADR.
- **Nada está desarrollado.** Correcto: no hay repositorio, ni código, ni especificación. Este análisis y el plan que lo acompaña son el punto de partida.
