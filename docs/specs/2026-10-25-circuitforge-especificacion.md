# CircuitForge — Especificación técnica (v0.1)

**Fecha:** 2026-10-25
**Estado:** borrador para revisión
**Insumos:** `docs/specs/2026-10-25-circuitforge-analisis-insumos.md`, `circuitForgeDocAvance.docx` (OE-1..OE-3), `visualPaginaRefencia.mp4` (referencia de producto)

---

## 1. Objetivo y alcance

**Objetivo.** Plataforma web interactiva para el diseño, configuración y simulación de circuitos electrónicos, con biblioteca parametrizable de componentes y validación de conexiones en tiempo real. (Objetivo general del documento de avance, verbatim.)

**Dentro del alcance (MVP, lo que la entrega evalúa):**

- Editor de circuito con arrastrar y soltar sobre lienzo con cuadrícula.
- ≥40 tipos de componentes parametrizados (≥60 fichas en el catálogo completo, ver OE-3).
- Cableado entre pines con validación en tiempo real.
- Motor de simulación DC (V, I, P) + kernel digital/temporal (HIGH/LOW, PWM, timers).
- Modelos conductuales de sensores, actuadores y energía.
- Ejecución del solver en el navegador (Web Worker).
- Guardar / cargar / compartir proyecto.

**Fuera del alcance del MVP (registrado como fase 2, no prometido en la entrega):**

- CAD de chasis en 3D y ensamblaje mecánico (visto en el video).
- Física de cuerpo rígido, gravedad y simulación de entorno (Earth/Moon/Mars/Zero-G).
- Compilación y ejecución de firmware Arduino real.
- Modo multijugador / robo-sumo.
- Edición de PCB y exportación a Gerber.

> Esta frontera se decide en un ADR. El video de referencia muestra un producto de terceros cuyo alcance excede 890 h-persona y 8 semanas.

---

## 2. Decisiones de arquitectura (ADR resumido)

| ID | Decisión | Justificación |
|---|---|---|
| **D-1** | **El netlist es la fuente de verdad.** La posición en el lienzo, el símbolo y (en fase 2) la malla 3D son *vistas* derivadas. | Es la única forma de agregar el 3D sin reescribir el motor. Si la geometría fuera la fuente de verdad, el 3D obligaría a tirar el código. |
| **D-2** | **Solver propio por Análisis Nodal Modificado (MNA) en TypeScript**, ejecutado en Web Worker. | Cumple el <10 % del OE-2 para DC, es testeable, y no arrastra la complejidad de integrar ngspice-wasm en 8 semanas. ngspice queda como escalado futuro si se requiere precisión SPICE completa. |
| **D-3** | **Lienzo con Three.js + React Three Fiber, en modo cámara ortográfica sobre cuadrícula.** | Satisface el OE-1 ("lienzo con cuadrícula") y habilita el 3D del video cambiando únicamente la cámara y cargando mallas GLB. Evita construir sobre SVG y rehacer. |
| **D-4** | **"Conexión adecuada" = reglas deterministas sobre pines tipados + grafo.** Un LLM puede sugerir después, sobre el mismo motor de reglas. | Determinista, testeable, explicable, gratis y sin latencia. |
| **D-5** | **El solver corre en el cliente.** | Protege los planes gratuitos de Vercel/Supabase y da interactividad. |
| **D-6** | **La biblioteca de componentes son datos declarativos (JSON), no código.** | 60 fichas con símbolo, pines tipados, parámetros y modelo son un problema de datos, no de programación. |

---

## 3. Requisitos funcionales

### 3.1 Editor (OE-1)

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| **RF-1.1** | Colocar un componente desde la paleta al lienzo mediante arrastrar y soltar. | El componente aparece en la celda más cercana de la cuadrícula. |
| **RF-1.2** | Mover, rotar (múltiplos de 90°) y eliminar componentes colocados. | Las operaciones se reflejan en el netlist y son deshacibles (Ctrl+Z). |
| **RF-1.3** | Cablear dos pines mediante clic en pin origen → clic en pin destino. | Se crea una conexión en el netlist; el cable se dibuja como curva entre pines. |
| **RF-1.4** | **Validar conexiones en tiempo real** e impedir o advertir las inválidas. | Cortocircuito entre `VCC` y `GND` → **bloqueo** con mensaje. Pin incompatible (p. ej. `digital` a `power`) → **advertencia**. |
| **RF-1.5** | Editar parámetros de un componente seleccionado (resistencia, capacitancia, tensión de fuente…). | Los cambios se escriben en el netlist y afectan al resultado de la simulación. |
| **RF-1.6** | Construir y cablear "fuente + resistencia + LED" en <5 min sin ayuda externa. | Prueba de usabilidad cronometrada con un usuario nuevo. |
| **RF-1.7** | Sugerir la conexión adecuada para un componente seleccionado (autoconexión). | Dado un LED seleccionado y una fuente en el lienzo, el sistema propone ánodo→R→VCC y cátodo→GND. |

