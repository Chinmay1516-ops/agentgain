import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowRight, Check, ChevronRight, FileText, ShieldCheck } from 'lucide-react'
import { Header, type LandingPanel } from '../../components/layout/Header'
import { Brand } from '../../components/shared/Brand'
import { Button } from '../../components/ui/Button'
import { EvidencePreview } from '../../components/shared/EvidencePreview'
import { landingService } from '../../services'
import type { LandingService } from '../../services/contracts/landingService'
import type { EvaluationPreview } from '../../types/evaluation'
import { LandingDialogs } from './LandingDialogs'

const panels: LandingPanel[] = ['demo', 'evidence', 'buyer', 'seller', 'builder']
export function LandingPage({ service = landingService }: { service?: LandingService }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const requested = params.get('panel') as LandingPanel | null
  const panel = requested && panels.includes(requested) ? requested : null
  const openPanel = (value: LandingPanel) => value === 'buyer' || value === 'seller' ? navigate(`/${value}`) : setParams({ panel: value }, { preventScrollReset: true })
  useEffect(() => { if (requested === 'buyer' || requested === 'seller') navigate(`/${requested}`, { replace: true }) }, [requested, navigate])
  const closePanel = () => setParams({}, { replace: true, preventScrollReset: true })
  const [preview, setPreview] = useState<EvaluationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    service.getPreview(controller.signal).then(data => { if (!controller.signal.aborted) setPreview(data) }).catch(() => {
      if (!controller.signal.aborted) setError('The illustrative preview could not load. Please retry.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [service, attempt])
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <main id="main-content">
      <section className="hero" id="top" aria-labelledby="hero-title">
        <img className="scene-image hero-image" src="/images/building-day.png" alt="" fetchPriority="high" width="1478" height="1064" />
        <div className="hero-shade" />
        <Header openPanel={openPanel} />
        <div className="hero-content page-container">
          <p className="eyebrow">AI SKILLS. VERIFIED ON YOUR TERMS.</p>
          <h1 id="hero-title">Better skills.<br />Proven before<br />you pay.</h1>
          <p className="hero-description">Test on your tasks. Agree the checks.<br />Pay when they pass.</p>
          <div className="hero-actions"><Button onClick={() => openPanel('demo')}>Try the demo <ArrowRight size={18} /></Button><a className="button button--outline" href="#how-it-works">Explore the building</a></div>
        </div>
        <div className="building-wordmark" aria-hidden="true"><span className="building-mark">A</span> AgentGain</div>
        <button className="glass-card hero-proof" onClick={() => openPanel('evidence')} aria-label="Review illustrative skill test result"><span className="glass-check"><Check size={21} /></span><span><strong>Skill test passed</strong><small>Illustrative demo</small></span></button>
        <div className="plaza-orbit" aria-hidden="true" />
        <a href="#how-it-works" className="explore-cue"><span aria-hidden="true"><ChevronRight /><ChevronRight /><ChevronRight /></span>Explore the building</a>
        <a className="scroll-cue" href="#proof"><ArrowDown size={18} /> Scroll to see the proof</a>
      </section>

      <section className="how-section" id="how-it-works" aria-labelledby="how-title">
        <img className="scene-image workflow-image" src="/images/building-sunset.png" alt="" loading="lazy" width="1586" height="992" />
        <div className="workflow-shade" />
        <div className="page-container how-content">
          <h2 id="how-title">One skill. Your test.<br />Clear proof.</h2>
          <ol className="steps">
            <li><span className="step-number">01</span><span className="step-dot" /><div><h3>Set the test</h3><p>Choose a skill and define your<br className="desktop-break" /> own checks for success.</p></div></li>
            <li><span className="step-number">02</span><span className="step-dot" /><div><h3>Compare the results</h3><p>Test your agent, a free alternative,<br className="desktop-break" /> and the paid skill on the same tasks.</p></div></li>
            <li><span className="step-number">03</span><span className="step-dot" /><div><h3>Pay when it passes</h3><p>Capture is requested only<br className="desktop-break" /> after a qualifying result.</p></div></li>
          </ol>
          <p className="authorization-note"><span className="paypal-letter" aria-hidden="true">P</span> PayPal authorization comes before testing.</p>
        </div>
        <div className="building-flow" role="group" aria-label="Illustrative evaluation flow">
          <button className="glass-card flow-skill" onClick={() => openPanel('evidence')}><FileText size={32} /><span><strong>Catalog Normalizer</strong><small>AI skill · illustrative demo</small></span></button>
          <div className="flow-connector connector-one" aria-hidden="true" />
          <button className="glass-card flow-check" onClick={() => openPanel('evidence')}><span className="glass-check"><Check size={20} /></span><strong>Checks passed</strong></button>
          <div className="flow-connector connector-two" aria-hidden="true" />
          <button className="glass-card flow-payment" onClick={() => openPanel('demo')}><span className="paypal-letter" aria-hidden="true">P</span><span><strong>PayPal</strong><small>Capture eligible · demo</small></span></button>
        </div>
      </section>

      <section className="proof-section" id="proof" aria-labelledby="proof-heading">
        <h2 id="proof-heading" className="sr-only">Compare the evidence before payment</h2>
        <img className="scene-image night-image" src="/images/building-night.png" alt="" loading="lazy" width="1586" height="992" />
        <div className="proof-content page-container"><EvidencePreview preview={preview} loading={loading} error={error} retry={() => setAttempt(x => x + 1)} review={() => openPanel('evidence')} /></div>
      </section>
      <section className="builder-cta page-container" id="for-builders" aria-labelledby="builder-title"><h2 id="builder-title">Build your agent’s next advantage.</h2><Button onClick={() => openPanel('demo')}>Launch demo <ArrowRight size={18} /></Button></section>
    </main>
    <footer className="site-footer page-container"><div><Brand footer /><span>Test. Verify. Pay.</span></div><p><ShieldCheck size={14} /> Independent frontend prototype. Illustrative demo data. No live payments.</p></footer>
    {panel && <LandingDialogs key={panel} panel={panel} close={closePanel} preview={preview} />}
  </>
}
