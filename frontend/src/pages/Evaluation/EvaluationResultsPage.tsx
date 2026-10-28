import { useState } from 'react'
import { FailedEvaluationView } from './FailedEvaluationView'
import { ArrowRight, Check, CircleAlert, FileText, Info, LockKeyhole, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { DemoReceipt } from '../../components/shared/DemoReceipt'
import { demoOutcome, useTestWorkflow } from '../../hooks/useTestWorkflow'
import { illustrativeOutput, illustrativeSummary, matchesFields } from '../../services/mock/testFixtures'
import type { InvoiceFields } from '../../types/testWorkflow'
import { DemoDisclosure, EvaluationLayout, WorkflowGate } from './EvaluationShared'

function MatchBadge({ match }: { match: boolean }) { return <span className={`match-badge ${match ? 'match' : 'mismatch'}`}>{match ? 'Match' : 'Mismatch'}</span> }

export function EvaluationResultsPage() {
  const { state, dispatch } = useTestWorkflow()
  const navigate = useNavigate()
  const [allRecords, setAllRecords] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [modal, setModal] = useState<'receipt' | null>(null)
  if (!state.agreement || !state.approved) return <EvaluationLayout title="Test results"><WorkflowGate /></EvaluationLayout>
  if (state.stage !== 'results') return <EvaluationLayout title="Test results"><section className="workflow-gate"><Info size={32} /><h1>Your evaluation is not finished.</h1><p>Complete the demo rule check before viewing results.</p><Link className="button button--primary" to="/buyer/evaluations/progress">Continue evaluation demo <ArrowRight size={18} /></Link></section></EvaluationLayout>
  const agreement = state.agreement
  const { draft } = agreement
  const outcome = demoOutcome(state)
  const summary = draft.source === 'demo' ? illustrativeSummary(draft.records, draft.scenario) : null
  if (outcome === 'FAIL') return <FailedEvaluationView />
  const passed = outcome === 'PASS'
  const completed = state.payment === 'COMPLETED'
  const pending = state.payment === 'CAPTURE_REQUESTED'
  const selected = draft.records[selectedIndex]
  const baselineOutput = summary ? illustrativeOutput(selected, selectedIndex, 'baseline', draft.scenario) : null
  const skillOutput = summary ? illustrativeOutput(selected, selectedIndex, 'skill', draft.scenario) : null
  const fields: { key: keyof InvoiceFields; label: string }[] = [{ key: 'currency', label: 'Currency' }, { key: 'invoiceNumber', label: 'Invoice number' }, { key: 'total', label: 'Total' }]
  const visibleRecords = allRecords ? draft.records : draft.records.slice(0, 3)
  return <EvaluationLayout title="Test results" className="results-page">
    <header className={`results-heading ${passed ? 'result-pass' : 'result-caution'}`}><span className="result-symbol">{passed ? <Check size={38} /> : <CircleAlert size={36} />}</span><div><h1>{passed ? 'Your demo test passed.' : 'Your test is inconclusive.'}</h1><p>{agreement.skill} · {agreement.version}</p></div></header>
    <div className="evaluation-columns results-columns"><div className="results-evidence">
      <section className="evaluation-card result-metrics" aria-label="Illustrative comparison results"><div><h2>Baseline</h2><strong>{summary ? `${summary.baselinePercent}%` : 'Not run'}</strong><p>{summary ? `${summary.baseline} / ${draft.records.length} matched` : 'No execution data'}</p></div><div><h2>With skill</h2><strong>{summary ? `${summary.skilledPercent}%` : 'Not run'}</strong><p>{summary ? `${summary.skilled} / ${draft.records.length} matched` : 'No execution data'}</p></div><div><h2>Improvement</h2><strong className={summary ? 'positive-gain' : ''}>{summary ? `+${summary.improvement}` : '—'}</strong><p>percentage points</p></div></section>
      <section className={`result-checks ${passed ? 'checks-pass' : 'checks-caution'}`}><h2>{passed ? <Check size={26} /> : <CircleAlert size={26} />}{passed ? 'Displayed checks met' : 'Evaluation not executed'}</h2>{summary ? <div>{[{ label: `At least ${draft.accuracy}% checked accuracy`, met: summary.skilledPercent >= draft.accuracy }, { label: `At least ${draft.improvement}-point improvement`, met: summary.improvement >= draft.improvement }].map(rule => <p key={rule.label}>{rule.met ? <Check size={19} /> : <X size={19} />}{rule.label}<span className="sr-only"> — {rule.met ? 'met' : 'not met'}</span></p>)}</div> : <p>These examples have not been evaluated. No verified result or completed payment is available.</p>}</section>
      {summary ? <><section className="evaluation-card evidence-records"><div className="evidence-title"><h2>Record-by-record evidence</h2><button onClick={() => setAllRecords(value => !value)} aria-expanded={allRecords}>{allRecords ? 'Show first 3 records' : 'View all records'} <ArrowRight size={18} /></button></div><div className="table-scroll" tabIndex={0} aria-label="Illustrative record evidence"><table className="evaluation-table results-table"><thead><tr><th>Record</th><th>Baseline</th><th>With skill</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{visibleRecords.map((record, index) => <tr key={record.id} className={index === selectedIndex ? 'selected-record' : ''}><th scope="row">{record.id}</th><td><MatchBadge match={matchesFields(record.expected, illustrativeOutput(record, index, 'baseline', draft.scenario))} /></td><td><MatchBadge match={matchesFields(record.expected, illustrativeOutput(record, index, 'skill', draft.scenario))} /></td><td><button className="record-inspect" aria-label={`Inspect ${record.id}`} aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)}><ArrowRight size={18} /></button></td></tr>)}</tbody></table></div><p className="evidence-count">Showing {visibleRecords.length} of {draft.records.length} synthetic records</p></section>
      <section className="evaluation-card selected-record-detail" aria-live="polite"><h2>Selected record detail — {selected.id}</h2><div className="table-scroll" tabIndex={0} aria-label="Selected record field comparison"><table className="evaluation-table"><thead><tr><th>Field</th><th>Checked answer</th><th>Baseline</th><th>With skill</th></tr></thead><tbody>{fields.map(field => <tr key={field.key}><th scope="row">{field.label}</th><td>{selected.expected[field.key]}</td><td><span className={`field-value ${baselineOutput![field.key] === selected.expected[field.key] ? 'match' : 'mismatch'}`}>{baselineOutput![field.key]}</span><span className="sr-only"> — {baselineOutput![field.key] === selected.expected[field.key] ? 'matches' : 'mismatch'}</span></td><td><span className={`field-value ${skillOutput![field.key] === selected.expected[field.key] ? 'match' : 'mismatch'}`}>{skillOutput![field.key]}</span><span className="sr-only"> — {skillOutput![field.key] === selected.expected[field.key] ? 'matches' : 'mismatch'}</span></td></tr>)}</tbody></table></div></section></> : <section className="evaluation-card inconclusive-evidence"><FileText size={30} /><h2>Your examples are preserved.</h2><p>{draft.records.length} {draft.records.length === 1 ? 'record' : 'records'} in {draft.filename}. Format checks passed; checked-answer correctness and held-out independence remain unverified.</p></section>}
      <p className="result-scope"><Info size={18} /><span>{summary ? 'These are illustrative fixtures, not measured model results.' : 'No model evaluation was run for these examples.'} Free-alternative and economic checks are not supplied; full purchase qualification remains unverified. This comparison applies only to this demo version and these records.</span></p>
    </div>
    <aside className="evaluation-card delivery-card"><div className="evaluation-building" role="img" aria-label="Glass office building in daylight" /><h2>Payment &amp; delivery</h2><div className="delivery-status-row"><span className="payment-monogram" aria-hidden="true">P</span><div><strong>PayPal payment</strong><p>USD 12.00 · Sandbox preview</p></div><span className={`delivery-badge ${completed ? 'ready' : ''}`}>{completed ? 'Demo captured' : pending ? 'Demo pending' : passed ? 'Demo authorized' : 'Demo cancelled'}</span></div><div className="delivery-status-row"><FileText size={25} /><div><strong>Tested skill</strong><p>{agreement.skill} · {agreement.version}</p></div><span className={`delivery-badge ${completed ? 'ready' : ''}`}>{completed ? 'Demo ready' : 'Locked'}</span></div>
      <div className="capture-explanation" role="status">{completed ? 'Simulated completed capture confirmed. The demo preview is unlocked; no actual package or licence has been delivered.' : pending ? 'Capture request simulated. Payment remains pending and delivery stays locked until confirmation.' : passed ? 'Passing does not complete payment. Request capture, then confirm its completion in this demo.' : 'The demo authorization is cancelled. No capture, charge or delivery occurs.'}</div>
      {passed && !completed && <Button onClick={() => dispatch({ type: pending ? 'confirm' : 'capture' })}>{pending ? 'Simulate completed capture' : 'Simulate capture request'} <ArrowRight size={18} /></Button>}
      <Button disabled={!completed} onClick={() => navigate('/buyer/my-skills/invoice-field-extractor')}>{completed ? 'Open demo skill' : <><LockKeyhole size={18} />Skill delivery locked</>} {completed && <ArrowRight size={18} />}</Button><Button variant="outline" disabled={!completed} onClick={() => setModal('receipt')}>View demo receipt</Button>
      <Link className="delivery-agreement" to="/buyer/evaluations/review">View approved agreement</Link><p className="delivery-note"><Info size={18} />This is a frontend simulation. No PayPal transaction exists.</p>
      {!passed && <Button variant="quiet" onClick={() => { dispatch({ type: 'reset' }); navigate('/buyer/evaluations/new') }}>Start a new demo</Button>}
    </aside></div><DemoDisclosure />
    {completed && modal === 'receipt' && <DemoReceipt agreement={agreement} onClose={() => setModal(null)} />}
  </EvaluationLayout>
}
