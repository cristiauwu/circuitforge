# CircuitForge — Referencias visuales y movimiento

Fecha: 2026-10-30
Estado: investigación y propuesta para revisión; no es un diseño aprobado ni una implementación.

## 1. Encargo y contexto confirmado

CircuitForge será un entorno general y adaptable de desarrollo electrónico para personas que aprenden y personas con experiencia. Las placas prioritarias son Arduino UNO y ESP32, con firmware C++. El usuario puede comenzar colocando componentes o conversando. El asistente debe conocer el proyecto y pedir confirmación antes de modificarlo. El montaje permite protoboard y conexiones directas fuera de ella. Se requiere simulación eléctrica y ejecución de firmware; Wi-Fi/Bluetooth quedan restringidos a dispositivos virtuales. La viabilidad de esos motores sigue pendiente.

Referencias solicitadas:

- https://www.iyo.ai/ — lenguaje visual y materialidad.
- https://www.supersolid.agency/ — transiciones y coreografía.
- https://app.tinkered.ai/ — entorno y presentación de modelos electrónicos.

Esta investigación no modifica el frontend ni el contrato DESIGN.md existente. No decide el motor de simulación.

## 2. Método, cobertura y límites

Se utilizó REA MCP 6.3.0 para inspección pasiva de Supersolid mediante CDP, y Bun 1.3.14 para abrir páginas públicas en un Chrome aislado, consultar estilos calculados, animaciones activas y recursos cargados, ejecutar interacciones de menú/desplazamiento y capturar imágenes.

Se revisó además la extracción local anterior de iyo y su documentación. No se utilizó .rea-chrome-profile ni su sesión, cookies o almacenamiento. Tampoco se inició sesión en terceros ni se extrajeron modelos para incorporarlos al producto.

Los dos resultados extensos de REA —binary_session e inspect_web_page— fueron leídos completos y analizados por un subagente mediante Bun/JSON. La inspección pasiva de Supersolid cubrió 1.200 nodos DOM y 720 nodos de accesibilidad durante una ventana de 1.200 ms. Su filtrado por origen excluyó 19 scripts externos; la inspección pasiva no pidió fuentes JS. Las mediciones posteriores de estilos y el estudio acotado del script público de Supersolid son evidencia adicional, no resultados atribuibles a esa captura pasiva.

Limitaciones concretas:

- app.tinkered.ai redirige a autenticación. No se inspeccionó su editor privado.
- Se observó www.tinkered.ai y su sección pública de placas 3D, no sus herramientas autenticadas.
- Las primeras capturas de iyo y Supersolid mostraban estados de entrada incompletos; no prueban su composición final.
- Una captura posterior de iyo mostró el bloqueo de orientación en un viewport estrecho. Las medidas históricas complementan esa observación; no se presenta una evaluación visual actual completa de iyo.
- Se observaron Supersolid con menú abierto y contenido tras desplazamiento, y tarjetas públicas de modelos Tinkered. Los tamaños efectivos de viewport variaron durante el muestreo: no se comparan píxeles de capturas distintas como si fueran equivalentes.
- No se hizo una auditoría integral móvil, de accesibilidad ni un perfil de GPU. No hay garantía de FPS.
- Playwright MCP no fue utilizado ni se declara reparado. El navegador se controló mediante Bun/CDP y REA.
- La skill review-animations no pudo cargarse: está deshabilitada para invocación del modelo. Se aplicó animation-performance y las instrucciones ya cargadas de Impeccable/brainstorming; no se invocaron skills ajenas al encargo.

## 3. iyo.ai: materialidad y anatomía

### Evidencia medida

Observación pública actual:

- Fondo del body: rgb(16,16,16), equivalente a #101010.
- Familias declaradas: Magnetik, Roobert Regular, Nbarchitekproneue y fallbacks de sistema. Declaración CSS no garantiza que todos los glifos usen esa fuente.
- Titular muestreado: 33,6 px, peso 400.
- Enlaces de producto: transición de opacity 300 ms ease-out.
- Un control observado combina width/height de 600 ms con cubic-bezier(.77,0,.175,1), y background de 300 ms con cubic-bezier(.65,0,.35,1).
- Se observó un canvas y una solicitud pública de yo.glb. Su accesibilidad pública no concede permiso para reutilizar el modelo.

La extracción local anterior registra:

