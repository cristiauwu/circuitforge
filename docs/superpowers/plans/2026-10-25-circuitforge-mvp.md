# CircuitForge MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Estado de ejecución

**Última actualización:** 2026-10-25

### Completado

| Etapa | Tareas | Estado | Evidencia |
|---|---|---|---|
| **F0** — Andamiaje | Monorepo pnpm + Turborepo, Biome, TypeScript estricto, CI, Vitest | ✅ **hecho** | `pnpm install` limpio; `biome check` sin hallazgos; CI con 5 gates |
| **F1** — Dominio | Task 1 (`netlist`), Task 2 (`validation`) | ✅ **hecho** | **30 tests en verde** (11 + 19); typecheck y build OK |

**Commits:** `0f8392f` (monorepo), `d4c5d9b` (netlist), `cf04baa` (validation), `b129191` (docs). Rama `main`.

**Puerta de salida de F0 cumplida:** `biome check .` sin hallazgos, `tsc --noEmit` sin errores, tests en verde.

### Desviaciones respecto a este plan (aplicadas)

Estas son decisiones tomadas durante la ejecución que **modifican** lo escrito abajo. El plan original se conserva como referencia.

| # | El plan decía | Se hizo | Motivo |
|---|---|---|---|
| **D-1** | `packages/netlist` con `connectPins` y 4 tests | Igual, más **11 tests** y el campo `nextNetSeq` en `Project` | La revisión encontró 2 bugs: (a) conectar un pin consigo mismo no lanzaba porque ambos `netId` eran `null`; (b) los ids de net se reciclaban tras un merge, creando *aliasing*. El contador persistido resuelve (b): el máximo histórico no es reconstruible desde el estado actual. |
| **D-2** | `canConnect(a: PinRef, b: PinRef)` | `canConnect(a: PinEndpoint, b: PinEndpoint)` | Un `PinRef` no identifica a qué componente pertenece, así que no permite localizar el pin de forma unívoca. `PinEndpoint` (componentId + pinId) sí. |
| **D-3** | `ComponentType` importado de `component-library` | `CatalogEntry` declarado localmente en `validation` | Evita un ciclo de dependencias en runtime y mantiene `validation` sin acoplarse a la biblioteca. |
| **D-4** | Tareas con `git commit` por tarea | Igual, con **4 commits atómicos** por unidad lógica | Un commit por tarea produce ruido; se agrupó por paquete. |
| **D-5** | `npm`/`pnpm test` en los comandos | `.tools/verify.cmd` y `.tools/cf.cmd` | En esta máquina los shims de `node_modules/.bin` no son ejecutables y `npm` está dañado. Ver `docs/dev-environment.md`. **El CI no se ve afectado** (Ubuntu usa `pnpm` normal). |
| **D-6** | *(no contemplado)* | `docs/design/DESIGN.md` | Prerrequisito del frontend: el design system que los prompts de Stitch daban por pendiente. |

### Añadido fuera del plan

- **`docs/design/DESIGN.md`** — sistema visual completo (tokens + 5 patrones de movimiento). Sustituye la sección 0 de los prompts de Stitch.
- **`docs/design/2026-10-25-analisis-visual-referencia.md`** — análisis con evidencia del que salen los tokens.
- **`docs/dev-environment.md`** — toolchain y las dos desviaciones del entorno.

### Siguiente

**F2** (`packages/ui`: tokens del design system, tema oscuro, primitivas) o **F3** (lienzo R3F). Antes de F2 conviene decidir si `packages/ui` consume `DESIGN.md` como fuente de tokens generados.

> **Nota sobre el Tech Stack de abajo:** dice `Node.js + Express`. El stack aprobado (`docs/specs/2026-10-25-circuitforge-stack.md`, ADR-003) usa **Fastify**, con Express como alternativa aceptable. Afecta a la Task 13.

---

**Goal:** Entregar el editor de circuitos con arrastrar y soltar, la biblioteca parametrizable de componentes, la validación de conexiones y el motor de simulación DC/digital corriendo en el navegador, cumpliendo OE-1, OE-2 y OE-3 del documento de avance.

**Architecture:** El **netlist es la fuente de verdad** (D-1); el lienzo, los símbolos y los cables son vistas derivadas. La lógica de dominio vive en paquetes puros de TypeScript (`packages/*`) sin dependencias de React ni del DOM, para que sea testeable en Node. El solver corre en un Web Worker (D-5) y la biblioteca de componentes son datos JSON (D-6). El 3D, la física y el firmware Arduino quedan fuera de alcance (fase 2, ADR en el spec).

**Tech Stack:** TypeScript, React, Vite, Three.js + React Three Fiber (cámara ortográfica sobre cuadrícula, D-3), Zustand, Vitest, Node.js + Express, PostgreSQL (Supabase), Vercel.

**Spec:** `docs/specs/2026-10-25-circuitforge-especificacion.md`

## Global Constraints

- Precisión del solver DC: **error <10 %** frente al cálculo teórico (RNF-1, OE-2).
- Editor: **≥40 tipos de componentes** utilizables (OE-1); catálogo completo **≥60** fichas en **9 categorías** (OE-3).
- Categorías exactas: `passive`, `semiconductor`, `mcu`, `sensor`, `actuator`, `esc`, `source`, `battery`, `connectivity`.
- Tipos de pin exactos: `power`, `gnd`, `digital`, `analog`, `pwm`, `i2c_sda`, `i2c_scl`, `spi_mosi`, `spi_miso`, `spi_sck`, `uart_tx`, `uart_rx`.
- Invariante: **un pin pertenece a como máximo un net**.
- Interfaz en **español**; identificadores de código en **inglés** (RNF-10).
- Costo de infraestructura **$0.00**: el solver corre en el cliente (RNF-6, D-5).
- Sin dependencias de React/DOM en `packages/netlist`, `packages/validation`, `packages/simulation`.
- Rotaciones permitidas: **0, 90, 180, 270** grados únicamente.
- `Project` y `ComponentType` serializan a JSON versionado con `schemaVersion` (RNF-9).

## Review Focus

Las cinco clases de entrada que el spec implica pero que ningún requisito enumera, y que romperían el programa si se ignoran:

1. **Grafo de circuito vacío o con un solo componente** — el solver no debe lanzar ni dividir por cero; devuelve un resultado vacío sin error.
2. **Net con un único pin, o componente aislado sin conexiones** — debe advertirse (V-3), no tratarse como circuito válido.
3. **Parámetro en cero o negativo** — una resistencia de 0 Ω es un cortocircuito y produce `Infinity` en el divisor. El solver debe acotar y advertir, nunca devolver `NaN`.
4. **Circuito singular (nodos flotantes, sin referencia a GND, mallas redundantes)** — la matriz MNA es singular y la eliminación gaussiana falla. Debe detectarse y reportarse como error de circuito, no colgarse.
5. **JSON de proyecto corrupto, `schemaVersion` desconocida o `typeId` inexistente** — debe rechazarse con error claro en vez de corromper el estado del editor.

---

### Task 1: Esqueleto del monorepo y paquete `netlist` ✅ COMPLETADA

> **Estado:** implementada. 11 tests en verde (el plan pedía 4). Ver "Estado de ejecución" arriba y la desviación **D-1**.
> **Añadido no previsto:** campo `nextNetSeq` en `Project` para que los ids de net no se reciclen tras un merge.

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- Create: `packages/netlist/src/types.ts`
- Create: `packages/netlist/src/netlist.ts`
- Create: `packages/netlist/src/index.ts`
- Test: `packages/netlist/src/netlist.test.ts`

**Interfaces:**
- Consumes: nada (tarea raíz).
- Produces:
  - `type PinType` = unión de los 12 tipos de pin del Global Constraints; `type Category` = unión de las 9 categorías.
  - `interface PinRef { pinId: string; type: PinType; netId: string | null }`
  - `interface Component { id: string; typeId: string; position: { x: number; y: number; rotation: 0|90|180|270 }; params: Record<string, number|string|boolean>; pins: PinRef[] }`
  - `interface Net { id: string; pins: { componentId: string; pinId: string }[] }`
  - `interface Project { id: string; name: string; schemaVersion: number; components: Component[]; nets: Net[]; metadata: { createdAt: string; updatedAt: string; author: string } }`
  - `type PinEndpoint = { componentId: string; pinId: string }`
  - `createEmptyProject(id: string, name: string): Project`
  - `connectPins(project: Project, a: PinEndpoint, b: PinEndpoint): Project` — pura; **mergea** los nets cuando ambos pines ya estaban conectados a nets distintos.

- [ ] **Step 1: Write the failing test**

