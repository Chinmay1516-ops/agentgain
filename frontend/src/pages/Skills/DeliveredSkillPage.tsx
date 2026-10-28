import { useState } from 'react'
import { ArrowRight, ChartNoAxesColumn, Check, Copy, Download, FileText, Info, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BuyerWorkspaceLayout } from '../../components/layout/BuyerWorkspaceLayout'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { DemoReceipt } from '../../components/shared/DemoReceipt'
import { hasDemoDelivery, useTestWorkflow } from '../../hooks/useTestWorkflow'
import '../Evaluation/evaluation.css'
import './delivered-skill.css'

export function DeliveredSkillPage() {
  const { state } = useTestWorkflow()
  const [receipt, setReceipt] = useState(false)
  const [retry, setRetry] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [copyError, setCopyError] = useState(false)
  const [copying, setCopying] = useState(false)
  const unlocked = hasDemoDelivery(state)
  const agreement = state.agreement
  const copy = async () => {
    if (!unlocked || !agreement) return
    setCopying(true); setFeedback(''); setCopyError(false)
    try { await navigator.clipboard.writeText(agreement.instructionText); setFeedback('Instructions copied.') }
    catch { setCopyError(true); setFeedback('Clipboard access was unavailable. Select and copy the instructions below.') }
    finally { setCopying(false) }
  }
  const download = () => {
    if (!unlocked || !agreement) return
    const text = `AGENTGAIN DEMO · ${agreement.skill} · ${agreement.version}\nIllustrative text sample. No actual purchase, verified model run or seller licence.\n\n${agreement.instructionText}\n`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'agentgain-invoice-field-extractor-v1.0-demo.txt'; document.body.append(anchor); anchor.click(); anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setCopyError(false); setFeedback('Demo text download requested. No executable files are included.')
  }
  return <BuyerWorkspaceLayout breadcrumb={<><span>My skills</span><span>/</span><span aria-current="page">Invoice field extractor</span></>}><main id="buyer-main" className="evaluation-main delivered-page">
    {!unlocked || !agreement ? <section className="workflow-gate"><LockKeyhole size={34} /><h1>Your skill is still locked.</h1><p>A passing result and confirmed completed demo capture are required. Opening this URL or reloading does not grant access.</p><Link className="button button--primary" to={state.approved ? '/buyer/evaluations/results' : '/buyer/evaluations/new'}>{state.approved ? 'Return to evaluation' : 'Set up a test'} <ArrowRight size={18} /></Link></section> : <>
      <header className="delivered-heading"><div><h1>Your tested skill is ready.</h1><p>The fixed instruction sample from your demo agreement.</p></div><span className="delivered-pill"><Check size={18} />Demo payment captured</span></header>
      <div className="evaluation-columns delivered-columns"><div><section className="evaluation-card delivered-package"><div className="delivered-summary"><div className="delivered-illustration"><img src="/images/skill-invoice.png" alt="Glass invoice document illustration" /></div><div><h2>{agreement.skill}</h2><p className="delivered-seller">Demo Studio <span>·</span> {agreement.version}</p><span className="delivered-pill"><Check size={17} />Demo access unlocked</span><dl><div><dt>Tested version</dt><dd>{agreement.version} · illustrative</dd></div><div><dt>Evaluation</dt><dd>Displayed demo checks passed</dd></div><div><dt>Payment</dt><dd>USD 12.00 · simulated capture</dd></div></dl></div></div>
        <section className="skill-instructions"><div><h3>Skill instructions</h3><span>TEXT-ONLY SAMPLE</span></div><pre tabIndex={0} aria-label="Skill instructions text">{agreement.instructionText}</pre><div className="skill-download-actions"><Button onClick={download}><Download size={19} />Download demo skill</Button><Button variant="outline" onClick={copy} disabled={copying}><Copy size={19} />{copying ? 'Copying…' : 'Copy instructions'}</Button></div>{feedback && <p className={copyError ? 'form-error' : 'form-message'} role={copyError ? 'alert' : 'status'}>{feedback}</p>}</section>
      </section><section className="evaluation-card put-to-work"><span className="dataset-icon"><FileText size={25} /></span><div><h2>Put it to work</h2><p>Return to your original task with this skill.</p></div><button onClick={() => setRetry(true)}>Retry original task <ArrowRight size={18} /></button></section></div>
      <aside className="evaluation-card purchase-record"><div className="delivered-building" role="img" aria-label="Glass office building at sunset" /><h2>Purchase record</h2><dl><div><dt>Version</dt><dd>{agreement.version}</dd></div><div><dt>Payment method</dt><dd>PayPal Sandbox preview</dd></div><div><dt>Amount</dt><dd>USD 12.00</dd></div><div><dt>Status</dt><dd className="purchase-captured"><Check size={18} />Demo captured</dd></div></dl><div className="purchase-record-links"><button onClick={() => setReceipt(true)}><FileText size={23} />View demo receipt <ArrowRight size={17} /></button><Link to="/buyer/evaluations/results"><ChartNoAxesColumn size={23} />View test evidence <ArrowRight size={17} /></Link></div><p><Info size={20} />Demo access unlocked after simulated completed capture.</p></aside></div>
      <p className="evaluation-disclosure"><Info size={16} />Illustrative text download only. No real PayPal payment, seller licence or model execution. Free-alternative and economic qualification remain unverified.</p>
      {receipt && <DemoReceipt agreement={agreement} onClose={() => setReceipt(false)} />}
      {retry && <Modal title="Return to your original task" onClose={() => setRetry(false)}><p className="modal-lead">Copy the instructions into your agent to retry your original task. This frontend is not connected to your agent and has not run that task.</p><p>Any later task result must be recorded separately from the demo evaluation. No post-purchase outcome is available yet.</p><Button onClick={() => { setRetry(false); void copy() }}><Copy size={18} />Copy instructions for my agent</Button></Modal>}
    </>}
  </main></BuyerWorkspaceLayout>
}
