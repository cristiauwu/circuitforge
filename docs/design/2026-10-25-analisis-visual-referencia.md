# Análisis visual de referencia — iyo.ai

**Fecha:** 2026-10-25
**Método:** extracción pasiva con el MCP de REA (Chrome DevTools Protocol) sobre `https://www.iyo.ai/`, más lectura de `getComputedStyle` en vivo sobre el DOM renderizado.
**Objetivo:** extraer el lenguaje visual y de movimiento del sitio y traducirlo a tokens propios de CircuitForge. **No** se copian activos, fuentes, imágenes ni marca.

**Evidencia:** todas las cifras de este documento son valores computados reales leídos del DOM en ejecución, no CSS inferido ni estimado a ojo. Las capturas REA quedan identificadas por `evidence_id` al pie.

---

## 1. Qué es el sitio, técnicamente

Antes de los colores, el *fingerprint* del stack, porque determina **qué** se puede reutilizar:

| Capa | Tecnología detectada | Evidencia |
|---|---|---|
| CMS / builder | **Webflow** | `html.w-mod-js.w-mod-ix`, atributos `data-wf-site`, `data-wf--navigation-n--variant` |
| Motor de animación | **Webflow IX2** (nativo) — **no GSAP** | `window.Webflow.require('ix2')` presente; `window.gsap === undefined` |
| Interacciones IX2 | **16 eventos**, **4 action lists** | `ixData.events` / `ixData.actionLists` |
| Scroll suave | **Lenis** | `html.lenis`, 1 nodo con `data-lenis-prevent` |
| Transiciones de página | **Taxi.js** | wrapper `div[data-taxi] > div[data-taxi-view]` |
| 3D | **three.js r178** | `canvas[data-engine="three.js r178"]`, `data-type="home"`, `data-gl="c"` |
| DOM utility | jQuery 3.5.1 | `window.jQuery` |
| E-commerce | Shopyflow (puente Webflow↔Shopify) | `shopyflow.js`, `shopyflow_auto_install-1.0.15.js` |
| Analítica | GTM, Facebook Pixel, Hotjar | scripts de terceros |

**Consecuencia práctica:** el sitio logra su calidad de movimiento **sin librerías de animación**. Usa el motor propio de Webflow sobre CSS `transition` + transformaciones `translate3d`. Eso significa que **todo el lenguaje de movimiento es reproducible con CSS nativo y un `IntersectionObserver`** — no hace falta GSAP ni Framer Motion en CircuitForge. Es la conclusión más valiosa del análisis.

**Segundo hallazgo:** la home es una experiencia de **un solo viewport**. `document.body.scrollHeight === 710 === window.innerHeight`. El `nav` mide 710 px de alto (es un overlay a pantalla completa, no una barra). El canvas WebGL ocupa el viewport entero. El texto es **subordinado a la escena 3D**, no al revés.

---

## 2. Tokens de color

### 2.1 Variables del sistema (extraídas de `:root`)

El sitio declara **nueve** custom properties. Es una paleta deliberadamente corta:

| Variable | Valor | Uso observado |
|---|---|---|
| `--black` | `#101010` | Fondo global del `body` |
| `--light-black` | `#151515` | Superficie elevada |
| `--dark-grey` | `#242426` | Superficie secundaria |
| `--dark-grey-lighter` | `#303030` | Bordes / separadores |
| `--white-5` | `#dddee30d` | Velo blanco al 5 % (hover sutil) |
| `--pearl-white` | `#dddee3` | **Texto principal** |
| `--almost-white` | `#edeced` | Texto de máximo contraste |
| `--white` | `#f9f9fb` | Blanco de UI |
| `--black-50` | `#10101080` | Negro al 50 % (scrims) |

**Lectura:** el texto principal **no es blanco puro** sino `#dddee3` (perla). El blanco puro `#f9f9fb` se reserva para UI. Esto reduce el halagado y el contraste duro sobre negro — un detalle de calidad que CircuitForge debería adoptar.

