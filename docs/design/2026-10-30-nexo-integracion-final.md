# Nexo — integración del frontend principal

Fecha: 2026-10-30.

## Entrega construida

La aplicación principal, no solo `/prototypes/nexo`, usa Nexo: portada React, editor, biblioteca, proyectos, compartidos y recuperación 404. `main.tsx` importa el sistema Nexo y no las hojas de aurora/atmósfera anteriores. Marca provisional y fuente Manrope local con OFL. No se añadió ninguna dependencia ni se cambió el lockfile.

El motor Three, modelos, proyección, controlador y 36 pruebas del prototipo se promovieron a `src/features/nexo`. No hay imports productivos desde prototipos. React gestiona navegación/DOM; el adaptador crea y destruye su escena con protección del montaje asíncrono de StrictMode. La portada carga el motor progresivamente, no bloquea sus enlaces.

El editor conserva la autoridad del store eléctrico: seis tipos editables, selección, movimiento, rotación, eliminación, conexiones validadas e historial. Escritorio ofrece montaje/C++ simultáneos y separador accesible; si no caben se alternan. Las notas/C++/preferencias viven fuera de las rutas, separados del historial eléctrico. No sobreviven a recarga.

Biblioteca: 22 fichas, de las que seis se pueden añadir expresamente al montaje. Ejemplos y compartidos son metadatos, no proyectos remotos que se puedan cargar. La ayuda local es opcional, no modal, sin IA; una invitación como máximo hasta reactivación explícita y retirada al continuar trabajando. `?help=idea` abre la nota del proyecto.

## Referencias, skills y revisión

Se conserva la dirección Nexo aprobada: carbón/perla, objeto electrónico protagonista, laboratorio mineral claro. Se aplicaron los criterios de las skills previamente cargadas (Impeccable, movimiento, rendimiento, accesibilidad): ningún paquete nuevo de animación, nada de autorrotación ni cortina en atajos frecuentes. No se presenta una copia literal de Iyo/Supersolid ni inspección del editor privado de Tinkered.

Primera inspección agrupada en 1440×1000 y 390×844 sobre build servido. REA inspeccionó DOM/accesibilidad/assets de la aplicación principal y capturó la portada, no el prototipo. El sobre JSON y el PNG completo de la captura se procesaron; el base64 no se usó como sustituto de inspección visual. Evidencia REA portada escritorio: `ev_cfb89c8b7271c7a1bcc538ba56d9d3301b898eb00cac66540b1f1ad6ec82eae8`.

La revisión independiente detectó cuatro defectos concretos, corregidos en una tanda: rutas `/editor/` y `/EDITOR` con shell erróneo; foco perdido al cerrar paneles responsivos; IDREFs del separador sin destino; falta de recuperación frente a error de chunk. Se añadieron IDs, gestión de foco/blur/Escape, normalización de detección del editor y límites de error por ruta. También se restauró `.sr-only`, se unificó el símbolo de marca SVG y se ajustaron límites de drawers al workspace real, no a alturas fijas del encabezado.

## Pruebas ejecutadas

- TypeScript: pasa.
- Build Vite principal: pasa, 71 módulos.
- Web: 265 pruebas en 16 archivos, pasan.
- Netlist: 11 pruebas, pasan.
- Validación: 34 pruebas, pasan.
- Total de pruebas de los tres paquetes ejecutados: **310**.
- Biome acotado a frontend productivo integrado: 23 archivos, cero errores; **18 advertencias** conservadas (complejidad y advertencias CSS). No se afirma lint global limpio.
- Detector Impeccable de la tanda: `[]` (no sustituye revisión humana).
- `git diff --check`: sin errores de whitespace; Git advierte conversión LF/CRLF de la configuración local.
- Regresión inicial del navegador contra preview: 13 escenarios pasan, ninguno falla. Confirmación final ampliada: 17 escenarios pasan, ninguno falla, incluyendo fallo deliberado del chunk de editor en un target propio y recuperación al inicio. Entrada real por CDP para controles; ninguna importación de stores de desarrollo. Los resultados exactos y límites quedan registrados en `nexo-final/production-regression.json`.
- La confirmación detectó una ruta residual de foco al cerrar propiedades abiertas mediante `?help=idea`; se añadió fallback al control visible. La captura móvil mostró ayuda solapada con Encuadrar; se movió al área libre inferior. Verificación dirigida posterior registrada junto al reporte, sin nueva ronda de rediseño. El fallo intermedio de foco de la regresión era una espera insuficiente del harness ante la ruta lazy: se corrigió con espera acotada del foco real, no con cambios de producto. Captura REA final móvil 390×844: `ev_2438c788fc5f2162a55271dfc97a2826706962ab1a13ba6c19fad66668efc572`, PNG completo decodificado e inspeccionado. No se afirma verificación de zoom 200% ni de dispositivo táctil físico.

## Coste y límites

Motor 3D: 637.03kB minificado / 162.50kB gzip. React: 218.75kB / 68.27kB gzip. CSS: 17.32kB / 4.29kB gzip. Fuente: 164.70kB. **Permanece el aviso de chunk mayor de 250kB**; no se cambió el umbral para ocultarlo.

La regresión DOM comprueba canvas únicos durante navegación, no demuestra liberación completa de GPU ni FPS en hardware real. No se verificó tacto físico ni rendimiento de teléfono real. Pruebas y capturas no equivalen a aprobación estética del usuario.

**Bloqueo explícito:** falta el arte original y la animación del gato naranja años 30. La generación de imágenes respondió que no existe modelo configurado. No se reintentó sin cambiar esa condición, no se sustituyó por dibujo improvisado y no se considera entregada la mascota. El botón de ayuda entrega únicamente su lógica de soporte.

No incluye solver, compilación/ejecución de firmware, Wi-Fi/Bluetooth simulados, IA conectada ni almacenamiento remoto. Los modelos y cables son ilustrativos; la validación de conexiones no es simulación. Sin commits ni push. Se preservaron prototipos, materiales de referencia y cambios previos.