### 3.2 Motor de simulación (OE-2)

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| **RF-2.1** | Resolver el estado eléctrico DC: tensión, corriente y potencia por componente y por net. | **Error <10 %** frente a cálculo teórico (V=IR, divisor de tensión, mallas de Kirchhoff). |
| **RF-2.2** | Resolver el comportamiento digital/temporal: estados HIGH/LOW, PWM, temporizadores. | Duty cycle aplicado correctamente; `delay()` avanza el tiempo simulado. |
| **RF-2.3** | Modelar conductualmente sensores, actuadores y energía. | LDR varía R con luz; DHT11 entrega temperatura/humedad; servo recibe ángulo; batería con ESR y curva de descarga. |
| **RF-2.4** | Ejecutar el solver sin bloquear la interfaz. | Corre en Web Worker; el editor permanece responsivo durante la simulación. |
| **RF-2.5** | Reportar estado por componente durante la simulación. | LED ilumina con brillo proporcional a la corriente; resistencias disipan potencia; valores visibles en el lienzo. |

### 3.3 Biblioteca de componentes (OE-3)

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| **RF-3.1** | Catálogo de **≥60 componentes en 9 categorías**: pasivos, semiconductores, microcontroladores, sensores, actuadores/motores, ESC, fuentes, baterías, conectividad básica. | Cada ficha con símbolo, pines tipados, parámetros editables y modelo asociado. |
| **RF-3.2** | ≥40 tipos utilizables en el editor del MVP. | Aceptación del OE-1. |
| **RF-3.3** | Buscador y filtro por categoría en la paleta. | Encontrar "LED" en ≤3 pulsaciones. |
| **RF-3.4** | Ficha de componente verificable. | Los parámetros por defecto coinciden con la hoja de datos de referencia. |

### 3.4 Persistencia

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| **RF-4.1** | Guardar y cargar un proyecto. | El circuito se reconstruye idéntico (netlist + posiciones + parámetros). |
| **RF-4.2** | Compartir un proyecto mediante enlace. | Enlace reproducible en modo solo lectura. |
| **RF-4.3** | Versionado del proyecto. | Historial de guardados con restauración. |

---

## 4. Requisitos no funcionales

| ID | Requisito | Umbral |
|---|---|---|
| **RNF-1** | Precisión del solver DC | Error <10 % vs. teoría (OE-2) |
| **RNF-2** | Latencia de interacción | Arrastrar un componente a 60 fps; solver <100 ms en circuitos de ≤50 componentes |
| **RNF-3** | Usabilidad | "fuente + resistencia + LED" en <5 min sin ayuda (OE-1) |
| **RNF-4** | Accesibilidad | Cumplir WCAG 2.1 AA: contraste, foco visible, navegación por teclado |
| **RNF-5** | Compatibilidad | Chrome, Firefox y Edge actuales; lienzo WebGL 2 |
| **RNF-6** | Costo de infraestructura | $0.00 en planes gratuitos (Vercel Hobby + Supabase Free); el solver corre en el cliente |
| **RNF-7** | Stack | React + TypeScript, Node.js, PostgreSQL; licencias en $0.00 |
| **RNF-8** | Mantenibilidad | La biblioteca de componentes son datos JSON versionados, no código |
| **RNF-9** | Portabilidad del modelo | El netlist se serializa a JSON independiente del render |
| **RNF-10** | Idioma | Interfaz en español; identificadores de código en inglés |

---

## 5. Modelo de datos (netlist)

El corazón del sistema. Todo lo demás se deriva de aquí.

