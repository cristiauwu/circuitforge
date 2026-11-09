# Nexo — Corrección de cinco bloqueos UX

Estado: correcciones del prototipo verificadas; no integración con el editor eléctrico.

## Cambios

1. Host de escena recibe pointer-events:auto dentro del hero, que tiene eventos desactivados para dejar pasar interacción. Orbitación portada accesible al puntero real.
2. Panel móvil sigue siendo no modal. Al salir el foco a contenido externo se cierra sin robar ese destino; close/Escape conservan retorno visible. Se cubre relatedTarget nulo.
3. Portada y laboratorio tienen un main enfocable por modo. Skip global cambia destino y enfoca contenido visible.
4. Localizar pieza desde Código activa Montaje, sincroniza controles y espera medición visible antes de encuadrar; el borrador permanece.
5. Controles de la experiencia normal tienen al menos44×44 en los tamaños comprobados. Selector stress es herramienta de desarrollo aparte.

## Pruebas

- 64 comprobaciones Bun/CDP correctas en1440×1000 y390×844, sin excepciones durante recorrido.
- Eventos Input.dispatchMouseEvent reales y comparación raster: portada cambia98.195 píxeles desktop y22.772 móvil; laboratorio123.188. Evidencia de respuesta de escena, no de precisión eléctrica ni FPS.
- Skip mediante Enter; Tab/ShiftTab de salida del panel; close/Escape; ARIA; foco externo conservado; localizar desde código y borrador.
- TypeScript estricto del prototipo correcto.
- Suite web216 tests en12archivos correcta (no sustituye pruebas propias del prototipo).
- Detector Impeccable: primer intento con Bun falló por interpretar launcher shell; ejecución posterior mediante bash correcta con lista vacía. No certifica accesibilidad integral.

Archivos: apps/web/prototypes/nexo/main.ts,index.html,style.css,verify.mjs. No scene.ts ni producción modificados en esta fase.

## Límites

No se ha medido GPU/FPS en dispositivo móvil físico, ni auditoría WCAG completa. No se implementaron colocación/conexiones reales en Nexo, catálogo adicional, gato, IA o simulación. Los64checks no constituyen equivalencia de calidad con las referencias. Sin dependencias nuevas, commit ni push.
