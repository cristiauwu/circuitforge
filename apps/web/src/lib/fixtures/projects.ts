/**
 * Fixtures de proyectos.
 *
 * El campo `summary` describe el circuito en lenguaje llano: la lista de
 * proyectos es una pantalla de navegación, no un listado técnico, asi que lo que
 * ayuda a reconocer un proyecto es "que hace", no su número de componentes.
 */

export interface ProjectFixture {
  id: string
  name: string
  summary: string
  componentCount: number
  netCount: number
  updatedAt: string
  /** `true` si el usuario actual puede editarlo. `false` = solo lectura. */
  owned: boolean
}

export const PROJECTS: ProjectFixture[] = [
  {
    id: 'led-blinker',
    name: 'Parpadeo de LED',
    summary: 'Arduino UNO con una resistencia de 220 ohm y un LED en el pin 13.',
    componentCount: 4,
    netCount: 3,
    updatedAt: '2026-10-24T18:20:00.000Z',
    owned: true,
  },
  {
    id: 'voltage-divider',
    name: 'Divisor de tensión',
    summary: 'Dos resistencias de 1k sobre 5 V, para medir la mitad de la tensión.',
    componentCount: 4,
    netCount: 3,
    updatedAt: '2026-10-23T11:05:00.000Z',
    owned: true,
  },
  {
    id: 'temp-sensor',
    name: 'Estacion meteorologica',
    summary: 'DHT22 leyendo temperatura y humedad, con pantalla OLED por I2C.',
    componentCount: 7,
    netCount: 6,
    updatedAt: '2026-10-21T09:42:00.000Z',
    owned: true,
  },
  {
    id: 'motor-driver',
    name: 'Control de motor',
    summary: 'Puente H con transistor NPN conmutando un motor DC a 9 V.',
    componentCount: 9,
    netCount: 8,
    updatedAt: '2026-10-19T16:30:00.000Z',
    owned: false,
  },
]

/** Proyecto por id, para la vista compartida. */
export function findProject(id: string): ProjectFixture | undefined {
  return PROJECTS.find((p) => p.id === id)
}

/**
 * Formatea una fecha ISO como tiempo relativo en espanol.
 *
 * Se calcula contra una fecha fija para que la interfaz sea determinista entre
 * renders: una lista que dice "hace 2 minutos" y cambia sola al re-renderizar
 * distrae sin aportar nada.
 */
export function formatRelative(iso: string, now = new Date('2026-10-25T12:00:00.000Z')): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.round(diffMs / 60000)

  if (diffMin < 1) return 'ahora mismo'
  if (diffMin < 60) return `hace ${diffMin} min`

  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} h`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'ayer'
  if (diffDays < 30) return `hace ${diffDays} dias`

  const diffMonths = Math.round(diffDays / 30)
  return `hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`
}