### 2.2 Fondos realmente aplicados

| Valor | Ocurrencias | Rol |
|---|---|---|
| `rgba(56, 56, 56, 0.6)` | 5 | **Relleno de tarjeta glass** |
| `#101010` | 1 | Fondo de página |
| `rgba(17, 17, 17, 0.5)` | 1 | Scrim |
| `rgba(217, 217, 217, 0.5)` | 1 | Velo claro |

### 2.3 El hallazgo estructural: **cero sombras**

El inventario de `box-shadow` sobre **todos** los elementos visibles devuelve **cero coincidencias**.

No hay una sola sombra en el sitio. La profundidad se construye **exclusivamente** con tres recursos:

1. `backdrop-filter: blur(19px)` — 12 elementos (y `blur(20px)` en 1)
2. Rellenos translúcidos (`rgba(56,56,56,0.6)`)
3. Bordes *hairline* de 0.8 px a `rgba(138,138,138,0.1)`

Esto contradice directamente el design system actual de CircuitForge, que especifica `0 4px 16px rgba(0,0,0,0.4)` en paneles. **Recomendación: sustituir la sombra por glass.** En una herramienta con lienzo WebGL, una sombra sobre paneles flotantes compite con el contenido del lienzo y ensucia la lectura de los cables de colores.

---

## 3. Tipografía

### 3.1 Familias en uso

| Familia | Elementos | Rol | Licencia |
|---|---|---|---|
| **Magnetik** | 44 | Display / titulares | Comercial — **no reutilizable** |
| **Roobert Regular** | 13 | UI / cuerpo | Comercial — **no reutilizable** |
| **Nbarchitekproneue** | 7 | Acento / etiquetas | Comercial — **no reutilizable** |
| Arial | 90 | Fallback heredado de Webflow | Sistema |

**Acción legal:** ninguna de las tres tipografías de marca se puede copiar. CircuitForge mantiene **Inter** (UI) y **JetBrains Mono** (pines y valores), que ya están en su design system y cubren los mismos roles sin coste de licencia.

### 3.2 Escala tipográfica real

| Tamaño | rem | Ocurrencias | Rol |
|---|---|---|---|
| **33.6 px** | 2.1 rem | 44 | Titulares (el `h1` del hero) |
| **14 px** | 0.875 rem | 96 | **Base de UI** — abrumadoramente dominante |
| 16 px | 1 rem | 6 | Cuerpo de lectura |
| 11.2 px | 0.7 rem | 5 | Etiquetas |
| 9.6 px | 0.6 rem | 3 | Micro-etiquetas |

**Observaciones de calidad:**

- La escala es **muy comprimida**: solo cinco tamaños en todo el sitio. No hay `h2`/`h3` intermedios visibles — el `h1` tiene clase `h-h4`, es decir, el hero usa el tamaño de un `h4`. El sitio apuesta a **pocos tamaños, muy repetidos**.
- El `h1` mide 33.6 px con `line-height: 36.8px` → **ratio 1.095**, muy apretado. Los titulares respiran por tracking negativo implícito, no por interlineado.
- `font-weight: 400` en el titular. **No hay negritas.** El peso no se usa para jerarquía.
- `letter-spacing: normal`, `text-transform: none` en el `h1` — pero las etiquetas de botón («SHOP NOW») aparecen en mayúsculas con una familia distinta (`Nbarchitekproneue`), probablemente con `text-transform: uppercase` aplicado en la clase del botón.

**Traducción a CircuitForge:** la lección es *disciplina de escala*. CircuitForge debe definir **cinco** pasos de tamaño y no inventar más, con titulares a peso 500–600 (no 400, porque en una herramienta técnica la jerarquía sí debe leerse) e interlineado apretado (1.1) en titulares.

---

## 4. Geometría: radios y bordes

### 4.1 Escala de radios observada

