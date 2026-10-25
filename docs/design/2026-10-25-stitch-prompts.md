# CircuitForge — Prompts de UI optimizados para Stitch

**Fecha:** 2026-10-25
**Skill aplicada:** `enhance-prompt`
**Uso:** actividad 3 del cronograma (diseño de UX y mockups). Cada prompt está listo para pegar en Stitch.

> **Nota previa.** Las instrucciones de `enhance-prompt` piden consultar la guía oficial de prompting de Stitch (https://stitch.withgoogle.com/docs/learn/prompting/) y comprobar si existe un `DESIGN.md` en el proyecto. **No hay `DESIGN.md` todavía.** Todos los prompts de abajo están escritos contra el design system que definimos en la sección 0, para que sea la fuente de ese archivo. Al final del documento están las dos acciones recomendadas.

---

## 0. Design system de CircuitForge (a crear como `DESIGN.md`)

Este bloque es el contrato visual. Todos los prompts de pantalla lo referencian en lugar de repetirlo. Está derivado de lo que hace legible un editor técnico: fondo frío y neutro para que los cables de colores resalten, acento único para las acciones primarias, y densidad alta porque es una herramienta, no una landing.

```
- Plataforma: Web, Desktop-first (el editor necesita ancho); responsive colapsable a tablet
- Tema: Oscuro, técnico, de precisión
- Background: Azul Pizarra Profundo (#0f1720) — lienzo y fondo de la app
- Surface: Grafito Elevado (#1b2430) — paneles (paleta, inspector), tarjetas
- Surface Alt: Pizarra Media (#26313f) — hover, campos de entrada, encabezados de sección
- Grid Line: Pizarra Sutil (#2e3b4a) — líneas de la cuadrícula del lienzo
- Primary Accent: Naranja Circuito (#ff6b35) — acción primaria, selección activa, CTA
- Primary Hover: Naranja Brasa (#ff8557)
- Secondary Accent: Cian Señal (#22d3ee) — instrumentación, valores de simulación en vivo
- Success: Verde Continuidad (#34d399) — net válido, simulación correcta
- Warning: Ámbar Advertencia (#fbbf24) — reglas V-2..V-6 (advertencias)
- Error: Rojo Cortocircuito (#f87171) — regla V-1 (bloqueo)
- Text Primary: Blanco Humo (#f1f5f9)
- Text Secondary: Gris Niebla (#94a3b8)
- Text Muted: Gris Pizarra (#64748b)
- Wire palette: #f87171, #fbbf24, #34d399, #22d3ee, #a78bfa, #f472b6, #60a5fa, #fb923c
- Tipografía UI: Inter (400/500/600); Tipografía técnica/pines: JetBrains Mono (400/500)
- Radios: paneles 12px, botones 8px, chips 999px
- Espaciado: base 4px, escala 4/8/12/16/24/32
- Sombras: elevación de panel 0 4px 16px rgba(0,0,0,0.4)
- Iconografía: outline, 1.5px, estilo Lucide
- Densidad: alta — es una herramienta profesional, objetivo ≥14 componentes visibles en la paleta sin scroll
```

---

## 1. Prompt — Editor principal (pantalla núcleo)

```
Un editor web profesional de circuitos electrónicos en el navegador, de tema oscuro y
precisión técnica, que se siente como una herramienta de ingeniería y no como un sitio
de marketing. La pantalla debe leerse de un vistazo: paleta a la izquierda, lienzo al
centro, inspector a la derecha.

**DESIGN SYSTEM (REQUIRED):**
- Plataforma: Web, Desktop-first
- Tema: Oscuro, técnico, de precisión, alta densidad de información
- Background: Azul Pizarra Profundo (#0f1720)
- Surface: Grafito Elevado (#1b2430) para los paneles
- Surface Alt: Pizarra Media (#26313f) para hover y campos
- Grid Line: Pizarra Sutil (#2e3b4a) para la cuadrícula del lienzo
- Primary Accent: Naranja Circuito (#ff6b35) para la acción primaria y la selección
- Secondary Accent: Cian Señal (#22d3ee) para valores de simulación en vivo
- Text Primary: Blanco Humo (#f1f5f9)
- Text Secondary: Gris Niebla (#94a3b8)
- Tipografía UI: Inter; pines y valores numéricos en JetBrains Mono
- Paneles con radio 12px y sombra 0 4px 16px rgba(0,0,0,0.4)
- Botones con radio 8px; chips de categoría tipo píldora

**Page Structure:**
1. **Barra superior (56px):** a la izquierda el logotipo "CircuitForge" con un ícono de
   circuito naranja; al centro el nombre del proyecto editable en línea ("Divisor de
   tensión"); a la derecha los botones "Guardar" (secundario), "Compartir" (secundario)
   y "Simular" (primario, relleno naranja).
2. **Panel izquierdo — Paleta (280px):** campo de búsqueda con ícono de lupa y
   placeholder "Buscar componente..." en la parte superior; debajo, una fila de chips de
   categoría desplazable horizontalmente: Todos, Pasivos, Semiconductores,
   Microcontroladores, Sensores, Actuadores, ESC, Fuentes, Baterías, Conectividad
   (el chip activo con fondo naranja). Después, una lista vertical de tarjetas de
   componente: cada tarjeta muestra un pequeño símbolo esquemático dibujado en blanco
   sobre fondo Grafito Elevado, el nombre en Inter 500 y la categoría en Gris Pizarra
   12px; al pasar el cursor la tarjeta se eleva con borde naranja sutil y muestra un
   ícono de arrastre. La paleta tiene su propio desplazamiento vertical.
3. **Área central — Lienzo:** el mayor espacio posible, con una cuadrícula de puntos
   sutiles sobre Azul Pizarra Profundo a 20px. Sobre la cuadrícula hay un circuito en
   construcción: una fuente de 5V etiquetada "PS1", una resistencia con el valor "220 Ω"
   impreso en JetBrains Mono, y un LED rojo con su símbolo de ánodo y cátodo. Los cables
   son curvas suaves de colores distintos (rojo y azul) que unen los pines, con pequeños
   puntos circulares en cada pin; el componente seleccionado está rodeado por un contorno
   naranja de 2px con cuatro tiradores de esquina. En la esquina inferior izquierda del
   lienzo hay una barra flotante de controles de zoom: acercar, alejar, ajustar a pantalla
   y una cuadrícula alternable, en un contenedor Grafito Elevado con bordes redondeados.
   En la esquina inferior derecha, un indicador de coordenadas "x: 240  y: 160" en
   JetBrains Mono Gris Niebla.
4. **Panel derecho — Inspector (320px):** dividido en tres secciones apiladas con
   encabezados en mayúsculas 11px Gris Pizarra y separadores de 1px:
   - **"COMPONENTE":** el nombre "Resistencia" en Inter 600 y el identificador "R1" en
     JetBrains Mono; debajo, la fila "Posición" con dos campos numéricos X e Y, y la fila
     "Rotación" con un control segmentado de cuatro opciones: 0°, 90°, 180°, 270°.
   - **"PARÁMETROS":** una etiqueta "Resistencia" con un deslizador cuyo recorrido se
     rellena en naranja y, a su derecha, un campo numérico que muestra "220" con la unidad
     "Ω" en Gris Pizarra; debajo, la misma estructura para "Tolerancia" con "5 %".
   - **"VALIDACIÓN":** una lista de mensajes de estado. El primero es un error con ícono
     de prohibición en Rojo Cortocircuito (#f87171) sobre fondo rojo al 8%: "Cortocircuito
     entre alimentación y tierra". El segundo es una advertencia con ícono de triángulo en
     Ámbar Advertencia (#fbbf24): "Conexión suelta: N3 tiene un solo pin". El tercero es
     un estado correcto con ícono de marca en Verde Continuidad (#34d399): "Circuito sin
     errores".
5. **Barra inferior de simulación (48px):** fondo Grafito Elevado con borde superior de
   1px; a la izquierda, un botón "Simular" con ícono de reproducción en naranja y, cuando
   corre, un botón "Detener" en rojo; al centro, una fila de lecturas en vivo en JetBrains
   Mono: "PS1  5.00 V", "R1  13.6 mA  68.2 mW", "D1  1.98 V  13.6 mA", con los valores en
   Cian Señal (#22d3ee) y las etiquetas en Gris Niebla; a la derecha, un indicador de
   estado "Simulando" con un punto cian pulsante.

Todo el texto de la interfaz está en español. Los números y unidades usan JetBrains Mono.
La sensación debe ser la de una herramienta de ingeniería densa y confiable, no la de una
página de producto.
```

---

## 2. Prompt — Estado de simulación activa en el lienzo

```
Una vista de detalle del mismo editor de circuitos CircuitForge, ahora con la simulación
en ejecución, mostrando cómo se visualiza la electricidad sobre el circuito.

**DESIGN SYSTEM (REQUIRED):**
- Idéntico al design system de CircuitForge (fondo #0f1720, paneles #1b2430, acento
  naranja #ff6b35, instrumentación en cian #22d3ee, éxito #34d399)

**Page Structure:**
1. **Contexto:** el mismo lienzo con cuadrícula, pero el circuito está energizado.
2. **LED encendido:** el LED rojo emite un resplandor suave y realista a su alrededor,
   con la intensidad del brillo proporcional a la corriente; el halo es un degradado
   radial rojo que se difumina sobre la cuadrícula.
3. **Anotaciones en vivo:** junto a cada componente aparece una etiqueta flotante pequeña
   en Grafito Elevado con borde cian al 40%, mostrando en JetBrains Mono: "5.00 V" junto a
   la fuente, "13.6 mA" junto a la resistencia, "1.98 V" junto al LED. Los valores cambian
   en tiempo real.
4. **Recorrido de corriente:** los cables que llevan corriente tienen un trazo más
   luminoso y un pequeño punto de luz cian que viaja a lo largo de la curva, indicando la
   dirección del flujo; los cables sin corriente permanecen apagados en gris.
5. **Barra inferior:** el botón cambió a "Detener" en rojo; las lecturas muestran valores
   numéricos en cian; el indicador de estado dice "Simulando" con el punto pulsante.
6. **Advertencia visible:** en el panel derecho, la sección VALIDACIÓN muestra una
   advertencia ámbar: "N3 tiene un solo pin" — el circuito funciona pero hay algo suelto.

La sensación es la de un osciloscopio amigable: preciso, luminoso sobre oscuro, con la
electricidad visible sin ser infantil.
```

---

## 3. Prompt — Pantalla de biblioteca de componentes

```
Un navegador de biblioteca de componentes para CircuitForge, en cuadrícula, para explorar
el catálogo completo de más de 60 componentes electrónicos en nueve categorías.

**DESIGN SYSTEM (REQUIRED):**
- Idéntico al design system de CircuitForge; acento naranja, superficies grafito)

**Page Structure:**
1. **Encabezado:** título "Biblioteca de componentes" en Inter 600 y, debajo, el contador
   "63 componentes · 9 categorías" en Gris Niebla.
2. **Barra de filtros:** campo de búsqueda a la izquierda ("Buscar por nombre o tipo..."),
   y a la derecha un grupo de chips de categoría con el activo en naranja.
3. **Cuadrícula de tarjetas:** cuatro columnas de tarjetas rectangulares con radio 12px.
   Cada tarjeta contiene: en la parte superior, un área de vista previa cuadrada con fondo
   Azul Pizarra Profundo más oscuro donde se dibuja el símbolo esquemático en blanco; en el
   centro, el nombre del componente en Inter 500 y su `typeId` en JetBrains Mono Gris
   Pizarra 11px; en la parte inferior, una fila de pines como píldoras de colores pequeños
   con sus tipos abreviados ("PWR", "GND", "DIG", "PWM", "I2C"; PWR en rojo, GND en gris,
   DIG en azul, PWM en morado, I2C en cian). Al pasar el cursor, la tarjeta eleva con
   borde naranja y muestra un botón "Añadir al lienzo".
4. **Pie:** paginación y un enlace de texto "¿Falta un componente? Solicítalo".

La retícula debe sentirse ordenada y comparable, como una hoja de datos navegable.
```

---

## 4. Prompt — Pantalla de compartir / proyecto público

```
Una vista pública de solo lectura de un proyecto CircuitForge compartido, pensada para
quien recibe un enlace y quiere entender el circuito sin poder editarlo.

**DESIGN SYSTEM (REQUIRED):**
- Idéntico al design system de CircuitForge; superficies grafito, acento naranja)

**Page Structure:**
1. **Encabezado:** a la izquierda, el logotipo "CircuitForge" y la insignia
   "Solo lectura" como chip ámbar; al centro el nombre del proyecto "Divisor de tensión";
   a la derecha, el nombre del autor "por Luis Martínez", la fecha "25 oct 2026" y los
   botones "Duplicar a mi espacio" (primario naranja) y "Exportar JSON" (secundario).
2. **Lienzo (70% de la altura):** el circuito completo y no editable, con la cuadrícula y
   los cables de colores; los componentes no muestran tiradores de selección; a diferencia
   del editor, se puede interactuar con la simulación desde la barra inferior.
3. **Banda de metadatos (debajo del lienzo):** tres bloques en línea separados por
   divisores verticales: "Componentes: 3", "Conexiones: 4", "Última simulación: correcta"
   (el último en Verde Continuidad).
4. **Pie:** nota pequeña en Gris Pizarra: "Este circuito es público. Duplícalo para
   editar una copia." y los enlaces "Reportar" y "Ver otros proyectos de este autor".

La sensación es la de una hoja de cálculo compartida: respetuosa del contenido, clara
sobre lo que no se puede tocar.
```

---

## 5. Prompt — Estados vacíos y de error

```
Tres estados vacíos y de error para CircuitForge, cada uno como una pantalla continua de
tema oscuro, coherentes con el editor.

**DESIGN SYSTEM (REQUIRED):**
- Idéntico al design system de CircuitForge)

Los tres estados, cada uno ocupando el área del lienzo con contenido centrado:

1. **Proyecto vacío:** en el centro, un ícono outline grande de un circuito incompleto en
   Gris Pizarra; debajo, el título "Empieza tu primer circuito" en Inter 600 Blanco Humo;
   después, la instrucción "Arrastra un componente desde la paleta o elige una plantilla"
   en Gris Niebla; y una fila de tres tarjetas de plantilla: "Fuente + Resistencia + LED",
   "Divisor de tensión" y "Semáforo con LEDs", cada una con un mini esquema y un borde que
   se ilumina naranja al pasar el cursor.

2. **Circuito sin tierra (error de simulación):** en el centro, un ícono de triángulo en
   Rojo Cortocircuito (#f87171) dentro de un círculo con fondo rojo al 8%; el título "No se
   puede simular" en Blanco Humo; la explicación "El circuito no tiene una referencia de
   tierra. Conecta el pin GND de la fuente a un nodo común." en Gris Niebla; y un botón
   primario "Ver pines GND" que resalta los pines de tierra. Debe quedar claro que la
   aplicación funciona y el circuito es el problema.

3. **Cortocircuito bloqueado:** en el centro, un ícono de prohibición en Rojo Cortocircuito;
   el título "Conexión bloqueada" y la explicación "No se puede unir alimentación (5V) con
   tierra (GND) directamente: crearía un cortocircuito. Añade una resistencia o una carga
   entre ambos."; debajo, una ilustración mínima de la conexión propuesta en verde. Un
   botón secundario "Entendido" cierra el aviso.

Estos tres estados son el sistema de seguridad del producto: deben explicar la causa
eléctrica, no solo que algo falló. Nunca mostrar un código de error crudo.
```

---

## 6. Acciones recomendadas (`DESIGN.md`)

`enhance-prompt` detectó que **no existe `DESIGN.md`**. Dos consecuencias:

1. **Acción inmediata:** crear `docs/design/DESIGN.md` con el bloque del design system de la sección 0 de este documento. Eso da consistencia visual entre las cinco pantallas sin repetir el sistema en cada prompt y sin que cada generación invente su propia paleta.
2. **Acción de flujo:** si el equipo adopta el ciclo `stitch-loop` (una pantalla por iteración), el prompt resultante de cada pantalla debe guardarse en `next-prompt.md`, usando como base el prompt correspondiente de este documento.

**Fuente autoritativa pendiente.** Las instrucciones de la skill piden contrastar contra la guía oficial de Stitch (https://stitch.withgoogle.com/docs/learn/prompting/), que puede haber cambiado sus recomendaciones. Este documento sigue los patrones de la skill (estructura numerada, design system explícito, colores con rol, keywords de componente). Antes de generar los mockups conviene abrir esa URL y confirmar que la guía vigente no pide otra estructura.