```
Project
 ├─ id: string
 ├─ name: string
 ├─ schemaVersion: number
 ├─ components: Component[]
 ├─ nets:       Net[]
 └─ metadata:   { createdAt, updatedAt, author }

Component
 ├─ id:      string            // "R1", "D1", "U1"
 ├─ typeId:  string            // clave en la biblioteca: "resistor", "led", "arduino_uno"
 ├─ position:{ x: number, y: number, rotation: 0|90|180|270 }
 ├─ params:  Record<string, number|string|boolean>   // {"resistance": 220}
 └─ pins:    PinRef[]          // derivados de la ficha del tipo

PinRef
 ├─ pinId: string              // "a", "c", "anode", "cathode", "D13"
 ├─ type:  PinType             // power | gnd | digital | analog | pwm | i2c_sda | i2c_scl | spi_* | uart_*
 └─ netId: string | null       // null = pin sin conectar

Net                              // un nodo eléctrico = un potential común
 ├─ id:    string              // "N1"
 └─ pins:  { componentId: string, pinId: string }[]

ComponentType (ficha de la biblioteca, dato JSON)
 ├─ typeId:     string
 ├─ category:   Category        // passive | semiconductor | mcu | sensor | actuator | esc | source | battery | connectivity
 ├─ name:       string          // "Resistencia", "LED", "Arduino UNO"
 ├─ symbol:     { viewBox, paths[] }            // 2D (símbolo esquemático, hoy)
 ├─ model3d:    { glbUrl } | null               // 3D (fase 2, ver D-3)
 ├─ pins:       { id, label, type, position }[]
 ├─ parameters: { key, label, unit, default, min?, max?, step? }[]
 └─ model:      ModelSpec       // cómo lo interpreta el solver
```

**Invariante fundamental:** un pin pertenece a **como máximo un net**. Toda la validación de conexiones se reduce a hacer cumplir este invariante más las reglas de compatibilidad de tipo.

### 5.1 Tipos de pin

```
power | gnd | digital | analog | pwm | i2c_sda | i2c_scl | spi_mosi | spi_miso | spi_sck | uart_tx | uart_rx
```

### 5.2 Reglas de validación (D-4)

| Regla | Condición | Acción |
|---|---|---|
| **V-1 Cortocircuito** | Un net contiene un pin `power` y un pin `gnd` sin carga intermedia | **Bloquear** |
| **V-2 Pin incompatible** | Se conectan dos pines `power` de fuentes distintas, o `digital` con `power` | **Advertir** |
| **V-3 Net huérfano** | Un net con un solo pin | Advertir al simular |
| **V-4 Polaridad** | `anode`/`cathode` invertidos respecto a la fuente | Advertir |
| **V-5 Pin no conectado** | Un componente activo con pines requeridos sin net | Advertir |
| **V-6 Sobretensión** | Tensión del net > tensión máxima del pin | Advertir |

---

## 6. Arquitectura del sistema

```
┌────────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite)                      │
│                                                            │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────┐  │
│  │   Palette    │   │    Canvas     │   │  Inspector    │  │
│  │  (biblioteca)│   │ (R3F + Three) │   │ (parámetros)  │  │
│  └──────┬───────┘   └───────┬───────┘   └───────┬───────┘  │
│         └──────────────┬────┴───────────────────┘          │
│                        ▼                                   │
│              ┌───────────────────┐                         │
│              │  Project Store    │  ← netlist (fuente de   │
│              │  (Zustand)        │    verdad, D-1)         │
│              └─────────┬─────────┘                         │
│                        │                                    │
│         ┌──────────────┼──────────────┐                     │
│         ▼              ▼              ▼                     │
│  ┌────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Validator  │ │  Simulator  │ │  Persist    │            │
│  │ (reglas V) │ │ (Web Worker)│ │  (API)      │            │
│  └────────────┘ └─────────────┘ └──────┬──────┘            │
└────────────────────────────────────────┼───────────────────┘
                                         │ HTTPS / JSON
                                         ▼
                        ┌────────────────────────────────┐
                        │  Backend (Node.js + Express)   │
                        │  Auth · Projects · Sharing     │
                        └───────────────┬────────────────┘
                                        ▼
                              ┌──────────────────┐
                              │  PostgreSQL      │
                              │  (Supabase)      │
                              └──────────────────┘
```

**Módulos del solver (D-2), todos en el cliente:**

| Módulo | Responsabilidad |
|---|---|
| `netlist-builder` | Convierte `Project` en matrices MNA: matriz de conductancias `G`, vector de fuentes `I`, incógnitas nodales |
| `mna-solver` | Resuelve `G·x = I` por eliminación gaussiana con pivoteo; devuelve tensiones nodales |
| `dc-analyzer` | Deriva V, I, P por componente desde las tensiones nodales |
| `digital-kernel` | Reloj de eventos discretos: HIGH/LOW, PWM (duty cycle), `delay()`, timers |
| `component-models` | Modelos conductuales: LDR, DHT11, servo, motor DC, batería con ESR |
| `simulation-worker` | Orquesta todo en un Web Worker y emite actualizaciones por mensaje |