| Radio | rem | Ocurrencias | Uso |
|---|---|---|---|
| 100 % | — | 4 | Píldoras y círculos |
| 160 px | 10 rem | 1 | Contenedor cápsula grande |
| 42 px | 2.625 rem | 2 | Paneles amplios |
| 32 px | 2 rem | 4 | Paneles |
| 20 px | 1.25 rem | 1 | Contenedor |
| **14.4192 px** | 0.9012 rem | 8 | Tarjetas |
| **14.4 px** | 0.9 rem | 4 | Tarjetas de producto |
| **12.8 px** | 0.8 rem | 6 | Tarjetas |
| 8 px | 0.5 rem | 2 | Controles |
| 4 px | 0.25 rem | 1 | Detalle |
| 3.2 px | 0.2 rem | 2 | Detalle |
| 3 px | — | 2 | Detalle |

**Lectura:** la escala es **rem-derivada** en pasos de 0.1 rem (0.2 / 0.8 / 0.9 / 1.25 / 2 / 2.625). Los valores «raros» (`14.4192px`, `3.2px`) no son errores: son resultado de aplicar `rem` sobre un `font-size` raíz de 16 px con algún factor de escala. La consecuencia es que **la geometría es proporcional a la tipografía** — si cambia el tamaño de fuente raíz, cambia todo el ritmo.

### 4.2 Tratamiento de borde: *hairline* de 0.8 px

La tarjeta de producto usa:

```css
border: 0.8px solid rgba(138, 138, 138, 0.1);
padding: 4px 4px 3.68px;
border-radius: 14.4px;
background: rgba(56, 56, 56, 0.6);
```

Un borde **sub-píxel** al 10 % de opacidad. A densidad 1× se ve como un filo luminoso apenas perceptible; a densidad 2× se resuelve como un trazo de 1.6 px. Es un recurso de alta densidad de pantalla que CircuitForge puede adoptar como `1px solid rgb(255 255 255 / 0.08)` (equivalente perceptivo en cualquier DPR).

### 4.3 Relación de aspecto de tarjeta

`.card__wrap` mide **153 × 236 px** → ratio **0.648**, retrato. Coherente con mostrar producto físico (hardware). **No aplica** a CircuitForge: las fichas de componente del catálogo deben ser cuadradas o apaisadas, porque un símbolo esquemático es horizontal (la resistencia es ancha, no alta).

---

## 5. El lenguaje de movimiento (lo más valioso)

### 5.1 Curvas de easing — la firma real

Contadas por frecuencia de uso sobre todos los elementos visibles:

| Curva | Usos | Carácter | Nombre propuesto |
|---|---|---|---|
| `cubic-bezier(0.77, 0, 0.175, 1)` | **11** | Arranque rapidísimo, frenada larga | **`--ease-out-expo`** |
| `cubic-bezier(0.65, 0, 0.35, 1)` | **13** | Simétrica, entrada y salida suaves | **`--ease-in-out`** |
| `cubic-bezier(0.625, 0.05, 0, 1)` | **8** | Desaceleración pronunciada | **`--ease-out-quint`** |
| `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | 6 | Desaceleración clásica | `--ease-out-quad` |
| `cubic-bezier(0.48, 0.01, 0, 1.08)` | 3 | **Sobrepasa el objetivo** (1.08 > 1) | **`--ease-overshoot`** |
| `cubic-bezier(0.4, 0, 0.2, 1)` | 2 | Estándar Material | `--ease-standard` |
| `cubic-bezier(0.5, 0.5, 0, 1)` | 1 | Suave | — |
| `ease-out`, `ease` | 6 / 459 | Heredado de Webflow | descartar |

**La firma es `cubic-bezier(0.77, 0, 0.175, 1)`** — un *expo-out* agresivo: el movimiento ocurre casi todo en el primer 20 % del tiempo y luego se asienta lentamente. Es lo que da la sensación de «respuesta instantánea pero elegante».

**Y hay exactamente una curva con sobrepaso:** `cubic-bezier(0.48, 0.01, 0, 1.08)`, usada 3 veces en `transform` a 0.64 s. El sobrepaso del 8 % se reserva para elementos que **rebotan al llegar** — no se usa en opacidad ni en color. Es disciplina, no accidente.

### 5.2 Duraciones

| Duración | Usos | Rol |
|---|---|---|
| **0.6 s** | 12 | **Firma**: morph de tarjeta (width/height/background) |
| 0.5 s | 5 | Entrada de opacidad + transform |
| 0.4 s | 5 | Salida, y radio de borde |
| **0.3 s** | 9 | Hover de opacidad, transform de UI |
| 0.25 s | 1 | Cambio de color |
| 0.1 s | 2 | Cambio de color inmediato |
| 0.7 s | 1 | Transición amplia |
| 0.64 s | 3 | Con sobrepaso |

**Regla inferida:** `0.1 s` para color, `0.3 s` para UI, `0.5–0.6 s` para movimiento estructural, `0.64 s` con rebote. Nunca una duración intermedia arbitraria.

### 5.3 Keyframes CSS

Solo **una** animación declarada en todo el sitio:

```css
@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

