# Entorno de desarrollo — notas de configuración

**Fecha:** 2026-10-25
**Aplica a:** la máquina donde se desarrolla CircuitForge.

Este documento registra dos desviaciones del entorno que afectan a cómo se ejecutan
las tareas. Sin esto, un colaborador (o el CI) pierde horas redescubriéndolas.

---

## 1. Toolchain verificado

| Herramienta | Versión | Ruta real |
|---|---|---|
| Node.js | **24.15.0** | `C:\Program Files\nodejs\node.exe` |
| pnpm | **11.23.0** | `C:\Program Files\nodejs\pnpm.CMD` (vía corepack) |
| Git | **2.54.0** | `C:\Program Files\Git\cmd\git.exe` |
| TypeScript | 5.9.3 | por paquete |
| Biome | 2.6.3 | raíz del monorepo |
| Vitest | 3.2.7 | por paquete |

Identidad git configurada: `cristiauwu <cristiauwu@users.noreply.github.com>`.

---

## 2. `npm` está dañado en esta máquina — usar `pnpm`

`npm` falla con **cualquier** comando:

```
npm error Class extends value undefined is not a constructor or null
  at Object.<anonymous> (.../npm/node_modules/minipass-sized/dist/commonjs/index.js:21:40)
  at Object.<anonymous> (.../npm/node_modules/minipass-fetch/lib/body.js:3:27)
```

**Causa raíz:** la instalación de npm en `C:\Program Files\nodejs\node_modules\npm`
tiene `minipass-sized` corrupto — no exporta una clase válida, y `minipass-fetch`
falla al extenderla. No es un problema de red ni de permisos.

**Impacto:** ninguno para el proyecto. El stack especifica **pnpm + Turborepo**
(ver `docs/specs/2026-10-25-circuitforge-stack.md` §2.5), y `pnpm` funciona
correctamente: resuelve el registro, instala y verifica el lockfile.

**Si se necesita npm** (no debería): reinstalar Node.js desde el instalador oficial.

---

## 3. Los shims `node_modules/.bin` no son ejecutables aquí

Este es el punto que cuesta más si no se conoce.

**Síntoma:** `pnpm test`, `pnpm -F <pkg> test` o cualquier script que invoque un
shim de `.bin` (`vitest.cmd`, `tsc.cmd`) falla con:

```
"node" no se reconoce como un comando interno o externo
```

o con `ERR_PNPM_IGNORED_BUILDS` (pnpm ejecuta `runDepsStatusCheck`, que lanza un
`install` interno que también falla).

**Causa raíz:** en los procesos hijos lanzados por el agente, ni `node` ni `cmd`
resuelven como comandos, **aunque `C:\Program Files\nodejs` esté en el PATH**.
Está verificado que `node.exe` es válido (87.4 MB, firma MZ, `exit=0` al lanzarlo
con ruta absoluta), así que no es un binario dañado: es la resolución de comandos
en el proceso hijo.

**Solución:** invocar el **entry real** con `node.exe` absoluto. No usar los shims.

```powershell
# En lugar de:  pnpm -F @circuitforge/netlist test
# Usar:
& 'C:\Program Files\nodejs\node.exe' `
  '.\packages\netlist\node_modules\vitest\vitest.mjs' run
```

Existe un wrapper que encapsula esto: **`.tools/cf.cmd`**

```
.tools\cf.cmd test packages/netlist    # ejecuta vitest
.tools\cf.cmd typecheck                # ejecuta tsc --noEmit
.tools\cf.cmd lint                     # ejecuta biome check
```

**Esto no afecta al CI.** En GitHub Actions (Ubuntu) los shims funcionan con
normalidad, así que el workflow usa `pnpm test` / `pnpm typecheck` / `pnpm lint`
sin ceremonia. El wrapper es una adaptación local, no una decisión de arquitectura.

---

## 4. Scripts de instalación aprobados

pnpm 11 bloquea los `postinstall` por defecto (defensa de cadena de suministro).

En este proyecto se desactivan globalmente vía `.npmrc` (`ignore-scripts=true`)
porque los dos paquetes afectados —`esbuild` y `@biomejs/biome`— ya traen su
**binario de plataforma** como `optionalDependency`, verificado:

- `node_modules/.pnpm/@esbuild+win32-x64@0.28.2/.../esbuild.exe` ✓
- `node_modules/.pnpm/@biomejs+cli-win32-x64@2.6.3/.../biome.exe` ✓

Sus `postinstall` solo verifican o descargan ese binario, así que son redundantes.
Desactivarlos no degrada ninguna funcionalidad.

> **Nota para CI:** en Ubuntu, `ignore-scripts=true` también es seguro, pero puede
> omitirse. Si se retira, pnpm pedirá aprobación de builds; usar
> `onlyBuiltDependencies` en `pnpm-workspace.yaml` con la lista explícita.

---

## 5. Restricciones del harness (no del proyecto)

El agente ejecuta comandos a través de un harness con dos limitaciones conocidas:

1. **El operador `&` de PowerShell con pipelines devuelve vacío** o falla con
   *"Cannot run a document in the middle of a pipeline"*. La técnica fiable es
   `Start-Process` con `-RedirectStandardOutput` a un archivo y leerlo después.
   El helper `.tools/run.ps1` encapsula esto.

2. **`Get-Command <exe>` puede no resolver** aunque el binario exista y sea
   ejecutable con ruta absoluta. No usar `Get-Command` como prueba de existencia:
   usar `Test-Path` sobre la ruta absoluta.

Ninguna de las dos afecta al código del proyecto. Son propiedades del entorno de
ejecución del agente y se documentan para no confundirlas con bugs.

---

## 6. Arranque desde cero

```powershell
# 1. Instalar dependencias (pnpm, no npm)
& 'C:\Program Files\nodejs\pnpm.CMD' install

# 2. Verificar (equivalente a la puerta de salida de F0)
& 'C:\Program Files\nodejs\node.exe' '.\node_modules\@biomejs\biome\bin\biome' check .
& 'C:\Program Files\nodejs\node.exe' '.\packages\netlist\node_modules\typescript\bin\tsc' --noEmit -p packages/netlist/tsconfig.json
& 'C:\Program Files\nodejs\node.exe' '.\packages\netlist\node_modules\vitest\vitest.mjs' run
```

Estado esperado: `biome` sin hallazgos, `tsc` sin errores, tests en verde.
