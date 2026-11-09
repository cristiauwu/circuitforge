# Nexo — Montaje editable conectado al dominio

Estado: implementación de primera integración verificada, sin promoción al routing de producción.

## Capacidades reales

Laboratorio vacío al iniciar un proyecto nuevo. Instancias: esp32, arduino_uno, resistor, led, dc_source, gnd_ref. Fuente y tierra son auxiliares simbólicos; modelos físicos son ilustrativos con anchors explícitos del subconjunto lógico disponible. Protoboard no conectable y Cable herramienta, nunca typeId desconocido.

Añadir explícito desde ficha, seleccionar, mover/rotar/eliminar, deshacer/rehacer; terminales WebGL y lista HTML accesible para conectar. Nets y pines proceden del mismo useEditorStore corregido. Cables se derivan de la pertenencia a redes, sin almacenar recorrido físico. Rechazo mantiene origen y no modifica proyecto/historial. Desaparecer una pieza cancela orígenes pendientes inválidos.

Drag con preview local y commit único al soltar; cancelar no edita dominio. Modelo/cámara/renderer comparten recursos con ownership claro. Hero ilustrativo y raíz editable independientes, una activa a la vez. Navegación conserva proyecto y borrador. No asistente ni LED de simulación fingidos.

## Archivos

- main.ts, index.html, style.css: adaptación de controles y estado de instancia, terminales, lista e historial.
- scene.ts: host/renderer existente, raíces separadas y bridge de diagnóstico DEV por eventos para proyectar objetos en pruebas.
- models.ts: factories procedurales independientes y recursos propios.
- editorProjection.ts: coordenadas XY a XZ, anchors, rotaciones, footprint y cables deterministas.
- editor3d.ts: reconciliación/picking/gestos/cables, sin estado eléctrico paralelo.
- projectController.ts: adaptador de store y transitorios, sin montar React. Zustand importa React transitivamente.
- Configuración propia tsconfig/vitest/vite: prototipo fuera de src tiene cobertura y build explícitos.

## Verificación

- 36 tests propios correctos:12 proyección,18 controlador,6 picking.
- 261 tests previos correctos:216 web,11 netlist,34 validación.
- TypeScript propio correcto; build independiente correcto. JS ~674kB minificado/~175kB gzip; advertencia de chunk grande, no ocultada.
- Detector Impeccable sobre UI cambiada: lista vacía. No auditoría WCAG integral.
- 91 checks browser con CDP en targets nuevos aislados y cerrados finally;1440/390. Entradas reales sobre terminales HTML y mesh WebGL, drag de resistencia/LED y único undo, rechazo corto, eliminación limpia/undo/redo, proyecto y texto conservados. Cero excepciones durante recorrido.
- Mobile representa emulación de viewport con ratón CDP, no touch físico.
- Revisión independiente detectó domo LED interpretado como pin por prioridad de mesh; fix restringe promoción del pin al mismo componente más cercano y proximidad geométrica. Probe THREE independiente y browser validan domo arrastrable sin conexión involuntaria. No inferir validación de todos los ángulos de cámara.
- Capturas agrupadas review/project1440.png y project390.png son del montaje poblado antes de añadir regresión LED final; no prueban la última interacción temporal. REA detectó el target existente; prueba funcional corresponde a Bun/CDP.

## Límites y pendientes

Sin solver, firmware, IA, persistencia, gatito o catálogo completo de22. Sin protoboard eléctrica, desconexión/borrado de un cable individual ni colocación de placas con pinout mecánico certificado. La escena solo implementa el subconjunto de terminales del catálogo actual.

El antiguo verify.mjs de la demo contiene expectativas anteriores (seleccionar ficha cambiaba placa del montaje de muestra) y no se declara que pase con la nueva integración. El recorrido vigente de proyecto es verify-project.mjs. Lint global del prototipo tiene deuda de formato previa y no se declara limpio por pasar tsc o detector. Móvil táctil, zoom200% y rendimiento real requieren pruebas adicionales.

Sin dependencias nuevas, commits ni push. La aplicación anterior permanece accesible y no fue sustituida silenciosamente.
