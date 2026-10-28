import { useCallback, useRef, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FileText, Info, LockKeyhole } from 'lucide-react'
import { BuyerWorkspaceLayout } from '../../components/layout/BuyerWorkspaceLayout'
import { Button } from '../../components/ui/Button'
import { useAsyncData } from '../../hooks/useAsyncData'
import { skillService } from '../../services'
import type { SkillDetailService } from '../../services/contracts/skillService'
import type { SkillDetail } from '../../types/skill'
import './skill-detail.css'

const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'input-output', label: 'Input & output' }, { id: 'version', label: 'Version' }] as const

function StructuredFields({ example }: { example: SkillDetail['example'] }) {
  return <dl className="invoice-fields"><div><dt>Invoice number</dt><dd>{example.invoiceNumber}</dd></div><div><dt>Total</dt><dd>{example.total}</dd></div><div><dt>Currency</dt><dd>{example.currency}</dd></div></dl>
}

function InvoiceExample({ skill }: { skill: SkillDetail }) {
  return <div className="invoice-example"><div><h3>Invoice text</h3><pre>{skill.example.input}</pre></div><ArrowRight className="invoice-example-arrow" size={24} aria-hidden="true" /><div><h3>Structured fields</h3><StructuredFields example={skill.example} /></div></div>
}

function InvoiceScene({ example }: { example: SkillDetail['example'] }) {
  return <div className="invoice-scene" aria-hidden="true">
    <div className="invoice-paper"><strong>INVOICE</strong><dl><div><dt>Invoice No.</dt><dd>{example.invoiceNumber}</dd></div><div><dt>Date</dt><dd>{example.date}</dd></div><div><dt>Total</dt><dd>{example.currency} {example.total}</dd></div><div><dt>Vendor</dt><dd>{example.vendor}</dd></div></dl><div className="invoice-paper-lines"><span /><span /><span /><span /><span /></div></div>
    <svg className="invoice-connector" viewBox="0 0 200 130"><path d="M0 15 C120 -15 65 110 200 90" fill="none" stroke="#50dfff" strokeWidth="3" /></svg>
    <div className="invoice-scene-fields"><StructuredFields example={example} /></div>
  </div>
}

export function SkillDetailPage({ service = skillService }: { service?: SkillDetailService }) {
  const { skillId = '' } = useParams()
  const load = useCallback((signal: AbortSignal) => service.getSkill(skillId, signal), [service, skillId])
  const { data: skill, loading, error, retry } = useAsyncData(load)
  const [params, setParams] = useSearchParams()
  const activeTab = tabs.find(item => item.id === params.get('tab'))?.id ?? 'overview'
  const navigate = useNavigate()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const selectTab = (id: string) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true, preventScrollReset: true })
  const tabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
    if (next !== null) { event.preventDefault(); selectTab(tabs[next].id); tabRefs.current[next]?.focus() }
  }
  return <BuyerWorkspaceLayout breadcrumb={<><ArrowRight size={19} aria-hidden="true" /><Link to="/buyer/skills">Explore skills</Link><span aria-hidden="true">/</span><span aria-current="page">{skill?.name ?? 'Skill details'}</span></>}>
    <main id="buyer-main" className="skill-detail-main">
      {loading ? <section className="workspace-loading" role="status" aria-busy="true">Loading skill details…</section> : error ? <section className="workspace-error" role="alert"><h1>We couldn’t load this skill.</h1><p>Please try again.</p><Button onClick={retry}>Retry skill</Button></section> : !skill ? <section className="workspace-error"><h1>Skill not available</h1><p>This preview only includes the supplied invoice skill detail.</p><Link to="/buyer/skills" className="button button--primary">Explore skills</Link></section> : <div className="skill-detail-grid">
        <div className="skill-detail-content">
          <header className="skill-detail-heading"><p className="skill-category-label">{skill.category}</p><h1>{skill.name}</h1><p className="skill-detail-byline">{skill.seller}<span>•</span>{skill.version}</p><p className="skill-detail-tagline">{skill.tagline}</p></header>
          <InvoiceScene example={skill.example} />
          <div className="skill-detail-tabs" role="tablist" aria-label="Skill information">{tabs.map((tab, index) => <button key={tab.id} ref={node => { tabRefs.current[index] = node }} id={`skill-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`skill-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={event => tabKeyDown(event, index)} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}</div>
          {tabs.map(tab => <section key={tab.id} id={`skill-panel-${tab.id}`} role="tabpanel" aria-labelledby={`skill-tab-${tab.id}`} tabIndex={0} hidden={activeTab !== tab.id} className="skill-tab-panel">
            {tab.id === 'overview' ? <><div className="skill-overview-summary"><div><h2>What it does</h2><p>Extracts key fields from invoice text.</p></div><div><h2>What you test</h2><p>Compare the results with your checked answers.</p></div></div><InvoiceExample skill={skill} /><p className="example-disclosure">Illustrative example — not an executed evaluation result.</p></> : tab.id === 'input-output' ? <><h2>From invoice text to structured fields</h2><p className="skill-panel-lead">This sample shows the expected format. A real test uses your separate examples and checked answers.</p><InvoiceExample skill={skill} /><p className="example-disclosure">Illustrative example — not an executed evaluation result.</p><div className="skill-test-note"><Info size={19} /><p>Agree the output requirements and scoring rules before testing. Compare your existing agent, a credible free alternative and the paid skill under the same conditions.</p></div></> : <><h2>Version {skill.version}</h2><p className="skill-panel-lead">This listing refers to {skill.name} by {skill.seller}.</p><dl className="skill-version-details"><div><dt>Listed version</dt><dd>{skill.version}</dd></div><div><dt>Package type</dt><dd>Instruction-only skill</dd></div><div><dt>Licence price</dt><dd>{skill.illustrativePrice.currency} {(skill.illustrativePrice.amountMinor / 100).toFixed(2)} · illustrative</dd></div><div><dt>Content hash</dt><dd>Not supplied in this preview</dd></div><div><dt>Purchase status</dt><dd>Not purchased</dd></div></dl><div className="skill-test-note"><LockKeyhole size={19} /><p>The agreed contract must identify the exact skill version and content hash. Delivery unlocks only after matching capture is confirmed as COMPLETED. Licence terms must be reviewed before approval.</p></div></>}
          </section>)}
        </div>
        <aside className="skill-purchase-card" aria-labelledby="purchase-title"><h2 id="purchase-title">Prove the fit{' '}<br />before you buy.</h2><div className="skill-purchase-price"><strong>{skill.illustrativePrice.currency} {(skill.illustrativePrice.amountMinor / 100).toFixed(2)}</strong><span>Illustrative price</span></div>
          <ul className="skill-purchase-benefits"><li><span><FileText size={24} /></span>Listed version: {skill.version}</li><li><span><CheckCircle2 size={24} /></span>Your examples. Your checks.</li></ul>
          <Button onClick={() => navigate('/buyer/evaluations/new')}>Set up a test <ArrowRight size={21} /></Button>
          <div className="skill-payment-note"><LockKeyhole size={20} /><p>Authorize with PayPal before testing. A passing result permits a capture request. Payment completes only after confirmed capture.</p></div>
          <div className="skill-paypal"><span className="paypal-letter" aria-hidden="true">P</span><div><strong>PayPal</strong> Sandbox<span className="skill-paypal-status">Preview · not connected</span></div></div>
          <div className="skill-result-note"><Info size={20} /><p>Results depend on your agreed test.</p></div>
        </aside>
      </div>}
    </main>
  </BuyerWorkspaceLayout>
}
