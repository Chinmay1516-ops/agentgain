import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, FileText, Link2, LockKeyhole, Plus } from 'lucide-react'
import { SellerShell } from '../../components/layout/SellerShell'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useSellerWorkspace } from '../../hooks/useSellerWorkspace'
import { sellerActivityFixtures } from '../../services/mock/sellerService'
import type { SellerActivity, SellerActivityStatus, SellerListing } from '../../types/seller'

const activityLabels: Record<SellerActivityStatus, string> = {
  TESTING: 'Testing in progress', PAYMENT_PENDING: 'Checks passed · Payment pending',
  DELIVERED: 'Payment completed · Skill delivered', FAILED: 'Checks failed · No capture',
}
const activityDetails: Record<SellerActivityStatus, { evaluation: string; payment: string; delivery: string }> = {
  TESTING: { evaluation: 'In progress', payment: 'Authorized · capture not started', delivery: 'Locked' },
  PAYMENT_PENDING: { evaluation: 'Checks passed', payment: 'Capture pending · not confirmed', delivery: 'Locked' },
  DELIVERED: { evaluation: 'Checks passed', payment: 'COMPLETED · simulated capture', delivery: 'Delivered · demo fixture' },
  FAILED: { evaluation: 'Checks failed', payment: 'Not captured · authorization voided', delivery: 'Locked' },
}

