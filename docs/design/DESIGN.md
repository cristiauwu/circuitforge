# CircuitForge — DESIGN.md

**Versión:** 1.0
**Fecha:** 2026-10-25
**Estado:** fuente de verdad visual. Todo componente nuevo se mide contra este archivo.
**Origen:** traduce el lenguaje visual extraído de `iyo.ai`. El análisis completo con evidencia está en `docs/design/2026-10-25-analisis-visual-referencia.md`; este documento no repite la justificación, define los tokens y las reglas.

> Este es el `DESIGN.md` que `docs/design/2026-10-25-stitch-prompts.md` daba por pendiente. Los prompts de Stitch deben referenciar este archivo en lugar de repetir el sistema.

---

## 1. Principios

| # | Principio | Consecuencia práctica |
|---|---|---|
| **V-1** | **La restricción es la calidad.** | No se inventan valores. Si falta un token, se añade al sistema o se usa el más cercano — nunca un literal suelto. |
| **V-2** | **La profundidad es luz, no sombra.** | Cero `box-shadow` de elevación. Se usa `backdrop-filter`, relleno translúcido y borde *hairline*. |
| **V-3** | **El movimiento vive en `transform` y `opacity`.** | Nunca se animan `width`, `height`, `top`, `left`, `margin`. `filter` solo como excepción justificada. |
| **V-4** | **El color es semántico y eléctrico.** | Los colores de estado significan algo en el dominio (verde = continuidad, ámbar = advertencia, rojo = cortocircuito). |
| **V-5** | **El contenido técnico manda.** | Es una herramienta, no una landing. Lienzo e instrumentación tienen prioridad sobre la expresión. |

**Modo de superficie:** CircuitForge es **Operate** (el visitante completa una tarea). La expresión vive en detalles precisos, no en espectáculo. Única excepción: portada y estados vacíos admiten **Persuade** moderado.

---

## 2. Tokens

Custom properties de CSS. Son la fuente de verdad; la configuración de Tailwind se **genera** desde aquí.

### 2.1 Color

```css
:root {
  /* Superficies (de más profunda a más elevada) */
  --cf-bg:               #0f1720;  /* lienzo y fondo de la app */
  --cf-surface:          #1b2430;  /* paneles: paleta, inspector */
  --cf-surface-alt:      #26313f;  /* hover, campos, encabezados */
  --cf-surface-raised:   #2e3b4a;  /* por encima de un panel (popover, menú) */
  --cf-grid:             #2e3b4a;  /* líneas de la cuadrícula */

  /* Texto */
  --cf-text:             #f1f5f9;
  --cf-text-secondary:   #94a3b8;
  --cf-text-muted:       #64748b;

  /* Acento primario (acción) */
  --cf-accent:           #ff6b35;
  --cf-accent-hover:     #ff8557;

  /* Acento secundario (instrumentación) */
  --cf-signal:           #22d3ee;

  /* Estado (semántica eléctrica, V-4) */
  --cf-success:          #34d399;
  --cf-warning:          #fbbf24;
  --cf-error:            #f87171;

  /* Paleta de cables */
  --cf-wire-1: #f87171;  --cf-wire-2: #fbbf24;
  --cf-wire-3: #34d399;  --cf-wire-4: #22d3ee;
  --cf-wire-5: #a78bfa;  --cf-wire-6: #f472b6;
  --cf-wire-7: #60a5fa;  --cf-wire-8: #fb923c;

  /* Velo y glass (V-2) */
  --cf-glass-fill:       rgb(255 255 255 / 0.04);
  --cf-glass-fill-hi:    rgb(255 255 255 / 0.07);
  --cf-hairline:         rgb(255 255 255 / 0.08);
  --cf-hairline-strong:  rgb(255 255 255 / 0.14);
  --cf-scrim:            rgb(15 23 32 / 0.72);

  /* Velos de estado */
  --cf-error-veil:       rgb(248 113 113 / 0.08);
  --cf-warning-veil:     rgb(251 191 36 / 0.08);
  --cf-success-veil:     rgb(52 211 153 / 0.08);
  --cf-accent-veil:      rgb(255 107 53 / 0.12);
}
```