- Neutros #101010, #151515, #242426 y #303030; texto perla #dddee3.
- Fondo de navegación rgba(56,56,56,.6), blur 20 px y radio 42 px.
- Tarjetas rgba(33,33,33,.69), blur 19 px, radio aproximadamente 19 px y borde gris al 10 %.
- Controles cuadrados entre 51 y 64 px con radio 14,4 px en las muestras; no todo es una píldora.

Estas cifras pertenecen a elementos y estados concretos, no a una receta universal.

### Qué adaptar

- Una base neutra que deje a los componentes y señales eléctricas dominar.
- Separación fina entre capas y superficies, sin convertir todo en tarjeta elevada.
- Controles compactos con geometría consistente.
- En la portada, un objeto electrónico protagonista; en el editor, el montaje editable protagonista.

### Qué no trasladar literalmente

- Fuentes comerciales sin licencia confirmada.
- Blur en todas las filas o paneles densos.
- Animación de width/height para abrir paneles junto al canvas.
- Bloqueos que oculten por completo el contenido en ciertas orientaciones.
- Aurora y grano continuo como requisito de identidad. Compiten con WebGL y lectura técnica.

## 4. Supersolid: mecanismos de movimiento

### Evidencia medida en navegador

- Fondo del body: #1c1c1c; texto base muestreado #eaf9fb.
- Familias declaradas en textos muestreados: Montserrat y Sono. Se observaron solicitudes de variantes Joyride; una solicitud no prueba su aplicación en todos los titulares.
- Menú abierto con enlaces grandes, índices pequeños y separadores: jerarquía editorial, no navegación adecuada para un editor técnico.
- El botón Menu/Close desplaza verticalmente dos etiquetas entre 0 % y aproximadamente 102 %.
- Esa transición CSS dura 750 ms, cubic-bezier(.16,1,.3,1).
- Los círculos del botón se desplazan mediante transform en 550 ms con la misma curva.
- Hay grano animado con ciclo de 500 ms y pasos. Es un efecto decorativo, no una necesidad funcional.
- GSAP y Barba estaban expuestos como objetos y Lenis como función. También se observaron recursos de SplitText, ScrollTrigger y CustomEase.

### Evidencia estática del script público

Fuente consultada: https://supersolid.vercel.app/app.js

Las siguientes son definiciones estáticas verificadas; no son mediciones extremo a extremo de todas las navegaciones:

- Curva primaria: cubic-bezier(.87,0,.13,1).
- Curva secundaria JS: cubic-bezier(.16,1,.35,1). No confundir con la CSS observada, que usa .3 como tercer parámetro.
- Curva de preloader: cubic-bezier(.25,1,.5,1).
- Capa de transición que se desplaza verticalmente con yPercent y remates que cambian scaleY.
- Tramos de transición definidos con duración de 1 s; velo de fondo con 400 ms. No se concluye que la navegación completa dure exactamente 1 s: hay coordinación y esperas adicionales.
- Textos divididos por líneas que entran desde yPercent 120, duración 750 ms, stagger de 82,5 ms.
- Entrada de escena hero con rotación, desplazamiento y escala, definida en 1,5 s.
- Elementos del hero con opacity, desplazamiento y blur de 5 px, escalonados.
- Existe una comprobación de prefers-reduced-motion alrededor de un conjunto de efectos de desplazamiento. Esto no demuestra cobertura de movimiento reducido en todo el sitio.

### Qué adaptar

- Continuidad espacial: que la entrada de un panel y su salida tengan una dirección coherente.
- Texto que cambia de estado dentro de un área estable, sin saltos de disposición.
- Revelado de contenido en bloques para la portada, sin ocultar el contenido si falla JS.
- Transiciones de navegación expresivas solo donde no interrumpan el trabajo.

### Qué excluir del editor

- Cortinas de pantalla completa entre Montaje, Esquema y Código.
- Esperas de 750–1.500 ms en tareas frecuentes.
- Scroll interpolado del canvas o de listas técnicas.
- Cursor decorativo y grano permanente.
- Una cadena de introducciones cada vez que se abre un proyecto.

## 5. Tinkered: objeto electrónico y acciones

### Evidencia pública observada

Fuentes: https://www.tinkered.ai/ y redirección de https://app.tinkered.ai/ a su login.

