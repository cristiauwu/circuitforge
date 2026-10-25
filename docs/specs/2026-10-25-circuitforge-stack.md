# CircuitForge — Stack tecnológico completo

**Fecha:** 2026-10-25
**Estado:** propuesta para aprobación del equipo
**Alcance:** stack para *todo* el desarrollo, con el **frontend como primer entregable**.
**Restricciones heredadas del documento de avance:** React + Node.js + PostgreSQL, licencias en **$0.00**, costo de infraestructura en planes gratuitos.

---

## 1. Principios que gobiernan cada elección

Cinco reglas. Cuando dos opciones empatan en mérito técnico, gana la que respeta estas reglas.

| # | Principio | Consecuencia práctica |
|---|---|---|
| **P-1** | **El netlist es la fuente de verdad** (D-1 del spec) | El dominio vive en paquetes TypeScript puros, sin React ni DOM. El render es una vista. |
| **P-2** | **El 2D de hoy no debe bloquear el 3D de mañana** (D-3) | El lienzo se construye sobre Three.js desde el inicio, en cámara ortográfica. No SVG, no Canvas 2D. |
| **P-3** | **El cómputo pesado corre en el cliente** (D-5) | El solver va en Web Worker. Protege los planes gratuitos y da latencia interactiva. |
| **P-4** | **Cero licencias, cero costos ocultos** (RNF-6) | Todo el stack es de código abierto con licencia permisiva, o tiene plan gratuito real. |
| **P-5** | **Tipado estricto de extremo a extremo** | Un solo lenguaje (TypeScript) en front, back y dominio. Los contratos se comparten por paquete, no se duplican. |

---

## 2. Stack propuesto, capa por capa

### 2.1 Núcleo del frontend (el primer entregable)

| Capa | Elección | Versión | Por qué esta |
|---|---|---|---|
| Build tool | **Vite** | **8.x** | Vite 8 unificó el bundler en **Rolldown** (Rust), con builds 10–30× más rápidos y compatibilidad total de plugins. [cite:5508aa0b-1] |
| UI framework | **React** | **19.x** | Requisito del documento. React 19 es la base que R3F v9 exige. |
| Lenguaje | **TypeScript** | **5.x**, `strict: true` | P-5. `noUncheckedIndexedAccess` activado: el solver indexa matrices constantemente y los `undefined` silenciosos son el bug más caro aquí. |
| Lienzo 2D/3D | **Three.js + React Three Fiber + Drei** | three **r170+**, R3F **9.5+** | P-2. R3F v9 es la release de compatibilidad con React 19 y trae mejoras de tipos y rendimiento. [cite:5508aa0b-2] |
| Estado de dominio | **Zustand** | **5.x** | El netlist es un objeto con historial de undo/redo: Zustand lo modela sin ceremonia. Su API de selectores evita re-renderizar 60 componentes cuando cambia uno. |
| Estado de servidor | **TanStack Query** | **5.x** | Caché, reintentos y estados de carga para los proyectos. Separa con claridad "estado del circuito" de "estado del servidor". |
| Estilos | **Tailwind CSS** | **4.x** | Utilitario, sin CSS muerto, y encaja con el design system de `docs/design/`. |
| Componentes base | **shadcn/ui** (sobre Radix) | última | No es una dependencia: es código que se copia al repo. Da accesibilidad (RNF-4, WCAG AA) sin atarnos a una librería. |
| Enrutado | **React Router** | **7.x** | Pocas rutas (editor, biblioteca, proyectos, compartido). No hace falta un router con capa de datos. |
| Validación | **Zod** | **3.x** | Un solo esquema valida en el borde (API), al importar JSON y en los formularios. |
| Iconos | **Lucide** | última | Coherente con el design system ya definido. |
| Fuentes | **Inter** + **JetBrains Mono** | — | Definidas en el design system: UI en Inter, pines y valores en monoespaciada. |

### 2.2 Dominio y simulación (paquetes puros)

