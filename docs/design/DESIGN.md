# CircuitForge — DESIGN.md

**Versión:** 2.1
**Fecha:** 2026-10-25
**Estado:** fuente de verdad visual. Todo componente nuevo se mide contra este archivo.
**Origen:** valores **medidos** de `iyo.ai` con `getComputedStyle` sobre el DOM renderizado. La evidencia completa está en `docs/design/2026-10-25-analisis-visual-referencia.md`.

> **Cambio de la v1 a la v2.** La v1 describía un sistema *inspirado en* la referencia: tomaba sus tokens de color y sus curvas de easing, pero la geometría de los componentes era inventada. El resultado fue una interfaz con los colores de iyo.ai y la anatomía de un dashboard genérico. La v2 corrige eso: **cada radio, altura, relleno y blur de este documento está medido**, no estimado.

---

## 1. Principios

| # | Principio | Consecuencia práctica |
|---|---|---|
| **V-1** | **La restricción es la calidad.** | No se inventan valores. Si falta un token, se añade al sistema o se usa el más cercano. |
| **V-2** | **La profundidad es luz, no sombra.** | Cero `box-shadow` de elevación. Se usa `backdrop-filter`, relleno translúcido y borde *hairline*. |
| **V-3** | **El movimiento vive en `transform` y `opacity`.** | Nunca se animan `width`, `height`, `top`, `left`, `margin`. |
| **V-4** | **El monocromo primero, el color como señal.** | La referencia es casi monocroma y reserva el color para lo que significa algo. En CircuitForge el color codifica estado eléctrico. |
| **V-5** | **El contenido técnico manda.** | Es una herramienta. Lienzo e instrumentación tienen prioridad sobre la expresión. |

**Modo de superficie:** CircuitForge es **Operate**. La única excepción es la portada, que admite **Persuade**.

---

## 2. Tokens

Custom properties de CSS en `apps/web/src/styles/tokens.css`. Son la fuente de verdad; la configuración de Tailwind se **genera** desde aquí.

### 2.1 Color — base neutra, no azul

**Decisión clave de la v2.** La referencia usa grises **neutros cálidos** y reserva el color para el acento. La v1 usaba una base azul pizarra: con fondo azul, cualquier gris de UI se lee sucio y el naranja de acento pierde contraste. Sobre neutro, el acento manda.

| Token | Valor | Evidencia en la referencia |
|---|---|---|
| `--cf-bg` | `#101010` | `--black: #101010` (fondo del `body`) |
| `--cf-bg-raised` | `#151515` | `--light-black: #151515` |
| `--cf-surface` | `#1c1c1e` | derivado de `--dark-grey: #242426` |
| `--cf-surface-alt` | `#242426` | `--dark-grey` literal |
| `--cf-surface-raised` | `#303030` | `--dark-grey-lighter` literal |
| `--cf-fill` | `rgb(56 56 56 / 0.6)` | **relleno de tarjeta, valor medido literal** |
| `--cf-fill-dim` | `rgb(56 56 56 / 0.35)` | versión tenue para rejillas densas |
| `--cf-fill-strong` | `rgb(56 56 56 / 0.85)` | estado activo |

**Texto.** El principal **no es blanco puro**: la perla reduce el halagado sobre negro y es lo que da sensación de material en vez de pantalla.

| Token | Valor | Evidencia |
|---|---|---|
| `--cf-text` | `#dddee3` | `--pearl-white: #dddee3` — **42 usos, el dominante** |
| `--cf-text-strong` | `#edeced` | `--almost-white: #edeced` |
| `--cf-text-secondary` | `#9a9a9e` | derivado |
| `--cf-text-muted` | `#6b6b70` | derivado |

**Acento y estado.** La referencia no tiene acento cromático: es monocroma y usa el blanco para la acción. CircuitForge **sí** necesita uno, porque el color codifica estado eléctrico (V-4).

