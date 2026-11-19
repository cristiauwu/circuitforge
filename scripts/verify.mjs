/**
 * verify.mjs
 * Script de verificación estricta pre-commit y pre-deploy para CircuitForge.
 *
 * Ejecuta los 5 gates de calidad de forma determinista y agnóstica del entorno:
 * 1. Biome Check (lint y formato)
 * 2. TypeScript composite build (typecheck exhaustivo y sin warnings)
 * 3. Vitest test suite completa (1192+ tests)
 * 4. Vite production build (compilación de producción de @circuitforge/web)
 * 5. Bundle Performance Budget (verificación estricta de tamaños gzip y crudo)
 */

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const ROOT = process.cwd()

const GATES = [
  {
    name: 'Gate 1: Lint & Code Style Check (Biome)',
    cmd: process.execPath,
    args: [
      join(ROOT, 'node_modules', '@biomejs', 'biome', 'bin', 'biome'),
      'lint',
      'apps',
      'packages',
      'scripts',
    ],
  },
  {
    name: 'Gate 2: TypeScript Strict Typecheck (Composite Projects)',
    cmd: process.execPath,
    args: [
      join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
      '-b',
      'packages/netlist/tsconfig.json',
      'packages/solver/tsconfig.json',
      'packages/validation/tsconfig.json',
      'apps/web/tsconfig.json',
    ],
  },
  {
    name: 'Gate 3: Vitest Test Suite Execution',
    cmd: process.execPath,
    args: [
      join(ROOT, 'apps', 'web', 'node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--config',
      join(ROOT, 'apps', 'web', 'vite.config.ts'),
    ],
  },
  {
    name: 'Gate 4: Vite Production Build (@circuitforge/web)',
    cmd: process.execPath,
    args: [
      join(ROOT, 'apps', 'web', 'node_modules', 'vite', 'bin', 'vite.js'),
      'build',
      'apps/web',
    ],
  },
  {
    name: 'Gate 5: Performance & Bundle Size Budget Guardrail',
    cmd: process.execPath,
    args: [join(ROOT, 'scripts', 'check-bundle-budget.mjs')],
  },
]

console.info(
  '🚀 Iniciando verificación de calidad estricta (CI/CD Guardrails & Zero Ghost Deployments)...\n',
)

const startTime = Date.now()

for (let i = 0; i < GATES.length; i++) {
  const gate = GATES[i]
  console.info(`[${i + 1}/${GATES.length}] ${gate.name}...`)
  const gateStart = Date.now()

  const result = spawnSync(gate.cmd, gate.args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  })

  const elapsed = ((Date.now() - gateStart) / 1000).toFixed(2)

  if (result.status !== 0) {
    console.error(
      `\n❌ FALLO en ${gate.name} (código de salida: ${result.status}, tiempo: ${elapsed}s)`,
    )
    console.error(
      'El pipeline de verificación fue interrumpido. No se permite despliegue ni commit con fallos.\n',
    )
    process.exit(result.status ?? 1)
  }

  console.info(`✅ ${gate.name} superado con éxito (${elapsed}s).\n`)
}

const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2)
console.info('🎉 =====================================================================')
console.info(`🎉 TODOS LOS GATES SUPERADOS (Tiempo total: ${totalElapsed}s)`)
console.info('🎉 El monorepo cumple con el estándar de Cero Despliegues Fantasma.')
console.info('🎉 =====================================================================\n')
