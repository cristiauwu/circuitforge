# CircuitForge — Shell navegable (etapa UI-1)

**Fecha:** 2026-10-25
**Estado:** propuesta para aprobación
**Prerrequisitos:** `docs/design/DESIGN.md` (tokens), `docs/specs/2026-10-25-circuitforge-stack.md` (stack)
**Alcance:** las interfaces del software y su navegación. **Sin** lógica de componentes.

---

## 1. Objetivo

Que puedas **experimentar la navegación del sitio en el navegador**: recorrer la portada, entrar a la herramienta, moverte entre pantallas, redimensionar la ventana y sentir el movimiento que define `DESIGN.md`.

Lo que se entrega es **código definitivo**, no un prototipo desechable: la estructura de rutas, la capa de primitivas y los tokens son la base sobre la que se construye F3..F9.

**Fuera de alcance (etapa siguiente):** solver MNA, simulación, arrastrar y soltar componentes, validación en vivo, backend, persistencia. Los datos que se muestren son *fixtures* locales.

---

## 2. Decisión de plataforma

**Aplicación web React servida por Vite. No es un `.exe`.**

| Opción | Veredicto |
|---|---|
| **Web (React + Vite)** | ✅ **Elegida.** Ya fijada en el stack. Es el entregable evaluable del OE-1. |
| `.exe` (Electron/Tauri) | ❌ Descartada. Añade un runtime de escritorio y un pipeline de empaquetado para un producto que el documento describe como *plataforma web*. Nada en OE-1..OE-3 lo pide. |
| HTML estático | ❌ Descartada. Arranca más rápido pero se tira: el producto real es React. |

**Cómo lo experimentas:** `pnpm dev` levanta Vite en `http://localhost:5173`. Te doy la URL y navegas con clic real.

---

## 3. Portada — opción A

Un **circuito que se ensambla solo** en SVG, y de ahí el título.

### Secuencia (≈3.2 s, una vez por carga)

| t | Qué ocurre | Patrón de `DESIGN.md` |
|---|---|---|
| 0.0 s | Fondo `--cf-bg` + cuadrícula sutil que se desvanece en los bordes | — |
| 0.2 s | Aparece la fuente de alimentación (símbolo + etiqueta `V1 5V`) | M-1 |
| 0.6 s | Aparece la resistencia `R1 220Ω` | M-1 |
| 1.0 s | Aparece el LED `D1`, con su halo | M-1 |
| 1.4 s | Se traza el cable `V1 → R1`, con `stroke-dashoffset` | — |
| 1.8 s | Se traza el cable `R1 → D1` | — |
| 2.2 s | Se traza el retorno `D1 → GND`. El LED enciende: el halo sube a `--cf-current-ratio: 1` | M-5 |
| 2.4 s | Pulso de corriente recorre la pista (`offset-distance`) | M-5 |
| 2.6 s | **Título**: revelado letra por letra con `blur(2px) → 0`, escalonado 18 ms | M-1 |
| 3.0 s | Botón «Entrar al editor» entra con `translateY` + `opacity` | M-2 |

### El botón de entrada

Botón primario con **text roll de doble capa** (§3.1 de `DESIGN.md`). Al pulsarlo:

1. `document.startViewTransition` (vía React Router 7) hace *morph* del botón hasta el botón «Simular» del editor.
2. El circuito SVG se mantiene visualmente durante la transición, luego se disuelve.

### Por qué esta opción

- **Muestra lo que el producto hace.** Es la identidad del dominio, no un hero genérico.
- **Sin WebGL.** SVG + CSS. Permite diferir three.js y no compite por GPU con el futuro lienzo.
- **Reutiliza lo ya especificado.** Los patrones M-1, M-2 y M-5 ya están escritos en `DESIGN.md`; la portada es su primer consumidor real.
- **Barata y reversible.** Si no convence, se sustituye el SVG sin tocar nada más.

### Accesibilidad

- `prefers-reduced-motion: reduce` → **todo aparece ya montado**, sin animación, con el LED encendido. El circuito es decorativo (`aria-hidden="true"`); el `<h1>` y el botón son los elementos reales.
- Contraste verificado a `--cf-text` sobre `--cf-bg` (15.8:1).