| Token | Valor | Uso |
|---|---|---|
| `--cf-accent` | `#ff6b35` | acción primaria, selección |
| `--cf-on-accent` | `#131313` | texto sobre el acento |
| `--cf-signal` | `#22d3ee` | **solo** instrumentación en vivo |
| `--cf-success` / `--cf-warning` / `--cf-error` | `#34d399` / `#fbbf24` / `#f87171` | V-3 / V-2..V-6 / V-1 |

### 2.2 Bordes y glass

| Token | Valor | Evidencia |
|---|---|---|
| `--cf-hairline` | `rgb(138 138 138 / 0.12)` | borde medido: `1px rgba(138,138,138,.1)` — **gris neutro, no blanco** |
| `--cf-hairline-strong` | `rgb(138 138 138 / 0.22)` | hover |
| `--cf-glass-blur` | **`19px`** | `backdrop-filter: blur(19px)` en 12 elementos |
| `--cf-glass-sat` | `130%` | saturación acompañante |

Un borde blanco sobre fondo cálido se ve lechoso; el gris se funde y solo deja el filo.

### 2.3 Tipografía

```
--cf-font-ui:   'Inter', system-ui, sans-serif
--cf-font-mono: 'JetBrains Mono', ui-monospace, monospace
```

Escala de 7 pasos: `2xs` 11px · `xs` 12px · `sm` 13px · `md` 14px · `lg` 18px · `xl` 24px · `3xl` 40px.

| Rol | Familia | Tamaño | Peso | Detalle |
|---|---|---|---|---|
| Titular de portada | Inter | `3xl` | 600 | `--cf-tracking-tight`, a dos tonos |
| Título de página | Inter | `xl` | 600 | `--cf-tracking-tight` |
| **Eyebrow** | Inter | `2xs` | 500 | uppercase, `--cf-tracking-wider` (0.14em), muted |
| Cuerpo | Inter | `md` | 400 | — |
| Identificador (`R1`) | **Mono** | `xs` | 500 | `--cf-signal` |
| Valor numérico | **Mono** | `sm` | 500 | `--cf-text-strong` |
| Unidad | **Mono** | `2xs` | 400 | muted |

**Regla dura:** todo número, unidad e identificador va en JetBrains Mono. El texto de UI en Inter.

> **La clase `cf-eyebrow` es un recurso central de la v2.** Versalitas micro con tracking amplio en color apagado. La referencia lo repite constantemente y da jerarquía sin gastar peso tipográfico.

### 2.4 Geometría — rampa ampliada con píldora

**Medido en la referencia:** `17.28px` (×8), `12.8px` (×6), `32px`, `42px`, `160px` (píldora), `100%` (círculos).

| Token | Valor | Uso |
|---|---|---|
| `--cf-radius-sm` | `0.5rem` (8px) | controles compactos |
| `--cf-radius-md` | `0.75rem` (12px) | campos |
| `--cf-radius-lg` | `1.25rem` (20px) | tarjetas, paneles |
| `--cf-radius-xl` | `1.75rem` (28px) | superficies glass |
| `--cf-radius-full` | `9999px` | **navegación, chips, botones** |

La rampa v1 llegaba solo a 12px. **La referencia usa radios grandes con generosidad** y esa es una de las razones por las que se ve suave en vez de rígida. Media interfaz de la v2 va en píldora.

### 2.5 Movimiento

| Token | Valor | Evidencia |
|---|---|---|
| `--cf-ease-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | **11 usos: la firma** |
| `--cf-ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | 13 usos |
| `--cf-ease-pop` | `cubic-bezier(0.48, 0.01, 0, 1.08)` | 3 usos, **siempre en `transform`** |
| `--cf-dur-instant` / `fast` / `base` / `slow` | `100` / `200` / `300` / `600` ms | 0.3s y 0.6s dominantes |

`--cf-ease-pop` **jamás** en `opacity` ni en color.

### 2.6 Textura de grano — nuevo en la v2

La referencia **no tiene una superficie lisa**: tiene grano sobre el negro. Es lo que separa "fondo oscuro" de "material oscuro". Se genera con un SVG en línea (`--cf-grain`), sin peticiones ni imágenes que cachear, aplicado vía `.cf-grain::before` con `mix-blend-mode: overlay`.

### 2.7 Capa de atmósfera — nuevo en la v2.2

