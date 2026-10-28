import { ArrowRight, Check, Circle, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useTestWorkflow } from '../../hooks/useTestWorkflow'
import { illustrativeSummary } from '../../services/mock/testFixtures'
import { DemoDisclosure, EvaluationLayout, WorkflowGate } from './EvaluationShared'

export function EvaluationProgressPage() {
  const { state, dispatch } = useTestWorkflow()
  const navigate = useNavigate()
  if (!state.agreement || !state.approved) return <EvaluationLayout title="Evaluation progress"><WorkflowGate /></EvaluationLayout>
  if (state.stage === 'results') return <EvaluationLayout title="Evaluation progress"><section className="workflow-gate"><Check size={35} /><h1>Your demo results are ready.</h1><Link className="button button--primary" to="/buyer/evaluations/results">View demo results <ArrowRight size={19} /></Link></section></EvaluationLayout>
  const { draft, skill, version } = state.agreement
  const demo = draft.source === 'demo'
  const verifying = state.stage === 'verifying'
  const summary = demo ? illustrativeSummary(draft.records, draft.scenario) : null
  const steps = [
    { title: 'Authorization confirmed', description: 'Demo authorization for USD 12.00. No real hold or capture.', state: 'done' },
    { title: demo ? 'Baseline fixture loaded' : 'Baseline not executed', description: demo ? `${summary!.baseline} of ${draft.records.length} matched in the illustrative fixture.` : 'Uploaded examples require a real evaluation worker.', state: 'done' },
    { title: verifying ? (demo ? 'Skill fixture loaded' : 'Skill not executed') : 'Running with skill · demo', description: demo ? (verifying ? `${summary!.skilled} of ${draft.records.length} matched in the illustrative fixture.` : 'Previewing the skill-run stage. No model is running.') : 'No outputs will be invented for your uploaded examples.', state: verifying ? 'done' : 'current' },
    { title: 'Checking agreed rules', description: verifying ? 'Ready to compare the fixture with your approved thresholds.' : 'Waiting for the next demo step.', state: verifying ? 'current' : 'pending' },
  ]
  return <EvaluationLayout title="Evaluation progress" className="progress-page">
    <div className="evaluation-columns progress-columns"><section className="progress-scene"><header className="progress-heading"><div><h1>Putting the skill to the test.</h1><p>{skill} <span>·</span> {version} <span>·</span> {draft.records.length} checked examples</p></div><span className="running-pill"><i />{verifying ? 'Checking rules · demo' : 'Running with skill · demo'}</span></header><div className="progress-building" role="img" aria-label="Illuminated glass building at night" /><div className="progress-callouts" aria-hidden="true"><span className="callout-skilled">With skill</span><span className="callout-baseline">Baseline</span></div><p className="scene-caption">Illustrative comparison · no live model execution</p></section>
      <aside className="evaluation-card progress-card"><h2>Evaluation progress</h2><ol className="evaluation-timeline">{steps.map(step => <li key={step.title} className={`timeline-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}><span className="timeline-marker">{step.state === 'done' ? <Check size={22} /> : <Circle size={step.state === 'current' ? 16 : 28} />}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
        <section className="progress-metrics"><h3>Results <span>(illustrative)</span></h3><div><section><h4>Baseline</h4><strong>{summary ? `${summary.baselinePercent}%` : 'Not run'}</strong><p>{summary ? `${summary.baseline} of ${draft.records.length} matched` : 'No execution data'}</p></section><section><h4>With skill</h4><strong className={!verifying ? 'pending-metric' : ''}>{summary && verifying ? `${summary.skilledPercent}%` : 'Pending'}</strong><p>{summary && verifying ? `${summary.skilled} of ${draft.records.length} matched` : 'No final result yet'}</p></section></div><p className="progress-qualification">Free alternative and economic qualification: unverified.</p></section>
        <Button onClick={() => { if (!verifying) dispatch({ type: 'verify' }); else { dispatch({ type: 'results' }); navigate('/buyer/evaluations/results') } }}>{verifying ? 'Show demo results' : 'Advance demo to rule check'} <ArrowRight size={18} /></Button>
      </aside>
    </div>
    <section className="payment-progress-strip" aria-label="Payment and delivery status"><div><Check className="payment-check" size={30} /><span><strong>Payment: Demo authorized</strong><p>USD 12.00 authorization simulation. No actual payment hold.</p></span></div><div><Circle size={29} /><span><strong>Capture: Not started</strong><p>Passing only makes the demo eligible for a capture request.</p></span></div><div><LockKeyhole size={28} /><span><strong>Skill delivery: Locked</strong><p>Unlocks only after simulated completed capture.</p></span></div><Link className="button button--primary" to="/buyer/evaluations/review">View agreement</Link></section><DemoDisclosure />
  </EvaluationLayout>
}
