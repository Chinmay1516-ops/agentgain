import { ArrowRight, CircleAlert, FileText, Info, Play, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import type { BuyerPanel } from '../../components/layout/BuyerShell'
import type { BuyerOverview, EvaluationDraft } from '../../types/buyer'

export function PreparationBadge({ state }: { state: EvaluationDraft['preparation'] }) {
  return <span className={`preparation-badge ${state === 'READY' ? 'preparation-badge--ready' : 'preparation-badge--draft'}`}>{state === 'READY' ? <Play size={14} fill="currentColor" /> : <FileText size={17} />}{state === 'READY' ? 'Ready to test' : 'Draft'}</span>
}

export function EvaluationRow({ evaluation, select }: { evaluation: EvaluationDraft; select: () => void }) {
  return <button className="evaluation-row" onClick={select} aria-label={`View ${evaluation.name}`}>
    <span className={`evaluation-tile evaluation-tile--${evaluation.kind}`}>{evaluation.kind === 'invoice' ? <FileText /> : <Tag />}</span>
    <span className="evaluation-copy"><strong>{evaluation.name}</strong><small>{evaluation.seller}<span>•</span>{evaluation.version}<span>•</span>{evaluation.recordCount} test records</small></span>
    <PreparationBadge state={evaluation.preparation} /><ArrowRight className="evaluation-chevron" size={19} />
  </button>
}

export function BuyerDialogs({ panel, overview, close, openPanel }: { panel: BuyerPanel; overview: BuyerOverview | null; close: () => void; openPanel: (value: BuyerPanel) => void }) {
  if (panel === 'explore') return <Modal title="Explore skills" onClose={close}><p className="modal-lead">Find a skill to test against your checked examples and a credible free alternative.</p><div className="notice"><Info size={20} /><p>Skill discovery is not available in this frontend preview yet. No skill has been selected and no checkout has been started.</p></div><Button onClick={close}>Back to overview</Button></Modal>
  if (panel === 'profile') return <Modal title="Your buyer profile" onClose={close}><div className="buyer-profile-detail"><span className="profile-avatar">{overview?.profile.initials ?? '…'}</span><div><strong>{overview?.profile.displayName ?? 'Profile unavailable'}</strong><p>Buyer · fictional demo profile</p></div></div><p className="modal-lead">This workspace uses illustrative data. Choosing Buyer does not sign you in or grant account permissions.</p><Button onClick={close}>Back to overview</Button></Modal>
  if (panel === 'workspace') return <Modal title="Your current workspace" onClose={close}><p className="modal-lead">{overview?.currentTask.title ?? 'Task unavailable'}</p><div className="notice"><CircleAlert size={20} /><p>“Needs a better result” is an illustrative buyer-reported concern, not a measured accuracy score. No evaluation has run for this task.</p></div><p className="fine-print">The building is a visual guide. This preview uses static artwork and does not support 3D rotation.</p><Button onClick={() => openPanel('explore')}>Find a matching skill <ArrowRight size={18} /></Button></Modal>
  if (panel === 'evaluations') return <Modal title="Recent evaluations" onClose={close}><p className="modal-lead">Illustrative preparation records. No payment has been authorized and no evaluation has run.</p>{overview?.evaluations.length ? <div className="dialog-evaluation-list">{overview.evaluations.map(item => <EvaluationRow key={item.id} evaluation={item} select={() => openPanel(item.id as BuyerPanel)} />)}</div> : <p className="modal-lead">No evaluation records are available.</p>}</Modal>
  const evaluation = overview?.evaluations.find(item => item.id === panel)
  return <Modal title={evaluation?.name ?? 'Evaluation details'} onClose={close}>{evaluation ? <>
    <p className="modal-lead">{evaluation.seller} · {evaluation.version} · {evaluation.recordCount} test records<br />Illustrative demo data</p>
    <PreparationBadge state={evaluation.preparation} />
    <dl className="draft-details"><div><dt>Preparation</dt><dd>{evaluation.preparation === 'READY' ? 'Example records prepared' : 'Draft setup'}</dd></div><div><dt>Approved contract</dt><dd>Not yet approved</dd></div><div><dt>Payment authorization</dt><dd>Not authorized</dd></div><div><dt>Evaluation result</dt><dd>Not run</dd></div><div><dt>Skill delivery</dt><dd>Not purchased</dd></div></dl>
    <div className="notice"><Info size={20} /><p>“Ready to test” describes this sample’s preparation only. A frozen contract and confirmed authorization are required before evaluation. These static preparation records are separate from the interactive evaluation demo.</p></div>
    {evaluation.kind === 'invoice' && <Link className="button button--primary" to="/buyer/evaluations/new" onClick={close}>Open test setup <ArrowRight size={18} /></Link>}
    <Button variant="outline" onClick={() => openPanel('evaluations')}>Back to evaluations</Button>
  </> : <p className="modal-lead">This evaluation is unavailable. Close this dialog and retry loading the workspace.</p>}</Modal>
}
