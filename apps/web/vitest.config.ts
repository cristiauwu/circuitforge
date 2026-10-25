import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Configuración de Vitest para la app.
 *
 * Entorno `node` y no `jsdom`: lo que se prueba aquí son las funciones puras del
 * editor y el store del dominio, que no tocan el DOM. El render de Three.js y de
 * React se verifica en un navegador real, que es donde tiene sentido.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
