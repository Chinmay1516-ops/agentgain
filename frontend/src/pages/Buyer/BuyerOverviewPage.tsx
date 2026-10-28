import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, CircleDot, MousePointer2 } from 'lucide-react'
import { BuyerShell, type BuyerPanel } from '../../components/layout/BuyerShell'
import { BrandMark } from '../../components/shared/Brand'
import { Button } from '../../components/ui/Button'
import { buyerService } from '../../services'
import type { BuyerService } from '../../services/contracts/buyerService'
import type { BuyerOverview } from '../../types/buyer'
import { BuyerDialogs, EvaluationRow } from './BuyerDialogs'
import './buyer.css'

const panelNames: BuyerPanel[] = ['explore', 'evaluations', 'profile', 'workspace', 'invoice-example', 'order-example']
const steps = [
  { title: 'Agree the test', copy: 'Use your checked examples and an agreed evaluation.' },
  { title: 'Authorize', copy: 'A payment authorization precedes evaluation (not a completed payment).' },
  { title: 'Evaluate', copy: 'Compare your agent, a free alternative and the skill on the same examples.' },
  { title: 'Complete payment', copy: 'Delivery unlocks only after confirmed capture.' },
]

export function BuyerOverviewPage({ service = buyerService }: { service?: BuyerService }) {
  const [overview, setOverview] = useState<BuyerOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const requested = params.get('panel') as BuyerPanel | null
  const panel = requested && panelNames.includes(requested) ? requested : null
  const openPanel = (value: BuyerPanel) => value === 'explore' ? navigate('/buyer/skills') : setParams({ panel: value }, { preventScrollReset: true })
  const close = () => setParams({}, { replace: true, preventScrollReset: true })
  useEffect(() => { if (requested === 'explore') navigate('/buyer/skills', { replace: true }) }, [requested, navigate])
  useEffect(() => {
    if (!loading && overview && location.hash === '#purchased-skills') {
      const target = document.getElementById('purchased-skills')
      target?.scrollIntoView({ block: 'center' }); target?.focus({ preventScroll: true })
    }
  }, [loading, overview, location.hash])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(false)
    service.getOverview(controller.signal).then(data => { if (!controller.signal.aborted) setOverview(data) }).catch(() => { if (!controller.signal.aborted) setError(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [service, attempt])
  return <BuyerShell profile={overview?.profile} openPanel={openPanel}>
    <main id="buyer-main" className="buyer-main">
      <div className="buyer-page-heading"><div><h1>What should your agent do better?</h1><p>Start with a task. Find a skill. Test it on your terms.</p></div><Button onClick={() => openPanel('explore')}>Explore skills <ArrowRight size={20} /></Button></div>
      {loading ? <section className="workspace-loading" aria-busy="true" role="status"><span className="loading-placeholder" /><p>Loading your illustrative workspace…</p></section> : error || !overview ? <section className="workspace-error" role="alert"><h2>We couldn’t load this workspace.</h2><p>Your data hasn’t changed. Please try again.</p><Button onClick={() => setAttempt(value => value + 1)}>Retry workspace</Button></section> : <>
        <section className="current-task-card" aria-labelledby="current-task-title">
          <div className="current-task-copy"><p className="task-eyebrow">Your current task</p><h2 id="current-task-title">{overview.currentTask.title}</h2><span className="task-concern"><CircleDot size={14} fill="currentColor" />{overview.currentTask.concern}</span><p className="task-description">Try a skill against your checked examples.</p><Button onClick={() => openPanel('explore')}>Find a matching skill <ArrowRight size={20} /></Button></div>
          <div className="workspace-scene"><img src="/images/buyer-workspace.png" width="1536" height="1024" alt="" fetchPriority="high" /><button className="workspace-callout" onClick={() => openPanel('workspace')}>Your workspace</button></div>
          <button className="workspace-explore" onClick={() => openPanel('workspace')}><MousePointer2 size={19} />Explore workspace</button>
        </section>
        <div className="buyer-overview-grid">
          <section className="workspace-card recent-evaluations" aria-labelledby="evaluations-title"><div className="workspace-card-heading"><h2 id="evaluations-title">Recent evaluations</h2><button className="text-action" onClick={() => openPanel('evaluations')}>View all <ArrowRight size={16} /></button></div>
            {overview.evaluations.length ? <div className="evaluation-list">{overview.evaluations.map(item => <EvaluationRow key={item.id} evaluation={item} select={() => openPanel(item.id as BuyerPanel)} />)}</div> : <p className="empty-evaluations">No evaluations yet. Start by finding a skill for your task.</p>}
          </section>
          <section id="purchased-skills" className="workspace-card purchased-skills" tabIndex={-1} aria-labelledby="purchased-title"><h2 id="purchased-title">Your purchased skills</h2><div className="skill-trophy" aria-hidden="true"><div className="trophy-face"><BrandMark /></div><div className="trophy-base" /></div><h3>Your next capability starts here.</h3><p>Find and purchase skills that pass your evaluation.</p><Button variant="outline" onClick={() => openPanel('explore')}>Browse skills <ArrowRight size={19} /></Button></section>
        </div>
        <section className="workspace-card buyer-how" aria-labelledby="buyer-how-title"><h2 id="buyer-how-title">How it works</h2><ol>{steps.map((step, index) => <li key={step.title}><span className="buyer-step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div>{index < steps.length - 1 && <ChevronRight className="buyer-step-chevron" size={18} />}</li>)}</ol></section>
      </>}
    </main>
    {panel && <BuyerDialogs panel={panel} overview={overview} close={close} openPanel={openPanel} />}
  </BuyerShell>
}
