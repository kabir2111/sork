import { ArrowLeft, Camera, Instagram, Leaf, Menu, ScanLine, ScanLine as ScanIcon, ShoppingBasket, Sparkles, X } from 'lucide-react'
import { FormEvent, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { fetchProduct, ProductNotFoundError } from './api/openFoodFacts'
import { findMissingFields } from './api/normalizeProduct'
import { estimateMissingMicronutrients } from './api/geminiEstimate'
import { findManufacturingSource } from './api/manufacturingSource'
import { estimateTransportMode } from './api/transportMode'
import { completeProductProfile } from './api/productProfile'
import { BarcodeCameraScanner } from './components/BarcodeCameraScanner'
import { IngredientSafetyChecker } from './components/IngredientSafetyChecker'
import { DataState } from './components/DataState'
import { ProductFactsTabs } from './components/ProductFactsTabs'
import { ScenarioControls } from './components/ScenarioControls'
import { presets } from './config/presets'
import { validateBarcode } from './lib/barcode'
import { resolveAutomaticRoute, resolveRoute, type AutomaticOrigin } from './model/route'
import { FIXED_DESTINATION } from './config/route'
import { getDemoProduct } from './config/demoProducts'
import type { LookupState, ProductFacts } from './types/product'
import type { Availability, ResolvedRoute, ScenarioInput } from './types/scenario'

const ScenarioVisuals = lazy(() => import('./components/ScenarioVisuals').then((module) => ({ default: module.ScenarioVisuals })))

const journey = [
  { index: '01', title: 'Read the barcode', copy: 'Scan the pack with your camera, or type the number printed under the bars.' },
  { index: '02', title: 'Show the record', copy: 'See what Open Food Facts holds for that pack, with its gaps left visible.' },
  { index: '03', title: 'Model the journey', copy: 'Set transport conditions yourself and read the outcome, labeled as a model.' },
]

const everydayBenefits = [
  { icon: ShoppingBasket, title: 'Shop with context', copy: 'From a kirana shelf to a supermarket aisle, know what the label is telling you before you choose.' },
  { icon: Sparkles, title: 'Decode the fine print', copy: 'Turn additive codes, processing scores, and missing nutrition values into plain language.' },
  { icon: Leaf, title: 'Follow the journey', copy: 'Connect what is inside the pack with how it may have travelled to your shelf.' },
]

const defaultScenario: ScenarioInput = { temperatureC: 28, transitHours: 24, transportMode: 'road' }
const initialRoute: Availability<ResolvedRoute> = { status: 'unavailable', reason: 'Automatic route resolution starts after a product lookup.' }

function BrandMark() { return <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span> }
function Footer() { return <footer className="site-footer"><div className="brand brand--static"><BrandMark /><span>sork.</span></div><p>Food, made more legible.</p><span>© {new Date().getFullYear()}</span></footer> }

function Landing({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }
  return <main>
    <header className="site-header"><button className="brand" onClick={() => scrollTo('top')} aria-label="Back to top"><BrandMark /><span>sork.</span></button><nav className={menuOpen ? 'nav nav--open' : 'nav'} aria-label="Main navigation"><button onClick={() => scrollTo('how-it-works')}>How it works</button><button onClick={() => scrollTo('principles')}>Why it matters</button><button className="nav-cta" onClick={onOpenDashboard}>Look up a pack</button></nav><button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button></header>
    <section className="hero" id="top" aria-labelledby="hero-title"><div className="hero-copy"><h1 id="hero-title">There is more to a meal than its label.</h1><p className="hero-intro">Type the barcode on any pack. sork. shows what the label states, what the public record is missing, and how the journey to your shelf may have changed the food. <strong>Every estimate is labeled as an estimate.</strong></p><button className="primary-button" onClick={onOpenDashboard}>Look up a pack</button></div><div className="label-frame" aria-label="A food label, enlarged and annotated"><div className="label-frame__head"><span>sork.</span><span>Label, enlarged</span></div><div className="label-frame__barcode" aria-hidden="true">8906009532363</div><p className="label-frame__caption">A demo pack: Maggi Noodles, 8906009532363</p><dl className="label-rows"><div><dt>Contents</dt><dd>From the source record</dd></div><div><dt>Journey</dt><dd>Modeled scenario<small>You set the assumptions</small></dd></div><div><dt>Ingredients</dt><dd>Checked against public rules</dd></div></dl><p className="label-frame__foot">A barcode is not the full story. It is a place to begin.</p></div></section>
    <section className="journey-section" id="how-it-works" aria-labelledby="journey-title"><div className="section-heading"><h2 id="journey-title">How it works.</h2><p>Three steps, in order. The facts come first, the models come after, and the two never mix.</p></div><div className="journey-list">{journey.map((item) => <article className="journey-row" key={item.index}><span className="journey-index">{item.index}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div></section>
    <section className="everyday-section" id="for-everyday" aria-labelledby="everyday-title"><div className="everyday-heading"><div><h2 id="everyday-title">Clearer labels change what ends up in the basket.</h2></div><p>India’s packaged food is wonderfully varied. sork. makes the print easier to read, without asking anyone to become a nutrition expert.</p></div><div className="everyday-grid">{everydayBenefits.map(({ icon: Icon, title, copy }) => <article key={title}><Icon size={19} strokeWidth={1.5} /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="principles-section" id="principles" aria-labelledby="principles-title"><div className="principles-quote"><h2 id="principles-title">Clear does not mean certain.</h2></div><div className="principles-panel"><div><h3>Facts stay factual.</h3><p>Source data is shown as source data. Gaps are made visible instead of silently filled.</p></div><div><h3>Scenarios stay honest.</h3><p>Every estimate is framed as a model, shaped by assumptions you can read and change.</p></div></div></section>
    <section className="inspiration-section" aria-labelledby="inspiration-title"><div className="inspiration-copy"><h2 id="inspiration-title">A healthier India starts with better questions.</h2><p>sork. is inspired by <a href="https://www.instagram.com/foodpharmer/" target="_blank" rel="noreferrer">@foodpharmer</a>, who debunks brands and products so people can make healthier choices with more confidence.</p><a className="inspiration-link" href="https://www.instagram.com/foodpharmer/" target="_blank" rel="noreferrer">Visit @foodpharmer on Instagram <Instagram size={16} strokeWidth={1.5} /></a></div></section>
    <section className="next-section" id="next" aria-labelledby="next-title"><div><h2 id="next-title">Start with a pack in your kitchen.</h2></div><div className="next-action"><p>The explorer runs live lookups against Open Food Facts, then models the journey from its source to Katpadi, Vellore.</p><button className="outline-button" onClick={onOpenDashboard}>Open the explorer</button></div></section><Footer />
  </main>
}

function Dashboard({ onBack }: { onBack: () => void }) {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })
  const [scenario, setScenario] = useState<ScenarioInput>(defaultScenario)
  const [route, setRoute] = useState<Availability<ResolvedRoute>>(initialRoute)
  const [routeLoading, setRouteLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [micronutrientStatus, setMicronutrientStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const controllerRef = useRef<AbortController | null>(null)
  const routeControllerRef = useRef<AbortController | null>(null)
  const automaticRouteControllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => { controllerRef.current?.abort(); routeControllerRef.current?.abort(); automaticRouteControllerRef.current?.abort() }, [])
  const getAutomaticOrigin = async (product: ProductFacts, signal: AbortSignal): Promise<AutomaticOrigin | undefined> => {
    if (product.manufacturingPlaces?.[0]) return { query: product.manufacturingPlaces[0], kind: 'manufacturing-place' }
    const researched = await findManufacturingSource(product, signal)
    if (researched) return { query: researched.location, kind: 'researched-source', sourceEvidence: researched.evidence }
    if (product.countries?.[0]) return { query: product.countries[0], kind: 'country-proxy' }
    return undefined
  }
  const applyAutomaticRoute = useCallback(async (product: ProductFacts) => {
    automaticRouteControllerRef.current?.abort()
    const controller = new AbortController()
    automaticRouteControllerRef.current = controller
    setRouteLoading(true)
    setRoute({ status: 'unavailable', reason: 'Resolving the manufacturing source and live route conditions to Katpadi, Vellore…' })
    const demoRoute = product.demoRoute
    if (demoRoute) {
      setRoute({ status: 'available', value: demoRoute })
      setScenario((current) => ({ ...current, origin: demoRoute.origin.label, destination: FIXED_DESTINATION.label, distanceKm: demoRoute.distanceKm, transitHours: Math.ceil(demoRoute.durationHours || current.transitHours), temperatureC: Math.round(demoRoute.weather?.averageTemperatureC || current.temperatureC), transportMode: 'road' }))
      setRouteLoading(false)
      return
    }
    try {
      const resolvedRoute = await resolveAutomaticRoute(await getAutomaticOrigin(product, controller.signal), controller.signal)
      if (controller.signal.aborted) return
      if (resolvedRoute.status === 'available') {
        const mode = await estimateTransportMode(product, resolvedRoute.value.origin.label, FIXED_DESTINATION.label, controller.signal)
        const modeRoute = await resolveAutomaticRoute({ query: resolvedRoute.value.origin.label, kind: resolvedRoute.value.originKind || 'country-proxy' }, controller.signal, mode)
        if (modeRoute.status === 'available') setRoute(modeRoute)
        setScenario((current) => ({ ...current, transportMode: mode }))
        if (modeRoute.status === 'available') setScenario((current) => ({ ...current, origin: modeRoute.value.origin.label, destination: FIXED_DESTINATION.label, distanceKm: modeRoute.value.distanceKm === undefined ? current.distanceKm : Number(modeRoute.value.distanceKm.toFixed(1)), transitHours: modeRoute.value.durationHours === undefined ? current.transitHours : Math.max(1, Math.ceil(modeRoute.value.durationHours)), temperatureC: modeRoute.value.weather ? Math.round(modeRoute.value.weather.averageTemperatureC) : current.temperatureC }))
        if (!controller.signal.aborted) setRouteLoading(false)
        return
      }
      setRoute(resolvedRoute)
    } catch {
      if (!controller.signal.aborted) setRoute(initialRoute)
    } finally {
      if (!controller.signal.aborted) setRouteLoading(false)
    }
  }, [])
  const lookupBarcode = useCallback(async (value: string) => {
    const validation = validateBarcode(value)
    setBarcodeInput(validation.barcode)
    if (!validation.valid) { setValidationMessage(validation.message); return }
    setValidationMessage(''); controllerRef.current?.abort()
    const controller = new AbortController(); controllerRef.current = controller
    setLookup({ status: 'loading', barcode: validation.barcode })
    try {
      let product: ProductFacts | undefined
      try { product = await fetchProduct(validation.barcode, controller.signal) } catch (error) {
        if (!(error instanceof ProductNotFoundError)) throw error
      }
      const completedProduct = getDemoProduct(validation.barcode) || await completeProductProfile(product, validation.barcode, controller.signal)
      setLookup({ status: 'success', product: completedProduct, missingFields: findMissingFields(product || completedProduct) })
      if (completedProduct.demoRoute) setMicronutrientStatus(Object.keys(completedProduct.estimatedNutrients || {}).length ? 'ready' : 'unavailable')
      else {
        setMicronutrientStatus('loading')
        void estimateMissingMicronutrients(completedProduct, controller.signal).then((estimatedNutrients) => {
          if (controller.signal.aborted) return
          setLookup({ status: 'success', product: { ...completedProduct, estimatedNutrients: { ...completedProduct.estimatedNutrients, ...estimatedNutrients } }, missingFields: findMissingFields(product || completedProduct) })
          setMicronutrientStatus(Object.keys(estimatedNutrients).length ? 'ready' : 'unavailable')
        }).catch(() => { if (!controller.signal.aborted) setMicronutrientStatus('unavailable') })
      }
      setScenario((current) => current.massKg ? current : { ...current, massKg: completedProduct.quantityGrams ? completedProduct.quantityGrams / 1000 : undefined })
      void applyAutomaticRoute(completedProduct)
    } catch (error) {
      if (controller.signal.aborted) return
      if (error instanceof ProductNotFoundError) setLookup({ status: 'not-found', barcode: validation.barcode })
      else setLookup({ status: 'error', message: error instanceof Error ? error.message : 'The lookup failed. Please try again.', retryable: true })
    }
  }, [applyAutomaticRoute])
  const submit = (event: FormEvent) => { event.preventDefault(); void lookupBarcode(barcodeInput) }
  const choosePreset = (barcode: string) => { setBarcodeInput(barcode); void lookupBarcode(barcode) }
  const handleScenarioChange = (_patch: Partial<ScenarioInput>) => undefined
  const handleResolveRoute = async () => {
    routeControllerRef.current?.abort(); const controller = new AbortController(); routeControllerRef.current = controller; setRouteLoading(true)
    const nextRoute = await resolveRoute(scenario.origin, scenario.destination, controller.signal)
    if (!controller.signal.aborted) { setRoute(nextRoute); setRouteLoading(false) }
  }
  const handleDetected = (barcode: string) => { setScannerOpen(false); void lookupBarcode(barcode) }
  return <main className="dashboard-shell">
    <header className="site-header dashboard-header"><button className="brand" onClick={onBack} aria-label="Return to landing page"><BrandMark /><span>sork.</span></button><button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to landing</button></header>
    <section className="scan-stage" aria-labelledby="dashboard-title">
      <div className="scan-stage__copy"><h1 id="dashboard-title">Look up a pack.</h1><p>Type the barcode printed under the bars, or scan the pack with your camera. The lookup runs live against Open Food Facts.</p></div>
      <div className="scan-stage__grid">
        <button className="camera-frame" type="button" onClick={() => setScannerOpen(true)} aria-label="Scan barcode with camera">
          <span className="camera-frame__corner camera-frame__corner--top-left" /><span className="camera-frame__corner camera-frame__corner--top-right" /><span className="camera-frame__corner camera-frame__corner--bottom-left" /><span className="camera-frame__corner camera-frame__corner--bottom-right" />
          <span className="camera-frame__icon"><Camera size={30} strokeWidth={1.4} /></span><strong>Scan with camera</strong><small>Hold the barcode in frame</small>
        </button>
        <form className="barcode-entry" onSubmit={submit} noValidate><label htmlFor="barcode">Or type the barcode</label><div className="lookup-control"><input id="barcode" inputMode="numeric" autoComplete="off" value={barcodeInput} onChange={(event) => { setBarcodeInput(event.target.value); setValidationMessage('') }} placeholder="8906009532363" aria-describedby="barcode-help barcode-error" /><button className="primary-button" type="submit" disabled={lookup.status === 'loading'}>{lookup.status === 'loading' ? 'Looking up…' : 'Look up'}</button></div><p id="barcode-help" className="field-help">Spaces and hyphens are accepted.</p>{validationMessage ? <p id="barcode-error" className="field-error" role="alert">{validationMessage}</p> : null}<div className="preset-row"><span>Try a demo pack</span>{presets.map((preset) => <button type="button" key={preset.barcode} onClick={() => choosePreset(preset.barcode)}>{preset.label}</button>)}</div></form>
      </div>
    </section>
    {lookup.status === 'success' ? <ProductDashboard product={lookup.product} micronutrientStatus={micronutrientStatus} missingFields={lookup.missingFields} scenario={scenario} route={route} routeLoading={routeLoading} onScenarioChange={handleScenarioChange} onResolveRoute={handleResolveRoute} onRetryAutomaticRoute={() => void applyAutomaticRoute(lookup.product)} /> : <section className="dashboard-empty"><DataState type={lookup.status} message={lookup.status === 'error' ? lookup.message : undefined} onRetry={() => void lookupBarcode(barcodeInput)} /></section>}
    {scannerOpen ? <BarcodeCameraScanner onDetected={handleDetected} onClose={() => setScannerOpen(false)} /> : null}<Footer />
  </main>
}

type ProductDashboardProps = { product: ProductFacts; micronutrientStatus: 'idle' | 'loading' | 'ready' | 'unavailable'; missingFields: string[]; scenario: ScenarioInput; route: Availability<ResolvedRoute>; routeLoading: boolean; onScenarioChange: (patch: Partial<ScenarioInput>) => void; onResolveRoute: () => void; onRetryAutomaticRoute: () => void }
function ProductDashboard({ product, micronutrientStatus, missingFields, scenario, route, routeLoading, onScenarioChange, onResolveRoute, onRetryAutomaticRoute }: ProductDashboardProps) {
  const partial = missingFields.length > 0
  return <section className="product-dashboard" aria-labelledby="product-title">
    <div className="journey-context"><span className="journey-context__icon"><ScanIcon size={16} /></span><div><h2 id="product-title">{product.name || 'Unnamed product'}</h2><p>{product.brands?.length ? product.brands.join(', ') : 'Brand not reported by Open Food Facts.'}</p></div><span className={partial ? 'live-badge live-badge--partial' : 'live-badge'}>{partial ? 'Partial source record' : 'Source-reported facts'}</span></div>
    <ScenarioControls scenario={scenario} routeLoading={routeLoading} automaticRoute={route} onRetryAutomaticRoute={onRetryAutomaticRoute} />
    <Suspense fallback={<div className="scenario-loading" role="status">Preparing scenario workspace…</div>}><ScenarioVisuals product={product} scenario={scenario} route={route} /></Suspense>
    <IngredientSafetyChecker initialIngredients={product.ingredientsText} />
    <ProductFactsTabs product={product} missingFields={missingFields} micronutrientStatus={micronutrientStatus} />
  </section>
}

function App() {
  const [route, setRoute] = useState(() => window.location.pathname === '/dashboard' ? 'dashboard' : 'landing')
  useEffect(() => { const handlePopState = () => setRoute(window.location.pathname === '/dashboard' ? 'dashboard' : 'landing'); window.addEventListener('popstate', handlePopState); return () => window.removeEventListener('popstate', handlePopState) }, [])
  const openDashboard = () => { window.history.pushState({}, '', '/dashboard'); setRoute('dashboard') }
  const openLanding = () => { window.history.pushState({}, '', '/'); setRoute('landing') }
  return route === 'dashboard' ? <Dashboard onBack={openLanding} /> : <Landing onOpenDashboard={openDashboard} />
}

export default App