**Reglas de uso:**

- `--cf-accent` es **exclusivo** para acción primaria y selección activa. Nunca como texto decorativo ni fondo de superficie grande.
- `--cf-signal` es **exclusivo** para instrumentación. Es lo que permite que un número cian signifique «esto es una medición» sin explicación.
- Los colores de estado se aplican con su **velo** al 8 % como fondo. El texto va en el color de estado, nunca blanco sobre color sólido.

**Contraste verificado:** `--cf-text` sobre `--cf-bg` = 15.8:1 ✓ · `--cf-text-secondary` sobre `--cf-surface` = 6.4:1 ✓ (AA) · `--cf-error` sobre velo compuesto = 5.1:1 ✓.

### 2.2 Tipografía

```css
:root {
  --cf-font-ui:   'Inter', system-ui, -apple-system, sans-serif;
  --cf-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;

  /* Escala — seis pasos, sin excepciones (V-1) */
  --cf-text-2xs: 0.6875rem;  /* 11px */
  --cf-text-xs:  0.75rem;    /* 12px */
  --cf-text-sm:  0.8125rem;  /* 13px */
  --cf-text-md:  0.875rem;   /* 14px */
  --cf-text-xl:  1.5rem;     /* 24px */
  --cf-text-3xl: 2.5rem;     /* 40px — solo portada */

  --cf-leading-tight: 1.15;
  --cf-leading-snug:  1.4;
  --cf-leading-base:  1.55;

  --cf-tracking-tight: -0.02em;
  --cf-tracking-wide:  0.08em;
}
```

| Rol | Familia | Tamaño | Peso | Detalle |
|---|---|---|---|---|
| Título de página | Inter | `xl` | 600 | `--cf-tracking-tight` |
| Título de panel | Inter | `2xs` | 600 | uppercase, `--cf-tracking-wide`, muted |
| Cuerpo / etiqueta | Inter | `md` | 400–500 | — |
| Nombre de componente | Inter | `sm` | 500 | — |
| Identificador (`R1`, `D13`) | **Mono** | `xs` | 500 | muted |
| Valor numérico | **Mono** | `sm` | 500 | `--cf-signal` |
| Unidad (`Ω`, `V`, `mA`) | **Mono** | `xs` | 400 | muted |
| Tipo de pin (`PWR`, `GND`) | Mono | `2xs` | 500 | chip, mayúsculas |

**Regla dura:** todo número, unidad e identificador va en JetBrains Mono. Todo texto de UI va en Inter. No hay cruce.

### 2.3 Espaciado

```css
:root {
  --cf-space-1:  0.25rem;  /*  4px */
  --cf-space-2:  0.5rem;   /*  8px */
  --cf-space-3:  0.75rem;  /* 12px */
  --cf-space-4:  1rem;     /* 16px */
  --cf-space-6:  1.5rem;   /* 24px */
  --cf-space-8:  2rem;     /* 32px */
  --cf-space-12: 3rem;     /* 48px */
  --cf-space-16: 4rem;     /* 64px */
}
```

| Contexto | Token |
|---|---|
| Relleno interno de panel | `4` |
| Separación entre secciones de panel | `6` |
| Gap entre fichas del catálogo | `3` |
| Relleno de campo de entrada | `2 3` |
| Separación entre grupos de controles | `2` |

### 2.4 Geometría

```css
:root {
  --cf-radius-sm:   0.5rem;   /*  8px — botones, campos */
  --cf-radius-md:   0.75rem;  /* 12px — paneles, tarjetas */
  --cf-radius-lg:   1.25rem;  /* 20px — contenedores grandes */
  --cf-radius-full: 9999px;   /* chips, píldoras, pines */

  --cf-border-hairline: 1px solid var(--cf-hairline);
  --cf-border-panel:    1px solid var(--cf-hairline);
  --cf-border-focus:    2px solid var(--cf-accent);
}
```

Tres radios. No hay un cuarto.

