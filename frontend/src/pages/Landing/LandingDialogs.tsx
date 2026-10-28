import { useState } from 'react'
import { ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import type { LandingPanel } from '../../components/layout/Header'
import type { EvaluationPreview } from '../../types/evaluation'

type DemoStep = 'ready' | 'evaluated' | 'capture-requested' | 'capture-confirmed'
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export function LandingDialogs({ panel, close, preview }: { panel: LandingPanel; close: () => void; preview: EvaluationPreview | null }) {
  const [step, setStep] = useState<DemoStep>('ready')
  if (panel === 'builder' || panel === 'buyer' || panel === 'seller') {
    const copy = {
      builder: { title: 'Build your agent’s next advantage.', description: 'Publish an instruction-only skill with its compatibility, licence and evaluation policy. Buyers test its value before a conditional purchase.', pending: 'The skill publishing screen is awaiting its design reference.' },
      buyer: { title: 'Find the right skill for your agent.', description: 'Compare a skill with your existing workflow and a credible free alternative under a contract you approve.', pending: 'The buyer workspace is awaiting its design reference.' },
      seller: { title: 'Let your skill prove its value.', description: 'Share your skill’s checkout link and review evaluation and purchase outcomes separately.', pending: 'The seller workspace is awaiting its design reference.' },
    }[panel]
    return <Modal title={copy.title} onClose={close}><p className="modal-lead">{copy.description}</p><div className="notice"><Info size={20} /><p>{copy.pending} This local frontend preview does not create an account or change your permissions.</p></div><Button onClick={close}>Back to AgentGain</Button></Modal>
  }
  return <Modal title={panel === 'demo' ? 'Try the purchase flow.' : 'See what the skill adds.'} onClose={close}>
    <p className="modal-lead">Illustrative demo data. No AI evaluation runs and no payment is made.</p>
    {!preview ? <p role="status">Evidence is not available yet. Close this dialog and retry the preview.</p> : <>
      <div className="skill-summary"><strong>{preview.skill}</strong><span>{preview.buyer}</span><span>{preview.seller}</span></div>
      <div className="comparison-table-wrap"><table className="comparison-table"><caption>120 hidden records · three agreed approaches</caption><thead><tr><th scope="col">Approach</th><th scope="col">Correct</th><th scope="col">Accuracy</th></tr></thead><tbody>{preview.arms.map(arm => <tr key={arm.id}><th scope="row">{arm.label}</th><td>{arm.correct} / {arm.total}</td><td>{(arm.correct / arm.total * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>
      <div className="value-summary"><div><span>Estimated 3-month net benefit</span><strong>{usd(preview.estimatedBenefitUsd)}</strong></div><div><span>Lower 90% bound</span><strong>{usd(preview.lowerBenefitBoundUsd)}</strong></div><div><span>Required minimum</span><strong>{usd(preview.requiredBenefitUsd)}</strong></div></div>
      <p className="fine-print">Illustrative confidence interval, not independently statistically verified. Assumptions: 3,000 tasks/month, $0.50 rework per incorrect record, 3 months. The $15 evaluation expense is a model assumption, not a checkout charge. Incremental operating costs are not supplied.</p>
      {panel === 'evidence' ? <div className="notice"><CheckCircle2 size={21} /><p><strong>PASS · Capture eligible.</strong><br />{usd(preview.licenceUsd)} USD licence authorization only. Payment not captured; skill not delivered.</p></div> : <section className="demo-simulation" aria-label="Local purchase simulation">
        <span className="demo-tag">LOCAL SIMULATION</span>
        <p role="status">{step === 'ready' ? '$200.00 USD licence hold (simulated). No completed purchase.' : step === 'evaluated' ? 'PASS (illustrative fixture). Capture eligible. Payment not captured.' : step === 'capture-requested' ? 'Capture requested (simulated). Not confirmed. Skill not delivered.' : 'Capture COMPLETED (simulated). Delivery would now be eligible. No real payment or skill delivery occurred.'}</p>
        {step === 'ready' && <Button onClick={() => setStep('evaluated')}>Show illustrative result <ArrowRight size={18} /></Button>}
        {step === 'evaluated' && <Button onClick={() => setStep('capture-requested')}>Simulate capture request <ArrowRight size={18} /></Button>}
        {step === 'capture-requested' && <Button onClick={() => setStep('capture-confirmed')}>Simulate confirmed capture <CheckCircle2 size={18} /></Button>}
        {step === 'capture-confirmed' && <Button variant="outline" onClick={() => setStep('ready')}>Reset local simulation</Button>}
      </section>}
    </>}
  </Modal>
}
