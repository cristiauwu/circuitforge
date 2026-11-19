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
     * El aviso de Vite mide el tamano crudo por chunk, no el gzip. Se fija en 650 kB
     * para acomodar el motor WebGL Three.js aislado en su propio chunk 'three' (~602 kB crudo,
     * ~151 kB gzip). Ningún chunk de la aplicación ni vendor de React/Router supera 250 kB.
     */
    chunkSizeWarningLimit: 650,
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
          if (id.includes('node_modules/three')) return 'three'
          return undefined
        },
      },
    },
  },
})