Vive en `apps/web/src/styles/atmosphere.css` y se monta **una vez en el shell**, no por ruta, para que el fondo sea continuo entre navegaciones.

| Efecto | Clase | Qué aporta |
|---|---|---|
| **Aurora** | `.cf-aurora` | Tres halos radiales (naranja del acento, cian de señal, violeta de apoyo) que derivan en 34 s por ciclo. A esa velocidad el ojo no percibe el bucle: se lee como que la superficie respira |
| **Grano global** | `.cf-grain-layer` | El grano sobre todo el viewport. Antes solo estaba en la portada; medido, las rutas de trabajo —que son las superficies oscuras grandes— no lo tenían |
| **Viñeta** | `.cf-vignette` | Oscurece los bordes para empujar la mirada al centro. Sutil: si se nota, está mal calibrada |
| **Resplandor** | `.cf-glow` | Halo cálido permanente en la acción primaria |
| **Reflejo del cursor** | `.cf-spotlight` | Luz suave que sigue al puntero, con `--mx`/`--my` |
| **Borde luminoso** | `.cf-border-glow` | El contorno se enciende cerca del cursor |
| **Brillo** | `.cf-shine` | Franja clara que cruza el botón al pasar |
| **Revelado** | `.cf-enter` | Entrada escalonada en **CSS puro** |

**Regla de `box-shadow`** — V-2 prohibía la sombra de **elevación**: la sombra gris que finge profundidad proyectando una silueta oscura sobre el plano. Un **halo de color** no es elevación, es emisión: no proyecta silueta y refuerza la tesis "la profundidad es luz". `.cf-glow` y el `inset` de `.cf-glass` están permitidos por eso.

**Coste medido, aceptado conscientemente.** Con el suelo del instrumento presente (sin grano = 16.9 ms):

| Estado | Mediana |
|---|---|
| Con grano | 21.3 ms |
| Sin grano | 16.9 ms |
| `mix-blend-mode: normal` en vez de `overlay` | 18.6 ms |

El grano cuesta **~4.4 ms por frame** y el `overlay` es más de la mitad. **Se acepta**: en esta etapa el objetivo es la estética, no los 60 fps. Queda anotado como el primer candidato a recortar si el lienzo necesita esos milisegundos.

**Animación como mejora, nunca como requisito.** `.cf-enter` usa `animation` con `animation-fill-mode: both`, no clases que añade JavaScript. La versión anterior dependía de un `useEffect` con temporizadores y **medido en el navegador dejaba el titular, la descripción y los botones en `opacity: 0` durante casi tres segundos**. Con la animación en CSS el contenido no puede quedarse invisible: si el JS no corriera, la peor consecuencia sería no tener animación.

---

## 3. Componentes

Medidos, no inventados.

### 3.1 Botón

| Propiedad | Valor | Origen |
|---|---|---|
| Radio | **píldora** | la referencia usa 160px y 100% |
| Altura | 40px (`sm` 32 / `lg` 48) | controles medidos: 37–44px |
| Padding-x | 20px (`sm` 14 / `lg` 28) | proporcional a la píldora |
| Transición | 300ms `--cf-ease-out` | medido |

Variantes: `primary` (acento), `secondary` (relleno glass + borde), `ghost`, `danger`, `light` (blanco sobre oscuro — **el tratamiento de la referencia**).

**Text roll de doble capa** (patrón M-2): dos copias del texto, la segunda `aria-hidden`. Es lo que aporta la sensación de respuesta que la referencia consigue con Webflow IX2.

### 3.2 Botón circular de icono — nuevo en la v2

**El control más característico de la referencia y el que faltaba por completo.** Círculos perfectos (`radius: 100%`) con relleno claro sobre el fondo oscuro. Tamaños 28 / 36 / 44 px. `label` obligatorio → `aria-label` (WCAG 4.1.2).

### 3.3 Navegación en píldora flotante — rehecha en la v2

