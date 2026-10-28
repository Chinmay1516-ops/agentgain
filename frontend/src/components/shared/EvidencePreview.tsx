import { ArrowRight, BarChart3, Check, CircleMinus, FileText, LockKeyhole } from 'lucide-react'
import { Button } from '../ui/Button'
import type { EvaluationPreview } from '../../types/evaluation'

export function EvidencePreview({ preview, loading, error, retry, review }: { preview: EvaluationPreview | null; loading: boolean; error: string | null; retry: () => void; review: () => void }) {
  return <div className="evidence-panel">
    <span className="demo-tag">ILLUSTRATIVE DEMO</span>
    <h2>Your proof, before payment.</h2>
    {loading ? <p role="status" className="preview-message">Loading illustrative evidence…</p> : error ? <div role="alert" className="preview-message"><p>{error}</p><Button onClick={retry}>Retry preview</Button></div> : preview && <>
      <div className="evidence-rows">
        {preview.arms.map(arm => <div className="evidence-row" key={arm.id}>
          <div className="evidence-icon">{arm.id === 'paid' ? <BarChart3 /> : <FileText />}</div>
          <div className="evidence-row-copy"><h3>{arm.id === 'existing' ? 'Baseline' : arm.label}</h3><p>{arm.correct} / {arm.total} correct</p></div>
          <span role="img" className={`result-icon ${arm.id === 'paid' ? 'result-icon--pass' : ''}`} aria-label={arm.id === 'paid' ? 'Checks passed' : 'Comparison result'}>{arm.id === 'paid' ? <Check size={19} /> : <CircleMinus size={19} />}</span>
        </div>)}
        <div className="evidence-row payment-row"><div className="evidence-icon"><span className="paypal-letter" aria-hidden="true">P</span></div><div className="evidence-row-copy"><h3>PayPal</h3><p>Authorized · not captured</p></div><LockKeyhole className="payment-lock" size={22} aria-label="Authorization only" /></div>
      </div>
      <div className="evidence-actions"><Button onClick={review}>Review evidence <ArrowRight size={18} /></Button><span>Sandbox preview</span></div>
    </>}
  </div>
}