---

## 7. Contrato de API

| Método | Ruta | Cuerpo / respuesta | Notas |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ email, password }` → `{ token }` | |
| `POST` | `/api/auth/login` | `{ email, password }` → `{ token }` | |
| `GET` | `/api/projects` | → `Project[]` | Solo del usuario autenticado |
| `POST` | `/api/projects` | `{ name, netlist }` → `Project` | |
| `GET` | `/api/projects/:id` | → `Project` | |
| `PUT` | `/api/projects/:id` | `{ name?, netlist }` → `Project` | Crea una versión |
| `DELETE` | `/api/projects/:id` | → `204` | |
| `POST` | `/api/projects/:id/share` | → `{ shareToken }` | Enlace de solo lectura |
| `GET` | `/api/share/:shareToken` | → `Project` | Público, solo lectura |
| `GET` | `/api/components` | → `ComponentType[]` | Catálogo; servido desde JSON |

**Errores:** `400` validación, `401` sin autenticar, `403` sin permiso, `404` no encontrado, `409` conflicto, `500` interno. Cuerpo de error: `{ error: { code, message } }`.

---

## 8. Estructura de archivos propuesta

```
circuitforge/
├─ apps/
│  ├─ web/                          # React + TS + Vite
│  │  └─ src/
│  │     ├─ features/
│  │     │  ├─ editor/              # Paleta, lienzo, inspector
│  │     │  ├─ simulator/           # Puente al Web Worker
│  │     │  └─ projects/            # Guardar / cargar / compartir
│  │     ├─ shared/
│  │     └─ main.tsx
│  └─ api/                          # Node + Express
│     └─ src/
│        ├─ routes/
│        ├─ db/
│        └─ index.ts
├─ packages/
│  ├─ netlist/                      # Tipos + invariantes (D-1)
│  ├─ simulation/                   # MNA + kernel digital + modelos (D-2)
│  ├─ validation/                   # Reglas V-1..V-6 (D-4)
│  └─ component-library/            # Fichas JSON (D-6)
│     └─ data/*.json
└─ docs/
   ├─ specs/
   ├─ superpowers/plans/
   ├─ design/
   └─ referencias/
```

---

## 9. Criterios de aceptación globales (trazabilidad a OE-1..OE-3)

| Criterio del documento | Requisitos que lo cubren | Cómo se verifica |
|---|---|---|
| OE-1: 40+ componentes en cuadrícula, editor drag & drop | RF-1.1, RF-1.2, RF-1.5, RF-3.2 | Prueba end-to-end en navegador |
| OE-1: <5 min sin ayuda para fuente+R+LED | RF-1.6 | Sesión cronometrada con usuario nuevo |
| OE-1: impedir o advertir conexiones inválidas | RF-1.4, V-1..V-6 | Suite de pruebas de validación |
| OE-2: error <10 % en DC | RF-2.1, RNF-1 | **Batería de 15 casos automatizados** con tolerancias documentadas |
| OE-2: motor digital/temporal | RF-2.2 | Pruebas de PWM y temporización |
| OE-3: 60 componentes / 9 categorías con ficha | RF-3.1, RF-3.4 | Validación de esquema sobre los JSON |
| (Video) Edición 3D | *Fuera del MVP* — ADR de fase 2 | — |

---

## 10. Preguntas abiertas para el equipo

1. ¿El entregable evaluado exige explícitamente el lienzo **2D** o admite 3D? (Define si D-3 se implementa como ortográfico o como perspectiva con GLB.)
2. ¿El microcontrolador del MVP es Arduino UNO, ESP32, o ambos? Afecta el kernel digital y la categoría "microcontroladores".
3. ¿La batería de 15 casos del OE-2 la redacta el equipo o se toma de un texto de referencia? Necesito los 15 casos **antes** de escribir el solver.
4. ¿"IA" en la petición original significa un LLM integrado, o basta el algoritmo determinista de RF-1.7? (D-4 asume lo segundo.)
5. ¿El catálogo de 60 componentes debe incluir ESC y motores brushless (categoría vista en el documento pero ausente en el video)?
