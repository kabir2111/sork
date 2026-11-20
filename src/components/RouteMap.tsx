import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import type { ResolvedRoute, TransportMode } from '../types/scenario'

type Props = { route: ResolvedRoute; transportMode: TransportMode }

function FitRoute({ route }: { route: ResolvedRoute }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds([
      [route.origin.latitude, route.origin.longitude],
      [route.destination.latitude, route.destination.longitude],
    ], { padding: [36, 36], maxZoom: 6 })
  }, [map, route])
  return null
}

export function RouteMap({ route, transportMode }: Props) {
  const path: [number, number][] = route.path || [
    [route.origin.latitude, route.origin.longitude],
    [route.destination.latitude, route.destination.longitude],
  ]
  const isColdChain = transportMode === 'cold-chain-reefer'

  return (
    <div className="route-map" aria-label="Route scenario map">
      <MapContainer center={path[0]} zoom={4} scrollWheelZoom={false} aria-label="OpenStreetMap route scenario">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={path} pathOptions={{ color: isColdChain ? '#56514A' : '#191713', weight: 3, dashArray: isColdChain ? '8 8' : undefined }} />
        <CircleMarker center={path[0]} radius={7} pathOptions={{ color: '#191713', fillColor: '#FAF9F5', fillOpacity: 1, weight: 2 }}>
          <Tooltip direction="top" offset={[0, -8]}>{route.origin.label}</Tooltip>
        </CircleMarker>
        <CircleMarker center={path[1]} radius={7} pathOptions={{ color: '#191713', fillColor: isColdChain ? '#F3E4C6' : '#1E6B3C', fillOpacity: 1, weight: 2 }}>
          <Tooltip direction="top" offset={[0, -8]}>{route.destination.label}</Tooltip>
        </CircleMarker>
        <FitRoute route={route} />
      </MapContainer>
    </div>
  )
}
