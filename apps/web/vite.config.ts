import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    /**
     * Presupuesto de bundle inicial: 200 KB **gzip** (DESIGN.md seccion 9).
     *
     * El aviso de Vite mide el tamano crudo por chunk, no el gzip. React solo ya
     * son 219 KB crudos pero 68 KB gzip, asi que un umbral de 200 crudos saltaria
     * siempre sin decir nada util. Se fija en 250 para que avise de una regresion
     * real: el total inicial hoy es 116 KB gzip y hay margen de sobra.
     */
    chunkSizeWarningLimit: 250,
    rollupOptions: {
      output: {
        /**
         * Separar el vendor permite cachear React entre despliegues: el chunk
         * propio cambia en cada release, el de React casi nunca.
         *
         * Se usa la forma de funcion y no el objeto `{ react: [...] }` porque el
         * bundler de Vite 8 (Rolldown) solo acepta `ManualChunksFunction`.
         */
        manualChunks(id: string) {
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('node_modules/react')) return 'react'
          return undefined
        },
      },
    },
  },
})