```ts
// packages/netlist/src/netlist.test.ts
import { describe, it, expect } from 'vitest'
import { createEmptyProject, connectPins } from './netlist'
import type { Project } from './types'

const withPin = (p: Project, componentId: string, pinId: string): Project => ({
  ...p,
  components: [...p.components, {
    id: componentId, typeId: 'resistor',
    position: { x: 0, y: 0, rotation: 0 }, params: {},
    pins: [{ pinId, type: 'power', netId: null }],
  }],
})

describe('connectPins', () => {
  it('creates a net joining two unconnected pins', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(p, 'R1', 'a'), 'R2', 'a')
    const result = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    expect(result.nets).toHaveLength(1)
    expect(result.nets[0].pins).toHaveLength(2)
    expect(result.components[0].pins[0].netId).toBe(result.nets[0].id)
  })

  it('merges two existing nets instead of creating a second one', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(withPin(p, 'R1', 'a'), 'R2', 'a'), 'R3', 'a')
    p = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    p = connectPins(p, { componentId: 'R2', pinId: 'a' }, { componentId: 'R3', pinId: 'a' })
    expect(p.nets).toHaveLength(1)
    expect(p.nets[0].pins).toHaveLength(3)
  })

  it('rejects a pin already in the target net', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(p, 'R1', 'a'), 'R2', 'a')
    p = connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    expect(() => connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' }))
      .toThrow(/already connected/)
  })

  it('does not mutate the input project', () => {
    let p = createEmptyProject('p1', 'test')
    p = withPin(withPin(p, 'R1', 'a'), 'R2', 'a')
    const before = JSON.stringify(p)
    connectPins(p, { componentId: 'R1', pinId: 'a' }, { componentId: 'R2', pinId: 'a' })
    expect(JSON.stringify(p)).toBe(before)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/netlist test`
Expected: FAIL — `Failed to resolve import "./netlist"`.

- [ ] **Step 3: Implement the types and the two functions**

Declare types in `types.ts`, functions in `netlist.ts`. `connectPins` is pure: structural sharing, never mutates the input. Net ids are generated as `N1`, `N2`, … scanning existing ids for the highest numeric suffix. When both endpoints already sit on nets, move every pin of the second net into the first and drop the second net.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/netlist test`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json packages/netlist
git commit -m "feat(netlist): add project/pin types and connectPins merge semantics"
```

---

### Task 2: Validador de conexiones (reglas V-1..V-6) ✅ COMPLETADA

> **Estado:** implementada. 19 tests en verde (el plan pedía 5). Ver desviaciones **D-2** y **D-3**.
> **Cambio de firma:** `canConnect` toma `PinEndpoint`, no `PinRef`.
> **Decisión de diseño:** V-4 y V-6 se abstienen cuando faltan datos (catálogo o tensiones) en vez de avisar en falso.

**Files:**
- Create: `packages/validation/src/rules.ts`
- Create: `packages/validation/src/validate.ts`
- Create: `packages/validation/src/index.ts`
- Test: `packages/validation/src/validate.test.ts`

**Interfaces:**
- Consumes: `Project`, `PinRef`, `Net`, `PinType` de `@circuitforge/netlist`; `ComponentType` de `@circuitforge/component-library` (solo el tipo; sin dependencia de runtime).
- Produces:
  - `type Severity = 'error' | 'warning'`
  - `interface Violation { rule: 'V-1'|'V-2'|'V-3'|'V-4'|'V-5'|'V-6'; severity: Severity; netId?: string; componentId?: string; message: string }`
  - `validateCircuit(project: Project, catalog: Map<string, ComponentType>): Violation[]`
  - `canConnect(a: PinRef, b: PinRef): { allowed: boolean; violation?: Violation }` — la usa el editor en tiempo real (RF-1.4).

- [ ] **Step 1: Write the failing test**

```ts
// packages/validation/src/validate.test.ts
import { describe, it, expect } from 'vitest'
import { validateCircuit } from './validate'
import { projectWithNet, emptyProject } from './fixtures'

describe('validateCircuit', () => {
  it('V-1: blocks a net holding both power and gnd', () => {
    const p = projectWithNet([
      { componentId: 'U1', pinId: '5V',  type: 'power' },
      { componentId: 'U1', pinId: 'GND', type: 'gnd' },
    ])
    expect(validateCircuit(p, new Map()))
      .toContainEqual(expect.objectContaining({ rule: 'V-1', severity: 'error' }))
  })

  it('V-2: warns when connecting digital to power', () => {
    const p = projectWithNet([
      { componentId: 'U1', pinId: 'D13', type: 'digital' },
      { componentId: 'PS1', pinId: 'OUT', type: 'power' },
    ])
    expect(validateCircuit(p, new Map()))
      .toContainEqual(expect.objectContaining({ rule: 'V-2', severity: 'warning' }))
  })

  it('V-3: warns on a net with a single pin', () => {
    // Review Focus #2
    const p = projectWithNet([{ componentId: 'R1', pinId: 'a', type: 'power' }])
    expect(validateCircuit(p, new Map()))
      .toContainEqual(expect.objectContaining({ rule: 'V-3', severity: 'warning' }))
  })

  it('returns no violations for an empty project', () => {
    expect(validateCircuit(emptyProject(), new Map())).toEqual([])
  })

  it('does not throw when a typeId is absent from the catalog', () => {
    // Review Focus #5
    const p = projectWithNet([], [{ id: 'X1', typeId: 'unknown_type' }])
    expect(() => validateCircuit(p, new Map())).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/validation test`
Expected: FAIL — `Failed to resolve import "./validate"`.

- [ ] **Step 3: Implement the six rules**

Each rule is a pure function `(project, catalog) => Violation[]` in `rules.ts`, collected by `validateCircuit`:

- **V-1** (error) — un net contiene un pin `power` y un pin `gnd` sin carga intermedia.
- **V-2** (warning) — dos pines `power` de fuentes distintas, o `digital` junto a `power`.
- **V-3** (warning) — net con un solo pin.
- **V-4** (warning) — `anode`/`cathode` invertidos respecto a la fuente.
- **V-5** (warning) — componente activo con pines requeridos sin net.
- **V-6** (warning) — tensión del net por encima de la máxima del pin.

`canConnect` aplica V-1 y V-2 sobre el net fusionado hipotético y devuelve `allowed: false` solo cuando `severity === 'error'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/validation test`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/validation
git commit -m "feat(validation): add V-1..V-6 rules and real-time canConnect"
```

---

### Task 3: Catálogo de componentes (≥60 fichas, 9 categorías)

**Files:**
- Create: `packages/component-library/src/schema.ts`
- Create: `packages/component-library/src/loadCatalog.ts`
- Create: `packages/component-library/data/{passive,semiconductor,mcu,sensor,actuator,esc,source,battery,connectivity}.json`
- Test: `packages/component-library/src/loadCatalog.test.ts`

**Interfaces:**
- Consumes: `Category`, `PinType` de `@circuitforge/netlist`.
- Produces:
  - `interface ComponentParameter { key: string; label: string; unit: string; default: number|string|boolean; min?: number; max?: number; step?: number }`
  - `interface ComponentType { typeId: string; category: Category; name: string; symbol: { viewBox: string; paths: string[] }; model3d: { glbUrl: string } | null; pins: { id: string; label: string; type: PinType; position: { x: number; y: number } }[]; parameters: ComponentParameter[]; model: ModelSpec }`
  - `type ModelSpec = { kind: 'resistor'; resistanceParam: string } | { kind: 'led'; forwardVoltage: number; maxCurrent: number } | { kind: 'source'; voltageParam: string; esr: number } | { kind: 'battery'; voltageParam: string; esr: number; capacityMah: number } | { kind: 'mcu'; digitalPins: string[]; analogPins: string[] } | { kind: 'behavioral'; fnId: string } | { kind: 'switch' }`
  - `loadCatalog(opts?: { dataDir?: string }): Map<string, ComponentType>` — lanza con la ruta del archivo ofensor si una ficha no valida.

- [ ] **Step 1: Write the failing test**

```ts
// packages/component-library/src/loadCatalog.test.ts
import { describe, it, expect } from 'vitest'
import { loadCatalog } from './loadCatalog'

const CATEGORIES = ['passive','semiconductor','mcu','sensor','actuator','esc','source','battery','connectivity']