- Portada clara con fondo #fbfbf9, gran titular y campo de descripción como acción central.
- Familias declaradas: Space Grotesk en títulos e Inter en interfaz; monospace en metadatos.
- En la muestra de escritorio, h1 de 68 px/peso 680. No se propone llevar esa escala al editor.
- Transiciones de controles entre 160 y 200 ms en las muestras; una curva observada es cubic-bezier(.16,1,.3,1).
- Sección pública de placas con tarjetas pastel, nombre de placa, familia y affordance explícita “Drag to rotate · Scroll to zoom”.
- Cuatro canvas visibles inicializados con data-engine “three.js r185” en esa sección. Las capturas mostraron placas de apariencia ilustrada con contornos oscuros.
- La muestra de recursos no mostró URLs .glb/.gltf. Esto no prueba ausencia de geometría externa: puede ser embebida, procedural, cargada de otra forma o fuera de la ventana observada.

No se verificaron topología, polígonos, licencia de modelos, materiales originales, anclajes eléctricos ni integración de esos modelos con simulación. Tampoco se inspeccionaron las placas prioritarias exactas del producto dentro del editor autenticado.

### Qué adaptar

- Componentes reconocibles y visualmente inspeccionables, no iconos genéricos que parezcan objetos 3D.
- Instrucciones breves y visibles para rotación/zoom, sin depender de que la persona descubra el gesto.
- Separar la vista previa de catálogo de la instancia colocada en el circuito.
- Nombre y variante exactos de placa; no usar una imagen UNO R4 para representar UNO R3 ni una S3 para una ESP32 clásica.
- Presentar descripción en lenguaje natural y edición manual como caminos complementarios.

### Modelos para CircuitForge

Propuesta propia, no evidencia de la implementación de Tinkered:

Cada componente debe relacionar model3d, símbolo, pines eléctricos, anclajes físicos, dimensiones/unidades y origen/licencia. La instancia añade parámetros, transform y conexiones. Una malla no es el modelo eléctrico.

- Preview de biblioteca: cámara orbital y zoom acotados, render bajo demanda y miniatura de respaldo.
- Montaje: mesa de trabajo, selección visible, pines localizables, snap a protoboard cuando aplique, componentes libres fuera de ella.
- Inspección: etiqueta de pin, nombre de señal, compatibilidad y límites conocidos.
- Detalle suficiente para reconocer y cablear; etiquetas/pines pueden ser capas de interfaz legibles en vez de depender de texturas diminutas.
- Cargar el modelo seleccionado o visible; no iniciar un canvas activo por cada fila del catálogo.
- La reacción visual de LED, pantalla o motor debe derivar del estado real del simulador cuando exista. Si no hay simulación compatible, mostrarlo explícitamente.

Los activos deben ser propios o tener licencia compatible. No se propone copiar modelos cerrados, branding ni código de terceros.

## 6. Adaptación propuesta a CircuitForge

### Principio

Tomar de iyo la sobriedad material, de Supersolid la continuidad del movimiento y de Tinkered la claridad del objeto electrónico. No repartir un tercio de cada estética ni reproducir una agencia dentro de un IDE.

### Portada — Persuade

- Escena protagonista con UNO y ESP32 y un montaje que explique la función real del producto.
- Entrada dual: describir una idea / abrir proyecto vacío; ninguna plantilla obligatoria.
- Una coreografía inicial breve por bloques, sin preloader ficticio ni cifras no demostradas.
- Transición expresiva hacia el entorno de trabajo, solo si no retrasa abrirlo.
- Fuente de display posible, con licencia; no fijada todavía.

### Entorno — Operate

- Lienzo central estable, montaje/esquema/código como vistas del mismo proyecto.
- Biblioteca a la izquierda, asistente y propiedades accesibles sin cubrir el montaje; distribución aún pendiente de comparación visual.
- Propuestas del asistente separadas del chat normal: resumen de altas, cambios y bajas; Confirmar/Ajustar/Cancelar.
- Previsualización de cambios sin alterar el proyecto; aplicación aprobada como operación deshacible.
- Selección relacionada entre pieza, esquema y explicación.
- Color reservado a selección, estado y señales; el color de un cable no debe ser la única identificación.
- Consola y diagnóstico desplegables; evitar llenar la pantalla de instrumentos sin uso.
- Guardado, motor disponible y estado de ejecución explícitos, sin falsos indicadores de éxito.

### Biblioteca

- Lista densa con miniaturas y datos esenciales; preview 3D al seleccionar, no decenas de escenas simultáneas.
- Filtros por categoría, compatibilidad y capacidad real.
- Distinguir visualización, validación y simulación. La presencia en catálogo no implica emulación completa.