### 2.5 Elevación (V-2: sin sombras)

```css
:root {
  --cf-glass-blur: 16px;
  --cf-glass-sat:  140%;
}

/* Superficie sólida — uso por defecto */
.cf-panel {
  background: var(--cf-surface);
  border: var(--cf-border-panel);
  border-radius: var(--cf-radius-md);
}

/* Superficie glass — solo donde hay contenido vivo detrás */
.cf-glass {
  background: linear-gradient(180deg, var(--cf-glass-fill-hi), var(--cf-glass-fill));
  backdrop-filter: blur(var(--cf-glass-blur)) saturate(var(--cf-glass-sat));
  -webkit-backdrop-filter: blur(var(--cf-glass-blur)) saturate(var(--cf-glass-sat));
  border: var(--cf-border-panel);
  border-radius: var(--cf-radius-md);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06);  /* highlight interior, no sombra proyectada */
}

@supports not (backdrop-filter: blur(1px)) {
  .cf-glass { background: var(--cf-surface); }
}
```

**Presupuesto de glass: exactamente 3 superficies** — paleta, inspector y barra de simulación. `backdrop-filter` obliga a la GPU a leer el búfer de fondo cada frame; con el solver en Web Worker y el lienzo a 60 fps (RNF-2), más superficies degradan el arrastre. Las 60 fichas del catálogo usan `.cf-panel` sólido.

### 2.6 Movimiento

```css
:root {
  /* Curvas — tres, y solo tres (V-1) */
  --cf-ease-out:   cubic-bezier(0.77, 0, 0.175, 1);    /* firma: arranque rápido, frenada larga */
  --cf-ease-inout: cubic-bezier(0.65, 0, 0.35, 1);     /* simétrica */
  --cf-ease-pop:   cubic-bezier(0.48, 0.01, 0, 1.08);  /* sobrepaso 8% — SOLO transform */

  /* Duraciones — cuatro (V-1) */
  --cf-dur-instant: 100ms;
  --cf-dur-fast:    200ms;
  --cf-dur-base:    300ms;
  --cf-dur-slow:    600ms;
}
```

| Propiedad | Duración | Curva |
|---|---|---|
| `color`, `background-color`, `border-color` | `instant` | `inout` |
| `opacity` | `fast` | `inout` |
| `transform` (hover, chip, botón) | `base` | `out` |
| `transform` (revelado, entrada) | `slow` | `out` |
| `transform` (rebote al asentarse) | `640ms` | `pop` |
| `border-radius` (morph) | `base` | `inout` |

**Prohibiciones duras:**

- `--cf-ease-pop` **jamás** en `opacity` ni en color. Solo en `transform`.
- Nunca animar `width`, `height`, `top`, `left`, `margin`, `padding`. Usar `transform`.
- `transition: all` está prohibido. Se declara la propiedad explícita.

### 2.7 Accesibilidad del movimiento (RNF-4, obligatorio)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .cf-reveal-letter {
    filter: none !important; opacity: 1 !important; visibility: visible !important;
  }
}
```

---

## 3. Componentes

### 3.1 Botón primario

Anatomía de doble capa (text roll) con relleno sólido.

```html
<button class="cf-btn cf-btn--primary">
  <span class="cf-btn__roll">
    <span class="cf-btn__text">Simular</span>
    <span class="cf-btn__text" aria-hidden="true">Simular</span>
  </span>
</button>
```

```css
.cf-btn {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  height: 2.25rem; padding: 0 var(--cf-space-4);
  border: none; border-radius: var(--cf-radius-sm);
  font: 500 var(--cf-text-md)/1 var(--cf-font-ui);
  cursor: pointer; overflow: hidden;
  transition: background-color var(--cf-dur-instant) var(--cf-ease-inout),
              transform var(--cf-dur-base) var(--cf-ease-out);
}
.cf-btn:active { transform: scale(0.97); }
.cf-btn:focus-visible { outline: var(--cf-border-focus); outline-offset: 2px; }

