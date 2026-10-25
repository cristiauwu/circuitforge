/**
 * Lienzo del circuito sobre React Three Fiber.
 *
 * **Por que Three.js y no SVG (D-3):** el stack fija el lienzo sobre Three.js
 * desde el inicio, en camara ortografica, para que el 3D de la fase 2 solo
 * requiera cambiar la camara y cargar mallas — no reescribir el motor de
 * dibujo. Un lienzo SVG habria que tirarlo entero al llegar ese momento.
 *
 * **Por que camara ortografica y no de perspectiva:** un esquematico es plano.
 * Con perspectiva, dos componentes del mismo tamano se ven distintos segun su
 * profundidad, y las lineas de la cuadricula convergen. La ortografica mantiene
 * la escala constante, que es lo que un plano tecnico necesita, y ademas hace
 * que la conversion pantalla→mundo sea lineal (ver `useGridSnap`).
 *
 * Este componente es el andamio: monta la camara, la cuadricula y el fondo, y
 * deja pasar los hijos (componentes y cables).
 */

import { OrthographicCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { ReactNode } from 'react'
import { GridPlane } from './GridPlane'

export interface CircuitCanvasProps {
  children?: ReactNode
  /** Se llama al hacer clic en una zona vacia del lienzo. */
  onPointerMissed?: (() => void) | undefined
}

/**
 * Zoom inicial de la camara.
 *
 * Con `zoom = 1` una celda de 24 unidades mide 24 px, que es legible pero algo
 * apretado para trabajar. Con 1.25 la celda ronda los 30 px, que es la densidad
 * comoda de un editor de esquematicos.
 */
const INITIAL_ZOOM = 1.25

export function CircuitCanvas({ children, onPointerMissed }: CircuitCanvasProps) {
  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-hairline bg-bg"
      data-testid="circuit-canvas"
      role="application"
      aria-label="Lienzo del circuito"
    >
      <Canvas
        // `dpr` acotado a 2: en pantallas retina sin tope el coste de relleno se
        // cuadruplica sin ganancia visible en una escena de lineas planas.
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        // Sin animacion continua: la escena solo cambia cuando el usuario
        // interactua. Evita gastar GPU (y bateria) redibujando lo mismo.
        frameloop="demand"
        // Se propaga solo si existe: R3F declara la prop como requerida en su
        // firma, y pasar `undefined` explicitamente no es valido con
        // `exactOptionalPropertyTypes`.
        {...(onPointerMissed ? { onPointerMissed } : {})}
        style={{ background: 'transparent' }}
      >
        <OrthographicCamera
          makeDefault
          position={[0, 0, 100]}
          zoom={INITIAL_ZOOM}
          near={0.1}
          far={1000}
        />

        {/*
          Luz ambiente tenue. Con materiales planos no es imprescindible, pero
          evita que un futuro material con sombreado se vea negro al anadirlo.
        */}
        <ambientLight intensity={0.9} />

        <GridPlane />
        {children}
      </Canvas>
    </div>
  )
}