---

## 4. Rutas

| Ruta | Pantalla | Modo | Estado |
|---|---|---|---|
| `/` | **Portada** | Persuade | Completa, con la secuencia de §3 |
| `/editor` | Editor: paleta + lienzo + inspector | Operate | Estructura navegable |
| `/biblioteca` | Catálogo de componentes | Operate | Filtros y buscador sobre datos *mock* |
| `/proyectos` | Lista de proyectos | Operate | Datos *mock*, incluido el estado vacío |
| `/compartido/:id` | Vista de solo lectura | Read | Estructura, sin simulación |
| `*` | 404 | — | Fuera del sistema visual a propósito |

**Transiciones entre rutas:** `document.startViewTransition` nativo, expuesto por React Router 7 con `viewTransition` en `<Link>`. Sin dependencia adicional.

---

## 5. Estructura de archivos

```
apps/web/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
└─ src/
   ├─ main.tsx                 # montaje
   ├─ app/
   │  ├─ router.tsx            # definición de rutas + view transitions
   │  └─ AppShell.tsx          # layout raíz
   ├─ routes/
   │  ├─ landing/              # portada + el circuito SVG
   │  ├─ editor/
   │  ├─ library/
   │  ├─ projects/
   │  └─ shared/
   ├─ features/                # lógica de cada pantalla
   │  ├─ landing/
   │  │  ├─ CircuitAssembly.tsx   # el SVG que se ensambla
   │  │  └─ useAssemblyTimeline.ts
   │  ├─ editor/
   │  │  ├─ Palette.tsx
   │  │  ├─ CanvasStage.tsx
   │  │  └─ Inspector.tsx
   │  ├─ library/
   │  └─ projects/
   ├─ ui/                      # primitivas del design system
   │  ├─ Button.tsx            # con text roll (M-2)
   │  ├─ Panel.tsx
   │  ├─ Chip.tsx
   │  ├─ Input.tsx
   │  ├─ ViolationMessage.tsx
   │  └─ RevealText.tsx        # revelado letra por letra (M-1)
   ├─ styles/
   │  ├─ tokens.css            # §2 de DESIGN.md, literal
   │  └─ theme.css             # @theme de Tailwind 4 → tokens
   └─ lib/
      └─ cx.ts                 # concatenación de clases
```

**Una carpeta por pantalla, con su lógica al lado.** Sin `components/` gigante ni `utils/` cajón de sastre.

---

## 6. Dependencias — y las que **no** se instalan

### Se instalan ahora

| Paquete | Para qué | Por qué ahora |
|---|---|---|
| `react` 19 + `react-dom` | Base | Requisito del stack |
| `vite` + `@vitejs/plugin-react` | Servidor y build | — |
| `typescript` | Tipos | Ya en el monorepo |
| `react-router-dom` 7 | Rutas | 5 rutas reales |
| `tailwindcss` 4 + `@tailwindcss/vite` | Tokens y utilidades | `DESIGN.md` §7 ya define el mapeo |

### Se difieren deliberadamente

| Paquete | Por qué no ahora |
|---|---|
| **`three` + `@react-three/fiber` + `@react-three/drei`** | La portada es SVG. El lienzo del editor, sin arrastrar ni simular, es una **cuadrícula CSS**. three.js entra cuando haya algo que renderizar en 3D. Ahorra ~600 KB y una decisión prematura. El componente `CanvasStage` es el único punto de cambio. |
| **`zustand`** | Sin arrastrar ni simular no hay estado de dominio que compartir. El estado de UI (panel activo) cabe en `useState`. |
| **`@tanstack/react-query`** | No hay servidor. Entra en F8. |
| **`shadcn/ui` + Radix** | Son primitivas que se copian al repo, pero cada una arrastra Radix. Para 5 primitivas, escribirlas contra los tokens de `DESIGN.md` da menos superficie y control total del movimiento (el text roll no lo da ninguna librería). |
| **`zod`** | Sin formularios ni API todavía. |

> **Criterio:** cada dependencia que entra sin consumidor real es deuda disfrazada de preparación. Todas las diferidas están ya decididas en el stack; se instalan cuando su consumidor existe.

