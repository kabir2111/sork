import { Plane, Ship, Truck } from 'lucide-react'
import { transportModeLabels } from '../config/modelConfig'
import { FIXED_DESTINATION } from '../config/route'
import type { Availability, ResolvedRoute, ScenarioInput } from '../types/scenario'

type Props = { scenario: ScenarioInput; routeLoading: boolean; automaticRoute: Availability<ResolvedRoute>; onRetryAutomaticRoute: () => void }
const icons = { road: Truck, air: Plane, sea: Ship, 'ambient-truck': Truck, 'cold-chain-reefer': Truck }

export function ScenarioControls({ scenario, routeLoading, automaticRoute, onRetryAutomaticRoute }: Props) {
  const ModeIcon = icons[scenario.transportMode]
  return <section className="scenario-controls" aria-labelledby="scenario-controls-title">
    <div className="scenario-controls__heading"><div><h2 id="scenario-controls-title">The journey, calculated for you.</h2><p className="field-help">The source, map routing, live weather, and a transport estimate are combined automatically.</p></div></div>
    <div className={routeLoading ? 'automatic-route-status automatic-route-status--loading' : automaticRoute.status === 'available' ? 'automatic-route-status automatic-route-status--ready' : 'automatic-route-status'} role="status">{routeLoading ? 'Calculating source, route, transport mode, and weather…' : automaticRoute.status === 'available' ? `Calculated journey to ${FIXED_DESTINATION.label}.` : <><span>{automaticRoute.reason}</span><button type="button" onClick={onRetryAutomaticRoute}>Retry calculation</button></>}</div>
    {automaticRoute.status === 'available' ? <div className="journey-summary-grid"><article><span>Transit temperature</span><strong>{scenario.temperatureC}°C</strong><small>Current route weather average</small></article><article><span>Transit duration</span><strong>{scenario.transitHours} h</strong><small>Estimated end-to-end travel time</small></article><article><span>Transport mode</span><strong><ModeIcon size={17} /> {transportModeLabels[scenario.transportMode]}</strong><small>Most likely freight mode for this journey</small></article><article><span>Route distance</span><strong>{scenario.distanceKm ? `${scenario.distanceKm.toLocaleString()} km` : 'Calculating…'}</strong><small>Mapped from source to destination</small></article></div> : null}
    <div className="route-fields route-fields--readonly"><label><span>Origin</span><input value={scenario.origin || 'Resolving product source…'} readOnly /></label><label><span>Destination</span><input value={FIXED_DESTINATION.label} readOnly /></label></div><p className="field-help">Destination is fixed for this demo: Katpadi, Vellore.</p>
  </section>
}