Todo lo demás lo dirige IX2 desde JavaScript manipulando `transform` inline. **Confirmación de la tesis:** el sitio no usa animaciones CSS declarativas; usa transiciones sobre propiedades transformadas.

---

## 6. Los cinco patrones de interacción que valen la pena

### Patrón A — Revelado de titular letra por letra con desenfoque

**Evidencia (markup real del `h1`):**

```html
<h1 data-module="heading" class="h-h4 is--configurator">
  <div style="position: relative; display: inline-block;">          <!-- envoltorio de palabra -->
    <div style="position: relative; display: inline-block;
                will-change: filter, opacity;
                filter: blur(2px); opacity: 0; visibility: hidden;">W</div>
    <div style="… filter: blur(2px); opacity: 0; visibility: hidden;">e</div>
  </div>
  <div style="position: relative; display: inline-block;">          <!-- palabra siguiente -->
    <div style="…">m</div><div style="…">a</div><div style="…">k</div>…
  </div>
</h1>
```

**Estado capturado a mitad de animación** (lectura en vivo durante el arranque):

```
blur(0.8291px) opacity: 0.5855
blur(0.8655px) opacity: 0.5673
blur(0.9018px) opacity: 0.5491
blur(0.9382px) opacity: 0.5309
```

**Mecánica:** cada letra es un `<div>` con `will-change: filter, opacity`. Parte de `blur(2px) + opacity: 0` y anima a `blur(0) + opacity: 1`. Las letras van **desfasadas** (los valores difieren en ~0.03 px de blur por letra, escalonados por índice), lo que produce un barrido de izquierda a derecha. `visibility: hidden` evita el parpadeo antes de que arranque la animación.

**Coste:** un nodo DOM por letra, más un envoltorio por palabra. Para un titular de 40 caracteres son ~80 nodos extra.

**Veredicto para CircuitForge — ADAPTAR, reducido.** El efecto comunica «la interfaz está viva» y es apropiado para una portada o una pantalla de bienvenida. **No** debe aplicarse al editor (cada re-render del lienzo lo dispararía). Implementación recomendada: sobre el `<h1>` del hero y los títulos de sección, con `IntersectionObserver`, **una vez** por carga, y desactivado bajo `prefers-reduced-motion`. Además, animar `filter: blur()` es costoso en GPU; usar `blur(2px)` como máximo y `will-change` solo durante la animación (retirarlo al terminar, o se degrada el rendimiento del lienzo WebGL que corre detrás).

### Patrón B — Botón con doble capa de texto y overlay circular

**Evidencia (markup real del CTA «Buy now»):**

