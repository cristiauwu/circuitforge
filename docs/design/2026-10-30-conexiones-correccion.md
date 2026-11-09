# Corrección de integridad de conexiones

Fecha: 2026-10-30. Alcance: editor funcional y paquetes de dominio; no cambia Nexo.

## Cambios

- Al borrar componentes, las redes que quedan con menos de dos pines se descartan y los pines supervivientes limpian su netId. Se mantiene una operación de historial y snapshots inmutables.
- PinType añade passive. Resistencia, inductor, LED y diodo usan terminales neutros; anode/cathode se mantienen como identificadores, no se confunden con rieles reales. Fuentes y referencias mantienen power/gnd.
- V-1 conserva el bloqueo power–gnd en la misma red. Una resistencia entre alimentación y tierra en redes distintas ya no se interpreta como corto.
- V-1/V-2 resuelven tipos efectivos de las cuatro fichas corregidas cuando el catálogo confirma passive. Snapshots antiguos no se mutan ni exigen reescribir historial.
- V-4 advierte solo cuando ambos terminales del mismo LED/diodo están conectados directamente, en redes distintas, a rieles invertidos de una misma fuente externa confirmada por catálogo (categoría source/battery y sus terminales). No usa nombres de pin de otro componente.

## Límites

No hay solver ni prueba general de polaridad. V-4 no recorre resistencias ni infiere tensiones: casos sin evidencia suficiente se omiten. El resultado es warning, no bloqueo. canConnect sigue usando errores para bloquear; la UI no incorpora aquí un panel nuevo que publique todas las advertencias. No se retipó el catálogo completo; otros modelos pueden necesitar revisión eléctrica propia. No se añadieron parámetros editables, componentes nuevos, gato, API, persistencia o conexión del prototipo Nexo con el store.

## Verificación

- Nuevas regresiones de borrado: 3 fallos reproducidos antes de corregir y correctos después.
- Validación: 8 casos nuevos fallaban antes del cambio, correctos después según ejecución del agente implementador.
- Suites finales por paquete: web 216 tests, netlist 11 tests, validation 34 tests; total 261 correctos.
- TypeScript web y builds netlist/validation/web correctos.
- Build web mantiene advertencia de chunk editor ~1,09 MB minificado / 304 kB gzip.
- Biome de los 8 archivos afectados: correcto. Lint global NO limpio: incluye errores/formato del prototipo Nexo ajenos a esta corrección; no se modificaron para ocultarlos.

Navegador aislado, target nuevo /editor, viewport1440×900, Bun/CDP: preparación de piezas por store; conexión R1.b–GND1.gnd mediante clics reales; selección real y Delete limpiaron redes y netId; botones Deshacer/Rehacer restauraron y limpiaron; nueva pieza preparada y reconectada mediante clics reales, N2 sin reutilizar N1. Ningún fallback de store para conectar/borrar/deshacer/rehacer. Target cerrado sin tocar Nexo existente.

Sin instalaciones, cambios de lockfile, commits ni push.
