import { ArrowRight, Check, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BuyerWorkspaceLayout } from '../../components/layout/BuyerWorkspaceLayout'
import type { ReactNode } from 'react'
import './evaluation.css'

export function EvaluationLayout({ children, title, className = '' }: { children: ReactNode; title: string; className?: string }) {
  return <BuyerWorkspaceLayout breadcrumb={<><Link to="/buyer?panel=evaluations">Evaluations</Link><span>/</span><span aria-current="page">{title}</span></>}><main id="buyer-main" className={`evaluation-main ${className}`}>{children}</main></BuyerWorkspaceLayout>
}
export function TestSteps({ current }: { current: number }) {
  return <ol className="test-steps" aria-label="Evaluation steps">{['Test setup', 'Review & authorize', 'Results'].map((label, index) => <li key={label} aria-current={current === index + 1 ? 'step' : undefined} className={current > index + 1 ? 'is-complete' : ''}><span>{current > index + 1 ? <Check size={20} /> : index + 1}</span>{label}</li>)}</ol>
}
export function DemoDisclosure() {
  return <p className="evaluation-disclosure"><Info size={16} />Frontend simulation. No model runs, payment operations or actual skill delivery.</p>
}
export function WorkflowGate({ title = 'Start with your test agreement.' }: { title?: string }) {
  return <section className="workflow-gate"><Info size={32} /><h1>{title}</h1><p>No authorization or result is restored from a URL or page reload. Set up the test and explicitly approve the demo terms first.</p><Link className="button button--primary" to="/buyer/evaluations/new">Set up a test <ArrowRight size={18} /></Link></section>
}
