import { Modal } from '../ui/Modal'
import type { TestAgreement } from '../../types/testWorkflow'

export function DemoReceipt({ agreement, onClose }: { agreement: TestAgreement; onClose: () => void }) {
  const { draft } = agreement
  return <Modal title="Demo receipt — no actual payment" onClose={onClose}><p className="modal-lead">A local illustration of the receipt fields. This is not a payment receipt or proof of ownership.</p><dl className="receipt-details"><div><dt>Skill</dt><dd>{agreement.skill} · {agreement.version}</dd></div><div><dt>Illustrative amount</dt><dd>USD 12.00 · skill licence only</dd></div><div><dt>Demo capture state</dt><dd>COMPLETED (simulated)</dd></div><div><dt>Test snapshot</dt><dd>{draft.filename} · {draft.records.length} records</dd></div><div><dt>Displayed rules</dt><dd>{draft.accuracy}% accuracy; {draft.improvement}-point gain</dd></div><div><dt>Skill hash / PayPal reference</dt><dd>Not available — no package hash or transaction was created.</dd></div></dl><p className="modal-note">The downloadable text is an illustrative instruction sample. No authenticated seller package, purchased licence or independently verified evaluation is available.</p></Modal>
}