## 7. Propuesta de movimiento adaptado

Estos valores son propuestas para CircuitForge, no medidas copiadas ni decisiones aprobadas.

| Interacción | Propuesta | Restricción |
|---|---|---|
| Hover/foco | 100–160 ms; color/opacity y desplazamiento mínimo si aporta | No mover pines ni objetivos de clic |
| Abrir inspector o asistente | 180–240 ms, transform/opacity | Mantener foco y conservar estado; no escalar texto |
| Cambio Montaje/Esquema/Código | 120–180 ms de continuidad visual | Sin cortina global ni reinicio del circuito |
| Propuesta pendiente | Resaltar diferencias y revelar resumen en 160–220 ms | No aplicar cambios antes de confirmar |
| Aplicación confirmada | Cambio atómico; foco en resultado | Movimiento opcional, cancelable, no secuencia por pieza que retrase trabajo |
| Portada | Revelado por bloques de 450–650 ms; stagger 40–70 ms | Una vez, no bloquear contenido |
| Navegación pública | Cortina o continuidad de escena de 350–500 ms, si aporta | Nunca para operaciones repetidas del editor |
| Manipulación 3D | Respuesta directa al puntero | Sin easing añadido al cableado o arrastre |

Curvas candidatas: (.16,1,.3,1) para salida rápida y asentamiento; (.65,0,.35,1) para cambios más simétricos. La elección final se hará en prototipo, sin adoptar automáticamente todas las curvas de las referencias.

Movimiento reducido: eliminar parallax, entradas espaciales y rotación automática; mantener estado y feedback legibles. No se debe impedir usar la interfaz si las animaciones están desactivadas.

## 8. Rendimiento y accesibilidad

- Priorizar transform y opacity. No transition: all ni animación de dimensiones junto al canvas sin una necesidad y medición concretas.
- El blur puede ser costoso aunque la composición parezca sencilla; limitar superficies y probar en hardware representativo.
- No adoptar una biblioteca por verla en la referencia. CSS/WAAPI para estados simples; estudiar GSAP solo para una coreografía de portada que realmente lo requiera. No trasladar Barba a una app React Router existente.
- No escribir posición de arrastre o cámara en estado React cada frame.
- Desacoplar render, simulación y frecuencia de actualización de instrumentos. La animación no define el reloj simulado.
- Pausar vistas previas fuera de pantalla y renderizar bajo demanda cuando no haya movimiento.
- Duplicados de texto para efectos roll deben quedar fuera del árbol accesible. Foco visible y operación por teclado.
- Contraste de texto, pines y cables debe verificarse en el prototipo real; las referencias no certifican AA.

## 9. Correcciones al análisis previo

No se editó la documentación existente. Se registran aquí los desfases:

1. DESIGN.md contiene valores adaptados —fuentes, acentos, tamaños, radios— aunque su introducción sugiera copia literal completa.
2. La extracción .review/iyo-full.json fragmenta algunas cadenas cubic-bezier al separar por comas. El JSON agregado por sí solo no permite reconstruir todas las curvas.
3. La curva (.77,0,.175,1) no debe describirse como una salida instantánea concentrada en el primer 20 %.
4. Un punto de control con y=1.08 no demuestra un sobrepaso efectivo del 8 %.
5. La prueba histórica del grano mide intervalos requestAnimationFrame; no demuestra un coste GPU causal exacto por frame.
6. El archivo .review/iyo-applied.png muestra CircuitForge/biblioteca, no la referencia iyo.

## 10. Siguiente decisión

Antes de reemplazar el frontend, comparar dos o tres composiciones del espacio de trabajo con los mismos datos y estados: proyecto vacío, componente seleccionado, propuesta pendiente y simulación/diagnóstico. Mantener neutral el estilo inicial para escoger distribución sin confundirla con acabado visual.

Después de elegir estructura y dirección visual, escribir el diseño aprobado y planificar implementación. No se declara aprobado ningún layout por este informe.

## Referencias locales

- docs/design/2026-10-25-analisis-visual-referencia.md
- docs/design/DESIGN.md
- .review/iyo-full.json
- .review/grain-cost.json y .review/grain-cost.mjs
- docs/referencias/2026-10-25-ingenieria-inversa.md

Las capturas y salidas extensas de esta investigación son material temporal de sesión, no activos redistribuibles ni entregables del frontend.
