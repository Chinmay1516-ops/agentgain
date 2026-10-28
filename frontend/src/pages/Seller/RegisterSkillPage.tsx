import { useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Box, Check, CreditCard, FileText, Info } from 'lucide-react'
import { SellerShell } from '../../components/layout/SellerShell'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useSellerWorkspace } from '../../hooks/useSellerWorkspace'
import { createSellerDraft, demoSellerPolicy, sellerErrors, type SellerErrors } from '../../services/mock/sellerService'
import type { SellerDraft, SellerListing } from '../../types/seller'

export function RegisterSkillPage() {
  const [params] = useSearchParams()
  return <RegistrationForm key={params.get('draft') ?? 'new'} />
}

function RegistrationForm() {
  const workspace = useSellerWorkspace()
  const [params] = useSearchParams()
  const editingId = params.get('draft')
  const editing = workspace.listings.find(item => item.id === editingId && item.status === 'DRAFT')
  const draftKey = editingId ?? 'new'
  const [value, setValue] = useState<SellerDraft>(() => structuredClone((Object.hasOwn(workspace.drafts, draftKey) ? workspace.drafts[draftKey] : undefined) ?? editing?.draft ?? createSellerDraft()))
  const [errors, setErrors] = useState<SellerErrors>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [registered, setRegistered] = useState<SellerListing | null>(null)
  const [confirmation, setConfirmation] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const locked = busy || !!registered
  const change = (key: keyof SellerDraft, text: string) => {
    const next = { ...value, [key]: text }; setValue(next); workspace.setDraft(editingId ?? 'new', next)
    setErrors(previous => ({ ...previous, [key]: undefined })); setError('')
  }
  const field = (key: keyof SellerDraft, label: string, multiline = false) => <label className="seller-field" htmlFor={`seller-${key}`}>{label}{multiline ? <textarea id={`seller-${key}`} name={key} aria-label={label} value={value[key]} onChange={event => change(key, event.target.value)} disabled={locked} rows={key === 'instructions' ? 3 : 2} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} maxLength={key === 'instructions' ? 10000 : 2000} /> : <input id={`seller-${key}`} name={key} aria-label={label} value={value[key]} onChange={event => change(key, event.target.value)} disabled={locked} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} maxLength={key === 'name' ? 100 : key === 'version' ? 30 : 2000} inputMode={key === 'price' ? 'decimal' : undefined} />}{errors[key] && <small id={`${key}-error`} className="seller-field-error">{errors[key]}</small>}</label>
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (locked) return
    const invalid = sellerErrors(value); setErrors(invalid)
    if (Object.keys(invalid).length) {
      setError('Correct the highlighted fields before registering.')
      if (invalid.licence || invalid.exampleInput || invalid.exampleOutput) setPolicyOpen(true)
      requestAnimationFrame(() => (form.current?.elements.namedItem(Object.keys(invalid)[0]) as HTMLElement | null)?.focus())
      return
    }
    setBusy(true); setError('')
    try { const listing = await workspace.register(value, editingId ?? undefined); setRegistered(listing); setConfirmation(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Registration could not complete. Please retry.') }
    finally { setBusy(false) }
  }
  if (editingId && !editing && !registered) return <SellerShell registering><main id="seller-main" className="seller-main"><section className="seller-empty"><h1>Draft not available.</h1><p>This URL does not identify an editable draft in this demo session.</p><Link className="button button--primary" to="/seller#listings">Back to my listings</Link></section></main></SellerShell>
  return <SellerShell registering><main id="seller-main" className="seller-main register-main"><form ref={form} noValidate onSubmit={submit} className="registration-grid"><div><header className="registration-heading"><h1>Give your skill a clear promise.</h1><p>Create a fixed version that buyers can test.</p></header>
    <section className="seller-card form-section"><h2><span>1</span>Describe the skill</h2><div className="seller-fields name-category">{field('name', 'Name')}<label className="seller-field" htmlFor="seller-category">Task category<select id="seller-category" value={value.category} onChange={event => change('category', event.target.value)} disabled={locked}>{['Documents', 'Operations', 'Commerce'].map(category => <option key={category}>{category}</option>)}</select></label></div>{field('description', 'Description', true)}</section>
    <section className="seller-card form-section"><h2><span>2</span>Define the version</h2><div className="seller-version-row">{field('version', 'Version')}<span>Text-only skill</span></div>{field('instructions', 'Skill instructions', true)}<div className="seller-fields">{field('expectedInput', 'Expected input')}{field('expectedOutput', 'Expected output')}</div></section>
    <section className="seller-card form-section"><h2><span>3</span>Set the offer</h2><div className="seller-fields">{field('price', 'Price')}<label className="seller-field" htmlFor="seller-currency">Currency<select id="seller-currency" value={value.currency} disabled={locked} onChange={event => change('currency', event.target.value)}><option>USD</option></select></label></div></section>
    <details className="seller-card package-policy" open={policyOpen} onToggle={event => setPolicyOpen(event.currentTarget.open)}><summary>Package policy and public example</summary>{field('licence', 'Licence terms', true)}{field('exampleInput', 'Public example input', true)}{field('exampleOutput', 'Public example output', true)}<h3>Published demo evaluation policy</h3><p>{demoSellerPolicy}</p><p>No file uploads or executable packages are accepted here. Public examples are separate from buyers’ private tests.</p></details>
    {error && <p className="seller-error" role="alert">{error}</p>}{registered && <p className="seller-success" role="status">Version registered locally. This form is now fixed; existing buyer agreements are unchanged.</p>}
    </div><aside className="seller-card listing-preview"><h2>Listing preview</h2><div className="listing-preview-scene" aria-hidden="true"><img src="/images/skill-invoice.png" alt="" /></div><h3>{value.name.trim() || 'Your skill name'}</h3><p className="preview-seller">Demo Studio <span>·</span> {value.version || 'Version'}</p><strong className="preview-price">{sellerErrors(value).price ? 'Set a valid price' : `USD ${Number(value.price).toFixed(2)}`}</strong><p className="illustrative-price">Illustrative price</p><div className="seller-checkout-steps"><p>Buyers test this version against their agreed checks.</p><ol>{[{ icon: CreditCard, label: 'Authorize' }, { icon: FileText, label: 'Test' }, { icon: Check, label: 'Capture' }, { icon: Box, label: 'Deliver' }].map(item => <li key={item.label}><item.icon size={25} /><span>{item.label}</span></li>)}</ol><small>Capture only after passing; delivery only after confirmed completed capture.</small></div><Button type="submit" disabled={locked}>{busy ? 'Registering…' : registered ? 'Registered locally' : 'Register this version'} {!registered && <ArrowRight size={18} />}</Button><Link className="button button--outline" to="/seller#listings">Back to my listings</Link><p className="seller-hint">New versions do not change existing agreements.</p><p className="seller-hint"><Info size={15} />Local demo only. No server publication or checkout is created. Reload resets registrations.</p></aside>
    </form>
    {confirmation && registered && <Modal title="Version registered locally" onClose={() => setConfirmation(false)}><p className="modal-lead">{registered.draft.name} · {registered.draft.version}</p><p>The text package and offer are fixed in this open demo session. Nothing has been published to a server.</p><h3 className="hash-heading">SHA-256 · demo package</h3><code className="seller-hash">{registered.contentHash}</code><p className="modal-note">This hash identifies the local package bytes; it does not certify safety or model performance.</p><Link className="button button--primary" to="/seller#listings">View my listings <ArrowRight size={18} /></Link></Modal>}
  </main></SellerShell>
}
