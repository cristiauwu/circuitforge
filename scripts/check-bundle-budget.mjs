/**
 * check-bundle-budget.mjs
 * Guardrail de presupuesto de rendimiento para CircuitForge / Nexo.
 *
 * Verifica estrictamente los tamaños de los artefactos generados en `apps/web/dist/assets`
 * tanto en tamaño crudo (minificado) como comprimido con Gzip.
 * Si algún chunk o el paquete crítico inicial supera el presupuesto, termina con exit code 1.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST_DIR = join(process.cwd(), 'apps', 'web', 'dist')
const ASSETS_DIR = join(DIST_DIR, 'assets')

/** Presupuestos en KB (crudo y gzip) */
const BUDGETS = [
  {
    name: 'Entrypoint JS (index-*.js)',
    match: /^index-.*\.js$/,
    maxRawKb: 30,
    maxGzipKb: 10,
  },
  {
    name: 'Main CSS (index-*.css)',
    match: /^index-.*\.css$/,
    maxRawKb: 60,
    maxGzipKb: 15,
  },
  {
    name: 'React Vendor (react-*.js)',
    match: /^react-.*\.js$/,
    maxRawKb: 250,
    maxGzipKb: 75,
  },
  {
    name: 'Router Vendor (router-*.js)',
    match: /^router-.*\.js$/,
    maxRawKb: 110,
    maxGzipKb: 35,
  },
  {
    name: 'Scene Module (scene-*.js)',
    match: /^scene-.*\.js$/,
    maxRawKb: 100,
    maxGzipKb: 35,
  },
  {
    name: 'Three.js 3D Engine (three-*.js)',
    match: /^three-.*\.js$/,
    maxRawKb: 650,
    maxGzipKb: 175,
  },
  {
    name: 'Editor Page (EditorPage-*.js)',
    match: /^EditorPage-.*\.js$/,
    maxRawKb: 85,
    maxGzipKb: 28,
  },
]

const UNKNOWN_CHUNK_MAX_RAW_KB = 650
const UNKNOWN_CHUNK_MAX_GZIP_KB = 175
const INITIAL_CRITICAL_BUDGET_GZIP_KB = 200

function readCriticalHtmlGzip() {
  try {
    const htmlContent = readFileSync(join(DIST_DIR, 'index.html'))
    const htmlGzip = gzipSync(htmlContent).length
    console.info(
      `  📄 index.html: ${(htmlContent.length / 1024).toFixed(2)} KB raw | ${(htmlGzip / 1024).toFixed(2)} KB gzip`,
    )
    return htmlGzip
  } catch {
    console.warn('  ⚠️ No se encontró index.html en dist root')
    return 0
  }
}

function isCriticalAsset(file) {
  return (
    /^index-.*\.js$/.test(file) ||
    /^index-.*\.css$/.test(file) ||
    /^react-.*\.js$/.test(file) ||
    /^router-.*\.js$/.test(file)
  )
}

function inspectAssetFile(file) {
  const filePath = join(ASSETS_DIR, file)
  const content = readFileSync(filePath)
  const rawBytes = statSync(filePath).size
  const gzipBytes = gzipSync(content).length
  const rawKb = rawBytes / 1024
  const gzipKb = gzipBytes / 1024

  const matched = BUDGETS.find((b) => b.match.test(file))
  const maxRawKb = matched ? matched.maxRawKb : UNKNOWN_CHUNK_MAX_RAW_KB
  const maxGzipKb = matched ? matched.maxGzipKb : UNKNOWN_CHUNK_MAX_GZIP_KB

  return {
    file,
    rawKb,
    maxRawKb,
    rawOk: rawKb <= maxRawKb,
    gzipKb,
    maxGzipKb,
    gzipOk: gzipKb <= maxGzipKb,
    gzipBytes,
  }
}

function printReportTable(inspectedAssets) {
  console.info(
    '\n  Asset                              | Raw (Actual / Límite) | Gzip (Actual / Límite) | Estado',
  )
  console.info(
    '  -----------------------------------|-----------------------|------------------------|-------',
  )

  for (const item of inspectedAssets) {
    const fileLabel = item.file.length > 34 ? `${item.file.slice(0, 31)}...` : item.file.padEnd(34)
    const rawLabel = `${item.rawKb.toFixed(1)} / ${item.maxRawKb} KB`.padEnd(21)
    const gzipLabel = `${item.gzipKb.toFixed(1)} / ${item.maxGzipKb} KB`.padEnd(22)
    const status = item.rawOk && item.gzipOk ? '✅ OK' : '❌ EXCEDIDO'
    console.info(`  ${fileLabel} | ${rawLabel} | ${gzipLabel} | ${status}`)
  }
}

function checkBundleBudget() {
  console.info('📦 Verificando Presupuesto de Rendimiento del Bundle (CI/CD Guardrails)...\n')

  let files = []
  try {
    files = readdirSync(ASSETS_DIR)
  } catch {
    console.error(`❌ Error al leer el directorio de distribución: ${ASSETS_DIR}`)
    console.error('¿Se ejecutó `pnpm build` antes de verificar el presupuesto?')
    process.exit(1)
  }

  let failures = 0
  let criticalGzipBytes = readCriticalHtmlGzip()
  const inspectedAssets = []

  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.css')) continue
    const item = inspectAssetFile(file)
    if (isCriticalAsset(file)) criticalGzipBytes += item.gzipBytes
    if (!item.rawOk || !item.gzipOk) failures++
    inspectedAssets.push(item)
  }

  printReportTable(inspectedAssets)

  const criticalGzipKb = criticalGzipBytes / 1024
  const criticalOk = criticalGzipKb <= INITIAL_CRITICAL_BUDGET_GZIP_KB
  if (!criticalOk) failures++

  console.info(
    '\n-----------------------------------------------------------------------------------',
  )
  console.info(
    `  Carga crítica inicial (HTML+CSS+Index+React+Router): ${criticalGzipKb.toFixed(2)} KB gzip`,
  )
  console.info(
    `  Presupuesto de carga inicial (DESIGN.md §9):        ${INITIAL_CRITICAL_BUDGET_GZIP_KB.toFixed(2)} KB gzip`,
  )
  console.info(
    `  Estado de ruta crítica: ${criticalOk ? '✅ DENTRO DE PRESUPUESTO' : '❌ PRESUPUESTO SUPERADO'}`,
  )
  console.info(
    '-----------------------------------------------------------------------------------\n',
  )

  if (failures > 0) {
    console.error(
      `❌ Fallo de presupuesto: ${failures} archivo(s) o métricas excedieron el límite establecido.`,
    )
    process.exit(1)
  }

  console.info(
    '✅ Presupuesto de rendimiento verificado al 100%. Todos los chunks están bajo control.',
  )
}

checkBundleBudget()
