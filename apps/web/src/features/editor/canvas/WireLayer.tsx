/**
 * Capa de cables.
 *
 * Recorre los nets del proyecto y dibuja un cable por cada uno. **No guarda
 * estado**: los cables se derivan del netlist, que es la fuente de verdad (D-1).
 * Anadir un net hace aparecer un cable; eliminarlo lo hace desaparecer; rotar un
 * componente mueve los extremos. Todo sin sincronizacion manual.
 *
 * # Un net de un solo pin no se dibuja
 *
 * Un net con un unico pin no es una conexion: es un pin marcado como
 * "pertenece a este net" sin nada al otro lado. Dibujarlo seria una linea de
 * longitud cero, y el validador ya lo reporta como aviso V-3. Aqui se omite.
 *
 * # Nets de mas de dos pines
 *
 * Un net puede tener mas de dos pines (un nodo electrico real: la alimentacion
 * de un riel, por ejemplo). No se dibuja un cable por cada par —seria una marana
 * de lineas— sino una **espina**: el primer pin se conecta con cada uno de los
 * demas. Es como se dibuja un nodo multiple en un esquematico real, y deja claro
 * quien es el origen del nodo.
 */

import type { Net } from '@circuitforge/netlist'
import { SceneWire, type WireComponent } from './SceneWire'
import { resolveTokenColor } from './tokenColor'

export interface WireLayerProps {
  components: readonly WireComponent[]
  nets: readonly Net[]
  /** Id del net resaltado, si hay alguno. */
  emphasizedNetId?: string | null
}

export function WireLayer({ components, nets, emphasizedNetId = null }: WireLayerProps) {
  return (
    <group>
      {nets.map((net, netIndex) => {
        // Un net con menos de dos pines no es un cable.
        if (net.pins.length < 2) return null

        const origin = net.pins[0]
        if (origin === undefined) return null

        const emphasis = emphasizedNetId === net.id

        /*
         * Color del net.
         *
         * **Todos los cables de un mismo net comparten color**, porque
         * electricamente son el mismo nodo: pintarlos distinto sugeriria que son
         * conexiones separadas. El color se elige por el indice del net dentro de
         * la paleta de 8, que es para lo que esa paleta existe.
         */
        const color = resolveTokenColor(`--cf-wire-${(netIndex % 8) + 1}`, 0xff6b35)

        // Espina: del primer pin a cada uno de los demas. Con dos pines es un
        // cable normal; con mas, un nodo multiple legible.
        //
        // La clave usa la IDENTIDAD del pin destino, no su indice: si un net
        // pierde un pin intermedio, con el indice todos los cables siguientes
        // cambiarian de clave y React los desmontaria y remontaria sin necesidad.
        return net.pins
          .slice(1)
          .map((target) => (
            <SceneWire
              key={`${net.id}-${target.componentId}-${target.pinId}`}
              components={components}
              from={origin}
              to={target}
              emphasis={emphasis}
              color={color}
            />
          ))
      })}
    </group>
  )
}