---

## 7. Capa de primitivas

Las 5 primitivas de `DESIGN.md` §3, implementadas contra los tokens:

| Primitiva | Patrón | Nota |
|---|---|---|
| `Button` | M-2 text roll | Variantes `primary`, `secondary`, `ghost`, `danger` |
| `Panel` | §3.2 | Sólido por defecto |
| `PanelGlass` | M-3 | Solo paleta, inspector y barra: **presupuesto de 3** |
| `Chip` | §3.3 | Incluye variante de pin, monoespaciada |
| `ViolationMessage` | §3.4 | Con icono además de color (WCAG 1.4.1) |
| `RevealText` | M-1 | Usa `IntersectionObserver`; retira `will-change` al terminar |

**Dónde viven:** en `apps/web/src/ui` durante esta etapa.

**Por qué no en `packages/ui` todavía:** el stack lo prevé, pero extraer un paquete con un solo consumidor es ceremonia sin beneficio. Se extrae cuando aparezca el segundo. Es una decisión **reversible**: mover una carpeta y añadir un `package.json`.

**Los tokens sí son contrato desde ya:** `src/styles/tokens.css` es la traducción literal de `DESIGN.md` §2. Ningún componente escribe un literal de color, radio, tamaño o duración.

---

## 8. Datos de mentira

Una sola carpeta `src/lib/fixtures/` con:

- `components.ts` — ~12 fichas de la biblioteca, tipadas con `Category` y `PinType` reales de `@circuitforge/netlist`. **Suficientes** para poblar la paleta y el catálogo; las 60 llegan en F6.
- `projects.ts` — 4 proyectos de ejemplo + lista vacía para probar el estado vacío.

Estos *fixtures* importan los **tipos reales** de `packages/netlist`, así que si el modelo cambia, el compilador avisa. No son JSON suelto.

---

## 9. Verificación

Antes de dar la etapa por terminada:

| # | Comprobación | Cómo |
|---|---|---|
| 1 | Las 5 rutas cargan sin error de consola | Navegador real, consola limpia |
| 2 | Navegación entre rutas con transición de vista | Clic en cada enlace |
| 3 | Portada reproduce la secuencia de §3 | Grabación de pantalla |
| 4 | `prefers-reduced-motion` deja todo montado | Emulación en DevTools |
| 5 | Responsive a 320 / 768 / 1024 / 1440 px | Redimensionar |
| 6 | Navegación completa por teclado, `:focus-visible` visible | Tab en cada pantalla |
| 7 | Cero `box-shadow` de elevación | `biome` + revisión |
| 8 | `backdrop-filter` en ≤ 3 superficies | Inspección del DOM |
| 9 | Contraste ≥ 4.5:1 | DevTools |
| 10 | `biome check` + `tsc --noEmit` + build en verde | `.tools/verify.cmd` |

Las comprobaciones 1-6 se hacen con el **navegador real** vía CDP, no por inspección de código.

---

## 10. Estimación y riesgo

| Riesgo | Mitigación |
|---|---|
| Tailwind 4 exige Node ≥20 y su plugin de Vite es reciente | Verificar la instalación antes de escribir componentes. Node 24.15.0 cumple. |
| Las transiciones de vista tienen soporte desigual entre navegadores | Degradación limpia: sin soporte, la ruta cambia sin animación. No es un fallo. |
| La secuencia de la portada puede verse lenta | Toda la animación cabe en 3.2 s y se salta con `prefers-reduced-motion`. |
| La portada y el editor tienen modos distintos (Persuade vs Operate) | Frontera explícita: la portada es la **única** superficie Persuade. Está en `DESIGN.md` §5. |

---

## 11. Lo que este documento NO decide

1. **R3F para el lienzo** — cuándo entra. Propuesta: F3, cuando haya geometría que renderizar. Afecta a `CanvasStage` únicamente.
2. **Extracción de `packages/ui`** — cuándo. Propuesta: con el segundo consumidor.
3. **Mockups en Stitch** — `docs/design/2026-10-25-stitch-prompts.md` sigue pendiente de regenerar contra `DESIGN.md`. Esta etapa no depende de él: el design system es la fuente.