| Capa | Elección | Por qué |
|---|---|---|
| Tipos y netlist | **TypeScript puro** | P-1. Sin dependencias: testeable en Node, usable en el worker y en el backend. |
| Álgebra lineal | **Implementación propia** | Un solver MNA para circuitos de ≤50 componentes no necesita una librería de álgebra. Eliminación gaussiana con pivoteo son ~60 líneas y así controlamos el caso singular (Review Focus #4). |
| Solver | **MNA propio en TS** (D-2) | `ngspice-wasm` queda documentado como plan de escalado, no como base. |
| Ejecución | **Web Worker** con protocolo propio | P-3. El reducer del worker es una función pura, así que se prueba en Node sin instanciar un `Worker`. |
| Modelos 3D de componentes | **glTF / GLB** vía `gltf-transform` | Formato estándar, comprimible, y `circuit-json-to-gltf` (tscircuit) ya resuelve el puente lógico→3D. |
| Física (fase 2) | **Rapier** vía `@react-three/rapier` | Solo cuando entre la simulación mecánica. No en el MVP. |

### 2.3 Backend y datos

| Capa | Elección | Versión | Por qué esta |
|---|---|---|---|
| Runtime | **Node.js** | **22 LTS** | Requisito del documento. LTS hasta 2027, cubre de sobra el proyecto. |
| Framework HTTP | **Fastify** | **5.x** | Recomendación por encima de Express: validación de esquemas integrada (JSON Schema), mejor rendimiento y tipos de TypeScript de primera clase. *Si el equipo prefiere Express por familiaridad, es un cambio de una tarde; el contrato de API del spec no cambia.* |
| ORM | **Drizzle** | última | SQL-first y tipado. Guarda el netlist como `jsonb` sin fricción, a diferencia de Prisma, que trata JSON como ciudadano de segunda. Migraciones como SQL legible. |
| Base de datos | **PostgreSQL** | **16+** (Supabase) | Requisito del documento. `jsonb` con índice GIN es exactamente lo que un netlist necesita. |
| Autenticación | **Supabase Auth** | — | Ya está en el stack del documento, es gratis hasta 50k usuarios y evita escribir gestión de sesiones y recuperación de contraseña. |
| Contraseñas / tokens | **argon2** + **JWT** | — | Solo si se implementa auth propia. Con Supabase Auth no hace falta. |
| Correo transaccional | **Resend** | — | Plan gratuito de 3,000 correos/mes, ya declarado en el documento. |

### 2.4 Calidad y pruebas

| Capa | Elección | Por qué esta |
|---|---|---|
| Linter + formatter | **Biome** | Una sola herramienta en lugar de ESLint + Prettier, configuración única para todo el monorepo y sin deriva de configuración entre paquetes. |
| Pruebas unitarias | **Vitest** | Comparte la configuración de Vite: cero fricción, y es lo que ya usa el plan de implementación. |
| Pruebas de componente | **React Testing Library** | Prueba comportamiento observable, no implementación. |
| Pruebas E2E | **Playwright** | Es la única forma honesta de verificar el OE-1 ("construir fuente + R + LED en <5 min") y el arrastrar y soltar real. |
| Mock de API | **MSW** | Los tests del front no dependen de que el backend esté levantado. |
| Git hooks | **Lefthook** | Rápido, multiplataforma, un solo archivo YAML. |
| CI | **GitHub Actions** | Gratis en repositorios públicos, ya declarado en el documento. |

### 2.5 Infraestructura

| Capa | Elección | Por qué esta |
|---|---|---|
| Frontend | **Vercel** (Hobby) | Plan gratuito, despliegue por rama y previews. Ya declarado en el documento. |
| Backend | **Vercel Functions** o **Railway** | Si Fastify corre como función serverless, todo queda en un solo proveedor. Railway entra si se necesita un proceso persistente. |
| Base de datos | **Supabase** (Free) | Ya declarado. PostgreSQL real, con `jsonb`, backups y panel de administración. |
| Monorepo | **pnpm workspaces + Turborepo** | pnpm por eficiencia de disco y enlaces estrictos (impide importar lo que no está declarado); Turborepo para cachear y orquestar las tareas de los paquetes. |

---

## 3. Las cinco decisiones que importan (y su justificación)

### ADR-001 — Three.js desde el inicio, no SVG

**Decisión:** el lienzo se construye sobre React Three Fiber con cámara ortográfica y cuadrícula, aunque el MVP sea 2D.

**Por qué.** El video de referencia muestra el 3D como el destino del producto. Si el MVP se construye sobre SVG, agregar el 3D implica reescribir el lienzo, el cableado y las interacciones de arrastre completas. Con R3F, el salto al 3D es **cambiar la cámara y cargar mallas GLB**: el mismo componente, la misma netlist, el mismo código de interacción.

**Costo de esta decisión:** R3F tiene una curva de aprendizaje mayor que SVG y la depuración es menos directa. Se acepta a cambio de no rehacer el corazón de la interfaz.

### ADR-002 — Drizzle sobre Prisma

**Decisión:** Drizzle como ORM.

**Por qué.** El netlist es un documento JSON anidado. Drizzle lo guarda como `jsonb` y permite consultarlo con SQL nativo (`->`, `@>`, índices GIN) manteniendo tipos completos. Prisma abstrae demasiado el JSON y obliga a salir del ORM justo en las consultas que más importan.

### ADR-003 — Fastify sobre Express

**Decisión:** Fastify como framework HTTP, con Express como alternativa aceptable.

**Por qué.** Fastify trae validación de esquemas integrada —exactamente lo que el contrato de API necesita para responder `400` en lugar de `500` ante un cuerpo malformado (Review Focus #5)—, mejor rendimiento y mejores tipos. El documento solo fija "Node.js", no el framework, así que esta elección no rompe nada.

**Cuándo cambiar:** si el equipo ya domina Express y prefiere invertir el tiempo en el editor en vez de aprender Fastify. La diferencia es de una tarde de trabajo.

### ADR-004 — Biome sobre ESLint + Prettier

**Decisión:** Biome como única herramienta de lint y formato.

**Por qué.** Una configuración para todo el monorepo, sin la deriva que aparece cuando cada paquete tiene su propio `.eslintrc`. En un monorepo con 6 paquetes, mantener dos herramientas y sus plugins cuesta más de lo que aporta.

**Riesgo:** el ecosistema de reglas de Biome es más pequeño que el de ESLint. Si más adelante hace falta una regla específica de React o de accesibilidad que Biome no tenga, se puede añadir ESLint **solo para esa regla**.

### ADR-005 — El "apoyo de IA" empieza determinista

**Decisión:** la sugerencia de conexiones (RF-1.7) es un motor de **reglas deterministas sobre pines tipados**, no un LLM.

**Por qué.** Es testeable, explicable, instantáneo y gratis. Un LLM sobre el mismo motor de reglas puede añadirse después como capa de lenguaje natural, pero **no puede ser la base**: un modelo generativo que sugiere una conexión eléctricamente inválida rompe el OE-1.

---

## 4. Estructura del monorepo

```
circuitforge/
├─ apps/
│  ├─ web/                     # React + Vite + R3F  ← PRIMER ENTREGABLE
│  └─ api/                     # Fastify + Drizzle
├─ packages/
│  ├─ netlist/                 # Tipos, invariantes, serialización (P-1)
│  ├─ validation/              # Reglas V-1..V-6
│  ├─ simulation/              # MNA + kernel digital + modelos + worker
│  ├─ component-library/       # Fichas JSON de los 60+ componentes
│  └─ ui/                      # Design system compartido (shadcn/ui + tokens)
├─ docs/
│  ├─ specs/  design/  referencias/  superpowers/plans/
├─ biome.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ tsconfig.base.json
```

**Regla de dependencias (se hace cumplir en CI):**

```
apps/web  →  packages/ui, netlist, validation, component-library
apps/api  →  packages/netlist, component-library
simulation →  netlist, component-library
validation →  netlist, component-library
netlist    →  (nada)
```

`packages/netlist` **no depende de nada**. Eso es lo que lo hace portable al worker, al backend y a los tests.

---

## 5. El frontend primero: orden de arranque

Se empieza por el front porque es donde está el riesgo de producto —el editor es el 60 % del valor percibido y el OE-1 se evalúa ahí— y porque el dominio (netlist, validación, simulación) se puede construir en paralelo sin esperar al backend.

| Etapa | Qué se construye | Paquetes que toca | Se puede ver funcionando |
|---|---|---|---|
| **F0** | Monorepo, Biome, TS estricto, CI, Vitest | — | `pnpm test` corre en verde |
| **F1** | `packages/netlist` + `packages/validation` con sus pruebas | netlist, validation | Pruebas en Node |
| **F2** | `packages/ui`: tokens del design system, tema oscuro, primitivas shadcn | ui | Storybook o página de muestra |
| **F3** | Lienzo R3F: cámara ortográfica, cuadrícula, colocar y mover con ajuste | web | **Se ve el editor** |
| **F4** | Paleta + inspector + validación en vivo | web | Se arrastran componentes reales |
| **F5** | Cableado y sugerencia determinista de conexión | web | **Cumple el OE-1** |
| **F6** | `packages/component-library`: 60 fichas | component-library | Catálogo navegable |
| **F7** | `packages/simulation` + worker + lecturas en vivo | simulation, web | **Cumple el OE-2** |
| **F8** | Backend, persistencia, compartir | api | Guardar y compartir |
| **F9** | E2E con Playwright, accesibilidad, pulido | — | Entrega |

**Hito visible en F5:** un usuario puede construir y cablear "fuente + resistencia + LED" con validación en tiempo real. Eso es el OE-1 completo, sin backend y sin solver.

**El backend no bloquea nada hasta F8.** Por eso se empieza por el front.

---

## 6. Skills recomendadas, por capa

⚠️ **Seguridad:** una skill es código de terceros que corre con los permisos completos del agente. Revisa el `SKILL.md` en el enlace antes de instalar. **No instalo nada sin que me lo pidas.**

### Para el frontend (instalar ahora)

| Skill | Autor | Installs | Para qué |
|---|---|---|---|
| `vercel-react-best-practices` | **vercel-labs** | **836,680** | Rendimiento y patrones de React 19. La de mayor adopción de toda la búsqueda y de fuente reconocida. |
| `web-design-guidelines` | **vercel-labs** | **781,419** | Guías de diseño web y accesibilidad — sostiene el RNF-4 (WCAG AA). |
| `react-state-management` | wshobson | 15,327 | Patrones de estado en React. Ayuda a decidir qué vive en Zustand y qué en Query. |
| `react-three-fiber` | **vercel-labs** | 2,290 | Base del lienzo. Es la pieza que sostiene ADR-001. |
| `shadcn` | **vercel-labs** | 2,489 | Alta de componentes shadcn/ui correctamente. |
| `threejs-webgl` | freshtechbro | 4,551 | Three.js a fondo: escenas, materiales, GLTF, instancing. |
| `tailwind-design-system` | giuseppe-trisciuoglio | 4,524 | Convertir los tokens del design system en configuración de Tailwind. |
| `frontend-testing` | langgenius (dify) | 3,762 | Patrones de prueba de frontend, de un proyecto real y grande. |
| `ultracite` | haydenbleasel | 11,332 | Configuración de Biome lista para producción. Encaja con ADR-004. |

Revisión: https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices · https://skills.sh/vercel-labs/json-render/react-three-fiber · https://skills.sh/haydenbleasel/ultracite/ultracite

### Para calidad de código (instalar ahora)

| Skill | Autor | Installs | Para qué |
|---|---|---|---|
| `typescript-react-reviewer` | dotneet | 8,954 | Revisión de código TS+React. Útil como puerta antes de cada commit. |
| `high-perf-browser` | wondelai | 5,233 | Rendimiento en navegador: sostiene el RNF-2 (60 fps al arrastrar). |

### Para más adelante (no instalar todavía)

| Skill | Cuándo | Nota |
|---|---|---|
| `three-best-practices` (emalorenzo, 1,448) | Al entrar los modelos GLB reales | Complementa `threejs-webgl`. |
| `3d-graphics` (samhvw8) | Al diseñar la escena 3D | Cubre PBR, post-proceso, instancing, LOD. |
| `monorepo-management` (curiositech, 103) | Si el monorepo se complica | Adopción media; el setup inicial es sencillo sin ella. |
| `hardware-tdd` (wedsamuel1230, 53) | Al empezar el kernel digital | Mejor adopción del nicho embebido. |
| `rapier-physics-worker` (2) | Fase 2, física | Adopción muy baja: revisar a fondo antes. |

### Huecos confirmados

- **No existe skill para motor de simulación de circuitos.** Nada de MNA, netlist o validación de pines. Es el núcleo diferencial del proyecto y se escribe a medida.
- **No existe skill para el puente lógico→3D de un circuito.** `circuit-json-to-gltf` de tscircuit es una librería, no una skill.

---

## 7. Lo que decidimos NO usar, y por qué

| Descartado | Motivo |
|---|---|
| **Next.js** | El editor es una aplicación de cliente intensiva. El renderizado en servidor y los Server Components no aportan nada aquí, y añaden complejidad al Web Worker y al lienzo. Vite + React es más simple y más rápido de arrancar. |
| **Redux Toolkit** | Ceremonia innecesaria para un grafo de estado que cabe en un store. Zustand resuelve lo mismo con menos código. |
| **SVG o Canvas 2D para el lienzo** | Bloquea el 3D del video y obligaría a reescribir el editor. Ver ADR-001. |
| **ngspice-wasm** | Potente, pero pesado de integrar y depurar en 8 semanas, y no aporta nada al kernel digital. Queda como escalado si el solver propio no alcanza el <10 %. |
| **Prisma** | Peor ajuste con `jsonb` que Drizzle. Ver ADR-002. |
| **ESLint + Prettier** | Dos herramientas y deriva de configuración en un monorepo de 6 paquetes. Ver ADR-004. |
| **Monaco Editor** | El editor de código es fase 2 (firmware Arduino). Hoy solo suma peso. |
| **MongoDB** | El documento exige PostgreSQL, y las relaciones usuario→proyecto→versión son relacionales. |
| **Babylon.js** | Buen motor, pero R3F tiene mejor integración con React y el ecosistema `pmndrs` (drei, rapier) es más coherente para este caso. |

---

## 8. Arranque (F0)

```bash
# 1. Base del monorepo
pnpm init
pnpm add -D turbo typescript @biomejs/biome lefthook
# crear pnpm-workspace.yaml, turbo.json, tsconfig.base.json, biome.json

# 2. Frontend
pnpm create vite apps/web --template react-ts
pnpm -F web add react@19 react-dom@19 three @react-three/fiber @react-three/drei
pnpm -F web add zustand @tanstack/react-query react-router zod
pnpm -F web add -D tailwindcss @tailwindcss/vite vitest @testing-library/react @playwright/test msw

# 3. Paquetes de dominio
pnpm -F @circuitforge/netlist add -D vitest
pnpm -F @circuitforge/validation add -D vitest

# 4. Verificación
pnpm biome check .
pnpm -r test
```

**Puerta de salida de F0:** `pnpm biome check .` sin hallazgos, `pnpm -r test` en verde, y CI corriendo en GitHub Actions. Nada más.

---

## 9. Resumen para decidir

| Capa | Elección | Confianza |
|---|---|---|
| Build | Vite 8 (Rolldown) | **Alta** — es el estándar y ya migró a Rust |
| UI | React 19 + TypeScript estricto | **Alta** — requisito del documento |
| Lienzo | Three.js + React Three Fiber 9 | **Alta** — la única opción que no bloquea el 3D |
| Estado | Zustand + TanStack Query | **Alta** — separación clara dominio/servidor |
| Estilos | Tailwind 4 + shadcn/ui | **Alta** — da WCAG AA sin ataduras |
| Backend | Fastify + Drizzle + PostgreSQL | **Media** — Fastify es recomendación, Express es aceptable |
| Auth | Supabase Auth | **Alta** — ya está en el documento |
| Calidad | Biome + Vitest + Playwright | **Alta** — una herramienta por trabajo |
| Monorepo | pnpm + Turborepo | **Alta** — necesario por los paquetes de dominio |

**Lo único que requiere una conversación del equipo es Fastify vs Express.** Todo lo demás es una recomendación con margen amplio.

---

## 10. Siguiente paso

Con el stack aprobado, el trabajo inmediato es la **etapa F0**: crear el monorepo, configurar Biome y TypeScript estricto, y dejar CI en verde. Es media jornada y desbloquea todo lo demás.

Después, **F1**: `packages/netlist` y `packages/validation` con sus pruebas — que son las tareas 1 y 2 del plan de implementación ya escrito en `docs/superpowers/plans/2026-10-25-circuitforge-mvp.md`.

Dime si quieres que arranque con F0 y F1, o si prefieres revisar antes alguna de las cinco decisiones.
