# CircuitForge (Nexo) — Disciplina de Ingeniería y Diseño de Alto Nivel
**Manifiesto de Arquitectura, Métodos Profesionales y Matriz de Verificación Ground-Truth**

---

## 1. Visión y Filosofía de la Disciplina

Este documento define el estándar técnico no negociable para la arquitectura del sistema, el diseño de interacción y la fidelidad física de **CircuitForge**. 

En lugar de aproximaciones estéticas superficiales basadas en tokens aislados («cambiar colores en CSS» o «capturas de pantalla copiadas»), este sistema se rige por el enfoque de un **Staff Design Engineer** y un **Graphics/Systems Architect**: la unión matemática y perceptual entre un **pipeline de renderizado WebGL/Three.js a 60–120 FPS**, un **motor de análisis nodal modificado (MNA DC)** y un **árbol de composición DOM reactivo**.

---

## 2. Lo que hace el Profesional Top vs. Prácticas Tradicionales

| Dimensión | Enfoque Superficial / Tradicional | Enfoque Profesional Top (Esta Disciplina) |
| :--- | :--- | :--- |
| **Arquitectura de Estado y Render** | React re-renderiza el árbol de componentes cada vez que cambia una tensión o se mueve el ratón en el canvas. | **Doble Búfer de Estado Desacoplado**: Three.js y el bucle de simulación corren en `requestAnimationFrame` con `TypedArrays`/`Float64Array`. React solo gobierna la cáscara accesible y no se entera de oscilaciones numéricas de alta frecuencia. |
| **Materiales e Iluminación** | Sombras y colores arbitrarios en CSS; el 3D y la UI flotante parecen dos mundos visuales desconectados. | **Modelo Óptico Unificado (PBR + Sombras Trigonométricas)**: La luz direccional del espacio 3D (temperatura de color de estudio 5200K, vector $(x, y, z)$) define matemáticamente el ángulo, dispersión y tono de las sombras DOM (`box-shadow` calculado por proyección física). |
| **Interacción y Gestos** | Múltiples `booleanos` dispersos (`isConnecting`, `isDragging`, `tempWire`). Genera cables huérfanos o bugs de estado. | **Máquina de Estados Finitos (FSM) Determinista**: Grafo estricto de transiciones algebraicas donde un estado inválido es sintáctica y lógicamente imposible. |
| **Diseño de Instrumentación** | Textos planos con fuentes proporcionales que provocan saltos de anchura (*layout shift*) al cambiar números. | **Tipografía de Grado de Laboratorio**: Soporte OpenType nativo para `tnum` (tabular-nums), `zero` (slashed zero para distinguir cero de la letra O en ingeniería), auto-rango dinámico (V, mV, µV, A, mA) y barra analógica rápida (*bargraph*). |
| **Criterio de Aceptación** | «Se ve bien en mi monitor» o «Pasan los tests unitarios básicos». | **Cuádruple Ground-Truth Independiente**: (1) Frame budget medido (<16.6 ms), (2) Cero Layout Shift (0.00 CLS), (3) Accesibilidad WCAG 2.2 AAA por analizador estático, (4) Coincidencia de tensiones contra `ngspice` con $\Delta V < 10^{-6}\text{ V}$. |

---

## 3. Materiales Crudos e Insumos Fundamentales

1. **Datasheets de Instrumentación de Banco Real:**
   - Referencia visual y funcional de multímetros de 6½ dígitos y osciloscopios de **Keysight Technologies (34461A)** y **Rohde & Schwarz**.
   - Jerarquía de lectura de alta legibilidad en banco de trabajo (lectura primaria, rango automático, indicador de polaridad y límite de sobretensión).
2. **Especificación Óptica W3C y Apple CIFilter (Vibrancy):**
   - Convolución de desenfoque gaussiano de doble pasada con curva de saturación de 180% y tono base `#f5f6f9` (perla de estudio).
   - Eliminación de halos negros o banding en materiales de cristal translúcido (*frosted glass*).
3. **Estándar Matemático MNA & SPICE3f5 (Berkeley):**
   - Ecuaciones de estampación de resistencias, fuentes de tensión y modelos lineales según el algoritmo clásico de Ho, Ruehli y Brennan (1975).
   - Modelado honesto de convergencia y singularidades matriciales sin falsear estados en la interfaz.

---

