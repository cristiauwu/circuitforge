import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NexoHeader } from '@/features/nexo/NexoHeader'

export function AppShell() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const isLanding = pathname === '/'
  const isEditor = /^\/editor\/*$/i.test(pathname)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      mainRef.current?.focus({ preventScroll: true })
      mainRef.current?.scrollTo(0, 0)
      previousPath.current = pathname
    }
  }, [pathname])

  return (
    <div
      className={`nexo-app${isEditor ? ' nexo-app-editor' : ''}`}
      data-theme={isLanding ? 'dark' : 'light'}
    >
      <a className="nx-skip" href="#main-content">
        Saltar al contenido
      </a>
      {!isEditor && <NexoHeader />}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className={`nx-main${isEditor ? ' nx-main-editor' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  )
}