```html
<div cta-button="vad-pro" data-w-id="1281b04a-…" class="navbar__button-wrap is--vad">
  <a href="/products/vad-pro" class="navbar__button w-inline-block">
    <div class="nb__text-wrap">
      <div class="nb__text" style="transform: translate3d(0px, 50%, 0px) …">
        <div class="paragraph__hero">Buy now</div>
      </div>
      <div class="nb__text" style="transform: translate3d(0px, 50%, 0px) …">
        <div class="paragraph__hero">Buy now</div>
      </div>
    </div>
    <div class="nb__overlay-wrap">
      <div class="nb__overlay" style="transform: translate3d(0,0,0) scale3d(0.5, 0.5, 1) …; opacity: 0;">
        <img src="…Button%20Circle%20(1).avif" class="img">
      </div>
    </div>
  </a>
</div>
```

**Mecánica:** hay **dos copias idénticas** del texto, ambas desplazadas `translate3d(0, 50%, 0)`. En reposo una es visible; al hacer hover, la primera sube y sale mientras la segunda entra desde abajo — un *text roll* clásico resuelto con dos capas, no con `overflow: hidden` sobre una sola. Simultáneamente, un overlay circular con imagen entra con `scale3d(0.5 → 1)` y `opacity: 0 → 1`, creando un relleno que crece desde el centro.

**Veredicto para CircuitForge — ADAPTAR, parcial.** El *text roll* de doble capa es un patrón excelente y barato para los botones primarios («Simular», «Compartir», «Guardar»). El overlay de imagen circular **no aplica** (depende de un activo gráfico de marca); se sustituye por un relleno sólido que crece desde el centro usando `transform: scale()` sobre un pseudo-elemento.

### Patrón C — Tarjeta con morph de tamaño

**Evidencia:**

```css
transition: width 0.6s cubic-bezier(0.77, 0, 0.175, 1),
            height 0.6s cubic-bezier(0.77, 0, 0.175, 1),
            background 0.3s cubic-bezier(0.65, 0, 0.35, 1);
```

La tarjeta cambia **ancho y alto** en hover (0.6 s, expo-out) y **fondo** más rápido (0.3 s, in-out). Dos velocidades distintas según la propiedad: la geometría tarda, el color no.

**Veredicto para CircuitForge — ADAPTAR como principio.** El principio valioso es **«la geometría y el color no se mueven a la misma velocidad»**. Aplicarlo en el catálogo de componentes (la ficha crece al hover) — pero animar `width`/`height` provoca *layout thrashing* y rompe los 60 fps que exige el RNF-2. **Sustituir por `transform: scale()`**, que es compositivo. El sitio se lo puede permitir porque tiene pocas tarjetas en un viewport estático; CircuitForge tiene 60 fichas en una cuadrícula con scroll.

### Patrón D — Glass con `backdrop-filter`

**Evidencia:** `backdrop-filter: blur(19px)` en **12 elementos** (`blur(20px)` en 1). Cero sombras.

**Veredicto para CircuitForge — ADOPTAR.** Es el reemplazo directo de la sombra en el design system actual y encaja mejor con un lienzo WebGL detrás. **Advertencia de rendimiento:** `backdrop-filter` obliga a la GPU a leer el búfer de fondo en cada frame. Con el solver en Web Worker y el lienzo a 60 fps, el número de elementos con blur debe ser **bajo y fijo** (paleta, inspector, barra de simulación = 3 superficies). No aplicarlo a las 60 fichas del catálogo.

### Patrón E — Transición de página y scroll inercial

**Evidencia:** `div[data-taxi] > div[data-taxi-view]` (Taxi.js) + `html.lenis` (Lenis).

Lenis intercepta la rueda del ratón y aplica interpolación al scroll; Taxi clona la vista saliente y la entrante y anima entre ambas antes de sustituir el DOM.

**Veredicto para CircuitForge — ADOPTAR el scroll, DESCARTAR la transición de página.**

- **Lenis: sí.** Da la sensación de fluidez en una herramienta con scroll (catálogo, lista de proyectos) y es una dependencia pequeña y desacoplada. **Pero** debe desactivarse dentro del lienzo: el zoom y el paneo del editor no pueden pasar por un interpolador de scroll. El propio sitio marca sus zonas con `data-lenis-prevent` — CircuitForge necesita el equivalente en el contenedor del canvas.
- **Taxi.js: no.** CircuitForge es una SPA con pocas rutas (editor, biblioteca, proyectos, compartido). La API nativa **View Transitions** (`document.startViewTransition`) hace lo mismo sin dependencia y React la integra nativamente. Además, en un editor, salir de la ruta con una transición larga arriesga perder estado no guardado si el usuario navega rápido.