## 4. Métodos y Herramientas Específicas de Medición

- **Chrome DevTools Performance & Rendering Profiler:**
  - Auditoría de tasa de refresco a 60 FPS / 120 FPS (ProMotion).
  - Umbral estricto: cero *Long Tasks* (>50 ms) en el hilo principal durante la simulación activa.
- **Spector.js / WebGL Inspector:**
  - Verificación de llamadas de dibujado (*Draw Calls*), *instanced meshes* y eliminación de *overdraw* en el protoboard.
- **axe-core & Lighthouse CI:**
  - Cumplimiento de WCAG 2.2 AAA en ratios de contraste para instrumentación en fondos claros (mínimo 7:1 en valores críticos).
- **Verificador Numérico ngspice:**
  - Script independiente que exporta netlists `.cir` y compara matrices numéricas.

---

## 5. Matriz de Ejecución y Estado de Tareas

Las tareas se ejecutan siguiendo la disciplina estricta. Al concluir cada tarea, se actualiza este registro con las métricas obtenidas.

| ID | Tarea de Ingeniería | Estado | Evidencia y Validación |
| :--- | :--- | :--- | :--- |
| **T-1** | **Desacoplamiento del Render Loop de Simulación y Telemetría de React**<br>- Conectar la telemetría mediante suscripciones de lectura directa al búfer o refs en lugar de re-renderizar la jerarquía completa de React en cada pulso.<br>- Evitar re-renders masivos en `EditorPage`. | `[PENDIENTE]` | 0 re-renders de React en componentes padre durante oscilaciones de simulación MNA. |
| **T-2** | **Unificación Óptica y Material de Laboratorio (Three.js PBR + Sombras DOM Trigonométricas)**<br>- Calibrar el vector de luz Three.js (estudio neutro 5200K).<br>- Calcular matemáticamente las sombras de las tarjetas flotantes (`.nx-telemetry-tray`, `.nx-mount-hud-dock`) para que coincidan con la proyección del circuito en la mesa.<br>- Materiales de cristal con backdrop-filter calibrado y bordes físicos. | `[PENDIENTE]` | Coherencia angular entre sombras Three.js y sombras CSS; eliminación de estilos planos o contrastes artificiales. |
| **T-3** | **FSM Determinista para Trazado de Cables y Gestos del Editor**<br>- Formalizar los estados: `IDLE`, `HOVERING_PIN`, `DRAGGING_WIRE`, `SNAPPED_MAGNETIC`, `MOUNTING_PART`.<br>- Eliminar condiciones de carrera o cables huérfanos ante Escape, pérdida de foco de ventana o puntero fuera de límites. | `[PENDIENTE]` | Suite de pruebas de transición de estados que cubra el 100% de aristas del grafo de interacción. |
| **T-4** | **Instrumentación de Precisión y Telemetría Dinámica de Alta Fidelidad**<br>- Formato numérico con auto-rango dinámico (mV, V, kV, µA, mA, A, µW, mW, W) con `tabular-nums` estricto.<br>- Indicadores analógicos tipo barra (*bargraph*) con histéresis visual suave.<br>- Desglose de diagnóstico ERC con enlaces directos al componente y pin infractor. | `[PENDIENTE]` | Medición de 0.00 CLS (Cumulative Layout Shift) en la bandeja de telemetría durante variaciones de escala de 10x. |
| **T-5** | **Suite de Validación Ground Truth contra SPICE / ngspice**<br>- Crear script de exportación de netlist canónico `.cir` desde el estado del circuito.<br>- Batería de circuitos de referencia (divisores, fuentes en paralelo, mallas con resistencias serie/paralelo) contrastados contra valores teóricos y SPICE con tolerancia $< 10^{-6}\text{ V}$. | `[PENDIENTE]` | Script automatizado con reporte numérico de error cuadrático medio (RMSE) $< 10^{-6}$. |
| **T-6** | **CI/CD Guardrails y Presupuesto de Rendimiento (Zero Ghost Deployments)**<br>- Configurar scripts de verificación estricta pre-commit y pre-deploy (`tsc -b`, `vite build`, `vitest`).<br>- Bloqueo estricto ante advertencias de tipos o degradación de bundle size. | `[PENDIENTE]` | Build verde automatizado sin discrepancias locales vs Vercel. |

---

*Última actualización: 2026-11-19 — Documento vivo de control de calidad.*