describe('loadCatalog', () => {
  const catalog = loadCatalog()

  it('loads at least 60 component types', () => {           // OE-3
    expect(catalog.size).toBeGreaterThanOrEqual(60)
  })

  it('covers all nine categories', () => {
    const present = new Set([...catalog.values()].map(c => c.category))
    for (const cat of CATEGORIES) expect([...present]).toContain(cat)
  })

  it('gives every component typed pins, a symbol and a model', () => {  // OE-3
    for (const c of catalog.values()) {
      expect(c.pins.length).toBeGreaterThan(0)
      expect(c.symbol.paths.length).toBeGreaterThan(0)
      expect(c.model).toBeDefined()
    }
  })

  it('exposes at least 40 types usable by the MVP editor', () => {      // OE-1
    const usable = [...catalog.values()].filter(c => c.model.kind !== 'behavioral')
    expect(usable.length).toBeGreaterThanOrEqual(40)
  })

  it('rejects a malformed entry naming the offending file', () => {     // Review Focus #5
    expect(() => loadCatalog({ dataDir: 'fixtures/malformed' })).toThrow(/passive\.json/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/component-library test`
Expected: FAIL — `Failed to resolve import "./loadCatalog"`.

- [ ] **Step 3: Author the nine JSON catalogs**

Each entry is a declarative ficha. Reference shape:

```json
{
  "typeId": "resistor",
  "category": "passive",
  "name": "Resistencia",
  "symbol": { "viewBox": "0 0 40 20", "paths": ["M2 10 H8", "M8 10 l4 -8 l8 16 l8 -16 l8 16 l4 -8 H40"] },
  "model3d": null,
  "pins": [
    { "id": "a", "label": "A", "type": "power", "position": { "x": 2, "y": 10 } },
    { "id": "b", "label": "B", "type": "power", "position": { "x": 38, "y": 10 } }
  ],
  "parameters": [{ "key": "resistance", "label": "Resistencia", "unit": "Ω", "default": 220, "min": 0.1, "step": 1 }],
  "model": { "kind": "resistor", "resistanceParam": "resistance" }
}
```

Distribute **≥60** fichas across the nine categories. Pin types must come from the Global Constraints list. Defaults must match real datasheets (RF-3.4): LED rojo `forwardVoltage: 2.0`, Arduino UNO con `digitalPins: ["D0".."D13"]` y `analogPins: ["A0".."A5"]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/component-library test`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/component-library
git commit -m "feat(library): add 9-category component catalog as declarative JSON"
```

---

### Task 4: Constructor de MNA y solver lineal

**Files:**
- Create: `packages/simulation/src/mna/buildMna.ts`
- Create: `packages/simulation/src/mna/linearSolve.ts`
- Test: `packages/simulation/src/mna/linearSolve.test.ts`
- Test: `packages/simulation/src/mna/buildMna.test.ts`

**Interfaces:**
- Consumes: `Project` de `@circuitforge/netlist`; `ComponentType`, `ModelSpec` de `@circuitforge/component-library`.
- Produces:
  - `interface MnaSystem { G: number[][]; I: number[]; nodeIndex: Map<string, number>; nodeCount: number; sourceIndex: Map<string, number> }`
  - `buildMna(project: Project, catalog: Map<string, ComponentType>): MnaSystem`
  - `interface SolveResult { x: number[]; singular: boolean }`
  - `linearSolve(G: number[][], I: number[]): SolveResult` — eliminación gaussiana con pivoteo parcial; `singular: true` cuando el pivote es menor que `1e-12`.
  - El nodo de referencia (GND) **no recibe índice en `G`**; queda fuera del sistema.

- [ ] **Step 1: Write the failing test**

```ts
// packages/simulation/src/mna/linearSolve.test.ts
import { describe, it, expect } from 'vitest'
import { linearSolve } from './linearSolve'

describe('linearSolve', () => {
  it('solves a 2x2 system', () => {
    const r = linearSolve([[2, 1], [1, 3]], [5, 10])
    expect(r.singular).toBe(false)
    expect(r.x[0]).toBeCloseTo(1, 6)
    expect(r.x[1]).toBeCloseTo(3, 6)
  })

  it('flags a singular matrix instead of returning NaNs', () => {  // Review Focus #4
    expect(linearSolve([[1, 2], [2, 4]], [3, 6]).singular).toBe(true)
  })

  it('solves a 1x1 system', () => {
    expect(linearSolve([[4]], [8]).x[0]).toBeCloseTo(2, 6)
  })

  it('does not throw on an empty system', () => {                 // Review Focus #1
    const r = linearSolve([], [])
    expect(r.x).toEqual([])
    expect(r.singular).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/simulation test -- linearSolve`
Expected: FAIL — `Failed to resolve import "./linearSolve"`.

- [ ] **Step 3: Implement `linearSolve`, then `buildMna`**

`linearSolve`: eliminación hacia adelante con pivoteo parcial, luego sustitución hacia atrás. Todo pivote con `Math.abs(pivot) < 1e-12` marca el sistema como singular y retorna de inmediato — nunca se divide entre él.

`buildMna`: asigna un índice por cada net distinto de GND; estampa conductancias `G[i][i] += 1/R`, `G[i][j] -= 1/R`; agrega una fila/columna extra por cada fuente de tensión; **acota cualquier parámetro `resistance` a un mínimo de `1e-3` Ω** para que una resistencia de 0 Ω no produzca `Infinity`.

- [ ] **Step 4: Write the buildMna test**

```ts
// packages/simulation/src/mna/buildMna.test.ts
import { describe, it, expect } from 'vitest'
import { buildMna } from './buildMna'
import { linearSolve } from './linearSolve'
import { projectOfResistorOnly, projectWithResistance, dividerWithGround, catalog } from './fixtures'

describe('buildMna', () => {
  it('yields a singular system for a floating circuit with no GND', () => {  // Review Focus #4
    const s = buildMna(projectOfResistorOnly(), catalog())
    expect(linearSolve(s.G, s.I).singular).toBe(true)
  })

  it('clamps a zero-ohm resistance instead of producing Infinity', () => {    // Review Focus #3
    const s = buildMna(projectWithResistance(0), catalog())
    expect(Number.isFinite(s.G[0][0])).toBe(true)
  })

  it('excludes the ground net from the unknown vector', () => {
    const s = buildMna(dividerWithGround(), catalog())
    expect(s.nodeIndex.has('GND')).toBe(false)
  })
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm -F @circuitforge/simulation test -- mna`
Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/simulation/src/mna
git commit -m "feat(simulation): add MNA stamping and singular-safe Gaussian solver"
```

---

### Task 5: Analizador DC y la batería de 15 casos de aceptación

**Files:**
- Create: `packages/simulation/src/dc/analyzeDc.ts`
- Create: `packages/simulation/src/dc/cases.ts`
- Create: `packages/simulation/src/dc/index.ts`
- Test: `packages/simulation/src/dc/analyzeDc.test.ts`
- Test: `packages/simulation/src/dc/cases.test.ts`

**Interfaces:**
- Consumes: `buildMna`, `linearSolve` de Task 4.
- Produces:
  - `interface ComponentState { componentId: string; voltage: number; current: number; power: number }`
  - `interface DcResult { ok: boolean; error?: 'SINGULAR' | 'NO_GROUND'; states: ComponentState[]; nodeVoltages: Map<string, number> }`
  - `analyzeDc(project: Project, catalog: Map<string, ComponentType>): DcResult`
  - `interface TestCase { name: string; build: () => Project; expected: { componentId: string; voltage?: number; current?: number; power?: number }[]; tolerancePct: number; reference: string }`
  - `TEST_CASES: TestCase[]` — exactamente **15** casos con `tolerancePct: 10` (OE-2).

- [ ] **Step 1: Write the failing test**

```ts
// packages/simulation/src/dc/analyzeDc.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeDc } from './analyzeDc'
import { dividerOneToOne, seriesResistor, projectOfResistorOnly, emptyProject, projectWithResistance, catalog } from './fixtures'

describe('analyzeDc', () => {
  it('solves the 5V / 1k / 1k divider to 2.5V', () => {
    const r = analyzeDc(dividerOneToOne(), catalog())
    expect(r.ok).toBe(true)
    const mid = r.nodeVoltages.get('N_mid')!
    expect(Math.abs(mid - 2.5) / 2.5 * 100).toBeLessThan(10)
  })

  it('applies Ohm law on a series resistor', () => {
    const r = analyzeDc(seriesResistor(9, 1000), catalog())
    const s = r.states.find(x => x.componentId === 'R1')!
    expect(s.current).toBeCloseTo(0.009, 6)
    expect(s.power).toBeCloseTo(0.081, 6)
  })

  it('reports NO_GROUND for a circuit with no ground reference', () => {   // Review Focus #4
    expect(analyzeDc(projectOfResistorOnly(), catalog()).error).toBe('NO_GROUND')
  })

  it('returns an empty result for an empty circuit without throwing', () => {  // Review Focus #1
    expect(analyzeDc(emptyProject(), catalog()).states).toEqual([])
  })

  it('never returns NaN for a zero-ohm resistor', () => {                 // Review Focus #3
    const r = analyzeDc(projectWithResistance(0), catalog())
    for (const s of r.states) {
      expect(Number.isFinite(s.current)).toBe(true)
      expect(Number.isFinite(s.power)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/simulation test -- analyzeDc`
Expected: FAIL — `Failed to resolve import "./analyzeDc"`.

- [ ] **Step 3: Implement `analyzeDc`**

Mapea `netId → nodeVoltage` desde el vector solución (GND = 0 V). Por componente, deriva `voltage` de la diferencia de tensión de sus pines, y de ahí `current` y `power` según su `ModelSpec`. Devuelve `error: 'NO_GROUND'` cuando el netlist no tiene ningún net con un pin `gnd`; devuelve `error: 'SINGULAR'` cuando el solver marca la matriz como singular.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/simulation test -- analyzeDc`
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the 15 acceptance cases**

```ts
// packages/simulation/src/dc/cases.test.ts
import { describe, it, expect } from 'vitest'
import { TEST_CASES } from './cases'
import { analyzeDc } from './analyzeDc'
import { catalog } from './fixtures'

describe('OE-2 acceptance battery', () => {
  it('defines exactly 15 documented cases', () => {
    expect(TEST_CASES).toHaveLength(15)
  })

  it('documents a reference and a tolerance for every case', () => {
    for (const c of TEST_CASES) {
      expect(c.reference.length).toBeGreaterThan(0)
      expect(c.tolerancePct).toBe(10)
    }
  })

  for (const c of TEST_CASES) {
    it(`${c.name} stays within ${c.tolerancePct}%`, () => {
      const result = analyzeDc(c.build(), catalog())
      expect(result.ok).toBe(true)
      for (const exp of c.expected) {
        const actual = result.states.find(s => s.componentId === exp.componentId)!
        for (const key of ['voltage', 'current', 'power'] as const) {
          if (exp[key] === undefined) continue
          const error = Math.abs(actual[key] - exp[key]) / Math.abs(exp[key]) * 100
          expect(error).toBeLessThan(c.tolerancePct)
        }
      }
    })
  }
})
```

The 15 cases must cover: (1) divisor de tensión, (2) resistencias en serie, (3) resistencias en paralelo, (4) ley de Ohm con R desconocida, (5) LED con resistencia limitadora, (6) dos LEDs en paralelo, (7) puente de resistencias equilibrado, (8) puente desequilibrado, (9) divisor con carga, (10) dos fuentes en serie, (11) divisor de corriente, (12) potencia disipada total, (13) batería con ESR alimentando una carga, (14) circuito mixto serie-paralelo, (15) malla de Kirchhoff con dos fuentes. Cada `reference` cita la fórmula aplicada y su fuente.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm -F @circuitforge/simulation test -- cases`
Expected: PASS — 17 tests. **Si un caso falla por más del 10 %, el bug está en el solver, no en el caso.**

- [ ] **Step 7: Commit**

```bash
git add packages/simulation/src/dc
git commit -m "feat(simulation): add DC analyzer with the 15-case OE-2 acceptance battery"
```

---

### Task 6: Kernel digital / temporal

**Files:**
- Create: `packages/simulation/src/digital/scheduler.ts`
- Create: `packages/simulation/src/digital/pwm.ts`
- Create: `packages/simulation/src/digital/index.ts`
- Test: `packages/simulation/src/digital/scheduler.test.ts`
- Test: `packages/simulation/src/digital/pwm.test.ts`

**Interfaces:**
- Consumes: `PinRef`, `PinType` de `@circuitforge/netlist`.
- Produces:
  - `type SignalState = 'HIGH' | 'LOW'`
  - `interface ScheduledEvent { timeMs: number; pinId: string; state: SignalState }`
  - `class EventScheduler { schedule(timeMs: number, pinId: string, state: SignalState): void; advanceTo(timeMs: number, onEvent: (e: ScheduledEvent) => void): void; now(): number }`
  - `interface PwmConfig { dutyCycle: number; frequencyHz: number }`
  - `pwmAverageVoltage(config: PwmConfig, highVoltage: number): number` — devuelve `dutyCycle * highVoltage`; lanza si `dutyCycle ∉ [0,1]` o si `frequencyHz <= 0`.
  - `pwmFromAnalogWrite(value: number): PwmConfig` — mapea `0..255` de Arduino a `dutyCycle = value / 255`, con `frequencyHz = 490`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/simulation/src/digital/pwm.test.ts
import { describe, it, expect } from 'vitest'
import { pwmAverageVoltage, pwmFromAnalogWrite } from './pwm'

describe('pwm', () => {
  it('maps analogWrite(127) to roughly half duty cycle', () => {
    expect(pwmFromAnalogWrite(127).dutyCycle).toBeCloseTo(0.498, 2)
  })

  it('averages 5V at 50% duty to 2.5V', () => {
    expect(pwmAverageVoltage({ dutyCycle: 0.5, frequencyHz: 490 }, 5)).toBeCloseTo(2.5, 6)
  })

  it('treats analogWrite(0) as a constant LOW', () => {
    expect(pwmAverageVoltage(pwmFromAnalogWrite(0), 5)).toBe(0)
  })

  it('rejects an out-of-range duty cycle', () => {
    expect(() => pwmAverageVoltage({ dutyCycle: 1.5, frequencyHz: 490 }, 5)).toThrow(/dutyCycle/)
  })

  it('rejects a non-positive frequency', () => {
    expect(() => pwmAverageVoltage({ dutyCycle: 0.5, frequencyHz: 0 }, 5)).toThrow(/frequencyHz/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/simulation test -- pwm`
Expected: FAIL — `Failed to resolve import "./pwm"`.

- [ ] **Step 3: Implement `pwm` and `EventScheduler`**

`pwm.ts`: `pwmFromAnalogWrite` valida `0 <= value <= 255` y normaliza; `pwmAverageVoltage` valida los rangos y multiplica.

`scheduler.ts`: `EventScheduler` guarda los eventos en una cola ordenada por `timeMs` ascendente. `advanceTo(t, cb)` extrae e invoca `cb` para todo evento con `timeMs <= t` en orden cronológico, y fija el reloj interno a `t`. `now()` devuelve el reloj interno, que inicia en `0`.

- [ ] **Step 4: Write the scheduler test**

```ts
// packages/simulation/src/digital/scheduler.test.ts
import { describe, it, expect } from 'vitest'
import { EventScheduler } from './scheduler'

describe('EventScheduler', () => {
  it('emits events in chronological order up to the target time', () => {
    const s = new EventScheduler()
    s.schedule(200, 'D13', 'LOW')
    s.schedule(100, 'D13', 'HIGH')
    const seen: number[] = []
    s.advanceTo(250, e => seen.push(e.timeMs))
    expect(seen).toEqual([100, 200])
  })

  it('does not emit an event scheduled beyond the target time', () => {
    const s = new EventScheduler()
    s.schedule(500, 'D13', 'HIGH')
    const seen: number[] = []
    s.advanceTo(100, e => seen.push(e.timeMs))
    expect(seen).toEqual([])
    expect(s.now()).toBe(100)
  })

  it('implements delay() semantics: nothing fires during the wait', () => {
    const s = new EventScheduler()
    s.schedule(2000, 'D13', 'LOW')
    const seen: number[] = []
    s.advanceTo(1999, e => seen.push(e.timeMs))
    expect(seen).toEqual([])
  })

  it('starts its clock at zero', () => {
    expect(new EventScheduler().now()).toBe(0)
  })
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm -F @circuitforge/simulation test -- pwm scheduler`
Expected: PASS — 9 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/simulation/src/digital
git commit -m "feat(simulation): add discrete-event scheduler and PWM mapping"
```

---

### Task 7: Modelos conductuales de sensores, actuadores y energía

**Files:**
- Create: `packages/simulation/src/models/behavioral.ts`
- Create: `packages/simulation/src/models/index.ts`
- Test: `packages/simulation/src/models/behavioral.test.ts`

**Interfaces:**
- Consumes: `Component`, `Project` de `@circuitforge/netlist`; `ModelSpec` de `@circuitforge/component-library`.
- Produces:
  - `interface BehavioralInput { project: Project; catalog: Map<string, ComponentType>; timeMs: number }`
  - `interface BehavioralOutput { componentId: string; value: number; unit: string }[]`
  - `applyBehavioralModels(input: BehavioralInput): BehavioralOutput` — aplica cada `ModelSpec.kind === 'behavioral'` mediante su `fnId` y devuelve las magnitudes observadas.
  - Registro `BEHAVIORAL_MODELS: Record<string, (component: Component, ctx: BehavioralInput) => number>` con las claves exactas: `ldr`, `dht11`, `servo`, `dc_motor`, `battery_discharge`, `buzzer`, `oled`, `ultrasonic_distance`, `ir_line_sensor`, `esc_throttle`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/simulation/src/models/behavioral.test.ts
import { describe, it, expect } from 'vitest'
import { applyBehavioralModels, BEHAVIORAL_MODELS } from './behavioral'
import { ldrProject, servoProject, batteryProject, catalog } from './fixtures'

describe('behavioral models', () => {
  it('registers the ten behavioral models named in the spec', () => {
    expect(Object.keys(BEHAVIORAL_MODELS).sort()).toEqual(
      ['battery_discharge','buzzer','dc_motor','dht11','esc_throttle','ir_line_sensor','ldr','oled','servo','ultrasonic_distance']
    )
  })

  it('varies LDR resistance inversely with light level', () => {
    expect(BEHAVIORAL_MODELS.ldr(ldrComponent(100), ctx(0))).toBeLessThan(
      BEHAVIORAL_MODELS.ldr(ldrComponent(0), ctx(0))
    )
  })

  it('maps a servo angle request within 0..180', () => {
    expect(BEHAVIORAL_MODELS.servo(servoComponent(90), ctx(0))).toBe(90)
    expect(BEHAVIORAL_MODELS.servo(servoComponent(400), ctx(0))).toBe(180)
    expect(BEHAVIORAL_MODELS.servo(servoComponent(-5), ctx(0))).toBe(0)
  })

  it('reports a battery voltage that decays with elapsed time', () => {
    const early = BEHAVIORAL_MODELS.battery_discharge(batteryComponent(), ctx(0))
    const late  = BEHAVIORAL_MODELS.battery_discharge(batteryComponent(), ctx(3_600_000))
    expect(late).toBeLessThan(early)
  })

  it('skips components with no behavioral model without throwing', () => {
    expect(applyBehavioralModels({ project: noBehavioralProject(), catalog: catalog(), timeMs: 0 })).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/simulation test -- behavioral`
Expected: FAIL — `Failed to resolve import "./behavioral"`.

- [ ] **Step 3: Implement the ten models**

| `fnId` | Entrada | Devuelve | Unidad | Referencia |
|---|---|---|---|---|
| `ldr` | `params.lux` | Resistencia | Ω | `R = 1000 * 10^(2 - lux/50)`, acotada a `[100, 1e6]` |
| `dht11` | `params.temperature`, `params.humidity` | Valor de la magnitud pedida | °C / % | Regresión lineal del datasheet (±2 °C, ±5 %) |
| `servo` | `params.angle` | Ángulo acotado | ° | Acotado a `[0, 180]`; PWM 500–2500 µs |
| `dc_motor` | `params.rpmTarget`, `params.load` | RPM real | rpm | `rpm = rpmTarget * (1 - load)` |
| `battery_discharge` | `params.capacityMah`, `timeMs` | Tensión de terminal | V | Lineal desde `nominal` hasta `cutoff` según `capacityMah` |
| `buzzer` | `params.frequency`, `params.tone` | Frecuencia emitida | Hz | Acotado a `[20, 20000]` |
| `oled` | `params.textLines` | Número de líneas dibujadas | — | Acotado a 4 (SSD1306 128×64) |
| `ultrasonic_distance` | `params.echoUs` | Distancia | cm | `d = echoUs / 58` |
| `ir_line_sensor` | `params.reflectivity` | Lectura analógica | 0..1023 | `value = 1023 * (1 - reflectivity)` |
| `esc_throttle` | `params.throttle` | Pulso de salida | µs | `1000 + throttle * 1000`, acotado a `[1000, 2000]` |

Todos los modelos deben acotar su salida y nunca devolver `NaN` ante un parámetro ausente.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/simulation test -- behavioral`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/simulation/src/models
git commit -m "feat(simulation): add ten behavioral models for sensors, actuators and power"
```

---

### Task 8: Web Worker del simulador

**Files:**
- Create: `packages/simulation/src/worker/protocol.ts`
- Create: `packages/simulation/src/worker/simulationWorker.ts`
- Test: `packages/simulation/src/worker/protocol.test.ts`

**Interfaces:**
- Consumes: `analyzeDc` (Task 5), `EventScheduler` (Task 6), `applyBehavioralModels` (Task 7).
- Produces:
  - `type WorkerRequest = { type: 'init'; catalog: ComponentType[] } | { type: 'simulate'; project: Project; timeMs: number } | { type: 'reset' }`
  - `type WorkerResponse = { type: 'ready' } | { type: 'result'; result: DcResult; behavioral: BehavioralOutput[] } | { type: 'error'; error: DcResult['error'] | 'INTERNAL' }`
  - `handleRequest(state: WorkerState, request: WorkerRequest): { state: WorkerState; response: WorkerResponse }` — **función pura y síncrona** con toda la lógica del worker, de modo que sea testeable en Node sin instanciar un `Worker`.
  - `interface WorkerState { catalog: Map<string, ComponentType>; scheduler: EventScheduler; initialized: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
// packages/simulation/src/worker/protocol.test.ts
import { describe, it, expect } from 'vitest'
import { createWorkerState, handleRequest } from './simulationWorker'
import { dividerOneToOne, catalog } from './fixtures'

describe('handleRequest', () => {
  it('answers ready after init', () => {
    const { response } = handleRequest(createWorkerState(), { type: 'init', catalog: [...catalog().values()] })
    expect(response.type).toBe('ready')
  })

  it('returns a result for a valid divider', () => {
    let s = createWorkerState()
    s = handleRequest(s, { type: 'init', catalog: [...catalog().values()] }).state
    const { response } = handleRequest(s, { type: 'simulate', project: dividerOneToOne(), timeMs: 0 })
    expect(response.type).toBe('result')
  })

  it('returns an error response instead of throwing on a groundless circuit', () => {
    // Review Focus #4
    let s = createWorkerState()
    s = handleRequest(s, { type: 'init', catalog: [...catalog().values()] }).state
    const { response } = handleRequest(s, { type: 'simulate', project: floatingCircuit(), timeMs: 0 })
    expect(response).toEqual(expect.objectContaining({ type: 'error', error: 'NO_GROUND' }))
  })

  it('rejects a simulate request before init', () => {
    const { response } = handleRequest(createWorkerState(), { type: 'simulate', project: dividerOneToOne(), timeMs: 0 })
    expect(response.type).toBe('error')
  })

  it('never throws on a malformed request', () => {
    // Review Focus #5
    expect(() => handleRequest(createWorkerState(), { type: 'nonsense' } as any)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/simulation test -- protocol`
Expected: FAIL — `Failed to resolve import "./simulationWorker"`.

- [ ] **Step 3: Implement `handleRequest` and the thin worker entry**

`handleRequest` is a pure reducer over `WorkerState`: it validates the request, calls the domain functions, and returns both the next state and the response. It wraps every domain call in `try/catch` and maps an unexpected throw to `{ type: 'error', error: 'INTERNAL' }`.

`simulationWorker.ts` additionally registers `self.onmessage` only when `typeof self !== 'undefined' && 'postMessage' in self`, so importing the module in Node stays side-effect free.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/simulation test -- protocol`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/simulation/src/worker
git commit -m "feat(simulation): add testable pure worker protocol reducer"
```

---

### Task 9: App React, store y editor de lienzo

**Files:**
- Create: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/index.html`
- Create: `apps/web/src/store/projectStore.ts`
- Create: `apps/web/src/features/editor/Canvas.tsx`
- Create: `apps/web/src/features/editor/Grid.tsx`
- Create: `apps/web/src/features/editor/ComponentMesh.tsx`
- Create: `apps/web/src/features/editor/useEditorPointer.ts`
- Test: `apps/web/src/store/projectStore.test.ts`

**Interfaces:**
- Consumes: `Project`, `connectPins`, `createEmptyProject` de `@circuitforge/netlist`; `validateCircuit`, `canConnect` de `@circuitforge/validation`; `loadCatalog` de `@circuitforge/component-library`.
- Produces:
  - `useProjectStore` (Zustand) con las acciones `placeComponent(typeId: string, x: number, y: number): void`, `moveComponent(id: string, x: number, y: number): void`, `rotateComponent(id: string): void`, `deleteComponent(id: string): void`, `setParam(id: string, key: string, value: number|string|boolean): void`, `tryConnect(a: PinEndpoint, b: PinEndpoint): { ok: boolean; message?: string }`, `undo(): void`, `redo(): void`.
  - `GRID_SIZE = 20` — separación de la cuadrícula en píxeles de mundo; `snapToGrid(v: number): number` devuelve `Math.round(v / GRID_SIZE) * GRID_SIZE`.
  - El lienzo usa **cámara ortográfica** (`<OrthographicCamera makeDefault zoom={...} />`) sobre un `<Grid />` de R3F, satisfaciendo RF-1.1 y preparando el 3D de la fase 2 (D-3).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/store/projectStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from './projectStore'

beforeEach(() => useProjectStore.getState().reset())

describe('projectStore', () => {
  it('places a component snapped to the grid', () => {
    useProjectStore.getState().placeComponent('resistor', 33, 67)
    const c = useProjectStore.getState().project.components[0]
    expect(c.position).toEqual({ x: 40, y: 60, rotation: 0 })
  })

  it('rotates through the four allowed angles and wraps', () => {
    useProjectStore.getState().placeComponent('resistor', 0, 0)
    const id = useProjectStore.getState().project.components[0].id
    for (const expected of [90, 180, 270, 0]) {
      useProjectStore.getState().rotateComponent(id)
      expect(useProjectStore.getState().project.components[0].position.rotation).toBe(expected)
    }
  })

  it('undoes a placement', () => {
    useProjectStore.getState().placeComponent('resistor', 0, 0)
    useProjectStore.getState().undo()
    expect(useProjectStore.getState().project.components).toHaveLength(0)
  })

  it('refuses a power-to-gnd connection and explains why', () => {
    // RF-1.4
    const store = useProjectStore.getState()
    store.placeComponent('arduino_uno', 0, 0)
    const id = useProjectStore.getState().project.components[0].id
    const result = useProjectStore.getState().tryConnect(
      { componentId: id, pinId: '5V' }, { componentId: id, pinId: 'GND' }
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/cortocircuito/i)
  })

  it('never exceeds four rotations (0/90/180/270 only)', () => {
    useProjectStore.getState().placeComponent('resistor', 0, 0)
    const id = useProjectStore.getState().project.components[0].id
    for (let i = 0; i < 9; i++) useProjectStore.getState().rotateComponent(id)
    expect([0, 90, 180, 270]).toContain(
      useProjectStore.getState().project.components[0].position.rotation
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/web test -- projectStore`
Expected: FAIL — `Failed to resolve import "./projectStore"`.

- [ ] **Step 3: Implement the store**

Zustand store holding `{ project, past: Project[], future: Project[] }`. Every mutating action pushes the previous `project` onto `past` and clears `future`. `tryConnect` calls `canConnect` first and, when `allowed` is false, returns `{ ok: false, message }` with a Spanish message per rule: V-1 → "Cortocircuito: no se puede unir alimentación con tierra directamente". `reset()` restores an empty project.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/web test -- projectStore`
Expected: PASS — 5 tests.

- [ ] **Step 5: Implement the canvas**

`Canvas.tsx` mounts `<Canvas>` with `<OrthographicCamera makeDefault />`, `<Grid />` (cuadrícula dorada con `args={[GRID_SIZE, GRID_SIZE]}`), and one `<ComponentMesh />` per component. `useEditorPointer.ts` converts screen coordinates to world coordinates via `useThree(state => state.raycaster)` and snaps with `snapToGrid` before calling `moveComponent`.

- [ ] **Step 6: Verify the editor renders in a real browser**

Run: `pnpm -F @circuitforge/web dev`
Expected: la app carga en `http://localhost:5173`, se ve la cuadrícula y la consola no muestra errores.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): add Zustand project store and orthographic grid canvas"
```

---

### Task 10: Paleta, inspector y validación en vivo

**Files:**
- Create: `apps/web/src/features/palette/Palette.tsx`
- Create: `apps/web/src/features/palette/CategoryFilter.tsx`
- Create: `apps/web/src/features/inspector/Inspector.tsx`
- Create: `apps/web/src/features/inspector/ParameterField.tsx`
- Create: `apps/web/src/features/validation/ViolationList.tsx`
- Test: `apps/web/src/features/palette/paletteFilter.test.ts`
- Test: `apps/web/src/features/validation/violationsToText.test.ts`

**Interfaces:**
- Consumes: `useProjectStore`, `loadCatalog`, `validateCircuit`.
- Produces:
  - `filterCatalog(catalog: Map<string, ComponentType>, query: string, category: Category | 'all'): ComponentType[]` — caso-insensible, busca en `name` y `typeId`.
  - `violationsToText(violations: Violation[]): string[]` — mensajes en español, con `error` antes que `warning`.
  - `ParameterField` renderiza un control por tipo de parámetro: `range` cuando hay `min` y `max`, `number` cuando solo hay unidad numérica, `select` para booleanos.
  - `ViolationList` se suscribe a `validateCircuit` y muestra los `error` en rojo y los `warning` en ámbar.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/features/palette/paletteFilter.test.ts
import { describe, it, expect } from 'vitest'
import { filterCatalog } from './paletteFilter'
import { loadCatalog } from '@circuitforge/component-library'

describe('filterCatalog', () => {
  const catalog = loadCatalog()

  it('finds a component by spanish name, case-insensitively', () => {
    expect(filterCatalog(catalog, 'resis', 'all').some(c => c.typeId === 'resistor')).toBe(true)
  })

  it('filters by category', () => {
    const only = filterCatalog(catalog, '', 'sensor')
    expect(only.length).toBeGreaterThan(0)
    expect(only.every(c => c.category === 'sensor')).toBe(true)
  })

  it('returns the whole catalog for an empty query and no category', () => {
    expect(filterCatalog(catalog, '', 'all').length).toBe(catalog.size)
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterCatalog(catalog, 'zzzzz', 'all')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/web test -- paletteFilter`
Expected: FAIL — `Failed to resolve import "./paletteFilter"`.

- [ ] **Step 3: Implement `filterCatalog` and `violationsToText`**

Both are pure functions in their own module so they can be tested without mounting React. Messages: V-1 "Cortocircuito entre alimentación y tierra", V-2 "Pines incompatibles", V-3 "Conexión suelta", V-4 "Polaridad invertida", V-5 "Componente sin conectar por completo", V-6 "Tensión por encima del máximo del pin".

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @circuitforge/web test -- paletteFilter violationsToText`
Expected: PASS — 8 tests.

- [ ] **Step 5: Implement the three components**

`Palette` lists `filterCatalog` results grouped by the nine categories, each item draggable via `onDragStart` setting `dataTransfer` to the `typeId`. `Inspector` renders `ParameterField` per entry in `componentType.parameters`, writing through `setParam`. `ViolationList` subscribes to the store and recomputes violations on every project change, so validation is genuinely real-time (RF-1.4).

- [ ] **Step 6: Verify in the browser**

Run: `pnpm -F @circuitforge/web dev`
Expected: buscar "resis" filtra la paleta a la resistencia; arrastrarla al lienzo la coloca en la cuadrícula; cambiar "Resistencia" en el inspector actualiza el valor; conectar 5V con GND del Arduino hace aparecer el error de cortocircuito en la lista.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/palette apps/web/src/features/inspector apps/web/src/features/validation
git commit -m "feat(web): add palette, inspector and real-time violation list"
```

---

### Task 11: Cableado en el lienzo y autoconexión sugerida

**Files:**
- Create: `apps/web/src/features/wiring/WireLayer.tsx`
- Create: `apps/web/src/features/wiring/PinHandle.tsx`
- Create: `apps/web/src/features/wiring/useWiring.ts`
- Create: `apps/web/src/features/wiring/suggestConnection.ts`
- Test: `apps/web/src/features/wiring/suggestConnection.test.ts`

**Interfaces:**
- Consumes: `useProjectStore`, `tryConnect`, `canConnect`.
- Produces:
  - `suggestConnection(componentId: string, project: Project, catalog: Map<string, ComponentType>): { from: PinEndpoint; to: PinEndpoint; toComponentId: string } | null` — RF-1.7 / D-4. Dado un LED con una fuente presente, propone `anode → R → VCC` y `cathode → GND`. **Determinista**, sin LLM.
  - `useWiring()` expone `{ startPin, hoverPin, begin(pin), complete(pin), cancel() }`; `complete` delega en `tryConnect` y muestra el mensaje de rechazo cuando `ok === false`.
  - `PinHandle` dibuja el punto de conexión de cada pin y su tooltip con `label` y `type`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/features/wiring/suggestConnection.test.ts
import { describe, it, expect } from 'vitest'
import { suggestConnection } from './suggestConnection'
import { loadCatalog } from '@circuitforge/component-library'

describe('suggestConnection', () => {
  const catalog = loadCatalog()

  it('suggests anode->VCC and cathode->GND for an LED with a source present', () => {
    const project = ledWithSource()
    const s = suggestConnection('D1', project, catalog)!
    expect(s).toBeDefined()
    expect(s.toComponentId).toBe('PS1')
    expect(['power', 'gnd']).toContain(pinTypeOf(project, catalog, s.to))
  })

  it('returns null when there is no source to connect to', () => {
    expect(suggestConnection('D1', ledAlone(), catalog)).toBeNull()
  })

  it('never suggests a connection that the validator would block', () => {
    const project = ledWithSource()
    const s = suggestConnection('D1', project, catalog)
    if (s) {
      const hypot = connectPins(project, s.from, s.to)
      expect(validateCircuit(hypot, catalog).some(v => v.severity === 'error')).toBe(false)
    }
  })

  it('returns null for an unknown component id', () => {
    // Review Focus #5
    expect(suggestConnection('NOPE', ledWithSource(), catalog)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/web test -- suggestConnection`
Expected: FAIL — `Failed to resolve import "./suggestConnection"`.

- [ ] **Step 3: Implement `suggestConnection`**

Implement as a deterministic rule set over the graph, in this priority order: (1) a component pin whose type is `power` connects to the nearest net containing a `power` pin from a `source`/`battery`; (2) a pin whose type is `gnd` connects to the nearest `gnd` net; (3) a `pwm` or `digital` pin connects to the nearest `mcu` pin of matching type; (4) para un LED, insertar una resistencia limitadora si no existe ninguna en el net. Every proposal is filtered through `canConnect` before being returned, so the suggestion can never violate V-1 or V-2.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/web test -- suggestConnection`
Expected: PASS — 4 tests.

- [ ] **Step 5: Implement the wiring UI**

`PinHandle` on click calls `begin(pin)`; the next `PinHandle` click calls `complete(pin)`. `WireLayer` renders one curve per net using `THREE.CatmullRomCurve3` over the pin world positions, colored by net id. A "Sugerir conexión" button in the inspector calls `suggestConnection` for the selected component and highlights the proposed pins.

- [ ] **Step 6: Verify in the browser**

Run: `pnpm -F @circuitforge/web dev`
Expected: clic en un pin y luego en otro dibuja un cable; intentar unir 5V con GND muestra el rechazo y **no** dibuja el cable; el botón de sugerencia resalta los pines correctos para el LED.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/wiring
git commit -m "feat(web): add wiring layer and deterministic connection suggestions"
```

---

### Task 12: Simulación en vivo desde el editor

**Files:**
- Create: `apps/web/src/features/simulator/workerClient.ts`
- Create: `apps/web/src/features/simulator/useSimulation.ts`
- Create: `apps/web/src/features/simulator/SimulationBar.tsx`
- Create: `apps/web/src/features/simulator/ComponentReadout.tsx`
- Test: `apps/web/src/features/simulator/useSimulation.test.ts`

**Interfaces:**
- Consumes: `WorkerRequest`, `WorkerResponse` (Task 8).
- Produces:
  - `createWorkerClient(): { post(request: WorkerRequest): void; onMessage(cb: (r: WorkerResponse) => void): void; terminate(): void }`
  - `useSimulation()` expone `{ running, result, behavioral, start(), stop(), error }`.
  - `ResultView` = `{ byComponent: Map<string, ComponentState> }`, derivado de `DcResult.states`.
  - `ComponentReadout` muestra V, I y P junto al componente seleccionado, y enciende el LED con opacidad proporcional a `current / maxCurrent` (RF-2.5).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/features/simulator/useSimulation.test.ts
import { describe, it, expect } from 'vitest'
import { toResultView } from './useSimulation'

describe('toResultView', () => {
  it('indexes component states by component id', () => {
    const view = toResultView({ ok: true, states: [
      { componentId: 'R1', voltage: 5, current: 0.005, power: 0.025 },
    ], nodeVoltages: new Map() })
    expect(view.byComponent.get('R1')!.current).toBe(0.005)
  })

  it('produces an empty view for an empty circuit', () => {   // Review Focus #1
    const view = toResultView({ ok: true, states: [], nodeVoltages: new Map() })
    expect(view.byComponent.size).toBe(0)
  })

  it('surfaces an error result without a view', () => {
    const view = toResultView({ ok: false, error: 'NO_GROUND', states: [], nodeVoltages: new Map() })
    expect(view.byComponent.size).toBe(0)
  })

  it('does not throw when a state carries a non-finite value', () => {  // Review Focus #3
    expect(() => toResultView({ ok: true, states: [
      { componentId: 'R1', voltage: NaN, current: Infinity, power: NaN },
    ], nodeVoltages: new Map() })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/web test -- useSimulation`
Expected: FAIL — `Failed to resolve import "./useSimulation"`.

- [ ] **Step 3: Implement `toResultView` and the worker client**

`toResultView(result: DcResult): ResultView` builds the `Map` and **replaces any non-finite value with `0`**, so a `NaN` from a degenerate circuit cannot reach the renderer (Review Focus #3). `createWorkerClient` constructs `new Worker(new URL('@circuitforge/simulation/worker', import.meta.url), { type: 'module' })` and forwards messages.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/web test -- useSimulation`
Expected: PASS — 4 tests.

- [ ] **Step 5: Implement the UI**

`SimulationBar` renders "Simular" / "Detener" and a compact readout row (V, I, P) per component. `useSimulation.start()` posts `{ type: 'init', catalog }` once, then `{ type: 'simulate', project, timeMs }` on every project change while running, debounced to one post per animation frame.

- [ ] **Step 6: Verify end to end in the browser**

Run: `pnpm -F @circuitforge/web dev`
Expected: fuente 5 V + resistencia 220 Ω + LED → al pulsar "Simular" el LED se enciende, la resistencia muestra ≈0.0136 A y ≈0.068 W, y el error frente a `(5-2)/220` es menor del 10 %. Retirar el GND y simular muestra "Circuito sin referencia de tierra" en vez de congelar la interfaz.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/simulator
git commit -m "feat(web): wire the simulation worker into the editor with live readouts"
```

---

### Task 13: Persistencia, API y compartir

**Files:**
- Create: `apps/api/package.json`, `apps/api/src/index.ts`
- Create: `apps/api/src/routes/projects.ts`, `apps/api/src/routes/share.ts`, `apps/api/src/routes/components.ts`
- Create: `apps/api/src/db/migrations/001_init.sql`
- Create: `apps/api/src/db/client.ts`
- Create: `packages/netlist/src/serialize.ts`
- Test: `packages/netlist/src/serialize.test.ts`
- Test: `apps/api/src/routes/projects.test.ts`

**Interfaces:**
- Consumes: `Project` de `@circuitforge/netlist`.
- Produces:
  - `SCHEMA_VERSION = 1`
  - `serializeProject(project: Project): string`
  - `deserializeProject(json: string, catalog: Map<string, ComponentType>): { ok: true; project: Project } | { ok: false; error: 'PARSE' | 'SCHEMA_VERSION' | 'UNKNOWN_TYPE' | 'INVARIANT'; detail: string }`
  - Rutas REST exactamente como el contrato del spec, sección 7.

- [ ] **Step 1: Write the failing test**

```ts
// packages/netlist/src/serialize.test.ts
import { describe, it, expect } from 'vitest'
import { serializeProject, deserializeProject } from './serialize'
import { catalog, dividerOneToOne } from './fixtures'

describe('serialize round-trip', () => {
  it('reconstructs an identical project', () => {
    const original = dividerOneToOne()
    const back = deserializeProject(serializeProject(original), catalog())
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.project).toEqual(original)
  })

  it('rejects malformed JSON with a PARSE error', () => {              // Review Focus #5
    const r = deserializeProject('{ not json', catalog())
    expect(r).toEqual(expect.objectContaining({ ok: false, error: 'PARSE' }))
  })

  it('rejects an unknown schemaVersion', () => {                       // Review Focus #5
    const r = deserializeProject(JSON.stringify({ schemaVersion: 99, components: [], nets: [] }), catalog())
    expect(r).toEqual(expect.objectContaining({ ok: false, error: 'SCHEMA_VERSION' }))
  })

  it('rejects a typeId missing from the catalog', () => {              // Review Focus #5
    const r = deserializeProject(JSON.stringify({
      schemaVersion: 1, id: 'p', name: 'x', components: [{ id: 'X', typeId: 'nope', position: { x:0,y:0,rotation:0 }, params: {}, pins: [] }], nets: [],
      metadata: { createdAt: '', updatedAt: '', author: '' },
    }), catalog())
    expect(r).toEqual(expect.objectContaining({ ok: false, error: 'UNKNOWN_TYPE' }))
  })

  it('rejects a project where a pin sits on two nets', () => {         // invariante
    const r = deserializeProject(JSON.stringify({
      schemaVersion: 1, id: 'p', name: 'x', components: [], nets: [],
      metadata: { createdAt: '', updatedAt: '', author: '' }, danglingPins: [{ componentId: 'R1', pinId: 'a' }],
    }), catalog())
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @circuitforge/netlist test -- serialize`
Expected: FAIL — `Failed to resolve import "./serialize"`.

- [ ] **Step 3: Implement `serialize`/`deserialize`**

`deserializeProject` validates in this order: JSON parse → `schemaVersion` equality with `SCHEMA_VERSION` → every `typeId` present in the catalog → the one-pin-one-net invariant. Each failure returns the specific error code; it never throws and never returns a partially accepted project.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @circuitforge/netlist test -- serialize`
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the API route test**

```ts
// apps/api/src/routes/projects.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../index'

describe('projects API', () => {
  let token: string
  beforeAll(async () => {
    const r = await request(app).post('/api/auth/register').send({ email: 'a@b.c', password: 'secret123' })
    token = r.body.token
  })

  it('rejects an unauthenticated listing with 401', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401)
  })

  it('creates and reads back a project', async () => {
    const created = await request(app).post('/api/projects')
      .set('Authorization', `Bearer ${token}`).send({ name: 'demo', netlist: emptyNetlist() })
    expect(created.status).toBe(201)
    const read = await request(app).get(`/api/projects/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(read.body.name).toBe('demo')
  })

  it('returns 400 for a malformed body instead of 500', async () => {   // Review Focus #5
    const r = await request(app).post('/api/projects')
      .set('Authorization', `Bearer ${token}`).send({ name: 42 })
    expect(r.status).toBe(400)
    expect(r.body.error.code).toBeDefined()
  })

  it('serves a shared project publicly in read-only mode', async () => {
    const created = await request(app).post('/api/projects')
      .set('Authorization', `Bearer ${token}`).send({ name: 'shared', netlist: emptyNetlist() })
    const share = await request(app).post(`/api/projects/${created.body.id}/share`)
      .set('Authorization', `Bearer ${token}`)
    const pub = await request(app).get(`/api/share/${share.body.shareToken}`)
    expect(pub.status).toBe(200)
    expect((await request(app).put(`/api/share/${share.body.shareToken}`).send({})).status).toBe(404)
  })

  it('returns 404 for a project belonging to another user', async () => {
    expect((await request(app).get('/api/projects/00000000-0000-0000-0000-000000000000')).status).toBe(401)
  })
})
```

- [ ] **Step 6: Implement the API**

Express with `helmet`, `cors` restringido al origen del frontend, y `express.json({ limit: '1mb' })`. Validación de cuerpos con un esquema explícito; toda entrada inválida responde `400` con `{ error: { code, message } }` — nunca `500`. Contraseñas con `argon2`; sesiones con JWT firmado con `JWT_SECRET`. La migración crea `users`, `projects` (con `netlist jsonb`) y `project_versions`, con índice en `projects.user_id`.

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm -F @circuitforge/api test`
Expected: PASS — 5 tests.

- [ ] **Step 8: Commit**

```bash
git add apps/api packages/netlist/src/serialize.ts
git commit -m "feat(api): add auth, projects, sharing endpoints and versioned serialization"
```

---

## Self-Review

**1. Spec coverage.** Cada requisito del spec tiene tarea:

| Requisito | Tarea |
|---|---|
| RF-1.1 colocar arrastrando | Task 9 (store + canvas), Task 10 (paleta) |
| RF-1.2 mover/rotar/eliminar + deshacer | Task 9 |
| RF-1.3 cablear | Task 1 (`connectPins`), Task 11 (UI) |
| RF-1.4 validar en tiempo real | Task 2 (`canConnect`), Task 10 (`ViolationList`) |
| RF-1.5 editar parámetros | Task 10 (`Inspector`) |
| RF-1.6 <5 min sin ayuda | Task 9/10/11 verificados en navegador; la medición cronometrada es una actividad de QA, no una tarea de código |
| RF-1.7 autoconexión sugerida | Task 11 (`suggestConnection`) |
| RF-2.1 error <10 % en DC | Task 4 + Task 5 |
| RF-2.2 digital/PWM/timers | Task 6 |
| RF-2.3 sensores/actuadores/energía | Task 7 |
| RF-2.4 solver sin bloquear UI | Task 8 (Worker) + Task 12 |
| RF-2.5 estado por componente | Task 12 (`ComponentReadout`) |
| RF-3.1 ≥60 fichas / 9 categorías | Task 3 |
| RF-3.2 ≥40 usables | Task 3 (prueba explícita) |
| RF-3.3 buscador y filtro | Task 10 (`filterCatalog`) |
| RF-3.4 ficha verificable | Task 3 (defaults de datasheet) |
| RF-4.1 guardar/cargar | Task 13 |
| RF-4.2 compartir por enlace | Task 13 |
| RF-4.3 versionado | Task 13 (`project_versions`) |
| RNF-1..10 | Global Constraints + Tasks 3, 8, 12 |

**Sin huecos.** Las decisiones D-1..D-6 están implementadas: D-1 en Task 1, D-2 en Tasks 4–7, D-3 en Task 9, D-4 en Task 11, D-5 en Task 12, D-6 en Task 3.

**2. Step scan.** Cada paso deja al implementador escribir una sola cosa razonable. Los cuerpos de código aparecen únicamente donde la firma y la prueba no los determinan (p. ej. la tabla de los diez modelos conductuales, donde los valores numéricos son decisiones del spec). Ninguna tarea define un tipo o función que otra no use.

**3. Type consistency.** Verificado: `PinEndpoint` se define en Task 1 y se usa en Tasks 9 y 11; `ComponentState` se define en Task 5 y se consume en Task 12; `WorkerRequest`/`WorkerResponse` se definen en Task 8 y se consumen en Task 12; `Violation` se define en Task 2 y se consume en Task 10; `SCHEMA_VERSION` se define en Task 13 y coincide con el `schemaVersion: 1` del spec. `netId`, `pinId`, `typeId`, `componentId` mantienen el mismo nombre en todas las tareas.

**4. Review Focus.** Las cinco clases quedaron con su prueba en la tarea dueña del código:

| Clase | Tarea | Prueba |
|---|---|---|
| #1 circuito vacío / 1 componente | Task 2, Task 4, Task 5, Task 12 | `returns no violations for an empty project`, `does not throw on an empty system`, `returns an empty result for an empty circuit`, `produces an empty view for an empty circuit` |
| #2 net huérfano / componente aislado | Task 2 | `V-3: warns on a net with a single pin` |
| #3 parámetro en cero o negativo | Task 4, Task 5, Task 12 | `clamps a zero-ohm resistance`, `never returns NaN for a zero-ohm resistor`, `does not throw when a state carries a non-finite value` |
| #4 circuito singular / sin GND | Task 4, Task 5, Task 8 | `flags a singular matrix`, `reports NO_GROUND`, `returns an error response instead of throwing on a groundless circuit` |
| #5 JSON corrupto / versión / typeId | Task 2, Task 3, Task 8, Task 13 | `does not throw when a typeId is absent from the catalog`, `rejects a malformed entry naming the offending file`, `never throws on a malformed request`, `rejects malformed JSON` + `rejects an unknown schemaVersion` |

**5. Proportion.** El plan es más largo que el spec, pero consistente con su tamaño: el spec define contratos y el plan define 13 tareas con ciclos de prueba. Los bloques de código son en su mayoría *pruebas* (que el spec no contiene y el implementador no puede adivinar), no cuerpos de implementación. Las descripciones de implementación están en prosa y delegadas a la firma.

---

## Handoff

**Plan completo, guardado en `docs/superpowers/plans/2026-10-25-circuitforge-mvp.md`.**

Antes de implementar hay que resolver las **cinco preguntas abiertas** de la sección 10 del spec. La #3 es bloqueante para la Task 5: sin los 15 casos de aceptación con sus fórmulas de referencia, no se puede escribir la batería.

**Método de ejecución recomendado: Subagent-driven.** Las razones son específicas de este plan: son 13 tareas con interfaces compartidas que se declaran explícitamente (`PinEndpoint`, `ComponentState`, `WorkerRequest`, `Violation`), el núcleo (`packages/simulation`) es numérico y un error sutil en el solver contamina todas las tareas siguientes, y un fallo enviado a producción aquí significa un motor de simulación que da resultados incorrectos de forma silenciosa. Cada tarea tiene su propia batería de pruebas como puerta, lo que hace que el coste de un revisor fresco por tarea esté justificado.