---

## 7. Lo que NO se debe copiar

| Elemento | Motivo |
|---|---|
| Tipografías Magnetik / Roobert / Nbarchitekproneue | Licencia comercial. CircuitForge usa Inter + JetBrains Mono. |
| Modelos 3D, imágenes y avif de producto | Activos propietarios. |
| Marca, logotipo, «iyO» | Identidad de tercero. |
| Overlay de imagen circular del botón | Depende de un activo de marca. Se sustituye por relleno sólido. |
| Estructura «un solo viewport, 3D protagonista» | iyo.ai es una **landing** (modo *Persuade*); CircuitForge es una **herramienta** (modo *Operate*). El texto subordinado a la escena 3D es correcto allí y sería un error aquí: el editor necesita paneles densos y legibles. |
| Relación de aspecto 0.648 de tarjeta | Retrato para hardware; los símbolos esquemáticos son horizontales. |
| Animación de morph con `width`/`height` | Layout thrashing; rompe el RNF-2 (60 fps). |
| `cubic-bezier` de sobrepaso en opacidad o color | El sitio lo reserva exclusivamente a `transform`. |

---

## 8. Síntesis: la tesis de diseño

Tres conclusiones que gobiernan la adaptación:

1. **La calidad viene de la restricción, no del efecto.** Nueve variables de color, cinco tamaños de tipo, una sola curva dominante, cero sombras, un solo `@keyframes`. El sitio es excelente porque **no** tiene variedad — tiene repetición disciplinada.

2. **El movimiento es CSS nativo sobre `transform`.** Sin GSAP, sin Framer Motion. Esto abarata enormemente la adopción en CircuitForge: el plan de implementación **no necesita una dependencia nueva** para lograr este lenguaje.

3. **La profundidad es luz, no sombra.** `backdrop-filter` + relleno translúcido + borde *hairline*. Es el cambio conceptual más importante respecto al design system actual de CircuitForge.

**La traducción completa a tokens está en `docs/design/DESIGN.md`.**

---

## Apéndice — Trazabilidad de evidencia

| Observación | Operación REA | `evidence_id` |
|---|---|---|
| Inventario de targets y producto del navegador | `list_browser_targets` | `ev_672646483f264fe1dd0ca132ed33f3a612fef14441c3d12a96bc24396053cd60` |
| DOM (654 nodos), accesibilidad (252 nodos), scripts, recursos, storage | `inspect_web_page` | `ev_bff65eb86812561905a8c2f5bd59ff8263a83b58a61b4d40979d6f4262eaacc1` |

**Nota sobre completitud:** la captura pasiva reportó `policy_filtered` en `scripts` (19 de origen no permitido), `resources` (45) y `metadata` (57). Los valores de color, tipografía, radios, transiciones y keyframes de este documento **no** provienen de esa captura, sino de lectura en vivo de `getComputedStyle` sobre el DOM renderizado — que es evidencia directa y completa para esos atributos. Las cifras de IX2 (16 eventos / 4 action lists) provienen de interrogar el store de Webflow en la página.

**Limitaciones reconocidas:**
- El estado de animación capturado es el de **arranque**, no el de reposo final; los valores de `blur`/`opacity` corresponden a una animación en curso.
- `window.THREE` no está expuesto globalmente (el canvas usa `data-engine="three.js r178"` como declaración), por lo que la revisión se infiere del atributo, no de la instancia.
- No se inspeccionaron los bundles de JavaScript de terceros; el análisis se limita a lo observable en la superficie pública, conforme a las reglas de trabajo de `docs/referencias/2026-10-25-ingenieria-inversa.md`.