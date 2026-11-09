# Nexo — contrato visual productivo

Fecha: 2026-10-30. Nombre provisional. Sustituye la dirección CircuitForge rechazada; el historial Git conserva el documento anterior. Fuente ejecutable: `apps/web/src/styles/nexo.css` y rutas React. Los prototipos siguen siendo material histórico, no dependencias del build.

## Intención y referencias

La portada deja protagonismo al objeto electrónico sobre carbón cálido; el laboratorio emplea superficies minerales claras para leer, conectar y programar. La referencia de materialidad es Iyo; Supersolid informa el criterio de transiciones, no una copia de sus efectos. Tinkered informa la presentación electrónica: su editor privado no se inspeccionó porque exige autenticación. Evidencia y límites en `2026-10-30-referencias-visuales-y-movimiento.md`.

Estos son valores adaptados para Nexo, no mediciones literales de las referencias. No restaurar cápsula flotante, aurora, grid decorativo dominante, glass administrativo o catálogo de píldoras del diseño descartado.

## Superficies

- Portada: Persuade / Experience. Titular de tres líneas, modelo propio ilustrativo, CTA real al editor y explicación honesta de capacidades.
- Editor: Operate. Montaje y C++ simultáneos cuando caben, biblioteca lateral, propiedades/notas contextuales, historial y estado visibles. Los controles del circuito no esperan animaciones.
- Biblioteca, proyectos y compartidos: Operate / Read. Listas con bordes discretos, contenido real y estados vacíos. No inventar guardado, carga o validación de ejemplos.

## Sistema construido

| Función | Valor |
|---|---|
| Carbón | `#121513` |
| Perla | `#f0f1ed` |
| Papel | `#ffffff` |
| Tinta | `#242924` |
| Secundario claro | `#62685f` |
| Línea | `#d8ddd2` |
| Acción / selección | `#d4eb91` |
| Foco claro | `#2f766f` |

Manrope variable local, 200–800, con licencia OFL junto al archivo; sin descarga externa. Código en Consolas/monospace. Display hasta 96px, tracking no menor que -0.04em. Controles mínimos de 44px; focos visibles; texto y caret tematizados. Radio pequeño de 4–5px en controles, hasta 12px en ayuda. La ayuda es no modal.

## Movimiento y 3D

Feedback de pulsación breve (100ms, transform), sin autorrotación, damping decorativo ni bucle de atención. Render 3D bajo demanda y pausa fuera de visibilidad. Reduced motion evita desplazamientos. Navegación operativa inmediata; no trasladar la cortina del prototipo a cada ruta o atajo. La composición y el objeto son el momento expresivo, no una cadena de entradas decorativas.

React posee DOM/rutas; Three posee su canvas y recursos. Importación progresiva del motor, limpieza al desmontar, refs para callbacks actuales y protección del montaje asíncrono en StrictMode. El netlist es autoridad eléctrica; escena y cables son proyecciones.

## Contenido y honestidad

73 tipos editables: 70 componentes electrónicos y tres auxiliares, definidos por un registro puro compartido con parámetros, terminales, prefijos y huellas. Modelos originales diferenciados por familia: pasivos/protección, conmutación, semiconductores, IC, potencia, controladores, sensores, actuadores e interfaces. Las miniaturas estáticas de todos los modelos comparten iluminación y encuadre; la paleta tiene búsqueda/filtro y acción siempre alcanzable. No hay un contexto WebGL por miniatura. MCU y módulos conservan los terminales lógicos declarados, sin certificación física. Protoboard editable: 420 contactos, 60 tiras de cinco y cuatro rieles continuos pasivos, con selección precisa y alternativa nativa accesible. Los cables son explícitos y no incluyen dibujos ficticios de las tiras internas. Ocho familias through-hole admiten inserción/recolocación/extracción explícita con ocupación por patas, geometría formada y seguimiento del movimiento de la placa. La simple superposición no conecta. El gato ocupa un dock reservado, no controles del inspector ni estado. Encuadrar utiliza límites reales del proyecto y sus cables. El objetivo de desarrollo y verificación actual es exclusivamente ordenador; móvil/tablet queda fuera del alcance nuevo. La protoboard de portada sigue siendo una ilustración separada. LED de portada ilustrativo, nunca indicador de simulación. No solver, firmware ejecutable, redes inalámbricas ni IA remota. Código/notas/proyecto solo viven en sesión sin persistencia.

El gato naranja original rubber-hose años 30 está dibujado en `OrangeCat.tsx`, con contorno tinta, hocico/guantes crema, cola enroscada y expresión de sueño/despertar. El usuario autorizó crear activos propios; no se usó generador ni arte extraído de terceros. Reposo estático; transiciones de 140–220ms con curva `cubic-bezier(.23,1,.32,1)`, sin loops; movimiento reducido elimina transformaciones. La invitación automática sigue siendo única hasta reactivación. El gato abre guía local, no GPT. El arte autoral no implica aprobación visual del usuario.

## Verificación

Capturas de la aplicación principal en `nexo-final/`, regresión de navegador contra build servido y reporte final de integración complementan tipos/tests/build. Las capturas headless no certifican rendimiento de GPU, interacción táctil física ni aprobación estética del usuario. Las limitaciones y resultados se registran sin convertir conteos de tests en aprobación visual.