| Propiedad | Valor |
|---|---|
| Forma | píldora, `w-fit` (abrace el contenido) |
| Posición | flotante, con margen respecto al borde |
| Superficie | `.cf-glass` (relleno + blur 19px + hairline) |
| Contenido | marca · separador vertical · enlaces · separador · icono circular |

La v1 era una barra de ancho completo con borde inferior: el patrón genérico de dashboard y lo más alejado de la referencia.

### 3.4 Superficies

| Clase | Fondo | Blur | Uso |
|---|---|---|---|
| `.cf-panel` | `--cf-surface` | no | panel sólido |
| `.cf-glass` | `--cf-fill` | **sí, 19px** | **presupuesto: 4** — nav, barra, paleta, inspector |
| `.cf-tile` | `--cf-fill-dim` | no | tarjetas en rejilla densa (biblioteca, proyectos) |

Sin `box-shadow` de elevación en ninguna.

### 3.5 Chip y pin

Píldora, altura 28px. El chip activo usa **relleno fuerte, no el acento**: con 9 categorías pintadas de naranja, el naranja dejaría de significar "haz esto".

Los pines llevan color por función eléctrica (V-4) y siempre monoespaciados.

### 3.5b Paleta del editor — ficha horizontal

**Cambio de la v2.1.** La paleta pasó de una rejilla de 2 columnas a una **lista de filas horizontales**: símbolo a la izquierda, nombre al centro, número de pines a la derecha.

Medido, la decisión se justifica sola:

| Disposición | Altura de ficha | Visibles sin scroll |
|---|---|---|
| Rejilla vertical (2 col) | 98 px | **6** |
| Fila horizontal (1 col) | **38 px** | **9** |

En vertical no cabía el nombre completo de «Potenciómetro» y había que truncarlo con elipsis o quitar el símbolo. En horizontal entra completo en una línea y el símbolo sigue visible.

Es además como funciona una paleta de EDA real (KiCad, Altium): **lista densa de filas, no rejilla de tarjetas**. Una rejilla dice "catálogo para explorar"; una lista dice "herramienta para elegir rápido", que es lo que la paleta es.

> **Densidad objetivo: ≥9 fichas visibles sin scroll a 900 px de alto.** No ≥14. Ese número venía de `2026-10-25-stitch-prompts.md`, escrito para el sistema anterior (fichas verticales sin símbolo); alcanzarlo hoy exigiría truncar nombres o eliminar los símbolos, y ambas cosas empeoran la paleta. La densidad es una consecuencia del contenido, no un objetivo que se persigue deformando el diseño.

### 3.5c Símbolos esquemáticos

`apps/web/src/ui/SchematicSymbol.tsx` dibuja **22 símbolos** en notación esquemática real: zigzag para la resistencia, placas paralelas para el capacitor, arcos para el inductor, triángulo con barra y flechas para el LED, círculo con base y colector con flecha saliente para el NPN, chip con pines para el microcontrolador.

Por qué importa: el OE-3 exige que cada componente declare **símbolo, pines tipados, parámetros y modelo**. El símbolo *es* la interfaz de un editor de circuitos: dibujar un rectángulo con una letra dentro no cumple ese criterio.

Convenciones: viewBox `0 0 32 24` (apaisado, porque un símbolo esquemático lo es), trazo de 1.5 unidades, `currentColor` para heredar el estado, y coordenadas sobre rejilla de 2 unidades. Los símbolos se **anidan** en el SVG del lienzo mediante `<svg x y width height>`, válido en SVG 2, lo que evita duplicar cada dibujo en dos variantes.

Un `typeId` desconocido cae en un símbolo genérico (rectángulo con rombo, que en notación esquemática significa «bloque no especificado») en vez de dejar un hueco, porque un hueco se lee como un error de render.

### 3.6 Campo de entrada

Píldora, altura 36px, relleno translúcido. Sobre fondo oscuro un campo sólido se lee como un agujero; el relleno tenue se lee como superficie.

---

## 4. Patrones de movimiento

