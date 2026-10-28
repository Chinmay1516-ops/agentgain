import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, FileJson, FileText, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { draftStorageKey, useTestWorkflow } from '../../hooks/useTestWorkflow'
import { createTestDraft } from '../../services/mock/testFixtures'
import { validateRecords, validateRules } from '../../services/testValidation'
import { DemoDisclosure, EvaluationLayout, TestSteps } from './EvaluationShared'
import type { CheckedRecord } from '../../types/testWorkflow'

export function TestSetupPage() {
  const { state, dispatch } = useTestWorkflow()
  const navigate = useNavigate()
  const draft = state.draft
  const [accuracy, setAccuracy] = useState(String(draft.accuracy))
  const [improvement, setImprovement] = useState(String(draft.improvement))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [record, setRecord] = useState<CheckedRecord | null>(null)
  const [formatOpen, setFormatOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadSequence = useRef(0)
  const frozen = state.payment !== 'NOT_AUTHORIZED'
  const ruleError = accuracy === '' || improvement === '' ? 'Enter both pass rules.' : validateRules(Number(accuracy), Number(improvement))
  const currentDraft = () => ({ ...draft, accuracy: Number(accuracy), improvement: Number(improvement) })
  const replace = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    const sequence = ++uploadSequence.current
    setError(''); setMessage(''); setBusy(true)
    try {
      if (!file.name.toLowerCase().endsWith('.json') || file.size > 500_000) throw new Error('Choose a JSON file no larger than 500 KB.')
      const records = validateRecords(JSON.parse(await file.text()))
      if (sequence !== uploadSequence.current) return
      dispatch({ type: 'draft', draft: { ...draft, filename: file.name.slice(0, 200), source: 'local', records } })
      setMessage(`${records.length} ${records.length === 1 ? 'record' : 'records'} passed format checks. Answer correctness and independence are not verified.`)
    } catch (cause) { if (sequence === uploadSequence.current) setError(cause instanceof SyntaxError ? 'This file is not valid JSON.' : (cause as Error).message) }
    finally { if (sequence === uploadSequence.current) setBusy(false) }
  }
  const save = () => {
    if (ruleError || error || busy) return
    try { const value = currentDraft(); sessionStorage.setItem(draftStorageKey, JSON.stringify(value)); dispatch({ type: 'draft', draft: value }); setMessage('Draft saved in this browser tab’s session. No payment or agreement approval was saved.') }
    catch { setError('Draft could not be saved. Browser storage may be full or unavailable.') }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ruleError || error || busy || frozen) return
    dispatch({ type: 'draft', draft: currentDraft() }); dispatch({ type: 'review' }); navigate('/buyer/evaluations/review')
  }
  return <EvaluationLayout title="New test"><TestSteps current={1} />
    <form className="evaluation-columns setup-columns" onSubmit={submit} noValidate>
      <div><header className="evaluation-heading"><h1>Define what passing means.</h1><p>Invoice field extractor · v1.0</p></header>
        <section className="evaluation-card setup-card"><h2>Your checked examples</h2>
          {draft.source === 'demo' && <label className="demo-scenario">Illustrative example set<select value={draft.scenario ?? 'standard'} disabled={frozen || busy} onChange={event => { const next = createTestDraft(event.target.value === 'below-target' ? 'below-target' : 'standard'); dispatch({ type: 'draft', draft: { ...next, accuracy: draft.accuracy, improvement: draft.improvement } }); setError(''); setMessage('Example set changed. Review and approve new terms before testing.'); }}><option value="standard">Standard example · 90% with skill</option><option value="below-target">Alternative example · 80% with skill</option></select></label>}
          <div className="dataset-box"><span className="dataset-icon"><FileText size={29} /></span><div className="dataset-copy"><div><strong>{draft.filename}</strong><span className="format-valid"><Check size={17} />{draft.records.length} {draft.records.length === 1 ? 'record' : 'records'} · format valid</span></div><p>{draft.source === 'demo' ? 'Synthetic examples with illustrative checked answers.' : 'Local examples. Correctness and independence are not verified.'}</p></div><Button type="button" variant="quiet" onClick={() => inputRef.current?.click()} disabled={busy || frozen}>{busy ? 'Reading…' : 'Replace file'}</Button><input ref={inputRef} className="sr-only" type="file" accept=".json,application/json" onChange={replace} aria-label="Replace checked examples file" disabled={frozen} /></div>
          <div className="table-scroll" tabIndex={0} aria-label="Example records"><table className="evaluation-table"><thead><tr><th>Record</th><th>Input</th><th>Checked answer</th></tr></thead><tbody>{draft.records.slice(0, 3).map(item => <tr key={item.id}><th scope="row">{item.id}</th><td><button type="button" className="record-file" onClick={() => setRecord(item)}><FileText size={19} />{item.id}.txt</button></td><td><button type="button" className="record-file" onClick={() => setRecord(item)}><FileJson size={19} />{item.id}-expected.json</button></td></tr>)}</tbody></table></div>
          <div className="dataset-tools"><span>Showing {Math.min(3, draft.records.length)} of {draft.records.length} examples</span><button type="button" onClick={() => setFormatOpen(true)}>JSON format</button><button type="button" disabled={frozen || busy} onClick={() => { dispatch({ type: 'reset' }); setAccuracy('90'); setImprovement('20'); setError(''); setMessage('Illustrative examples restored.'); }}>Use demo examples</button></div>
          <section className="setup-section"><h3>Required fields</h3><p>A record matches only when all three fields match its checked answer.</p><div className="required-fields"><span>Invoice number</span><span>Total</span><span>Currency</span></div></section>
          <section className="setup-section"><h3>Pass rules</h3><p>Set the minimum performance required for this illustrative comparison.</p><div className="pass-rule-inputs"><label>Minimum checked accuracy<span><input type="number" min="1" max="100" step="any" value={accuracy} onChange={e => { setAccuracy(e.target.value); setMessage('') }} disabled={frozen} aria-invalid={!!ruleError} />%</span></label><label>Minimum improvement<span><input type="number" min="0" max="100" step="any" value={improvement} onChange={e => { setImprovement(e.target.value); setMessage('') }} disabled={frozen} aria-invalid={!!ruleError} />percentage points</span></label></div><p className="rule-equivalent">{ruleError ?? `At least ${Math.ceil(Number(accuracy) * draft.records.length / 100)} of ${draft.records.length} matching records and a ${improvement}-point gain over baseline.`}</p></section>
          {(error || ruleError) && <p className="form-error" role="alert">{error || ruleError}</p>}{message && <p className="form-message" role="status">{message}</p>}
        </section>
      </div>
      <aside className="setup-summary"><div className="evaluation-building" role="img" aria-label="Glass office building in daylight" /><section className="evaluation-card"><h2>Test summary</h2><dl className="test-summary-list"><div><dt>Skill version</dt><dd>v1.0</dd></div><div><dt>Examples</dt><dd>{draft.records.length}</dd></div><div><dt>Demo price</dt><dd>USD 12.00</dd></div><div><dt>Payment</dt><dd>{frozen ? 'Simulation already started' : 'Not authorized'}</dd></div></dl><p className="privacy-note"><ShieldCheck size={23} />Files stay in this browser. Save draft stores examples only in this tab’s session.</p><p className="setup-scope">Free-alternative and economic checks are not supplied in this illustration. Full purchase qualification remains unverified.</p><Button type="submit" disabled={!!ruleError || !!error || busy || frozen}>Review test terms <ArrowRight size={20} /></Button><Button type="button" variant="outline" onClick={save} disabled={!!ruleError || !!error || busy || frozen}>Save draft</Button>{frozen && <Button type="button" variant="quiet" onClick={() => { dispatch({ type: 'reset' }); setAccuracy('90'); setImprovement('20'); setError(''); setMessage('New illustrative draft started.'); }}>Start a new demo</Button>}</section></aside>
    </form><DemoDisclosure />
    {record && <Modal title={`Example — ${record.id}`} onClose={() => setRecord(null)}><p className="modal-lead">These labels preview text and checked-answer data; no PDF is uploaded or parsed.</p><h3>Input text</h3><pre className="record-preview">{record.input}</pre><h3>Checked answer</h3><pre className="record-preview">{JSON.stringify(record.expected, null, 2)}</pre></Modal>}
    {formatOpen && <Modal title="Checked examples JSON format" onClose={() => setFormatOpen(false)}><p className="modal-lead">A JSON array of 1–200 unique records, no larger than 500 KB. Input is plain text; total is a decimal string without commas. Format checks cannot verify that answers are correct or independently held out.</p><pre className="record-preview">{JSON.stringify([createTestDraft().records[0]], null, 2)}</pre></Modal>}
  </EvaluationLayout>
}
