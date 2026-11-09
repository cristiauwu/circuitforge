# Entorno B — Implementación y verificación

Fecha: 2026-10-30

## Implementado

Editor real `/editor` reorganizado en esquema y borrador C++ simultáneos en escritorio, separador redimensionable por teclado/puntero, biblioteca compacta/expandible, lateral Asistente/Inspector colapsable y diagnóstico desplegable. En ancho reducido se alternan paneles explícitamente.

Se conservan una sola escena y los borradores/filtros al cambiar paneles. El circuito sigue en useEditorStore con su historial; los textos y distribución viven en sesión separada. Se advierte su pérdida al recargar/salir.

Asistente sin servicio conectado y envío deshabilitado. Sin respuestas ni propuestas ficticias. Compilación, simulación y monitor serie no se presentan como disponibles. El lienzo existente se llama Esquema, no 3D físico. Los parámetros que no escribían al store se presentan como referencia de catálogo.

Se corrige Ctrl+Z/rehacer dentro de campos editables para no mutar el circuito. Se corrige la captura R3F durante arrastre rápido: capturar solo el canvas DOM no conservaba el objeto raycast cuando el puntero salía de su malla. La conversión de arrastre usa canvas y cámara efectivos de la escena.

## Resultados

- Vitest web: 207 tests correctos en 12 archivos.
- Vitest netlist: 11 tests correctos.
- Vitest validation: 19 tests correctos.
- TypeScript web: correcto.
- Build web: correcto; advertencia de chunk editor aproximadamente 1,09 MB minificado / 304 kB gzip. No se añadió una librería de editor de código.
- Biome raíz: 99 archivos comprobados, sin errores ni advertencias al cierre.
- Detector Impeccable sobre UI afectada: lista vacía. No equivale a auditoría completa de accesibilidad.
- `bun run test` raíz: bloqueado por pnpm/corepack local (MODULE_NOT_FOUND), no por una aserción de test. Las suites se ejecutaron directamente por paquete mediante Bun y Vitest instalado. Sin instalaciones ni cambios de lockfile.

## Navegador real

Script: `.tools/verify-workspace-b.mjs`, ejecutable con Bun, CDP_ENDPOINT y APP_ORIGIN opcionales. Selecciona target exacto de una sesión de prueba aislada.

27 comprobaciones correctas: vista responsive con una escena y sin overflow de página en 1440×900, 1920×1080, 1024×768, 768×1024 y 390×844; conservación de código/mensaje al alternar; separador por teclado; ampliar/restaurar código; diagnóstico; preferencia de movimiento reducido; cuatro hit targets de pines; iniciar cableado mediante clic real; cancelar al ocultar esquema; conectar pines de dos componentes mediante CDP Input real; deshacer/rehacer conexión; arrastre rápido tras resize; selección y rotación por teclado; Ctrl+Z en texto sin tocar historial eléctrico; sin excepciones no capturadas durante esa ventana.

REA MCP detectó el target real y obtuvo captura del viewport. El resultado completo JSON se leyó y decodificó con Bun; la captura REA concreta fue 762×484, no se presenta como una captura desktop. Las comprobaciones de dimensiones anteriores proceden del script Bun/CDP y sus capturas temporales, no de atribuir a REA acciones que no realizó.

## Límites de verificación

No se acredita una auditoría integral WCAG ni rendimiento en GPU real de gama media. No se completó verificación de zoom de navegador al 200 %, ni todos los escenarios manuales de rechazo/borrado después de cada combinación de paneles. Las suites existentes de dominio cubren sus reglas; eso no sustituye esos recorridos visuales adicionales. No se probó compilación, IA, solver o conectividad: no están implementados.

## Archivos principales

- apps/web/src/routes/editor/EditorPage.tsx
- apps/web/src/features/editor/workspace/
- apps/web/src/features/editor/Palette.tsx e Inspector.tsx
- apps/web/src/features/editor/canvas/keyboardShortcuts.ts y su test
- apps/web/src/features/editor/canvas/SceneComponent.tsx y useDragComponent.ts
- apps/web/package.json
- apps/web/PRODUCT.md

Sin commit ni push. Portada, motores y esquema netlist no se modificaron. El servidor local se mantiene para revisión en http://127.0.0.1:5173/editor.