| ID | Patrón | Dónde |
|---|---|---|
| **M-1** | Revelado de titular letra por letra con desenfoque | Títulos de sección. **Nunca en el editor.** |
| **M-2** | Botón con text roll | Todos los botones |
| **M-3** | Superficie glass | Presupuesto de 4 |
| **M-4** | Entrada del inspector | Editor |
| **M-5** | LED y flujo de corriente | Editor, en simulación |
| **M-6** | **Entrada escalonada de bloques** (v2) | Portada: desplazamiento de 14px, retardos de 70ms por bloque |

---

## 5. Aplicación por superficie

| Superficie | Modo | Glass | Movimiento |
|---|---|---|---|
| **Portada** `/` | Persuade | No (grano + resplandor) | M-1, M-2, M-6 |
| **Editor** | Operate | Nav, paleta, inspector, barra | M-2, M-3, M-4, M-5 |
| **Biblioteca** | Operate | No (22 tiles) | M-2, hover de tile |
| **Proyectos** | Operate | No | M-2, hover de tile |
| **Compartido** | Read | Panel | M-2 |

---

## 6. Reglas de rechazo

| Anti-patrón | Por qué | Correcto |
|---|---|---|
| `box-shadow` de elevación | Viola V-2 | `.cf-glass` o `.cf-tile` |
| `transition: all` | Anima propiedades no previstas | Declarar la propiedad |
| Animación de `width`/`height` | Layout thrashing | `transform` |
| `--cf-ease-pop` en opacidad o color | El rebote es para posición | `--cf-ease-inout` |
| Radio fuera de la rampa | Viola V-1 | Token de radio |
| Base azul o fría | Ensucia los grises y mata el acento | Neutro `#101010` |
| Texto blanco puro | Halaga sobre negro | `--cf-text` perla |
| Borde blanco | Se ve lechoso sobre cálido | `--cf-hairline` gris |
| Barra de nav de ancho completo | Patrón genérico de dashboard | Píldora flotante |
| Número o unidad en Inter | Rompe la legibilidad técnica | `--cf-font-mono` |
| Estado solo por color | Viola WCAG 1.4.1 | Icono + texto |
| `backdrop-filter` en >4 superficies | Degrada el arrastre | `.cf-tile` |
| Animación sin `prefers-reduced-motion` | Viola RNF-4 | Bloque de tokens.css |
| Degradado púrpura, tarjetas uniformes | Estética AI genérica | Este sistema |

---

## 7. Verificación

Antes de dar una superficie por terminada:

- [ ] Cero `box-shadow` de elevación en el diff.
- [ ] Ninguna animación de `width`/`height`/`top`/`left`.
- [ ] `--cf-ease-pop` solo junto a `transform`.
- [ ] Todo número y unidad en `--cf-font-mono`.
- [ ] Todo estado con icono además de color.
- [ ] `backdrop-filter` en ≤ 4 superficies.
- [ ] Radios dentro de la rampa `sm/md/lg/xl/full`.
- [ ] Base neutra: el `body` computa `rgb(16, 16, 16)`.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Consola sin errores ni warnings.
- [ ] Contraste ≥ 4.5:1.
- [ ] Teclado completo, con `:focus-visible` visible.
- [ ] Responsive a 320 / 768 / 1024 / 1440 px sin desbordamiento.
- [ ] Sin solapamiento de texto (medido en el DOM, no a ojo).

---

## 8. Trazabilidad

| Decisión | Evidencia medida |
|---|---|
| Base neutra `#101010` | `--black` de la referencia |
| Texto perla `#dddee3` | `--pearl-white`, 42 usos |
| Relleno `rgb(56 56 56/.6)` | valor literal de sus tarjetas |
| Borde `rgb(138 138 138/.1)` | valor literal de sus bordes |
| Blur `19px` | `backdrop-filter` en 12 elementos |
| Radios hasta 160px | 17.28 / 12.8 / 32 / 42 / 160 medidos |
| Controles 37–44px | alturas medidas |
| Curvas de easing | 11 / 13 / 3 usos contados |
| Duraciones 0.3s y 0.6s | dominantes medidas |
| Nav en píldora flotante | anatomía observada |
| Botón circular de icono | anatomía observada |
| Textura de grano | superficie observada |
| Eyebrow en versalitas | recurso recurrente observado |
