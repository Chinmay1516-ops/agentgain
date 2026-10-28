import { useState } from 'react'
import { ArrowRight, Check, Circle, LockKeyhole, Pause, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useTestWorkflow } from '../../hooks/useTestWorkflow'
import { DemoDisclosure, EvaluationLayout, TestSteps, WorkflowGate } from './EvaluationShared'

export function AgreementPage() {
  const { state, dispatch } = useTestWorkflow()
  const [consent, setConsent] = useState(false)
  const agreement = state.agreement
  if (!agreement) return <EvaluationLayout title="Review agreement"><WorkflowGate /></EvaluationLayout>
  const { draft } = agreement
  const authorized = state.payment !== 'NOT_AUTHORIZED'
  return <EvaluationLayout title="Review agreement" className="agreement-page">
    <header className="agreement-hero"><div><h1>Agree the test.<br className="mobile-break" /> Authorize the payment.</h1><TestSteps current={2} /></div></header>
    <div className="evaluation-columns agreement-columns">
      <section className="evaluation-card agreement-card">
        <div className="agreement-card-title"><span className="dataset-icon"><LockKeyhole size={27} /></span><div><h2>Your test agreement</h2><p>{authorized ? 'This demo snapshot is approved and locked.' : 'These terms lock when you approve.'}</p></div></div>
        <dl className="agreement-terms">
          <div><dt>Skill</dt><dd>{agreement.skill}</dd></div><div><dt>Version</dt><dd>{agreement.version}</dd></div><div><dt>Test records</dt><dd>{draft.records.length} · {draft.filename}</dd></div><div><dt>Checked accuracy</dt><dd>At least {draft.accuracy}%</dd></div><div><dt>Improvement</dt><dd>At least {draft.improvement} percentage points</dd></div><div><dt>Demo price</dt><dd>USD 12.00 · skill licence only</dd></div>
        </dl>
        <p className="agreement-explanation">All three required fields must match the checked answer. Results in this preview are {draft.source === 'demo' ? 'synthetic fixtures, not model execution.' : 'unavailable for uploaded examples; the outcome will be inconclusive.'}</p>
        <div className="agreement-outcomes"><section className="outcome-policy pass"><Check size={32} /><h3>Pass: complete payment,<br /> then deliver</h3><p>The demo can request capture after passing the displayed rules. Delivery stays locked until capture is confirmed.</p></section><section className="outcome-policy caution"><Pause size={30} /><h3>Fail or inconclusive:<br /> no capture, no delivery</h3><p>The demo cancels the uncaptured authorization. Uploaded data is not evaluated by a model in this preview.</p></section></div>
        <details className="agreement-details"><summary>Evaluation scope and limits</summary><dl><div><dt>Baseline / model</dt><dd>Illustrative existing agent; no model or resource budget configured.</dd></div><div><dt>Scoring</dt><dd>Exact field matches; accuracy and percentage-point gain. No statistical inference.</dd></div><div><dt>Free alternative / economics</dt><dd>Not supplied. Full purchase qualification is unverified.</dd></div><div><dt>Version hash / licence policy</dt><dd>Not supplied. v1.0 is demo metadata, not an authenticated package.</dd></div><div><dt>Technical errors</dt><dd>No automatic retries in this preview. A real controller must reconcile uncertain payment status before acting.</dd></div></dl></details>
        {!authorized && <Link className="agreement-edit" to="/buyer/evaluations/new">Edit test setup</Link>}
      </section>
      <aside className="authorization-card"><div className="authorization-art"><span>PAYPAL SANDBOX · PREVIEW</span></div><div className="authorization-body"><p className="authorization-price">USD 12.00</p><h2>Authorize, then test.</h2><p>An authorization is separate from completed payment. This preview simulates both stages; it does not contact PayPal.</p>
        <div className="authorization-action">{!authorized ? <><label className="consent-checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I approve these demo test terms.</label><Button disabled={!consent} onClick={() => dispatch({ type: 'authorize', approved: consent })}>Simulate PayPal authorization <ArrowRight size={19} /></Button><p className="authorization-hint">No PayPal login, hold or charge is created.</p></> : <><p className="authorization-confirmed" role="status"><ShieldCheck size={24} />Demo authorization confirmed.</p><Link className="button button--primary" to={state.stage === 'results' ? '/buyer/evaluations/results' : '/buyer/evaluations/progress'}>Continue evaluation demo <ArrowRight size={19} /></Link><p className="authorization-hint">Terms remain fixed for this local demo.</p></>}</div>
        <div className="authorization-status"><span>Payment status</span><strong><Circle size={14} />{authorized ? (state.payment === 'COMPLETED' ? 'Demo captured' : state.payment === 'VOIDED' ? 'Demo cancelled' : state.payment === 'CAPTURE_REQUESTED' ? 'Demo capture pending' : 'Demo authorized') : 'Not authorized'}</strong></div>
      </div></aside>
    </div><DemoDisclosure />
  </EvaluationLayout>
}
