import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import './styles/theme.css'
import './styles/animations.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Falta el elemento #root en index.html')
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
