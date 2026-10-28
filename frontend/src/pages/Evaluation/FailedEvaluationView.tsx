import { useState } from 'react'
import { ArrowRight, Box, Check, ChevronRight, CircleAlert, CreditCard, Info, LockKeyhole, Shield, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useTestWorkflow } from '../../hooks/useTestWorkflow'
import { illustrativeOutput, illustrativeSummary, matchesFields } from '../../services/mock/testFixtures'
import type { InvoiceFields } from '../../types/testWorkflow'
import { DemoDisclosure, EvaluationLayout } from './EvaluationShared'
import './failure.css'

export function FailedEvaluationView() {
  const { state, dispatch } = useTestWorkflow()
  const navigate = useNavigate()
  const [all, setAll] = useState(false)
  const [detail, setDetail] = useState<'accuracy' | 'improvement' | null>(null)
  const { draft, skill, version } = state.agreement!
  const summary = illustrativeSummary(draft.records, draft.scenario)
  const accuracyMet = summary.skilledPercent >= draft.accuracy
  const improvementMet = summary.improvement >= draft.improvement
  const mismatches = draft.records.flatMap((record, index) => {
    const output = illustrativeOutput(record, index, 'skill', draft.scenario)
    if (matchesFields(record.expected, output)) return []
    const field = (Object.keys(output) as (keyof InvoiceFields)[]).find(key => output[key] !== record.expected[key])!
    return [{ id: record.id, field, expected: record.expected[field], actual: output[field] }]
  })
  return <EvaluationLayout title="Run results" className="failure-page"><div className="evaluation-columns failure-columns"><div>
    <header className="failure-heading"><span className="failure-label"><CircleAlert size={18} />Checks not met</span><h1>This skill didn’t meet your checks.</h1><p>{skill} <span>·</span> {version} <span>·</span> Alternative demo outcome</p><p className="failure-explanation">{!accuracyMet ? `Your agreed accuracy requirement was ${draft.accuracy}%. This run reached ${summary.skilledPercent}%.` : `Your agreed improvement requirement was ${draft.improvement} points. This run gained ${summary.improvement} points.`}</p></header>
    <section className="evaluation-card failure-metrics" aria-label="Illustrative failed comparison"><div><h2>Baseline</h2><strong>{summary.baselinePercent}%</strong><p>{summary.baseline} of {draft.records.length} records</p></div><div><h2>With skill</h2><strong>{summary.skilledPercent}%</strong><p>{summary.skilled} of {draft.records.length} records</p></div><div><h2>Required</h2><strong>{draft.accuracy}%</strong><p>At least {Math.ceil(draft.accuracy * draft.records.length / 100)} of {draft.records.length} records</p></div></section>
    <section className="evaluation-card failure-evidence"><h2>What did not pass</h2><div className="failed-checks">{[{ key: 'accuracy' as const, label: 'Checked accuracy', value: `${summary.skilledPercent}% / ${draft.accuracy}% required`, met: accuracyMet }, { key: 'improvement' as const, label: 'Improvement', value: `${summary.improvement} points / ${draft.improvement} required`, met: improvementMet }].map(rule => <button key={rule.key} onClick={() => setDetail(rule.key)}><span className={`rule-icon ${rule.met ? 'met' : ''}`}>{rule.met ? <Check /> : <X />}</span><span><strong>{rule.label}</strong><small>{rule.value}<span className="sr-only"> — {rule.met ? 'met' : 'not met'}</span></small></span><ChevronRight size={18} /></button>)}</div>
      <h3>Records to review</h3><p>Examples that did not match their checked answers.</p><div className="table-scroll" tabIndex={0} aria-label="Failed records"><table className="evaluation-table failure-table"><thead><tr><th>Record</th><th>Checked answer<small>(expected value)</small></th><th>Skill output<small>(demo fixture)</small></th></tr></thead><tbody>{(all ? mismatches : mismatches.slice(0, 2)).map(record => <tr key={record.id}><th scope="row">{record.id}<small>{record.field === 'currency' ? 'Currency' : record.field === 'total' ? 'Total' : 'Invoice number'}</small></th><td>{record.expected}</td><td>{record.actual}</td></tr>)}</tbody></table></div><Button variant="outline" aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? 'Show first two records' : 'Review failed records'} <ArrowRight size={18} /></Button><p className="failed-count">Showing {Math.min(all ? mismatches.length : 2, mismatches.length)} of {mismatches.length} mismatched records.</p>
    </section></div>
    <aside className="evaluation-card failure-payment"><div className="failure-building" role="img" aria-label="Illuminated glass office building" /><h2>Payment &amp; delivery</h2><p>PayPal Sandbox · illustrative demo</p><dl>{[{ icon: CreditCard, label: 'Payment', status: 'Not captured' }, { icon: Shield, label: 'Authorization', status: 'Demo voided' }, { icon: Box, label: 'Skill delivery', status: 'Locked' }].map(item => <div key={item.label}><dt><span><item.icon size={24} /></span>{item.label}</dt><dd>{item.status}</dd></div>)}</dl><Button disabled><LockKeyhole size={19} />Download skill</Button><Link className="button button--primary" to="/buyer/skills">Explore another skill <ArrowRight size={19} /></Link><Button variant="outline" onClick={() => { dispatch({ type: 'reset' }); navigate('/buyer/evaluations/new') }}>Create a new test</Button><p className="failure-note"><Info size={19} />A new test requires new agreed terms. No real authorization or payment exists.</p></aside>
    </div><p className="evaluation-disclosure"><Info size={16} />Synthetic comparison only. Free-alternative and economic qualification remain unverified.</p><DemoDisclosure />
    {detail && <Modal title={detail === 'accuracy' ? 'Checked accuracy rule' : 'Improvement rule'} onClose={() => setDetail(null)}><p className="modal-lead">{detail === 'accuracy' ? `${summary.skilled} of ${draft.records.length} records match all three fields: ${summary.skilledPercent}% accuracy. The agreement requires at least ${draft.accuracy}%.` : `${summary.skilledPercent}% with skill minus ${summary.baselinePercent}% baseline equals ${summary.improvement} percentage points. The agreement requires at least ${draft.improvement} points.`}</p><p>This rule is {detail === 'accuracy' ? (accuracyMet ? 'met' : 'not met') : (improvementMet ? 'met' : 'not met')}. Both rules must be met to pass the illustrative comparison. No model was run.</p></Modal>}
  </EvaluationLayout>
}