export function SellerOverviewPage() {
  const { listings } = useSellerWorkspace()
  const location = useLocation()
  const [copied, setCopied] = useState(false)
  const [manualLink, setManualLink] = useState('')
  const [listing, setListing] = useState<SellerListing | null>(null)
  const [activity, setActivity] = useState<SellerActivity | null>(null)
  const demoListing = listings.find(item => item.id === 'invoice-demo')!
  useEffect(() => {
    if (!['#listings', '#activity'].includes(location.hash)) return
    const section = document.getElementById(location.hash.slice(1))
    section?.scrollIntoView?.({ block: 'start' }); section?.focus({ preventScroll: true })
  }, [location.hash, location.key])
  const copyLink = async () => {
    const url = new URL(demoListing.buyerPreview!, window.location.origin).href
    setCopied(false)
    try { await navigator.clipboard.writeText(url); setCopied(true) }
    catch { setManualLink(url) }
  }
  return <SellerShell><main id="seller-main" className="seller-overview">
    <header className="seller-hero">
      <div className="seller-hero-copy"><h1>Your skills, ready<br />to prove themselves.</h1><p>Publish a version. Share it. Let buyers test the fit.</p></div>
      <Link className="button button--primary" to="/seller/register">Register a skill <Plus size={19} /></Link>
    </header>
    <div className="seller-overview-content">
      <section id="listings" className="seller-card seller-listings" tabIndex={-1} aria-labelledby="listings-heading">
        <div className="seller-section-heading"><h2 id="listings-heading">My listings</h2><span>Local demo workspace</span></div>
        <p className="seller-scroll-hint">Scroll the table to see all columns and actions.</p>
        <div className="seller-table-scroll" role="region" aria-label="Skill listings" tabIndex={0}>
          <table className="seller-table listing-table"><thead><tr><th scope="col">Skill</th><th scope="col">Version</th><th scope="col">Availability</th><th scope="col">Price</th><th scope="col">Actions</th></tr></thead>
            <tbody>{listings.map(item => <tr key={item.id}>
              <td><div className="seller-listing-name"><span className="seller-document"><FileText size={29} /></span><div><strong>{item.draft.name}</strong><p>{item.draft.description}</p></div></div></td>
              <td>{item.draft.version}</td><td><span className={`seller-badge seller-badge--${item.status.toLowerCase()}`}>{item.status === 'DRAFT' ? 'Draft' : item.status === 'LOCAL' ? 'Registered locally' : 'Available for demo testing'}</span></td>
              <td className="seller-price">{item.status === 'DRAFT' ? '—' : `USD ${item.draft.price}`}</td>
              <td><div className="seller-listing-actions">{item.status === 'DRAFT' ? <Link className="button button--outline" to={`/seller/register?draft=${encodeURIComponent(item.id)}`}>Continue editing</Link> : item.buyerPreview ? <><Link className="button button--primary" to={item.buyerPreview}>View listing</Link><Button variant="outline" onClick={copyLink}><Link2 size={17} />Copy demo link</Button></> : <Button variant="outline" onClick={() => setListing(item)}>View local package <ArrowRight size={16} /></Button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <div className="seller-bottom-grid">
        <section id="activity" className="seller-card seller-activity" tabIndex={-1} aria-labelledby="activity-heading">
          <div className="seller-section-heading"><h2 id="activity-heading">Evaluation activity</h2><span>Historical fixtures · no live transactions</span></div>
          <p className="seller-scroll-hint">Scroll the table to see all columns.</p>
          <div className="seller-table-scroll" role="region" aria-label="Illustrative evaluation activity" tabIndex={0}>
            <table className="seller-table activity-table"><thead><tr><th scope="col">ID</th><th scope="col">Buyer skill test</th><th scope="col">Skill</th><th scope="col">Started</th><th scope="col">Status</th></tr></thead><tbody>{sellerActivityFixtures.map(item => <tr key={item.id}><td><button className="seller-id-link" onClick={() => setActivity(item)} aria-label={`View ${item.id} status`}>{item.id}</button></td><td>{item.buyerLabel}</td><td>{item.skill} {item.version}</td><td>{item.started}</td><td><span className={`seller-badge seller-badge--${item.status.toLowerCase()}`}>{activityLabels[item.status]}</span></td></tr>)}</tbody></table>
          </div>
          <p className="seller-hint"><LockKeyhole size={14} />Buyer examples and checked answers stay private.</p>
        </section>
        <aside className="seller-card seller-share"><span className="seller-share-icon"><Link2 size={43} strokeWidth={1.5} /></span><h2>Share your skill</h2><p>Open the buyer’s view of the invoice demo.</p><Button variant="outline" onClick={copyLink}><Link2 size={18} />Copy demo link</Button><p className="seller-share-note">Demo listing preview, not a live checkout. Localhost links work only on this computer.</p><p className="seller-copy-status" role="status">{copied ? 'Demo listing link copied.' : ''}</p></aside>
      </div>
      <p className="seller-session-note">Registrations stay in this open session and reset on reload. Nothing is published to a server.</p>
    </div>
    {manualLink && <Modal title="Copy the demo listing link" onClose={() => setManualLink('')}><p className="modal-lead">Automatic clipboard access was unavailable.</p><label className="seller-field">Demo listing URL<input readOnly value={manualLink} onFocus={event => event.target.select()} /></label><p className="modal-note">Select and copy this URL manually. This is the invoice preview on this host; localhost links cannot be opened on another computer.</p></Modal>}
    {listing && <Modal title="Local package details" onClose={() => setListing(null)}><p className="modal-lead">{listing.draft.name} · {listing.draft.version}</p><p>{listing.draft.description}</p><dl className="draft-details"><div><dt>Illustrative price</dt><dd>USD {listing.draft.price}</dd></div><div><dt>Category</dt><dd>{listing.draft.category}</dd></div><div><dt>Licence terms</dt><dd>{listing.draft.licence}</dd></div></dl><h3 className="hash-heading">SHA-256 · demo package</h3><code className="seller-hash">{listing.contentHash}</code><details className="seller-package-text"><summary>View fixed instructions and public example</summary><h3>Instructions</h3><pre>{listing.draft.instructions}</pre><h3>Public input</h3><pre>{listing.draft.exampleInput}</pre><h3>Public output</h3><pre>{listing.draft.exampleOutput}</pre></details><p className="modal-note">This version is registered only in this session. A checkout for custom packages requires backend integration; no buyer checkout link has been created.</p></Modal>}
    {activity && <Modal title={`${activity.id} · illustrative status`} onClose={() => setActivity(null)}><p className="modal-lead">{activity.skill} · {activity.version}</p><p>Historical demo fixture. No evaluation or payment was executed.</p><dl className="draft-details"><div><dt>Evaluation</dt><dd>{activityDetails[activity.status].evaluation}</dd></div><div><dt>Payment</dt><dd>{activityDetails[activity.status].payment}</dd></div><div><dt>Skill delivery</dt><dd>{activityDetails[activity.status].delivery}</dd></div></dl><p className="modal-note">Buyer examples, checked answers and record-level results are not exposed in the seller workspace.</p></Modal>}
  </main></SellerShell>
}