.cf-btn--primary { background: var(--cf-accent); color: #10161f; }
.cf-btn--primary:hover { background: var(--cf-accent-hover); }

.cf-btn__roll { position: relative; display: block; overflow: hidden; }
.cf-btn__text { display: block; transition: transform var(--cf-dur-base) var(--cf-ease-out); }
.cf-btn__text + .cf-btn__text { position: absolute; inset: 0; transform: translate3d(0, 100%, 0); }
.cf-btn:hover .cf-btn__text,
.cf-btn:focus-visible .cf-btn__text { transform: translate3d(0, -100%, 0); }
.cf-btn:hover .cf-btn__text + .cf-btn__text,
.cf-btn:focus-visible .cf-btn__text + .cf-btn__text { transform: translate3d(0, 0, 0); }
```

La segunda capa lleva `aria-hidden="true"` para que el lector de pantalla no anuncie el texto dos veces. La animación se activa en `:hover` **y** `:focus-visible` (requisito de teclado).

**Variantes:** `--secondary` (`--cf-surface-alt` / `--cf-text`), `--ghost` (sin fondo, `--cf-text-secondary`), `--danger` (`--cf-error`, texto oscuro).

### 3.2 Panel

```css
.cf-panel {
  display: flex; flex-direction: column;
  background: var(--cf-surface);
  border: var(--cf-border-panel);
  border-radius: var(--cf-radius-md);
  padding: var(--cf-space-4);
}

.cf-panel__title {
  font: 600 var(--cf-text-2xs)/1.2 var(--cf-font-ui);
  text-transform: uppercase;
  letter-spacing: var(--cf-tracking-wide);
  color: var(--cf-text-muted);
  padding-bottom: var(--cf-space-3);
  border-bottom: 1px solid var(--cf-hairline);
  margin-bottom: var(--cf-space-3);
}
```

### 3.3 Chip de categoría y de pin

```css
.cf-chip {
  display: inline-flex; align-items: center; gap: var(--cf-space-1);
  height: 1.5rem; padding: 0 var(--cf-space-3);
  border-radius: var(--cf-radius-full);
  background: var(--cf-surface-alt);
  color: var(--cf-text-secondary);
  font: 500 var(--cf-text-xs)/1 var(--cf-font-ui);
  transition: background-color var(--cf-dur-fast) var(--cf-ease-inout),
              color var(--cf-dur-fast) var(--cf-ease-inout),
              transform var(--cf-dur-fast) var(--cf-ease-out);
}
.cf-chip:hover { transform: translateY(-1px); }
.cf-chip[aria-pressed="true"] { background: var(--cf-accent); color: #10161f; }

.cf-chip--pin {
  font-family: var(--cf-font-mono);
  font-size: var(--cf-text-2xs);
  text-transform: uppercase;
}
.cf-chip--pin[data-pin="power"]   { color: var(--cf-error);       background: var(--cf-error-veil); }
.cf-chip--pin[data-pin="gnd"]     { color: var(--cf-text-muted); }
.cf-chip--pin[data-pin="digital"] { color: var(--cf-wire-7);      background: rgb(96 165 250 / 0.1); }
.cf-chip--pin[data-pin="pwm"]     { color: var(--cf-wire-5);      background: rgb(167 139 250 / 0.1); }
.cf-chip--pin[data-pin="i2c_sda"],
.cf-chip--pin[data-pin="i2c_scl"] { color: var(--cf-signal);      background: rgb(34 211 238 / 0.1); }
```

### 3.4 Mensaje de validación

```css
.cf-violation {
  display: flex; gap: var(--cf-space-2); align-items: flex-start;
  padding: var(--cf-space-3);
  border-radius: var(--cf-radius-sm);
  font-size: var(--cf-text-sm);
  line-height: var(--cf-leading-snug);
}
.cf-violation[data-severity="error"]   { background: var(--cf-error-veil);   color: var(--cf-error); }
.cf-violation[data-severity="warning"] { background: var(--cf-warning-veil); color: var(--cf-warning); }
.cf-violation[data-severity="success"] { background: var(--cf-success-veil); color: var(--cf-success); }
```

**Accesibilidad:** el estado nunca se comunica **solo** con color. Cada mensaje lleva icono (prohibición / triángulo / marca) y el texto español de la regla. Cumple WCAG 1.4.1.

### 3.5 Ficha de catálogo

```css
.cf-card {
  display: flex; flex-direction: column;
  aspect-ratio: 4 / 3;                    /* apaisado: el símbolo esquemático es horizontal */
  padding: var(--cf-space-3);
  background: var(--cf-surface);
  border: var(--cf-border-hairline);
  border-radius: var(--cf-radius-md);
  cursor: grab;
  transition: border-color var(--cf-dur-fast) var(--cf-ease-inout),
              transform var(--cf-dur-base) var(--cf-ease-out);
}
.cf-card:hover {
  border-color: var(--cf-accent);
  transform: translate3d(0, -2px, 0) scale(1.02);   /* NO width/height — V-3 */
}
.cf-card:active { cursor: grabbing; transform: scale(0.99); }
.cf-card:focus-visible { outline: var(--cf-border-focus); outline-offset: 2px; }
```

`aspect-ratio: 4/3` sustituye deliberadamente el `0.648` retrato de la referencia (era para hardware físico).

### 3.6 Campo de entrada

```css
.cf-input {
  width: 100%; height: 2rem;
  padding: 0 var(--cf-space-3);
  background: var(--cf-surface-alt);
  border: var(--cf-border-hairline);
  border-radius: var(--cf-radius-sm);
  color: var(--cf-text);
  font: 400 var(--cf-text-sm)/1 var(--cf-font-ui);
  transition: border-color var(--cf-dur-fast) var(--cf-ease-inout);
}
.cf-input::placeholder { color: var(--cf-text-muted); }
.cf-input:focus { outline: none; border-color: var(--cf-accent); }
.cf-input--numeric { font-family: var(--cf-font-mono); text-align: right; }
```

---

## 4. Patrones de movimiento

Todos son **CSS nativo**. No requieren GSAP ni Framer Motion — la referencia logra su calidad sin librerías de animación, y CircuitForge no necesita añadir una.

| ID | Patrón | Dónde | Coste |
|---|---|---|---|
| **M-1** | Revelado de titular letra por letra con desenfoque | Portada y títulos de la biblioteca. **Nunca en el editor.** | 1 nodo por letra |
| **M-2** | Botón con text roll de doble capa | Todos los botones primarios | 1 nodo extra |
| **M-3** | Panel glass | Máximo 3 superficies | GPU por frame |
| **M-4** | Entrada del inspector al cambiar selección | Editor | Ninguno |
| **M-5** | LED y flujo de corriente | Editor, durante la simulación | 1 animación |

### M-1 — Revelado de titular

```css
.cf-reveal-letter {
  display: inline-block;
  will-change: filter, opacity;
  filter: blur(2px); opacity: 0; visibility: hidden;
  transition: filter var(--cf-dur-slow) var(--cf-ease-out),
              opacity var(--cf-dur-slow) var(--cf-ease-out);
  transition-delay: calc(var(--i) * 18ms);
}
.cf-reveal.is-visible .cf-reveal-letter { filter: blur(0); opacity: 1; visibility: visible; }
.cf-reveal.is-done .cf-reveal-letter { will-change: auto; }   /* liberar la GPU */
```

Activación con `IntersectionObserver`, una vez, `{ threshold: 0.2 }`. `will-change` se retira al terminar — dejarlo activo penaliza el lienzo WebGL que corre detrás.

### M-4 — Entrada del inspector

```css
.cf-inspector__body {
  transition: opacity var(--cf-dur-fast) var(--cf-ease-inout),
              transform var(--cf-dur-base) var(--cf-ease-out);
}
.cf-inspector__body[data-swapping] { opacity: 0; transform: translate3d(6px, 0, 0); }
```

Desplazamiento de 6 px: apenas perceptible, comunica «el contenido cambió» sin robar atención.

### M-5 — LED y flujo de corriente (diseño propio)

```css
.cf-led__halo { opacity: calc(var(--cf-current-ratio, 0) * 0.9); transition: opacity var(--cf-dur-fast) linear; }
.cf-wire[data-live="true"] { filter: brightness(1.35); transition: filter var(--cf-dur-fast) linear; }
.cf-wire__pulse { animation: cf-pulse 1.6s linear infinite; }
@keyframes cf-pulse {
  0%   { offset-distance: 0%;   opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
```

`offset-distance` sobre `offset-path` mueve el punto de luz a lo largo de la curva del cable. Es la única animación declarativa del sistema (equivalente al único `@keyframes spin` de la referencia) y está justificada porque representa un fenómeno físico continuo.

---

## 5. Aplicación por superficie

| Superficie | Modo | Glass | Movimiento permitido |
|---|---|---|---|
| **Editor** (paleta + lienzo + inspector) | Operate | Paleta, inspector, barra de simulación | M-2, M-3, M-4, M-5. **Sin M-1.** |
| **Biblioteca** de componentes | Operate | No (60 fichas) | M-1 en el título, M-2, hover de ficha |
| **Portada / estado vacío** | Persuade | No | M-1, M-2, M-3 |
| **Proyecto compartido** | Read | Barra de metadatos | M-2, M-5 (simulación permitida) |
| **Diálogos / modales** | Operate | Scrim `--cf-scrim` + panel glass | Entrada con `transform` + `opacity` |

---

## 6. Reglas de rechazo (anti-patrones)

Un componente se rechaza en revisión si presenta cualquiera de estos:

| Anti-patrón | Por qué | Correcto |
|---|---|---|
| `box-shadow` de elevación | Viola V-2; compite con el lienzo | `.cf-glass` o borde *hairline* |
| `transition: all` | Anima propiedades no previstas; rompe V-3 | Declarar la propiedad |
| Animación de `width`/`height` | Layout thrashing, rompe RNF-2 (60 fps) | `transform: scale()` |
| `--cf-ease-pop` en opacidad o color | El rebote es para posición, no visibilidad | `--cf-ease-inout` |
| Color de texto fuera de los tres tokens | Viola V-1 | `--cf-text` / `-secondary` / `-muted` |
| `border-radius` fuera de los tres tokens | Viola V-1 | `--cf-radius-sm/md/full` |
| Tamaño de tipo fuera de los seis pasos | Viola V-1 | Token de escala |
| Número o unidad en Inter | Rompe la legibilidad técnica de los valores | `--cf-font-mono` |
| Estado indicado solo por color | Viola WCAG 1.4.1 y RNF-4 | Añadir icono + texto |
| `backdrop-filter` en más de 3 superficies | Degrada el arrastre del lienzo | `.cf-panel` sólido |
| Animación sin `prefers-reduced-motion` | Viola RNF-4 | Bloque de §2.7 |
| Degradado púrpura/índigo, tarjetas uniformes, hero genérico | Estética AI genérica | Usar este sistema |

---

## 7. Configuración de Tailwind

Tailwind 4 lee los tokens desde CSS con `@theme`. **No se duplican valores**: se mapean a las custom properties.

```css
/* apps/web/src/styles/theme.css */
@import 'tailwindcss';
@import './tokens.css';   /* el bloque :root de §2 */

@theme inline {
  --color-bg:             var(--cf-bg);
  --color-surface:        var(--cf-surface);
  --color-surface-alt:    var(--cf-surface-alt);
  --color-surface-raised: var(--cf-surface-raised);
  --color-text:           var(--cf-text);
  --color-text-secondary: var(--cf-text-secondary);
  --color-text-muted:     var(--cf-text-muted);
  --color-accent:         var(--cf-accent);
  --color-accent-hover:   var(--cf-accent-hover);
  --color-signal:         var(--cf-signal);
  --color-success:        var(--cf-success);
  --color-warning:        var(--cf-warning);
  --color-error:          var(--cf-error);
  --color-hairline:       var(--cf-hairline);

  --font-ui:   var(--cf-font-ui);
  --font-mono: var(--cf-font-mono);

  --text-2xs: var(--cf-text-2xs);
  --text-xs:  var(--cf-text-xs);
  --text-sm:  var(--cf-text-sm);
  --text-md:  var(--cf-text-md);
  --text-xl:  var(--cf-text-xl);
  --text-3xl: var(--cf-text-3xl);

  --radius-sm:   var(--cf-radius-sm);
  --radius-md:   var(--cf-radius-md);
  --radius-lg:   var(--cf-radius-lg);
  --radius-full: var(--cf-radius-full);

  --ease-out:   var(--cf-ease-out);
  --ease-inout: var(--cf-ease-inout);
  --ease-pop:   var(--cf-ease-pop);
}
```

Uso: `class="bg-surface text-text border border-hairline rounded-md ease-out duration-300"`.

---

## 8. Correspondencia con los prompts de Stitch

`docs/design/2026-10-25-stitch-prompts.md` describe un design system en su sección 0. **Este documento lo sustituye** en todo lo relativo a color, tipografía, geometría, elevación y movimiento. Cambios que los prompts deben incorporar al regenerarse:

| Elemento | Prompt original | DESIGN.md |
|---|---|---|
| Sombra de panel | `0 4px 16px rgba(0,0,0,0.4)` | **Eliminada.** Glass + borde *hairline* |
| Radios | paneles 12px, botones 8px, chips 999px | Igual (`--cf-radius-md/sm/full`) |
| Paleta | 12 colores con nombre | Igual, más velos de estado formalizados al 8 % |
| Densidad | «≥14 componentes visibles sin scroll» | Mantenido |
| Movimiento | No especificado | **Nuevo:** §2.6 y §4 |
| Aspecto de ficha | No especificado | **Nuevo:** `4/3` apaisado |
| Botón | Relleno naranja simple | **Nuevo:** text roll de doble capa |

---

## 9. Verificación

Antes de marcar una superficie como terminada:

- [ ] Ningún `box-shadow` de elevación en el diff.
- [ ] Ninguna animación de `width`/`height`/`top`/`left`.
- [ ] `--cf-ease-pop` aparece solo junto a `transform`.
- [ ] Todo número y unidad en `--cf-font-mono`.
- [ ] Todo estado con icono además de color.
- [ ] `backdrop-filter` en ≤ 3 superficies.
- [ ] Bloque `prefers-reduced-motion` respetado (probar con la emulación de DevTools).
- [ ] Consola sin errores ni warnings.
- [ ] Contraste ≥ 4.5:1 en texto normal, ≥ 3:1 en texto grande.
- [ ] Navegación completa por teclado, con `:focus-visible` visible.
- [ ] Responsive verificado a 320 / 768 / 1024 / 1440 px.
- [ ] Ningún literal de color, radio, tamaño o duración fuera de los tokens.
- [ ] Estados vacío, de carga y de error presentes (no pantallas en blanco).

---

## 10. Trazabilidad

| Decisión de este documento | Origen |
|---|---|
| Paleta corta, texto perla en lugar de blanco puro | `2026-10-25-analisis-visual-referencia.md` §2 |
| Cero sombras; profundidad por glass + hairline | §2.3 y §5 del análisis |
| Tres curvas de easing, una con sobrepaso reservada a `transform` | §5.1 |
| Cuatro duraciones discretas | §5.2 |
| Botón de doble capa con text roll | §6 patrón B |
| Revelado letra por letra con desenfoque, acotado | §6 patrón A |
| `transform` en lugar de `width`/`height` en hover de tarjeta | §6 patrón C |
| Presupuesto de 3 superficies con `backdrop-filter` | §6 patrón D |
| Lenis sí / Taxi.js no | §6 patrón E |
| Ficha `4/3` apaisada en lugar de `0.648` retrato | §4.3 del análisis |
| Tipografías propias (Inter + JetBrains Mono) | §3.1 del análisis (licencias comerciales ajenas) |
| Patrón M-5 (LED y flujo de corriente) | Diseño original de CircuitForge |
