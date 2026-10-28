import image0 from './assets/building-day.png';
import image1 from './assets/building-night.png';
import image2 from './assets/building-sunset.png';
import image3 from './assets/buyer-workspace.png';
import image4 from './assets/skill-attributes.png';
import image5 from './assets/skill-invoice.png';
import image6 from './assets/skill-orders.png';
import image7 from './assets/skill-returns.png';
const assetUrls = {"building-day.png":image0,"building-night.png":image1,"building-sunset.png":image2,"buyer-workspace.png":image3,"skill-attributes.png":image4,"skill-invoice.png":image5,"skill-orders.png":image6,"skill-returns.png":image7};
// @ts-check
// AgentGain compact frontend. All outcomes and payments remain local simulations.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, BarChart3, Box, ChartNoAxesColumn, Check, CheckCircle2, ChevronRight, Circle, CircleAlert, CircleDot, CircleMinus, Copy, CreditCard, Download, FileJson, FileText, House, Info, LayoutGrid, Link2, LockKeyhole, MousePointer2, Pause, Play, Plus, Search, Shield, ShieldCheck, ShieldPlus, Tag, X } from 'lucide-react';
/** @import { ButtonHTMLAttributes, ChangeEvent, FormEvent, KeyboardEvent, ReactNode } from 'react' */

// ── Data and component contracts ──
/** @typedef {'day' | 'auto' | 'night'} ThemePreference */
/** @typedef {'demo' | 'evidence' | 'builder' | 'buyer' | 'seller'} LandingPanel */
/** @typedef {'ready' | 'evaluated' | 'capture-requested' | 'capture-confirmed'} DemoStep */
/** @typedef {{     type: 'draft';     draft: TestDraft; } | {     type: 'review'; } | {     type: 'authorize';     approved: boolean; } | {     type: 'verify'; } | {     type: 'results'; } | {     type: 'capture'; } | {     type: 'confirm'; } | {     type: 'reset'; }} Action */
/** @typedef {'explore' | 'evaluations' | 'profile' | 'workspace' | 'invoice-example' | 'order-example'} BuyerPanel */
/** @typedef {Partial<Record<keyof SellerDraft, string>>} SellerErrors */
/** @typedef {{     id: string;     name: string;     seller: string;     version: string;     recordCount: number;     kind: 'invoice' | 'categorization';     preparation: 'READY' | 'DRAFT';     contractApproved: false;     paymentAuthorized: false;     evaluationExecuted: false; }} EvaluationDraft */
/** @typedef {{     demo: true;     profile: {         displayName: string;         initials: string;         role: 'Buyer';         fictional: true;     };     currentTask: {         title: string;         concern: string;         source: 'BUYER_REPORTED';     };     evaluations: EvaluationDraft[];     purchasedSkillCount: 0; }} BuyerOverview */
/** @typedef {'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'TECHNICAL_ERROR'} EvaluationOutcome */
/** @typedef {'AUTHORIZED' | 'CAPTURE_REQUESTED' | 'COMPLETED' | 'VOIDED' | 'UNKNOWN' | 'FAILED'} PaymentState */
/** @typedef {{     id: 'existing' | 'free' | 'paid';     label: string;     correct: number;     total: number; }} ComparisonArm */
/** @typedef {{     demo: true;     skill: string;     buyer: string;     seller: string;     arms: ComparisonArm[];     outcome: EvaluationOutcome;     paymentState: PaymentState;     licenceUsd: number;     evaluationExpenseUsd: number;     estimatedBenefitUsd: number;     lowerBenefitBoundUsd: number;     requiredBenefitUsd: number;     intervalIsIllustrative: true; }} EvaluationPreview */
/** @typedef {{     name: string;     category: 'Documents' | 'Operations' | 'Commerce';     description: string;     version: string;     instructions: string;     expectedInput: string;     expectedOutput: string;     price: string;     currency: 'USD';     licence: string;     exampleInput: string;     exampleOutput: string; }} SellerDraft */
/** @typedef {{     id: string;     status: 'AVAILABLE' | 'DRAFT' | 'LOCAL';     draft: SellerDraft;     contentHash: string | null;     buyerPreview: string | null; }} SellerListing */
/** @typedef {'TESTING' | 'PAYMENT_PENDING' | 'DELIVERED' | 'FAILED'} SellerActivityStatus */
/** @typedef {{     id: string;     buyerLabel: string;     skill: string;     version: string;     started: string;     status: SellerActivityStatus; }} SellerActivity */
/** @typedef {{     register(draft: SellerDraft, listings: SellerListing[]): Promise<SellerListing>; }} SellerService */
/** @typedef {'Documents' | 'Operations' | 'Commerce'} SkillCategory */
/** @typedef {{     id: string;     name: string;     description: string;     seller: string;     category: SkillCategory;     artwork: string;     version: string | null;     illustrativePrice: {         amountMinor: number;         currency: 'USD';     } | null;     preparedExample: boolean; }} SkillSummary */
/** @typedef {{     demo: true;     skills: SkillSummary[]; }} SkillCatalog */
/** @typedef {SkillSummary & {     demo: true;     tagline: string;     version: string;     illustrativePrice: {         amountMinor: number;         currency: 'USD';     };     example: {         input: string;         invoiceNumber: string;         date: string;         vendor: string;         total: string;         currency: string;     }; }} SkillDetail */
/** @typedef {{     invoiceNumber: string;     total: string;     currency: string; }} InvoiceFields */
/** @typedef {{     id: string;     input: string;     expected: InvoiceFields; }} CheckedRecord */
/** @typedef {{     filename: string;     source: 'demo' | 'local';     scenario?: 'standard' | 'below-target';     records: CheckedRecord[];     accuracy: number;     improvement: number; }} TestDraft */
/** @typedef {{     draft: TestDraft;     skill: 'Invoice field extractor';     version: 'v1.0';     amountMinor: 1200;     currency: 'USD';     instructionText: string; }} TestAgreement */
/** @typedef {'NOT_AUTHORIZED' | 'AUTHORIZED' | 'CAPTURE_REQUESTED' | 'COMPLETED' | 'VOIDED'} DemoPayment */
/** @typedef {'setup' | 'review' | 'running' | 'verifying' | 'results'} DemoStage */
/** @typedef {{     draft: TestDraft;     agreement: TestAgreement | null;     approved: boolean;     payment: DemoPayment;     stage: DemoStage; }} TestWorkflow */
/** @typedef {{     getOverview(signal?: AbortSignal): Promise<BuyerOverview>; }} BuyerService */
/** @typedef {{     getPreview(signal?: AbortSignal): Promise<EvaluationPreview>; }} LandingService */
/** @typedef {{     getCatalog(signal?: AbortSignal): Promise<SkillCatalog>; }} SkillService */
/** @typedef {{     getSkill(id: string, signal?: AbortSignal): Promise<SkillDetail | null>; }} SkillDetailService */

/** @template T
 * @param {T} value
 * @returns {NonNullable<T>} */
function required(value) { if (value == null) throw new Error('Required demo state is unavailable.'); return value; }
// ── components/shared/Brand ──
/** @param {{ className?: string }} props0 */
export function BrandMark({ className = '' }) {
    return <svg className={className} aria-hidden="true" viewBox="0 0 36 30"><path fill="#0067ff" d="M1 27 14 3h10L12 27z"/><path fill="#16bcf8" d="m24 3 11 24H22l-5-8z"/><path fill="#0055d7" d="m17 19 7-16 5 11-8 13z"/></svg>;
}
/** @param {{ footer?: boolean }} props0 */
export function Brand({ footer = false }) {
    return <a className={`brand ${footer ? 'brand--footer' : ''}`} href="#top" aria-label="AgentGain home">
    <BrandMark />
    <span>AgentGain</span>
  </a>;
}


// ── hooks/useTheme ──
const themeKey = 'agentgain.theme';
const ThemeContext = /** @type {typeof createContext<{ preference: ThemePreference; setPreference: (value: ThemePreference) => void } | null>} */ (createContext)(null);
/** @param {{ children: ReactNode }} props0 */
export function ThemeProvider({ children }) {
    const [preference, setPreference] = /** @type {typeof useState<ThemePreference>} */ (useState)(() => {
        try {
            const saved = localStorage.getItem(themeKey);
            return saved === 'day' || saved === 'night' ? saved : 'auto';
        }
        catch {
            return 'auto';
        }
    });
    useEffect(() => {
        const media = matchMedia('(prefers-color-scheme: dark)');
        const apply = () => { document.documentElement.dataset.theme = preference === 'auto' ? (media.matches ? 'night' : 'day') : preference; };
        apply();
        try {
            localStorage.setItem(themeKey, preference);
        }
        catch { /* Preference remains usable without storage. */ }
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [preference]);
    return <ThemeContext value={{ preference, setPreference }}>{children}</ThemeContext>;
}
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context)
        throw new Error('useTheme requires ThemeProvider');
    return context;
}


// ── components/ui/ThemeSelector ──
export function ThemeSelector() {
    const { preference, setPreference } = useTheme();
    return <fieldset className="theme-selector"><legend className="sr-only">Color theme</legend>
    {( /** @type {ThemePreference[]} */(['day', 'auto', 'night'])).map(theme => <label key={theme} className={preference === theme ? 'is-selected' : ''}>
      <input type="radio" name="theme" value={theme} checked={preference === theme} onChange={() => setPreference(theme)}/>
      <span>{theme[0].toUpperCase() + theme.slice(1)}</span>
    </label>)}
  </fieldset>;
}


// ── components/layout/Header ──
/** @param {{ openPanel: (panel: LandingPanel) => void }} props0 */
export function Header({ openPanel }) {
    return <header className="site-header page-container">
    <Brand />
    <nav className="main-nav" aria-label="Main navigation">
      <a className="nav-control" href="#how-it-works">How it works</a>
      <div className="role-nav" role="group" aria-label="Explore AgentGain">
        <button className="nav-control role-control" onClick={() => openPanel('builder')}>For Builder</button>
        <button className="nav-control role-control" onClick={() => openPanel('buyer')}>Buyer</button>
        <button className="nav-control role-control" onClick={() => openPanel('seller')}>Seller</button>
      </div>
    </nav>
    <ThemeSelector />
  </header>;
}


// ── components/ui/Button ──
/** @param {ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'quiet' }} props0 */
export function Button({ className = '', variant = 'primary', ...props }) {
    return <button type="button" className={`button button--${variant} ${className}`} {...props}/>;
}


// ── components/shared/EvidencePreview ──
/** @param {{ preview: EvaluationPreview | null; loading: boolean; error: string | null; retry: () => void; review: () => void }} props0 */
export function EvidencePreview({ preview, loading, error, retry, review }) {
    return <div className="evidence-panel">
    <span className="demo-tag">ILLUSTRATIVE DEMO</span>
    <h2>Your proof, before payment.</h2>
    {loading ? <p role="status" className="preview-message">Loading illustrative evidence…</p> : error ? <div role="alert" className="preview-message"><p>{error}</p><Button onClick={retry}>Retry preview</Button></div> : preview && <>
      <div className="evidence-rows">
        {preview.arms.map(arm => <div className="evidence-row" key={arm.id}>
          <div className="evidence-icon">{arm.id === 'paid' ? <BarChart3 /> : <FileText />}</div>
          <div className="evidence-row-copy"><h3>{arm.id === 'existing' ? 'Baseline' : arm.label}</h3><p>{arm.correct} / {arm.total} correct</p></div>
          <span role="img" className={`result-icon ${arm.id === 'paid' ? 'result-icon--pass' : ''}`} aria-label={arm.id === 'paid' ? 'Checks passed' : 'Comparison result'}>{arm.id === 'paid' ? <Check size={19}/> : <CircleMinus size={19}/>}</span>
        </div>)}
        <div className="evidence-row payment-row"><div className="evidence-icon"><span className="paypal-letter" aria-hidden="true">P</span></div><div className="evidence-row-copy"><h3>PayPal</h3><p>Authorized · not captured</p></div><LockKeyhole className="payment-lock" size={22} aria-label="Authorization only"/></div>
      </div>
      <div className="evidence-actions"><Button onClick={review}>Review evidence <ArrowRight size={18}/></Button><span>Sandbox preview</span></div>
    </>}
  </div>;
}


// ── services/mock/landingService ──
/** @type {EvaluationPreview} */
export const previewFixture = {
    demo: true,
    skill: 'Catalog Normalizer v1.3.2',
    buyer: 'Northwind Commerce (fictional)',
    seller: 'CatalogCraft Labs (fictional)',
    arms: [
        { id: 'existing', label: 'Existing agent', correct: 84, total: 120 },
        { id: 'free', label: 'Free alternative', correct: 89, total: 120 },
        { id: 'paid', label: 'With skill', correct: 106, total: 120 },
    ],
    outcome: 'PASS', paymentState: 'AUTHORIZED', licenceUsd: 200, evaluationExpenseUsd: 15,
    estimatedBenefitUsd: 422.5, lowerBenefitBoundUsd: 172, requiredBenefitUsd: 150, intervalIsIllustrative: true,
};
/** @type {LandingService} */
export const mockLandingService = {
    async getPreview(signal) {
        signal?.throwIfAborted();
        // Fresh data prevents one demo from mutating another. No fetch or payment call.
        return structuredClone(previewFixture);
    },
};


// ── services/mock/buyerService ──
/** @type {BuyerOverview} */
export const buyerOverviewFixture = {
    demo: true,
    profile: { displayName: 'Jordan Diaz', initials: 'JD', role: 'Buyer', fictional: true },
    currentTask: { title: 'Extract invoice fields', concern: 'Needs a better result', source: 'BUYER_REPORTED' },
    evaluations: [
        { id: 'invoice-example', name: 'Invoice field extractor', seller: 'Demo Studio', version: 'v1.0', recordCount: 20, kind: 'invoice', preparation: 'READY', contractApproved: false, paymentAuthorized: false, evaluationExecuted: false },
        { id: 'order-example', name: 'Order categorizer', seller: 'Demo Studio', version: 'v1.0', recordCount: 20, kind: 'categorization', preparation: 'DRAFT', contractApproved: false, paymentAuthorized: false, evaluationExecuted: false },
    ],
    purchasedSkillCount: 0,
};
/** @type {BuyerService} */
export const mockBuyerService = {
    async getOverview(signal) {
        signal?.throwIfAborted();
        return structuredClone(buyerOverviewFixture);
    },
};


// ── services/mock/skillService ──
/** @type {SkillCatalog} */
export const skillCatalogFixture = { demo: true, skills: [
        { id: 'invoice-field-extractor', name: 'Invoice field extractor', description: 'Extract key fields such as invoice number, date, vendor and total from invoices.', seller: 'Demo Studio', category: 'Documents', artwork: assetUrls["skill-invoice.png"], version: 'v1.0', illustrativePrice: { amountMinor: 1200, currency: 'USD' }, preparedExample: true },
        { id: 'order-categorizer', name: 'Order categorizer', description: 'Classify orders into categories such as electronics, apparel, home and more.', seller: 'Demo Studio', category: 'Operations', artwork: assetUrls["skill-orders.png"], version: null, illustrativePrice: null, preparedExample: false },
        { id: 'returns-classifier', name: 'Returns classifier', description: 'Identify the reason for product returns from customer messages.', seller: 'Demo Studio', category: 'Operations', artwork: assetUrls["skill-returns.png"], version: null, illustrativePrice: null, preparedExample: false },
        { id: 'product-attribute-mapper', name: 'Product attribute mapper', description: 'Extract product attributes such as brand, color, size and material from listings.', seller: 'Demo Studio', category: 'Commerce', artwork: assetUrls["skill-attributes.png"], version: null, illustrativePrice: null, preparedExample: false },
    ] };
/** @type {SkillDetail} */
export const invoiceSkillFixture = {
    ...skillCatalogFixture.skills[0],
    demo: true,
    version: 'v1.0',
    illustrativePrice: { amountMinor: 1200, currency: 'USD' },
    tagline: 'Turn invoice text into consistent, structured fields.',
    example: {
        input: 'Acme Supplies Ltd.\n123 Market Street\nSan Francisco, CA 94105\n\nInvoice No: INV-1042\nDate: Mar 14, 2024\nTotal: USD 1,250.00\n\nThank you for your business.',
        invoiceNumber: 'INV-1042', date: 'Mar 14, 2024', vendor: 'Acme Supplies Ltd.', total: '1,250.00', currency: 'USD',
    },
};
/** @type {SkillService & SkillDetailService} */
export const mockSkillService = {
    async getCatalog(signal) { signal?.throwIfAborted(); return structuredClone(skillCatalogFixture); },
    async getSkill(id, signal) { signal?.throwIfAborted(); return id === invoiceSkillFixture.id ? structuredClone(invoiceSkillFixture) : null; },
};


// ── components/ui/Modal ──
/** @param {{ title: string; onClose: () => void; children: ReactNode }} props0 */
export function Modal({ title, onClose, children }) {
    const ref = /** @type {typeof useRef<HTMLDialogElement>} */ (useRef)(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = required(ref.current);
        const previous = /** @type {HTMLElement | null} */ (document.activeElement);
        dialog.showModal();
        return () => { dialog.close(); previous?.focus(); };
    }, []);
    return <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onKeyDown={e => {
            if (e.key !== 'Tab')
                return;
            const focusable = Array.from(/** @type {NodeListOf<HTMLElement>} */ (e.currentTarget.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))).filter(node => node.getClientRects().length > 0);
            const first = focusable[0];
            const last = focusable.at(-1);
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
            }
            else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
            }
        }} onClick={e => {
            if (e.target === e.currentTarget)
                onClose();
        }}>
    <div className="modal-content">
      <div className="modal-header"><div><span className="eyebrow">AGENTGAIN · FRONTEND PREVIEW</span><h2 id={titleId}>{title}</h2></div>
        <button autoFocus className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={22}/></button>
      </div>
      {children}
    </div>
  </dialog>;
}


// ── pages/Landing/LandingDialogs ──
const usd = /** @param {number} n */ (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
/** @param {{ panel: LandingPanel; close: () => void; preview: EvaluationPreview | null }} props0 */
export function LandingDialogs({ panel, close, preview }) {
    const [step, setStep] = /** @type {typeof useState<DemoStep>} */ (useState)('ready');
    if (panel === 'builder' || panel === 'buyer' || panel === 'seller') {
        const copy = {
            builder: { title: 'Build your agent’s next advantage.', description: 'Publish an instruction-only skill with its compatibility, licence and evaluation policy. Buyers test its value before a conditional purchase.', pending: 'The skill publishing screen is awaiting its design reference.' },
            buyer: { title: 'Find the right skill for your agent.', description: 'Compare a skill with your existing workflow and a credible free alternative under a contract you approve.', pending: 'The buyer workspace is awaiting its design reference.' },
            seller: { title: 'Let your skill prove its value.', description: 'Share your skill’s checkout link and review evaluation and purchase outcomes separately.', pending: 'The seller workspace is awaiting its design reference.' },
        }[panel];
        return <Modal title={copy.title} onClose={close}><p className="modal-lead">{copy.description}</p><div className="notice"><Info size={20}/><p>{copy.pending} This local frontend preview does not create an account or change your permissions.</p></div><Button onClick={close}>Back to AgentGain</Button></Modal>;
    }
    return <Modal title={panel === 'demo' ? 'Try the purchase flow.' : 'See what the skill adds.'} onClose={close}>
    <p className="modal-lead">Illustrative demo data. No AI evaluation runs and no payment is made.</p>
    {!preview ? <p role="status">Evidence is not available yet. Close this dialog and retry the preview.</p> : <>
      <div className="skill-summary"><strong>{preview.skill}</strong><span>{preview.buyer}</span><span>{preview.seller}</span></div>
      <div className="comparison-table-wrap"><table className="comparison-table"><caption>120 hidden records · three agreed approaches</caption><thead><tr><th scope="col">Approach</th><th scope="col">Correct</th><th scope="col">Accuracy</th></tr></thead><tbody>{preview.arms.map(arm => <tr key={arm.id}><th scope="row">{arm.label}</th><td>{arm.correct} / {arm.total}</td><td>{(arm.correct / arm.total * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>
      <div className="value-summary"><div><span>Estimated 3-month net benefit</span><strong>{usd(preview.estimatedBenefitUsd)}</strong></div><div><span>Lower 90% bound</span><strong>{usd(preview.lowerBenefitBoundUsd)}</strong></div><div><span>Required minimum</span><strong>{usd(preview.requiredBenefitUsd)}</strong></div></div>
      <p className="fine-print">Illustrative confidence interval, not independently statistically verified. Assumptions: 3,000 tasks/month, $0.50 rework per incorrect record, 3 months. The $15 evaluation expense is a model assumption, not a checkout charge. Incremental operating costs are not supplied.</p>
      {panel === 'evidence' ? <div className="notice"><CheckCircle2 size={21}/><p><strong>PASS · Capture eligible.</strong><br />{usd(preview.licenceUsd)} USD licence authorization only. Payment not captured; skill not delivered.</p></div> : <section className="demo-simulation" aria-label="Local purchase simulation">
        <span className="demo-tag">LOCAL SIMULATION</span>
        <p role="status">{step === 'ready' ? '$200.00 USD licence hold (simulated). No completed purchase.' : step === 'evaluated' ? 'PASS (illustrative fixture). Capture eligible. Payment not captured.' : step === 'capture-requested' ? 'Capture requested (simulated). Not confirmed. Skill not delivered.' : 'Capture COMPLETED (simulated). Delivery would now be eligible. No real payment or skill delivery occurred.'}</p>
        {step === 'ready' && <Button onClick={() => setStep('evaluated')}>Show illustrative result <ArrowRight size={18}/></Button>}
        {step === 'evaluated' && <Button onClick={() => setStep('capture-requested')}>Simulate capture request <ArrowRight size={18}/></Button>}
        {step === 'capture-requested' && <Button onClick={() => setStep('capture-confirmed')}>Simulate confirmed capture <CheckCircle2 size={18}/></Button>}
        {step === 'capture-confirmed' && <Button variant="outline" onClick={() => setStep('ready')}>Reset local simulation</Button>}
      </section>}
    </>}
  </Modal>;
}


// ── pages/Landing/LandingPage ──
/** @type {LandingPanel[]} */
const panels = ['demo', 'evidence', 'buyer', 'seller', 'builder'];
/** @param {{ service?: LandingService }} props0 */
export function LandingPage({ service = landingService }) {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const requested = /** @type {LandingPanel | null} */ (params.get('panel'));
    const panel = requested && panels.includes(requested) ? requested : null;
    const openPanel = /** @param {LandingPanel} value */ (value) => value === 'buyer' || value === 'seller' ? navigate(`/${value}`) : setParams({ panel: value }, { preventScrollReset: true });
    useEffect(() => {
        if (requested === 'buyer' || requested === 'seller')
            navigate(`/${requested}`, { replace: true });
    }, [requested, navigate]);
    const closePanel = () => setParams({}, { replace: true, preventScrollReset: true });
    const [preview, setPreview] = /** @type {typeof useState<EvaluationPreview | null>} */ (useState)(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = /** @type {typeof useState<string | null>} */ (useState)(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        service.getPreview(controller.signal).then(data => {
            if (!controller.signal.aborted)
                setPreview(data);
        }).catch(() => {
            if (!controller.signal.aborted)
                setError('The illustrative preview could not load. Please retry.');
        }).finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [service, attempt]);
    return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <main id="main-content">
      <section className="hero" id="top" aria-labelledby="hero-title">
        <img className="scene-image hero-image" src={assetUrls["building-day.png"]} alt="" fetchPriority="high" width="1478" height="1064"/>
        <div className="hero-shade"/>
        <Header openPanel={openPanel}/>
        <div className="hero-content page-container">
          <p className="eyebrow">AI SKILLS. VERIFIED ON YOUR TERMS.</p>
          <h1 id="hero-title">Better skills.<br />Proven before<br />you pay.</h1>
          <p className="hero-description">Test on your tasks. Agree the checks.<br />Pay when they pass.</p>
          <div className="hero-actions"><Button onClick={() => openPanel('demo')}>Try the demo <ArrowRight size={18}/></Button><a className="button button--outline" href="#how-it-works">Explore the building</a></div>
        </div>
        <div className="building-wordmark" aria-hidden="true"><span className="building-mark">A</span> AgentGain</div>
        <button className="glass-card hero-proof" onClick={() => openPanel('evidence')} aria-label="Review illustrative skill test result"><span className="glass-check"><Check size={21}/></span><span><strong>Skill test passed</strong><small>Illustrative demo</small></span></button>
        <div className="plaza-orbit" aria-hidden="true"/>
        <a href="#how-it-works" className="explore-cue"><span aria-hidden="true"><ChevronRight /><ChevronRight /><ChevronRight /></span>Explore the building</a>
        <a className="scroll-cue" href="#proof"><ArrowDown size={18}/> Scroll to see the proof</a>
      </section>

      <section className="how-section" id="how-it-works" aria-labelledby="how-title">
        <img className="scene-image workflow-image" src={assetUrls["building-sunset.png"]} alt="" loading="lazy" width="1586" height="992"/>
        <div className="workflow-shade"/>
        <div className="page-container how-content">
          <h2 id="how-title">One skill. Your test.<br />Clear proof.</h2>
          <ol className="steps">
            <li><span className="step-number">01</span><span className="step-dot"/><div><h3>Set the test</h3><p>Choose a skill and define your<br className="desktop-break"/> own checks for success.</p></div></li>
            <li><span className="step-number">02</span><span className="step-dot"/><div><h3>Compare the results</h3><p>Test your agent, a free alternative,<br className="desktop-break"/> and the paid skill on the same tasks.</p></div></li>
            <li><span className="step-number">03</span><span className="step-dot"/><div><h3>Pay when it passes</h3><p>Capture is requested only<br className="desktop-break"/> after a qualifying result.</p></div></li>
          </ol>
          <p className="authorization-note"><span className="paypal-letter" aria-hidden="true">P</span> PayPal authorization comes before testing.</p>
        </div>
        <div className="building-flow" role="group" aria-label="Illustrative evaluation flow">
          <button className="glass-card flow-skill" onClick={() => openPanel('evidence')}><FileText size={32}/><span><strong>Catalog Normalizer</strong><small>AI skill · illustrative demo</small></span></button>
          <div className="flow-connector connector-one" aria-hidden="true"/>
          <button className="glass-card flow-check" onClick={() => openPanel('evidence')}><span className="glass-check"><Check size={20}/></span><strong>Checks passed</strong></button>
          <div className="flow-connector connector-two" aria-hidden="true"/>
          <button className="glass-card flow-payment" onClick={() => openPanel('demo')}><span className="paypal-letter" aria-hidden="true">P</span><span><strong>PayPal</strong><small>Capture eligible · demo</small></span></button>
        </div>
      </section>

      <section className="proof-section" id="proof" aria-labelledby="proof-heading">
        <h2 id="proof-heading" className="sr-only">Compare the evidence before payment</h2>
        <img className="scene-image night-image" src={assetUrls["building-night.png"]} alt="" loading="lazy" width="1586" height="992"/>
        <div className="proof-content page-container"><EvidencePreview preview={preview} loading={loading} error={error} retry={() => setAttempt(x => x + 1)} review={() => openPanel('evidence')}/></div>
      </section>
      <section className="builder-cta page-container" id="for-builders" aria-labelledby="builder-title"><h2 id="builder-title">Build your agent’s next advantage.</h2><Button onClick={() => openPanel('demo')}>Launch demo <ArrowRight size={18}/></Button></section>
    </main>
    <footer className="site-footer page-container"><div><Brand footer/><span>Test. Verify. Pay.</span></div><p><ShieldCheck size={14}/> Independent frontend prototype. Illustrative demo data. No live payments.</p></footer>
    {panel && <LandingDialogs key={panel} panel={panel} close={closePanel} preview={preview}/>}
  </>;
}


// ── services/mock/testFixtures ──
export const demoInstructionText = 'Extract invoice number, total and currency from the input.\nReturn the agreed structured fields.\nDo not infer missing values.';
/** Synthetic UI examples, not an evaluated dataset. All numbers are demo fixtures. */
/** @param {TestDraft['scenario']} [scenario]
 * @returns {TestDraft} */
export function createTestDraft(scenario = 'standard') {
    return { filename: 'invoice-tests.json', source: 'demo', scenario, accuracy: 90, improvement: 20, records: Array.from({ length: 20 }, (_, index) => {
            const id = `Invoice${String(index + 1).padStart(3, '0')}`;
            const expected = { invoiceNumber: `INV-${1042 + index}`, total: index === 0 ? '1250.00' : scenario === 'below-target' && index === 13 ? '120.00' : `${100 + index * 25}.00`, currency: 'USD' };
            return { id, expected, input: `Acme Supplies Ltd.\nInvoice No: ${expected.invoiceNumber}\nTotal: USD ${expected.total}` };
        }) };
}
/** @param {CheckedRecord} record
 * @param {number} index
 * @param {'baseline' | 'skill'} arm
 * @param {TestDraft['scenario']} [scenario]
 * @returns {InvoiceFields} */
export function illustrativeOutput(record, index, arm, scenario = 'standard') {
    if (scenario === 'below-target' && arm === 'skill') {
        if (index === 7)
            return { ...record.expected, currency: 'EUR' };
        if (index === 13)
            return { ...record.expected, total: '102.00' };
    }
    const mismatch = arm === 'baseline' ? [0, 1, 3, 4, 5, 6, 7, 8].includes(index) : index >= 18;
    return { ...record.expected, currency: mismatch ? 'SGD' : record.expected.currency };
}
/** @param {InvoiceFields} expected
 * @param {InvoiceFields} actual */
export function matchesFields(expected, actual) {
    return expected.invoiceNumber === actual.invoiceNumber && expected.total === actual.total && expected.currency === actual.currency;
}
/** @param {CheckedRecord[]} records
 * @param {TestDraft['scenario']} [scenario] */
export function illustrativeSummary(records, scenario = 'standard') {
    const baseline = records.filter((record, index) => matchesFields(record.expected, illustrativeOutput(record, index, 'baseline', scenario))).length;
    const skilled = records.filter((record, index) => matchesFields(record.expected, illustrativeOutput(record, index, 'skill', scenario))).length;
    return { baseline, skilled, baselinePercent: baseline * 100 / records.length, skilledPercent: skilled * 100 / records.length, improvement: (skilled - baseline) * 100 / records.length };
}


// ── services/testValidation ──
const object = /** @param {unknown} value
 * @returns {value is Record<string, unknown>} */ (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = /** @param {unknown} value
 * @param {number} limit
 * @returns {value is string} */ (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
/** @param {unknown} value
 * @returns {CheckedRecord[]} */
export function validateRecords(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 200)
        throw new Error('Provide an array of 1–200 records.');
    const ids = /** @type {Set<string>} */ (new Set());
    return value.map((item, index) => {
        if (!object(item) || !text(item.id, 80) || !text(item.input, 10000) || !object(item.expected))
            throw new Error(`Record ${index + 1} needs id, input text and an expected answer.`);
        if (ids.has(item.id))
            throw new Error(`Record ${index + 1} has a duplicate id.`);
        ids.add(item.id);
        const answer = item.expected;
        if (!text(answer.invoiceNumber, 80) || !text(answer.total, 40) || !/^\d+(\.\d{1,2})?$/.test(answer.total) || !text(answer.currency, 3) || !/^[A-Z]{3}$/.test(answer.currency))
            throw new Error(`Record ${index + 1}: expected needs invoiceNumber, decimal total as a string, and a three-letter currency.`);
        return { id: item.id, input: item.input, expected: { invoiceNumber: answer.invoiceNumber, total: answer.total, currency: answer.currency } };
    });
}
/** @param {number} accuracy
 * @param {number} improvement
 * @returns {string | null} */
export function validateRules(accuracy, improvement) {
    if (!Number.isFinite(accuracy) || accuracy < 1 || accuracy > 100)
        return 'Minimum checked accuracy must be between 1 and 100%.';
    if (!Number.isFinite(improvement) || improvement < 0 || improvement > 100)
        return 'Minimum improvement must be between 0 and 100 percentage points.';
    return null;
}
/** @param {unknown} value
 * @returns {TestDraft} */
export function parseDraft(value) {
    if (!object(value) || !text(value.filename, 200) || (value.source !== 'demo' && value.source !== 'local') || typeof value.accuracy !== 'number' || typeof value.improvement !== 'number' || validateRules(value.accuracy, value.improvement))
        throw new Error('Saved draft is invalid.');
    const records = validateRecords(value.records);
    const scenario = value.scenario === 'below-target' ? 'below-target' : 'standard';
    const source = value.source === 'demo' && JSON.stringify(records) === JSON.stringify(validateRecords(createTestDraft(scenario).records)) ? 'demo' : 'local';
    return { filename: value.filename, source, scenario, records, accuracy: value.accuracy, improvement: value.improvement };
}


// ── hooks/useTestWorkflow ──
export const draftStorageKey = 'agentgain.invoice-draft.v1';
/** @returns {TestWorkflow} */
export function initialWorkflow() {
    let draft = createTestDraft();
    try {
        const saved = sessionStorage.getItem(draftStorageKey);
        if (saved)
            draft = parseDraft(JSON.parse(saved));
    }
    catch { /* Unreadable or invalid storage is ignored; no payment state is restored. */ }
    return { draft, agreement: null, approved: false, payment: 'NOT_AUTHORIZED', stage: 'setup' };
}
/** @param {TestWorkflow} state
 * @returns {'PASS' | 'FAIL' | 'INCONCLUSIVE'} */
export function demoOutcome(state) {
    const draft = state.agreement?.draft;
    if (!draft || draft.source !== 'demo')
        return 'INCONCLUSIVE';
    const summary = illustrativeSummary(draft.records, draft.scenario);
    return summary.skilledPercent >= draft.accuracy && summary.improvement >= draft.improvement ? 'PASS' : 'FAIL';
}
/** @param {TestWorkflow} state
 * @param {Action} action
 * @returns {TestWorkflow} */
export function workflowReducer(state, action) {
    switch (action.type) {
        case 'draft': return state.payment === 'NOT_AUTHORIZED' ? { draft: action.draft, agreement: null, approved: false, payment: 'NOT_AUTHORIZED', stage: 'setup' } : state;
        case 'review':
            if (state.payment !== 'NOT_AUTHORIZED' || validateRules(state.draft.accuracy, state.draft.improvement))
                return state;
            try {
                validateRecords(state.draft.records);
            }
            catch {
                return state;
            }
            return { ...state, stage: 'review', approved: false, agreement: { draft: structuredClone(state.draft), skill: 'Invoice field extractor', version: 'v1.0', amountMinor: 1200, currency: 'USD', instructionText: demoInstructionText } };
        case 'authorize': return state.stage === 'review' && state.agreement && action.approved && state.payment === 'NOT_AUTHORIZED' ? { ...state, approved: true, payment: 'AUTHORIZED', stage: 'running' } : state;
        case 'verify': return state.stage === 'running' && state.payment === 'AUTHORIZED' ? { ...state, stage: 'verifying' } : state;
        case 'results': return state.stage === 'verifying' ? { ...state, stage: 'results', payment: demoOutcome(state) === 'PASS' ? 'AUTHORIZED' : 'VOIDED' } : state;
        case 'capture': return state.stage === 'results' && state.payment === 'AUTHORIZED' && demoOutcome(state) === 'PASS' ? { ...state, payment: 'CAPTURE_REQUESTED' } : state;
        case 'confirm': return state.stage === 'results' && state.payment === 'CAPTURE_REQUESTED' ? { ...state, payment: 'COMPLETED' } : state;
        case 'reset': return { draft: createTestDraft(), agreement: null, approved: false, payment: 'NOT_AUTHORIZED', stage: 'setup' };
    }
}
const WorkflowContext = /** @type {typeof createContext<{ state: TestWorkflow; dispatch: React.Dispatch<Action> } | null>} */ (createContext)(null);
/** @param {TestWorkflow} state */
export function hasDemoDelivery(state) {
    return state.approved && state.stage === 'results' && state.payment === 'COMPLETED' && !!state.agreement?.instructionText && demoOutcome(state) === 'PASS';
}
export function useDemoDelivery() {
    const context = useContext(WorkflowContext);
    return context ? hasDemoDelivery(context.state) : false;
}
/** @param {{ children: ReactNode }} props0 */
export function TestWorkflowProvider({ children }) {
    const [state, dispatch] = useReducer(workflowReducer, undefined, initialWorkflow);
    return <WorkflowContext.Provider value={{ state, dispatch }}>{children}</WorkflowContext.Provider>;
}
export function useTestWorkflow() {
    const context = useContext(WorkflowContext);
    if (!context)
        throw new Error('TestWorkflowProvider is required');
    return context;
}


// ── components/layout/BuyerShell ──
/** @param {{ children: ReactNode; profile?: BuyerOverview['profile']; openPanel: (panel: BuyerPanel) => void; breadcrumb?: ReactNode }} props0 */
export function BuyerShell({ children, profile, openPanel, breadcrumb }) {
    const navigate = useNavigate();
    const location = useLocation();
    const delivered = useDemoDelivery();
    const scrollToSkills = () => {
        if (delivered) {
            navigate('/buyer/my-skills/invoice-field-extractor');
            return;
        }
        if (location.pathname !== '/buyer') {
            navigate('/buyer#purchased-skills');
            return;
        }
        const target = document.getElementById('purchased-skills');
        target?.scrollIntoView({ block: 'center' });
        target?.focus({ preventScroll: true });
    };
    return <div className="buyer-app">
    <a className="skip-link" href="#buyer-main">Skip to workspace</a>
    <aside className="buyer-sidebar" aria-label="Buyer navigation">
      <Link to="/" className="buyer-brand" aria-label="AgentGain home"><BrandMark /><span>AgentGain</span></Link>
      <p className="sidebar-label">BUYER WORKSPACE</p>
      <nav className="buyer-nav" aria-label="Buyer workspace">
        <NavLink to="/buyer" end><House /><span>Overview</span></NavLink>
        <NavLink to="/buyer/skills"><Search /><span>Explore skills</span></NavLink>
        <button className={location.pathname.startsWith('/buyer/evaluations') ? 'active' : ''} onClick={() => openPanel('evaluations')}><FileText /><span>Evaluations</span></button>
        <button className={location.pathname.startsWith('/buyer/my-skills') ? 'active' : ''} onClick={scrollToSkills}><LayoutGrid /><span>My skills</span></button>
      </nav>
      <button className="sidebar-profile" onClick={() => openPanel('profile')} aria-label="Open buyer profile">
        <span className="profile-avatar">{profile?.initials ?? '…'}</span><span><strong>{profile?.displayName ?? 'Loading profile'}</strong><small>Buyer</small></span><ChevronRight size={21}/>
      </button>
    </aside>
    <div className="buyer-body">
      <header className="buyer-topbar">
        <nav className="buyer-breadcrumb" aria-label="Breadcrumb">{breadcrumb ?? <><span>Buyer workspace</span><ChevronRight size={15}/><span aria-current="page">Overview</span></>}</nav>
        <div className="buyer-topbar-actions"><span className="buyer-demo-label">Illustrative demo</span><ThemeSelector /><span className="topbar-divider"/><button className="profile-avatar topbar-avatar" onClick={() => openPanel('profile')} aria-label="Open profile menu">{profile?.initials ?? '…'}</button></div>
      </header>
      {children}
    </div>
  </div>;
}


// ── pages/Buyer/BuyerDialogs ──
/** @param {{ state: EvaluationDraft['preparation'] }} props0 */
export function PreparationBadge({ state }) {
    return <span className={`preparation-badge ${state === 'READY' ? 'preparation-badge--ready' : 'preparation-badge--draft'}`}>{state === 'READY' ? <Play size={14} fill="currentColor"/> : <FileText size={17}/>}{state === 'READY' ? 'Ready to test' : 'Draft'}</span>;
}
/** @param {{ evaluation: EvaluationDraft; select: () => void }} props0 */
export function EvaluationRow({ evaluation, select }) {
    return <button className="evaluation-row" onClick={select} aria-label={`View ${evaluation.name}`}>
    <span className={`evaluation-tile evaluation-tile--${evaluation.kind}`}>{evaluation.kind === 'invoice' ? <FileText /> : <Tag />}</span>
    <span className="evaluation-copy"><strong>{evaluation.name}</strong><small>{evaluation.seller}<span>•</span>{evaluation.version}<span>•</span>{evaluation.recordCount} test records</small></span>
    <PreparationBadge state={evaluation.preparation}/><ArrowRight className="evaluation-chevron" size={19}/>
  </button>;
}
/** @param {{ panel: BuyerPanel; overview: BuyerOverview | null; close: () => void; openPanel: (value: BuyerPanel) => void }} props0 */
export function BuyerDialogs({ panel, overview, close, openPanel }) {
    if (panel === 'explore')
        return <Modal title="Explore skills" onClose={close}><p className="modal-lead">Find a skill to test against your checked examples and a credible free alternative.</p><div className="notice"><Info size={20}/><p>Skill discovery is not available in this frontend preview yet. No skill has been selected and no checkout has been started.</p></div><Button onClick={close}>Back to overview</Button></Modal>;
    if (panel === 'profile')
        return <Modal title="Your buyer profile" onClose={close}><div className="buyer-profile-detail"><span className="profile-avatar">{overview?.profile.initials ?? '…'}</span><div><strong>{overview?.profile.displayName ?? 'Profile unavailable'}</strong><p>Buyer · fictional demo profile</p></div></div><p className="modal-lead">This workspace uses illustrative data. Choosing Buyer does not sign you in or grant account permissions.</p><Button onClick={close}>Back to overview</Button></Modal>;
    if (panel === 'workspace')
        return <Modal title="Your current workspace" onClose={close}><p className="modal-lead">{overview?.currentTask.title ?? 'Task unavailable'}</p><div className="notice"><CircleAlert size={20}/><p>“Needs a better result” is an illustrative buyer-reported concern, not a measured accuracy score. No evaluation has run for this task.</p></div><p className="fine-print">The building is a visual guide. This preview uses static artwork and does not support 3D rotation.</p><Button onClick={() => openPanel('explore')}>Find a matching skill <ArrowRight size={18}/></Button></Modal>;
    if (panel === 'evaluations')
        return <Modal title="Recent evaluations" onClose={close}><p className="modal-lead">Illustrative preparation records. No payment has been authorized and no evaluation has run.</p>{overview?.evaluations.length ? <div className="dialog-evaluation-list">{overview.evaluations.map(item => <EvaluationRow key={item.id} evaluation={item} select={() => openPanel(/** @type {BuyerPanel} */ (item.id))}/>)}</div> : <p className="modal-lead">No evaluation records are available.</p>}</Modal>;
    const evaluation = overview?.evaluations.find(item => item.id === panel);
    return <Modal title={evaluation?.name ?? 'Evaluation details'} onClose={close}>{evaluation ? <>
    <p className="modal-lead">{evaluation.seller} · {evaluation.version} · {evaluation.recordCount} test records<br />Illustrative demo data</p>
    <PreparationBadge state={evaluation.preparation}/>
    <dl className="draft-details"><div><dt>Preparation</dt><dd>{evaluation.preparation === 'READY' ? 'Example records prepared' : 'Draft setup'}</dd></div><div><dt>Approved contract</dt><dd>Not yet approved</dd></div><div><dt>Payment authorization</dt><dd>Not authorized</dd></div><div><dt>Evaluation result</dt><dd>Not run</dd></div><div><dt>Skill delivery</dt><dd>Not purchased</dd></div></dl>
    <div className="notice"><Info size={20}/><p>“Ready to test” describes this sample’s preparation only. A frozen contract and confirmed authorization are required before evaluation. These static preparation records are separate from the interactive evaluation demo.</p></div>
    {evaluation.kind === 'invoice' && <Link className="button button--primary" to="/buyer/evaluations/new" onClick={close}>Open test setup <ArrowRight size={18}/></Link>}
    <Button variant="outline" onClick={() => openPanel('evaluations')}>Back to evaluations</Button>
  </> : <p className="modal-lead">This evaluation is unavailable. Close this dialog and retry loading the workspace.</p>}</Modal>;
}


// ── pages/Buyer/BuyerOverviewPage ──
/** @type {BuyerPanel[]} */
const panelNames = ['explore', 'evaluations', 'profile', 'workspace', 'invoice-example', 'order-example'];
const steps = [
    { title: 'Agree the test', copy: 'Use your checked examples and an agreed evaluation.' },
    { title: 'Authorize', copy: 'A payment authorization precedes evaluation (not a completed payment).' },
    { title: 'Evaluate', copy: 'Compare your agent, a free alternative and the skill on the same examples.' },
    { title: 'Complete payment', copy: 'Delivery unlocks only after confirmed capture.' },
];
/** @param {{ service?: BuyerService }} props0 */
export function BuyerOverviewPage({ service = buyerService }) {
    const [overview, setOverview] = /** @type {typeof useState<BuyerOverview | null>} */ (useState)(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const requested = /** @type {BuyerPanel | null} */ (params.get('panel'));
    const panel = requested && panelNames.includes(requested) ? requested : null;
    const openPanel = /** @param {BuyerPanel} value */ (value) => value === 'explore' ? navigate('/buyer/skills') : setParams({ panel: value }, { preventScrollReset: true });
    const close = () => setParams({}, { replace: true, preventScrollReset: true });
    useEffect(() => {
        if (requested === 'explore')
            navigate('/buyer/skills', { replace: true });
    }, [requested, navigate]);
    useEffect(() => {
        if (!loading && overview && location.hash === '#purchased-skills') {
            const target = document.getElementById('purchased-skills');
            target?.scrollIntoView({ block: 'center' });
            target?.focus({ preventScroll: true });
        }
    }, [loading, overview, location.hash]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        service.getOverview(controller.signal).then(data => {
            if (!controller.signal.aborted)
                setOverview(data);
        }).catch(() => {
            if (!controller.signal.aborted)
                setError(true);
        }).finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [service, attempt]);
    return <BuyerShell profile={overview?.profile} openPanel={openPanel}>
    <main id="buyer-main" className="buyer-main">
      <div className="buyer-page-heading"><div><h1>What should your agent do better?</h1><p>Start with a task. Find a skill. Test it on your terms.</p></div><Button onClick={() => openPanel('explore')}>Explore skills <ArrowRight size={20}/></Button></div>
      {loading ? <section className="workspace-loading" aria-busy="true" role="status"><span className="loading-placeholder"/><p>Loading your illustrative workspace…</p></section> : error || !overview ? <section className="workspace-error" role="alert"><h2>We couldn’t load this workspace.</h2><p>Your data hasn’t changed. Please try again.</p><Button onClick={() => setAttempt(value => value + 1)}>Retry workspace</Button></section> : <>
        <section className="current-task-card" aria-labelledby="current-task-title">
          <div className="current-task-copy"><p className="task-eyebrow">Your current task</p><h2 id="current-task-title">{overview.currentTask.title}</h2><span className="task-concern"><CircleDot size={14} fill="currentColor"/>{overview.currentTask.concern}</span><p className="task-description">Try a skill against your checked examples.</p><Button onClick={() => openPanel('explore')}>Find a matching skill <ArrowRight size={20}/></Button></div>
          <div className="workspace-scene"><img src={assetUrls["buyer-workspace.png"]} width="1536" height="1024" alt="" fetchPriority="high"/><button className="workspace-callout" onClick={() => openPanel('workspace')}>Your workspace</button></div>
          <button className="workspace-explore" onClick={() => openPanel('workspace')}><MousePointer2 size={19}/>Explore workspace</button>
        </section>
        <div className="buyer-overview-grid">
          <section className="workspace-card recent-evaluations" aria-labelledby="evaluations-title"><div className="workspace-card-heading"><h2 id="evaluations-title">Recent evaluations</h2><button className="text-action" onClick={() => openPanel('evaluations')}>View all <ArrowRight size={16}/></button></div>
            {overview.evaluations.length ? <div className="evaluation-list">{overview.evaluations.map(item => <EvaluationRow key={item.id} evaluation={item} select={() => openPanel(/** @type {BuyerPanel} */ (item.id))}/>)}</div> : <p className="empty-evaluations">No evaluations yet. Start by finding a skill for your task.</p>}
          </section>
          <section id="purchased-skills" className="workspace-card purchased-skills" tabIndex={-1} aria-labelledby="purchased-title"><h2 id="purchased-title">Your purchased skills</h2><div className="skill-trophy" aria-hidden="true"><div className="trophy-face"><BrandMark /></div><div className="trophy-base"/></div><h3>Your next capability starts here.</h3><p>Find and purchase skills that pass your evaluation.</p><Button variant="outline" onClick={() => openPanel('explore')}>Browse skills <ArrowRight size={19}/></Button></section>
        </div>
        <section className="workspace-card buyer-how" aria-labelledby="buyer-how-title"><h2 id="buyer-how-title">How it works</h2><ol>{steps.map((step, index) => <li key={step.title}><span className="buyer-step-number">{index + 1}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div>{index < steps.length - 1 && <ChevronRight className="buyer-step-chevron" size={18}/>}</li>)}</ol></section>
      </>}
    </main>
    {panel && <BuyerDialogs panel={panel} overview={overview} close={close} openPanel={openPanel}/>}
  </BuyerShell>;
}


// ── components/layout/BuyerWorkspaceLayout ──
/** @param {{ children: ReactNode; breadcrumb: ReactNode }} props0 */
export function BuyerWorkspaceLayout({ children, breadcrumb }) {
    const [overview, setOverview] = /** @type {typeof useState<BuyerOverview | null>} */ (useState)(null);
    const [panel, setPanel] = /** @type {typeof useState<BuyerPanel | null>} */ (useState)(null);
    const navigate = useNavigate();
    useEffect(() => {
        const controller = new AbortController();
        buyerService.getOverview(controller.signal).then(data => {
            if (!controller.signal.aborted)
                setOverview(data);
        }).catch(() => { });
        return () => controller.abort();
    }, []);
    const openPanel = /** @param {BuyerPanel} value */ (value) => value === 'explore' ? navigate('/buyer/skills') : setPanel(value);
    return <BuyerShell profile={overview?.profile} openPanel={openPanel} breadcrumb={breadcrumb}>
    {children}
    {panel && <BuyerDialogs panel={panel} overview={overview} openPanel={openPanel} close={() => setPanel(null)}/>}
  </BuyerShell>;
}


// ── hooks/useAsyncData ──
/** @template T
 * @param {(signal: AbortSignal) => Promise<T>} load */
export function useAsyncData(load) {
    const [data, setData] = /** @type {typeof useState<T | null>} */ (useState)(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        setData(null);
        load(controller.signal).then(value => {
            if (!controller.signal.aborted)
                setData(value);
        }).catch(() => {
            if (!controller.signal.aborted)
                setError(true);
        }).finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [load, attempt]);
    return { data, loading, error, retry: () => setAttempt(value => value + 1) };
}


// ── pages/Skills/ExploreSkillsPage ──
const categories = /** @type {const} */ (['All skills', 'Documents', 'Operations', 'Commerce']);
/** @param {{ service?: SkillService }} props0 */
export function ExploreSkillsPage({ service = skillService }) {
    const load = useCallback(/** @param {AbortSignal} signal */ (signal) => service.getCatalog(signal), [service]);
    const { data, loading, error, retry } = useAsyncData(load);
    const [params, setParams] = useSearchParams();
    const query = params.get('q') ?? '';
    const category = categories.find(item => item === params.get('category')) ?? 'All skills';
    const [selected, setSelected] = /** @type {typeof useState<SkillSummary | null>} */ (useState)(null);
    const updateFilter = /** @param {string} key
     * @param {string} value */ (key, value) => {
        setParams(previous => {
            const next = new URLSearchParams(previous);
            if (!value || value === 'All skills')
                next.delete(key);
            else
                next.set(key, value);
            return next;
        }, { replace: true, preventScrollReset: true });
    };
    const filtered = data?.skills.filter(skill => (category === 'All skills' || skill.category === category) && `${skill.name} ${skill.description} ${skill.seller} ${skill.category}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
    return <BuyerWorkspaceLayout breadcrumb={<><Link to="/buyer" aria-label="Buyer overview"><House size={20}/></Link><ChevronRight size={15}/><span aria-current="page">Explore skills</span></>}>
    <main id="buyer-main" className="skills-main">
      <header className="skills-hero">
        <div className="skills-hero-art" aria-hidden="true"/>
        <div className="skills-hero-content"><h1>Find your agent’s next skill.</h1>
          <div className="skill-search"><Search size={24} aria-hidden="true"/><label className="sr-only" htmlFor="skill-search">Search skills</label><input id="skill-search" type="search" placeholder="What does your agent need to do?" value={query} onChange={event => updateFilter('q', event.target.value)}/>{query && <button onClick={() => updateFilter('q', '')} aria-label="Clear search"><X size={19}/></button>}</div>
          <div className="skill-categories" role="group" aria-label="Skill categories">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => updateFilter('category', item)}>{item}</button>)}</div>
        </div>
      </header>
      <section className="skill-results" aria-label="Available skills" aria-busy={loading}>
        <p className="sr-only" role="status">{loading ? 'Loading skills' : error ? 'Skills could not load' : `${filtered.length} skills found`}</p>
        {loading ? <div className="workspace-loading"><p>Loading illustrative skills…</p></div> : error ? <div className="workspace-error" role="alert"><h2>We couldn’t load the skills.</h2><p>Please try again.</p><Button onClick={retry}>Retry skills</Button></div> : filtered.length ? <div className="skills-grid">{filtered.map(skill => <article className={`skill-card ${skill.preparedExample ? 'skill-card--prepared' : ''}`} key={skill.id}>
          {skill.preparedExample && <span className="skill-prepared"><ShieldPlus size={14}/>Ready to test<span className="sr-only"> — illustrative preparation only; no evaluation has run</span></span>}
          <img className="skill-card-art" src={skill.artwork} alt="" width="1024" height="1024"/>
          <div className="skill-card-copy"><h2>{skill.name}</h2><p>{skill.description}</p><span className="skill-seller">{skill.seller}</span><div className="skill-card-bottom">
            {skill.illustrativePrice && <div className="skill-price"><strong>{skill.illustrativePrice.currency} {(skill.illustrativePrice.amountMinor / 100).toFixed(2)}</strong><span className="sr-only">Illustrative price</span>{skill.version && <span className="skill-version">{skill.version}</span>}</div>}
            {skill.id === 'invoice-field-extractor' ? <Link className="skill-view" to={`/buyer/skills/${skill.id}`} aria-label={`View ${skill.name}`}>View skill <ArrowRight size={20}/></Link> : <button className="skill-view" onClick={() => setSelected(skill)} aria-label={`View ${skill.name}`}>View skill <ArrowRight size={20}/></button>}
          </div></div>
        </article>)}</div> : <div className="skill-empty"><Search size={32}/><h2>No matching skills</h2><p>Try a different task or category.</p><Button variant="outline" onClick={() => setParams({})}>Clear filters</Button></div>}
      </section>
      <footer className="skills-note"><Info size={20}/><p>Test each skill against your agreed checks. Listings and prices are illustrative.</p></footer>
    </main>
    {selected && <Modal title={selected.name} onClose={() => setSelected(null)}><p className="modal-lead">{selected.description}</p><div className="notice"><Info size={20}/><p>This skill’s detail screen is not available in this preview yet. No test or payment has started.</p></div><Button onClick={() => setSelected(null)}>Back to skills</Button></Modal>}
  </BuyerWorkspaceLayout>;
}


// ── pages/Skills/SkillDetailPage ──
const tabs = /** @type {const} */ ([{ id: 'overview', label: 'Overview' }, { id: 'input-output', label: 'Input & output' }, { id: 'version', label: 'Version' }]);
/** @param {{ example: SkillDetail['example'] }} props0 */
function StructuredFields({ example }) {
    return <dl className="invoice-fields"><div><dt>Invoice number</dt><dd>{example.invoiceNumber}</dd></div><div><dt>Total</dt><dd>{example.total}</dd></div><div><dt>Currency</dt><dd>{example.currency}</dd></div></dl>;
}
/** @param {{ skill: SkillDetail }} props0 */
function InvoiceExample({ skill }) {
    return <div className="invoice-example"><div><h3>Invoice text</h3><pre>{skill.example.input}</pre></div><ArrowRight className="invoice-example-arrow" size={24} aria-hidden="true"/><div><h3>Structured fields</h3><StructuredFields example={skill.example}/></div></div>;
}
/** @param {{ example: SkillDetail['example'] }} props0 */
function InvoiceScene({ example }) {
    return <div className="invoice-scene" aria-hidden="true">
    <div className="invoice-paper"><strong>INVOICE</strong><dl><div><dt>Invoice No.</dt><dd>{example.invoiceNumber}</dd></div><div><dt>Date</dt><dd>{example.date}</dd></div><div><dt>Total</dt><dd>{example.currency} {example.total}</dd></div><div><dt>Vendor</dt><dd>{example.vendor}</dd></div></dl><div className="invoice-paper-lines"><span /><span /><span /><span /><span /></div></div>
    <svg className="invoice-connector" viewBox="0 0 200 130"><path d="M0 15 C120 -15 65 110 200 90" fill="none" stroke="#50dfff" strokeWidth="3"/></svg>
    <div className="invoice-scene-fields"><StructuredFields example={example}/></div>
  </div>;
}
/** @param {{ service?: SkillDetailService }} props0 */
export function SkillDetailPage({ service = skillService }) {
    const { skillId = '' } = useParams();
    const load = useCallback(/** @param {AbortSignal} signal */ (signal) => service.getSkill(skillId, signal), [service, skillId]);
    const { data: skill, loading, error, retry } = useAsyncData(load);
    const [params, setParams] = useSearchParams();
    const activeTab = tabs.find(item => item.id === params.get('tab'))?.id ?? 'overview';
    const navigate = useNavigate();
    const tabRefs = /** @type {typeof useRef<(HTMLButtonElement | null)[]>} */ (useRef)([]);
    const selectTab = /** @param {string} id */ (id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true, preventScrollReset: true });
    const tabKeyDown = /** @param {KeyboardEvent<HTMLButtonElement>} event
     * @param {number} index */ (event, index) => {
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
        if (next !== null) {
            event.preventDefault();
            selectTab(tabs[next].id);
            tabRefs.current[next]?.focus();
        }
    };
    return <BuyerWorkspaceLayout breadcrumb={<><ArrowRight size={19} aria-hidden="true"/><Link to="/buyer/skills">Explore skills</Link><span aria-hidden="true">/</span><span aria-current="page">{skill?.name ?? 'Skill details'}</span></>}>
    <main id="buyer-main" className="skill-detail-main">
      {loading ? <section className="workspace-loading" role="status" aria-busy="true">Loading skill details…</section> : error ? <section className="workspace-error" role="alert"><h1>We couldn’t load this skill.</h1><p>Please try again.</p><Button onClick={retry}>Retry skill</Button></section> : !skill ? <section className="workspace-error"><h1>Skill not available</h1><p>This preview only includes the supplied invoice skill detail.</p><Link to="/buyer/skills" className="button button--primary">Explore skills</Link></section> : <div className="skill-detail-grid">
        <div className="skill-detail-content">
          <header className="skill-detail-heading"><p className="skill-category-label">{skill.category}</p><h1>{skill.name}</h1><p className="skill-detail-byline">{skill.seller}<span>•</span>{skill.version}</p><p className="skill-detail-tagline">{skill.tagline}</p></header>
          <InvoiceScene example={skill.example}/>
          <div className="skill-detail-tabs" role="tablist" aria-label="Skill information">{tabs.map((tab, index) => <button key={tab.id} ref={node => { tabRefs.current[index] = node; }} id={`skill-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`skill-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={event => tabKeyDown(event, index)} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}</div>
          {tabs.map(tab => <section key={tab.id} id={`skill-panel-${tab.id}`} role="tabpanel" aria-labelledby={`skill-tab-${tab.id}`} tabIndex={0} hidden={activeTab !== tab.id} className="skill-tab-panel">
            {tab.id === 'overview' ? <><div className="skill-overview-summary"><div><h2>What it does</h2><p>Extracts key fields from invoice text.</p></div><div><h2>What you test</h2><p>Compare the results with your checked answers.</p></div></div><InvoiceExample skill={skill}/><p className="example-disclosure">Illustrative example — not an executed evaluation result.</p></> : tab.id === 'input-output' ? <><h2>From invoice text to structured fields</h2><p className="skill-panel-lead">This sample shows the expected format. A real test uses your separate examples and checked answers.</p><InvoiceExample skill={skill}/><p className="example-disclosure">Illustrative example — not an executed evaluation result.</p><div className="skill-test-note"><Info size={19}/><p>Agree the output requirements and scoring rules before testing. Compare your existing agent, a credible free alternative and the paid skill under the same conditions.</p></div></> : <><h2>Version {skill.version}</h2><p className="skill-panel-lead">This listing refers to {skill.name} by {skill.seller}.</p><dl className="skill-version-details"><div><dt>Listed version</dt><dd>{skill.version}</dd></div><div><dt>Package type</dt><dd>Instruction-only skill</dd></div><div><dt>Licence price</dt><dd>{skill.illustrativePrice.currency} {(skill.illustrativePrice.amountMinor / 100).toFixed(2)} · illustrative</dd></div><div><dt>Content hash</dt><dd>Not supplied in this preview</dd></div><div><dt>Purchase status</dt><dd>Not purchased</dd></div></dl><div className="skill-test-note"><LockKeyhole size={19}/><p>The agreed contract must identify the exact skill version and content hash. Delivery unlocks only after matching capture is confirmed as COMPLETED. Licence terms must be reviewed before approval.</p></div></>}
          </section>)}
        </div>
        <aside className="skill-purchase-card" aria-labelledby="purchase-title"><h2 id="purchase-title">Prove the fit{' '}<br />before you buy.</h2><div className="skill-purchase-price"><strong>{skill.illustrativePrice.currency} {(skill.illustrativePrice.amountMinor / 100).toFixed(2)}</strong><span>Illustrative price</span></div>
          <ul className="skill-purchase-benefits"><li><span><FileText size={24}/></span>Listed version: {skill.version}</li><li><span><CheckCircle2 size={24}/></span>Your examples. Your checks.</li></ul>
          <Button onClick={() => navigate('/buyer/evaluations/new')}>Set up a test <ArrowRight size={21}/></Button>
          <div className="skill-payment-note"><LockKeyhole size={20}/><p>Authorize with PayPal before testing. A passing result permits a capture request. Payment completes only after confirmed capture.</p></div>
          <div className="skill-paypal"><span className="paypal-letter" aria-hidden="true">P</span><div><strong>PayPal</strong> Sandbox<span className="skill-paypal-status">Preview · not connected</span></div></div>
          <div className="skill-result-note"><Info size={20}/><p>Results depend on your agreed test.</p></div>
        </aside>
      </div>}
    </main>
  </BuyerWorkspaceLayout>;
}


// ── components/shared/RouteScrollReset ──
/** New pages start at the top; query-only filters/tabs keep their scroll position. */
export function RouteScrollReset() {
    const { pathname } = useLocation();
    useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
    return null;
}


// ── pages/Evaluation/EvaluationShared ──
/** @param {{ children: ReactNode; title: string; className?: string }} props0 */
export function EvaluationLayout({ children, title, className = '' }) {
    return <BuyerWorkspaceLayout breadcrumb={<><Link to="/buyer?panel=evaluations">Evaluations</Link><span>/</span><span aria-current="page">{title}</span></>}><main id="buyer-main" className={`evaluation-main ${className}`}>{children}</main></BuyerWorkspaceLayout>;
}
/** @param {{ current: number }} props0 */
export function TestSteps({ current }) {
    return <ol className="test-steps" aria-label="Evaluation steps">{['Test setup', 'Review & authorize', 'Results'].map((label, index) => <li key={label} aria-current={current === index + 1 ? 'step' : undefined} className={current > index + 1 ? 'is-complete' : ''}><span>{current > index + 1 ? <Check size={20}/> : index + 1}</span>{label}</li>)}</ol>;
}
export function DemoDisclosure() {
    return <p className="evaluation-disclosure"><Info size={16}/>Frontend simulation. No model runs, payment operations or actual skill delivery.</p>;
}
/** @param {{ title?: string }} props0 */
export function WorkflowGate({ title = 'Start with your test agreement.' }) {
    return <section className="workflow-gate"><Info size={32}/><h1>{title}</h1><p>No authorization or result is restored from a URL or page reload. Set up the test and explicitly approve the demo terms first.</p><Link className="button button--primary" to="/buyer/evaluations/new">Set up a test <ArrowRight size={18}/></Link></section>;
}


// ── pages/Evaluation/TestSetupPage ──
export function TestSetupPage() {
    const { state, dispatch } = useTestWorkflow();
    const navigate = useNavigate();
    const draft = state.draft;
    const [accuracy, setAccuracy] = useState(String(draft.accuracy));
    const [improvement, setImprovement] = useState(String(draft.improvement));
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [record, setRecord] = /** @type {typeof useState<CheckedRecord | null>} */ (useState)(null);
    const [formatOpen, setFormatOpen] = useState(false);
    const inputRef = /** @type {typeof useRef<HTMLInputElement>} */ (useRef)(null);
    const uploadSequence = useRef(0);
    const frozen = state.payment !== 'NOT_AUTHORIZED';
    const ruleError = accuracy === '' || improvement === '' ? 'Enter both pass rules.' : validateRules(Number(accuracy), Number(improvement));
    const currentDraft = () => ({ ...draft, accuracy: Number(accuracy), improvement: Number(improvement) });
    const replace = /** @param {ChangeEvent<HTMLInputElement>} event */ async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file)
            return;
        const sequence = ++uploadSequence.current;
        setError('');
        setMessage('');
        setBusy(true);
        try {
            if (!file.name.toLowerCase().endsWith('.json') || file.size > 500000)
                throw new Error('Choose a JSON file no larger than 500 KB.');
            const records = validateRecords(JSON.parse(await file.text()));
            if (sequence !== uploadSequence.current)
                return;
            dispatch({ type: 'draft', draft: { ...draft, filename: file.name.slice(0, 200), source: 'local', records } });
            setMessage(`${records.length} ${records.length === 1 ? 'record' : 'records'} passed format checks. Answer correctness and independence are not verified.`);
        }
        catch (cause) {
            if (sequence === uploadSequence.current)
                setError(cause instanceof SyntaxError ? 'This file is not valid JSON.' : ( /** @type {Error} */(cause)).message);
        }
        finally {
            if (sequence === uploadSequence.current)
                setBusy(false);
        }
    };
    const save = () => {
        if (ruleError || error || busy)
            return;
        try {
            const value = currentDraft();
            sessionStorage.setItem(draftStorageKey, JSON.stringify(value));
            dispatch({ type: 'draft', draft: value });
            setMessage('Draft saved in this browser tab’s session. No payment or agreement approval was saved.');
        }
        catch {
            setError('Draft could not be saved. Browser storage may be full or unavailable.');
        }
    };
    const submit = /** @param {FormEvent} event */ (event) => {
        event.preventDefault();
        if (ruleError || error || busy || frozen)
            return;
        dispatch({ type: 'draft', draft: currentDraft() });
        dispatch({ type: 'review' });
        navigate('/buyer/evaluations/review');
    };
    return <EvaluationLayout title="New test"><TestSteps current={1}/>
    <form className="evaluation-columns setup-columns" onSubmit={submit} noValidate>
      <div><header className="evaluation-heading"><h1>Define what passing means.</h1><p>Invoice field extractor · v1.0</p></header>
        <section className="evaluation-card setup-card"><h2>Your checked examples</h2>
          {draft.source === 'demo' && <label className="demo-scenario">Illustrative example set<select value={draft.scenario ?? 'standard'} disabled={frozen || busy} onChange={event => { const next = createTestDraft(event.target.value === 'below-target' ? 'below-target' : 'standard'); dispatch({ type: 'draft', draft: { ...next, accuracy: draft.accuracy, improvement: draft.improvement } }); setError(''); setMessage('Example set changed. Review and approve new terms before testing.'); }}><option value="standard">Standard example · 90% with skill</option><option value="below-target">Alternative example · 80% with skill</option></select></label>}
          <div className="dataset-box"><span className="dataset-icon"><FileText size={29}/></span><div className="dataset-copy"><div><strong>{draft.filename}</strong><span className="format-valid"><Check size={17}/>{draft.records.length} {draft.records.length === 1 ? 'record' : 'records'} · format valid</span></div><p>{draft.source === 'demo' ? 'Synthetic examples with illustrative checked answers.' : 'Local examples. Correctness and independence are not verified.'}</p></div><Button type="button" variant="quiet" onClick={() => inputRef.current?.click()} disabled={busy || frozen}>{busy ? 'Reading…' : 'Replace file'}</Button><input ref={inputRef} className="sr-only" type="file" accept=".json,application/json" onChange={replace} aria-label="Replace checked examples file" disabled={frozen}/></div>
          <div className="table-scroll" tabIndex={0} aria-label="Example records"><table className="evaluation-table"><thead><tr><th>Record</th><th>Input</th><th>Checked answer</th></tr></thead><tbody>{draft.records.slice(0, 3).map(item => <tr key={item.id}><th scope="row">{item.id}</th><td><button type="button" className="record-file" onClick={() => setRecord(item)}><FileText size={19}/>{item.id}.txt</button></td><td><button type="button" className="record-file" onClick={() => setRecord(item)}><FileJson size={19}/>{item.id}-expected.json</button></td></tr>)}</tbody></table></div>
          <div className="dataset-tools"><span>Showing {Math.min(3, draft.records.length)} of {draft.records.length} examples</span><button type="button" onClick={() => setFormatOpen(true)}>JSON format</button><button type="button" disabled={frozen || busy} onClick={() => { dispatch({ type: 'reset' }); setAccuracy('90'); setImprovement('20'); setError(''); setMessage('Illustrative examples restored.'); }}>Use demo examples</button></div>
          <section className="setup-section"><h3>Required fields</h3><p>A record matches only when all three fields match its checked answer.</p><div className="required-fields"><span>Invoice number</span><span>Total</span><span>Currency</span></div></section>
          <section className="setup-section"><h3>Pass rules</h3><p>Set the minimum performance required for this illustrative comparison.</p><div className="pass-rule-inputs"><label>Minimum checked accuracy<span><input type="number" min="1" max="100" step="any" value={accuracy} onChange={e => { setAccuracy(e.target.value); setMessage(''); }} disabled={frozen} aria-invalid={!!ruleError}/>%</span></label><label>Minimum improvement<span><input type="number" min="0" max="100" step="any" value={improvement} onChange={e => { setImprovement(e.target.value); setMessage(''); }} disabled={frozen} aria-invalid={!!ruleError}/>percentage points</span></label></div><p className="rule-equivalent">{ruleError ?? `At least ${Math.ceil(Number(accuracy) * draft.records.length / 100)} of ${draft.records.length} matching records and a ${improvement}-point gain over baseline.`}</p></section>
          {(error || ruleError) && <p className="form-error" role="alert">{error || ruleError}</p>}{message && <p className="form-message" role="status">{message}</p>}
        </section>
      </div>
      <aside className="setup-summary"><div className="evaluation-building" role="img" aria-label="Glass office building in daylight"/><section className="evaluation-card"><h2>Test summary</h2><dl className="test-summary-list"><div><dt>Skill version</dt><dd>v1.0</dd></div><div><dt>Examples</dt><dd>{draft.records.length}</dd></div><div><dt>Demo price</dt><dd>USD 12.00</dd></div><div><dt>Payment</dt><dd>{frozen ? 'Simulation already started' : 'Not authorized'}</dd></div></dl><p className="privacy-note"><ShieldCheck size={23}/>Files stay in this browser. Save draft stores examples only in this tab’s session.</p><p className="setup-scope">Free-alternative and economic checks are not supplied in this illustration. Full purchase qualification remains unverified.</p><Button type="submit" disabled={!!ruleError || !!error || busy || frozen}>Review test terms <ArrowRight size={20}/></Button><Button type="button" variant="outline" onClick={save} disabled={!!ruleError || !!error || busy || frozen}>Save draft</Button>{frozen && <Button type="button" variant="quiet" onClick={() => { dispatch({ type: 'reset' }); setAccuracy('90'); setImprovement('20'); setError(''); setMessage('New illustrative draft started.'); }}>Start a new demo</Button>}</section></aside>
    </form><DemoDisclosure />
    {record && <Modal title={`Example — ${record.id}`} onClose={() => setRecord(null)}><p className="modal-lead">These labels preview text and checked-answer data; no PDF is uploaded or parsed.</p><h3>Input text</h3><pre className="record-preview">{record.input}</pre><h3>Checked answer</h3><pre className="record-preview">{JSON.stringify(record.expected, null, 2)}</pre></Modal>}
    {formatOpen && <Modal title="Checked examples JSON format" onClose={() => setFormatOpen(false)}><p className="modal-lead">A JSON array of 1–200 unique records, no larger than 500 KB. Input is plain text; total is a decimal string without commas. Format checks cannot verify that answers are correct or independently held out.</p><pre className="record-preview">{JSON.stringify([createTestDraft().records[0]], null, 2)}</pre></Modal>}
  </EvaluationLayout>;
}


// ── pages/Evaluation/AgreementPage ──
export function AgreementPage() {
    const { state, dispatch } = useTestWorkflow();
    const [consent, setConsent] = useState(false);
    const agreement = state.agreement;
    if (!agreement)
        return <EvaluationLayout title="Review agreement"><WorkflowGate /></EvaluationLayout>;
    const { draft } = agreement;
    const authorized = state.payment !== 'NOT_AUTHORIZED';
    return <EvaluationLayout title="Review agreement" className="agreement-page">
    <header className="agreement-hero"><div><h1>Agree the test.<br className="mobile-break"/> Authorize the payment.</h1><TestSteps current={2}/></div></header>
    <div className="evaluation-columns agreement-columns">
      <section className="evaluation-card agreement-card">
        <div className="agreement-card-title"><span className="dataset-icon"><LockKeyhole size={27}/></span><div><h2>Your test agreement</h2><p>{authorized ? 'This demo snapshot is approved and locked.' : 'These terms lock when you approve.'}</p></div></div>
        <dl className="agreement-terms">
          <div><dt>Skill</dt><dd>{agreement.skill}</dd></div><div><dt>Version</dt><dd>{agreement.version}</dd></div><div><dt>Test records</dt><dd>{draft.records.length} · {draft.filename}</dd></div><div><dt>Checked accuracy</dt><dd>At least {draft.accuracy}%</dd></div><div><dt>Improvement</dt><dd>At least {draft.improvement} percentage points</dd></div><div><dt>Demo price</dt><dd>USD 12.00 · skill licence only</dd></div>
        </dl>
        <p className="agreement-explanation">All three required fields must match the checked answer. Results in this preview are {draft.source === 'demo' ? 'synthetic fixtures, not model execution.' : 'unavailable for uploaded examples; the outcome will be inconclusive.'}</p>
        <div className="agreement-outcomes"><section className="outcome-policy pass"><Check size={32}/><h3>Pass: complete payment,<br /> then deliver</h3><p>The demo can request capture after passing the displayed rules. Delivery stays locked until capture is confirmed.</p></section><section className="outcome-policy caution"><Pause size={30}/><h3>Fail or inconclusive:<br /> no capture, no delivery</h3><p>The demo cancels the uncaptured authorization. Uploaded data is not evaluated by a model in this preview.</p></section></div>
        <details className="agreement-details"><summary>Evaluation scope and limits</summary><dl><div><dt>Baseline / model</dt><dd>Illustrative existing agent; no model or resource budget configured.</dd></div><div><dt>Scoring</dt><dd>Exact field matches; accuracy and percentage-point gain. No statistical inference.</dd></div><div><dt>Free alternative / economics</dt><dd>Not supplied. Full purchase qualification is unverified.</dd></div><div><dt>Version hash / licence policy</dt><dd>Not supplied. v1.0 is demo metadata, not an authenticated package.</dd></div><div><dt>Technical errors</dt><dd>No automatic retries in this preview. A real controller must reconcile uncertain payment status before acting.</dd></div></dl></details>
        {!authorized && <Link className="agreement-edit" to="/buyer/evaluations/new">Edit test setup</Link>}
      </section>
      <aside className="authorization-card"><div className="authorization-art"><span>PAYPAL SANDBOX · PREVIEW</span></div><div className="authorization-body"><p className="authorization-price">USD 12.00</p><h2>Authorize, then test.</h2><p>An authorization is separate from completed payment. This preview simulates both stages; it does not contact PayPal.</p>
        <div className="authorization-action">{!authorized ? <><label className="consent-checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/>I approve these demo test terms.</label><Button disabled={!consent} onClick={() => dispatch({ type: 'authorize', approved: consent })}>Simulate PayPal authorization <ArrowRight size={19}/></Button><p className="authorization-hint">No PayPal login, hold or charge is created.</p></> : <><p className="authorization-confirmed" role="status"><ShieldCheck size={24}/>Demo authorization confirmed.</p><Link className="button button--primary" to={state.stage === 'results' ? '/buyer/evaluations/results' : '/buyer/evaluations/progress'}>Continue evaluation demo <ArrowRight size={19}/></Link><p className="authorization-hint">Terms remain fixed for this local demo.</p></>}</div>
        <div className="authorization-status"><span>Payment status</span><strong><Circle size={14}/>{authorized ? (state.payment === 'COMPLETED' ? 'Demo captured' : state.payment === 'VOIDED' ? 'Demo cancelled' : state.payment === 'CAPTURE_REQUESTED' ? 'Demo capture pending' : 'Demo authorized') : 'Not authorized'}</strong></div>
      </div></aside>
    </div><DemoDisclosure />
  </EvaluationLayout>;
}


// ── pages/Evaluation/EvaluationProgressPage ──
export function EvaluationProgressPage() {
    const { state, dispatch } = useTestWorkflow();
    const navigate = useNavigate();
    if (!state.agreement || !state.approved)
        return <EvaluationLayout title="Evaluation progress"><WorkflowGate /></EvaluationLayout>;
    if (state.stage === 'results')
        return <EvaluationLayout title="Evaluation progress"><section className="workflow-gate"><Check size={35}/><h1>Your demo results are ready.</h1><Link className="button button--primary" to="/buyer/evaluations/results">View demo results <ArrowRight size={19}/></Link></section></EvaluationLayout>;
    const { draft, skill, version } = state.agreement;
    const demo = draft.source === 'demo';
    const verifying = state.stage === 'verifying';
    const summary = demo ? illustrativeSummary(draft.records, draft.scenario) : null;
    const steps = [
        { title: 'Authorization confirmed', description: 'Demo authorization for USD 12.00. No real hold or capture.', state: 'done' },
        { title: demo ? 'Baseline fixture loaded' : 'Baseline not executed', description: demo ? `${required(summary).baseline} of ${draft.records.length} matched in the illustrative fixture.` : 'Uploaded examples require a real evaluation worker.', state: 'done' },
        { title: verifying ? (demo ? 'Skill fixture loaded' : 'Skill not executed') : 'Running with skill · demo', description: demo ? (verifying ? `${required(summary).skilled} of ${draft.records.length} matched in the illustrative fixture.` : 'Previewing the skill-run stage. No model is running.') : 'No outputs will be invented for your uploaded examples.', state: verifying ? 'done' : 'current' },
        { title: 'Checking agreed rules', description: verifying ? 'Ready to compare the fixture with your approved thresholds.' : 'Waiting for the next demo step.', state: verifying ? 'current' : 'pending' },
    ];
    return <EvaluationLayout title="Evaluation progress" className="progress-page">
    <div className="evaluation-columns progress-columns"><section className="progress-scene"><header className="progress-heading"><div><h1>Putting the skill to the test.</h1><p>{skill} <span>·</span> {version} <span>·</span> {draft.records.length} checked examples</p></div><span className="running-pill"><i />{verifying ? 'Checking rules · demo' : 'Running with skill · demo'}</span></header><div className="progress-building" role="img" aria-label="Illuminated glass building at night"/><div className="progress-callouts" aria-hidden="true"><span className="callout-skilled">With skill</span><span className="callout-baseline">Baseline</span></div><p className="scene-caption">Illustrative comparison · no live model execution</p></section>
      <aside className="evaluation-card progress-card"><h2>Evaluation progress</h2><ol className="evaluation-timeline">{steps.map(step => <li key={step.title} className={`timeline-${step.state}`} aria-current={step.state === 'current' ? 'step' : undefined}><span className="timeline-marker">{step.state === 'done' ? <Check size={22}/> : <Circle size={step.state === 'current' ? 16 : 28}/>}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
        <section className="progress-metrics"><h3>Results <span>(illustrative)</span></h3><div><section><h4>Baseline</h4><strong>{summary ? `${summary.baselinePercent}%` : 'Not run'}</strong><p>{summary ? `${summary.baseline} of ${draft.records.length} matched` : 'No execution data'}</p></section><section><h4>With skill</h4><strong className={!verifying ? 'pending-metric' : ''}>{summary && verifying ? `${summary.skilledPercent}%` : 'Pending'}</strong><p>{summary && verifying ? `${summary.skilled} of ${draft.records.length} matched` : 'No final result yet'}</p></section></div><p className="progress-qualification">Free alternative and economic qualification: unverified.</p></section>
        <Button onClick={() => {
            if (!verifying)
                dispatch({ type: 'verify' });
            else {
                dispatch({ type: 'results' });
                navigate('/buyer/evaluations/results');
            }
        }}>{verifying ? 'Show demo results' : 'Advance demo to rule check'} <ArrowRight size={18}/></Button>
      </aside>
    </div>
    <section className="payment-progress-strip" aria-label="Payment and delivery status"><div><Check className="payment-check" size={30}/><span><strong>Payment: Demo authorized</strong><p>USD 12.00 authorization simulation. No actual payment hold.</p></span></div><div><Circle size={29}/><span><strong>Capture: Not started</strong><p>Passing only makes the demo eligible for a capture request.</p></span></div><div><LockKeyhole size={28}/><span><strong>Skill delivery: Locked</strong><p>Unlocks only after simulated completed capture.</p></span></div><Link className="button button--primary" to="/buyer/evaluations/review">View agreement</Link></section><DemoDisclosure />
  </EvaluationLayout>;
}


// ── pages/Evaluation/FailedEvaluationView ──
export function FailedEvaluationView() {
    const { state, dispatch } = useTestWorkflow();
    const navigate = useNavigate();
    const [all, setAll] = useState(false);
    const [detail, setDetail] = /** @type {typeof useState<'accuracy' | 'improvement' | null>} */ (useState)(null);
    const { draft, skill, version } = required(state.agreement);
    const summary = illustrativeSummary(draft.records, draft.scenario);
    const accuracyMet = summary.skilledPercent >= draft.accuracy;
    const improvementMet = summary.improvement >= draft.improvement;
    const mismatches = draft.records.flatMap((record, index) => {
        const output = illustrativeOutput(record, index, 'skill', draft.scenario);
        if (matchesFields(record.expected, output))
            return [];
        const field = required(( /** @type {(keyof InvoiceFields)[]} */(Object.keys(output))).find(key => output[key] !== record.expected[key]));
        return [{ id: record.id, field, expected: record.expected[field], actual: output[field] }];
    });
    return <EvaluationLayout title="Run results" className="failure-page"><div className="evaluation-columns failure-columns"><div>
    <header className="failure-heading"><span className="failure-label"><CircleAlert size={18}/>Checks not met</span><h1>This skill didn’t meet your checks.</h1><p>{skill} <span>·</span> {version} <span>·</span> Alternative demo outcome</p><p className="failure-explanation">{!accuracyMet ? `Your agreed accuracy requirement was ${draft.accuracy}%. This run reached ${summary.skilledPercent}%.` : `Your agreed improvement requirement was ${draft.improvement} points. This run gained ${summary.improvement} points.`}</p></header>
    <section className="evaluation-card failure-metrics" aria-label="Illustrative failed comparison"><div><h2>Baseline</h2><strong>{summary.baselinePercent}%</strong><p>{summary.baseline} of {draft.records.length} records</p></div><div><h2>With skill</h2><strong>{summary.skilledPercent}%</strong><p>{summary.skilled} of {draft.records.length} records</p></div><div><h2>Required</h2><strong>{draft.accuracy}%</strong><p>At least {Math.ceil(draft.accuracy * draft.records.length / 100)} of {draft.records.length} records</p></div></section>
    <section className="evaluation-card failure-evidence"><h2>What did not pass</h2><div className="failed-checks">{[{ key: /** @type {const} */ ('accuracy'), label: 'Checked accuracy', value: `${summary.skilledPercent}% / ${draft.accuracy}% required`, met: accuracyMet }, { key: /** @type {const} */ ('improvement'), label: 'Improvement', value: `${summary.improvement} points / ${draft.improvement} required`, met: improvementMet }].map(rule => <button key={rule.key} onClick={() => setDetail(rule.key)}><span className={`rule-icon ${rule.met ? 'met' : ''}`}>{rule.met ? <Check /> : <X />}</span><span><strong>{rule.label}</strong><small>{rule.value}<span className="sr-only"> — {rule.met ? 'met' : 'not met'}</span></small></span><ChevronRight size={18}/></button>)}</div>
      <h3>Records to review</h3><p>Examples that did not match their checked answers.</p><div className="table-scroll" tabIndex={0} aria-label="Failed records"><table className="evaluation-table failure-table"><thead><tr><th>Record</th><th>Checked answer<small>(expected value)</small></th><th>Skill output<small>(demo fixture)</small></th></tr></thead><tbody>{(all ? mismatches : mismatches.slice(0, 2)).map(record => <tr key={record.id}><th scope="row">{record.id}<small>{record.field === 'currency' ? 'Currency' : record.field === 'total' ? 'Total' : 'Invoice number'}</small></th><td>{record.expected}</td><td>{record.actual}</td></tr>)}</tbody></table></div><Button variant="outline" aria-expanded={all} onClick={() => setAll(value => !value)}>{all ? 'Show first two records' : 'Review failed records'} <ArrowRight size={18}/></Button><p className="failed-count">Showing {Math.min(all ? mismatches.length : 2, mismatches.length)} of {mismatches.length} mismatched records.</p>
    </section></div>
    <aside className="evaluation-card failure-payment"><div className="failure-building" role="img" aria-label="Illuminated glass office building"/><h2>Payment &amp; delivery</h2><p>PayPal Sandbox · illustrative demo</p><dl>{[{ icon: CreditCard, label: 'Payment', status: 'Not captured' }, { icon: Shield, label: 'Authorization', status: 'Demo voided' }, { icon: Box, label: 'Skill delivery', status: 'Locked' }].map(item => <div key={item.label}><dt><span><item.icon size={24}/></span>{item.label}</dt><dd>{item.status}</dd></div>)}</dl><Button disabled><LockKeyhole size={19}/>Download skill</Button><Link className="button button--primary" to="/buyer/skills">Explore another skill <ArrowRight size={19}/></Link><Button variant="outline" onClick={() => { dispatch({ type: 'reset' }); navigate('/buyer/evaluations/new'); }}>Create a new test</Button><p className="failure-note"><Info size={19}/>A new test requires new agreed terms. No real authorization or payment exists.</p></aside>
    </div><p className="evaluation-disclosure"><Info size={16}/>Synthetic comparison only. Free-alternative and economic qualification remain unverified.</p><DemoDisclosure />
    {detail && <Modal title={detail === 'accuracy' ? 'Checked accuracy rule' : 'Improvement rule'} onClose={() => setDetail(null)}><p className="modal-lead">{detail === 'accuracy' ? `${summary.skilled} of ${draft.records.length} records match all three fields: ${summary.skilledPercent}% accuracy. The agreement requires at least ${draft.accuracy}%.` : `${summary.skilledPercent}% with skill minus ${summary.baselinePercent}% baseline equals ${summary.improvement} percentage points. The agreement requires at least ${draft.improvement} points.`}</p><p>This rule is {detail === 'accuracy' ? (accuracyMet ? 'met' : 'not met') : (improvementMet ? 'met' : 'not met')}. Both rules must be met to pass the illustrative comparison. No model was run.</p></Modal>}
  </EvaluationLayout>;
}


// ── components/shared/DemoReceipt ──
/** @param {{ agreement: TestAgreement; onClose: () => void }} props0 */
export function DemoReceipt({ agreement, onClose }) {
    const { draft } = agreement;
    return <Modal title="Demo receipt — no actual payment" onClose={onClose}><p className="modal-lead">A local illustration of the receipt fields. This is not a payment receipt or proof of ownership.</p><dl className="receipt-details"><div><dt>Skill</dt><dd>{agreement.skill} · {agreement.version}</dd></div><div><dt>Illustrative amount</dt><dd>USD 12.00 · skill licence only</dd></div><div><dt>Demo capture state</dt><dd>COMPLETED (simulated)</dd></div><div><dt>Test snapshot</dt><dd>{draft.filename} · {draft.records.length} records</dd></div><div><dt>Displayed rules</dt><dd>{draft.accuracy}% accuracy; {draft.improvement}-point gain</dd></div><div><dt>Skill hash / PayPal reference</dt><dd>Not available — no package hash or transaction was created.</dd></div></dl><p className="modal-note">The downloadable text is an illustrative instruction sample. No authenticated seller package, purchased licence or independently verified evaluation is available.</p></Modal>;
}


// ── pages/Evaluation/EvaluationResultsPage ──
/** @param {{ match: boolean }} props0 */
function MatchBadge({ match }) { return <span className={`match-badge ${match ? 'match' : 'mismatch'}`}>{match ? 'Match' : 'Mismatch'}</span>; }
export function EvaluationResultsPage() {
    const { state, dispatch } = useTestWorkflow();
    const navigate = useNavigate();
    const [allRecords, setAllRecords] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [modal, setModal] = /** @type {typeof useState<'receipt' | null>} */ (useState)(null);
    if (!state.agreement || !state.approved)
        return <EvaluationLayout title="Test results"><WorkflowGate /></EvaluationLayout>;
    if (state.stage !== 'results')
        return <EvaluationLayout title="Test results"><section className="workflow-gate"><Info size={32}/><h1>Your evaluation is not finished.</h1><p>Complete the demo rule check before viewing results.</p><Link className="button button--primary" to="/buyer/evaluations/progress">Continue evaluation demo <ArrowRight size={18}/></Link></section></EvaluationLayout>;
    const agreement = state.agreement;
    const { draft } = agreement;
    const outcome = demoOutcome(state);
    const summary = draft.source === 'demo' ? illustrativeSummary(draft.records, draft.scenario) : null;
    if (outcome === 'FAIL')
        return <FailedEvaluationView />;
    const passed = outcome === 'PASS';
    const completed = state.payment === 'COMPLETED';
    const pending = state.payment === 'CAPTURE_REQUESTED';
    const selected = draft.records[selectedIndex];
    const baselineOutput = summary ? illustrativeOutput(selected, selectedIndex, 'baseline', draft.scenario) : null;
    const skillOutput = summary ? illustrativeOutput(selected, selectedIndex, 'skill', draft.scenario) : null;
    /** @type {{ key: keyof InvoiceFields; label: string }[]} */
    const fields = [{ key: 'currency', label: 'Currency' }, { key: 'invoiceNumber', label: 'Invoice number' }, { key: 'total', label: 'Total' }];
    const visibleRecords = allRecords ? draft.records : draft.records.slice(0, 3);
    return <EvaluationLayout title="Test results" className="results-page">
    <header className={`results-heading ${passed ? 'result-pass' : 'result-caution'}`}><span className="result-symbol">{passed ? <Check size={38}/> : <CircleAlert size={36}/>}</span><div><h1>{passed ? 'Your demo test passed.' : 'Your test is inconclusive.'}</h1><p>{agreement.skill} · {agreement.version}</p></div></header>
    <div className="evaluation-columns results-columns"><div className="results-evidence">
      <section className="evaluation-card result-metrics" aria-label="Illustrative comparison results"><div><h2>Baseline</h2><strong>{summary ? `${summary.baselinePercent}%` : 'Not run'}</strong><p>{summary ? `${summary.baseline} / ${draft.records.length} matched` : 'No execution data'}</p></div><div><h2>With skill</h2><strong>{summary ? `${summary.skilledPercent}%` : 'Not run'}</strong><p>{summary ? `${summary.skilled} / ${draft.records.length} matched` : 'No execution data'}</p></div><div><h2>Improvement</h2><strong className={summary ? 'positive-gain' : ''}>{summary ? `+${summary.improvement}` : '—'}</strong><p>percentage points</p></div></section>
      <section className={`result-checks ${passed ? 'checks-pass' : 'checks-caution'}`}><h2>{passed ? <Check size={26}/> : <CircleAlert size={26}/>}{passed ? 'Displayed checks met' : 'Evaluation not executed'}</h2>{summary ? <div>{[{ label: `At least ${draft.accuracy}% checked accuracy`, met: summary.skilledPercent >= draft.accuracy }, { label: `At least ${draft.improvement}-point improvement`, met: summary.improvement >= draft.improvement }].map(rule => <p key={rule.label}>{rule.met ? <Check size={19}/> : <X size={19}/>}{rule.label}<span className="sr-only"> — {rule.met ? 'met' : 'not met'}</span></p>)}</div> : <p>These examples have not been evaluated. No verified result or completed payment is available.</p>}</section>
      {summary ? <><section className="evaluation-card evidence-records"><div className="evidence-title"><h2>Record-by-record evidence</h2><button onClick={() => setAllRecords(value => !value)} aria-expanded={allRecords}>{allRecords ? 'Show first 3 records' : 'View all records'} <ArrowRight size={18}/></button></div><div className="table-scroll" tabIndex={0} aria-label="Illustrative record evidence"><table className="evaluation-table results-table"><thead><tr><th>Record</th><th>Baseline</th><th>With skill</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{visibleRecords.map((record, index) => <tr key={record.id} className={index === selectedIndex ? 'selected-record' : ''}><th scope="row">{record.id}</th><td><MatchBadge match={matchesFields(record.expected, illustrativeOutput(record, index, 'baseline', draft.scenario))}/></td><td><MatchBadge match={matchesFields(record.expected, illustrativeOutput(record, index, 'skill', draft.scenario))}/></td><td><button className="record-inspect" aria-label={`Inspect ${record.id}`} aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)}><ArrowRight size={18}/></button></td></tr>)}</tbody></table></div><p className="evidence-count">Showing {visibleRecords.length} of {draft.records.length} synthetic records</p></section>
      <section className="evaluation-card selected-record-detail" aria-live="polite"><h2>Selected record detail — {selected.id}</h2><div className="table-scroll" tabIndex={0} aria-label="Selected record field comparison"><table className="evaluation-table"><thead><tr><th>Field</th><th>Checked answer</th><th>Baseline</th><th>With skill</th></tr></thead><tbody>{fields.map(field => <tr key={field.key}><th scope="row">{field.label}</th><td>{selected.expected[field.key]}</td><td><span className={`field-value ${required(baselineOutput)[field.key] === selected.expected[field.key] ? 'match' : 'mismatch'}`}>{required(baselineOutput)[field.key]}</span><span className="sr-only"> — {required(baselineOutput)[field.key] === selected.expected[field.key] ? 'matches' : 'mismatch'}</span></td><td><span className={`field-value ${required(skillOutput)[field.key] === selected.expected[field.key] ? 'match' : 'mismatch'}`}>{required(skillOutput)[field.key]}</span><span className="sr-only"> — {required(skillOutput)[field.key] === selected.expected[field.key] ? 'matches' : 'mismatch'}</span></td></tr>)}</tbody></table></div></section></> : <section className="evaluation-card inconclusive-evidence"><FileText size={30}/><h2>Your examples are preserved.</h2><p>{draft.records.length} {draft.records.length === 1 ? 'record' : 'records'} in {draft.filename}. Format checks passed; checked-answer correctness and held-out independence remain unverified.</p></section>}
      <p className="result-scope"><Info size={18}/><span>{summary ? 'These are illustrative fixtures, not measured model results.' : 'No model evaluation was run for these examples.'} Free-alternative and economic checks are not supplied; full purchase qualification remains unverified. This comparison applies only to this demo version and these records.</span></p>
    </div>
    <aside className="evaluation-card delivery-card"><div className="evaluation-building" role="img" aria-label="Glass office building in daylight"/><h2>Payment &amp; delivery</h2><div className="delivery-status-row"><span className="payment-monogram" aria-hidden="true">P</span><div><strong>PayPal payment</strong><p>USD 12.00 · Sandbox preview</p></div><span className={`delivery-badge ${completed ? 'ready' : ''}`}>{completed ? 'Demo captured' : pending ? 'Demo pending' : passed ? 'Demo authorized' : 'Demo cancelled'}</span></div><div className="delivery-status-row"><FileText size={25}/><div><strong>Tested skill</strong><p>{agreement.skill} · {agreement.version}</p></div><span className={`delivery-badge ${completed ? 'ready' : ''}`}>{completed ? 'Demo ready' : 'Locked'}</span></div>
      <div className="capture-explanation" role="status">{completed ? 'Simulated completed capture confirmed. The demo preview is unlocked; no actual package or licence has been delivered.' : pending ? 'Capture request simulated. Payment remains pending and delivery stays locked until confirmation.' : passed ? 'Passing does not complete payment. Request capture, then confirm its completion in this demo.' : 'The demo authorization is cancelled. No capture, charge or delivery occurs.'}</div>
      {passed && !completed && <Button onClick={() => dispatch({ type: pending ? 'confirm' : 'capture' })}>{pending ? 'Simulate completed capture' : 'Simulate capture request'} <ArrowRight size={18}/></Button>}
      <Button disabled={!completed} onClick={() => navigate('/buyer/my-skills/invoice-field-extractor')}>{completed ? 'Open demo skill' : <><LockKeyhole size={18}/>Skill delivery locked</>} {completed && <ArrowRight size={18}/>}</Button><Button variant="outline" disabled={!completed} onClick={() => setModal('receipt')}>View demo receipt</Button>
      <Link className="delivery-agreement" to="/buyer/evaluations/review">View approved agreement</Link><p className="delivery-note"><Info size={18}/>This is a frontend simulation. No PayPal transaction exists.</p>
      {!passed && <Button variant="quiet" onClick={() => { dispatch({ type: 'reset' }); navigate('/buyer/evaluations/new'); }}>Start a new demo</Button>}
    </aside></div><DemoDisclosure />
    {completed && modal === 'receipt' && <DemoReceipt agreement={agreement} onClose={() => setModal(null)}/>}
  </EvaluationLayout>;
}


// ── pages/Skills/DeliveredSkillPage ──
export function DeliveredSkillPage() {
    const { state } = useTestWorkflow();
    const [receipt, setReceipt] = useState(false);
    const [retry, setRetry] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [copyError, setCopyError] = useState(false);
    const [copying, setCopying] = useState(false);
    const unlocked = hasDemoDelivery(state);
    const agreement = state.agreement;
    const copy = async () => {
        if (!unlocked || !agreement)
            return;
        setCopying(true);
        setFeedback('');
        setCopyError(false);
        try {
            await navigator.clipboard.writeText(agreement.instructionText);
            setFeedback('Instructions copied.');
        }
        catch {
            setCopyError(true);
            setFeedback('Clipboard access was unavailable. Select and copy the instructions below.');
        }
        finally {
            setCopying(false);
        }
    };
    const download = () => {
        if (!unlocked || !agreement)
            return;
        const text = `AGENTGAIN DEMO · ${agreement.skill} · ${agreement.version}\nIllustrative text sample. No actual purchase, verified model run or seller licence.\n\n${agreement.instructionText}\n`;
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'agentgain-invoice-field-extractor-v1.0-demo.txt';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setCopyError(false);
        setFeedback('Demo text download requested. No executable files are included.');
    };
    return <BuyerWorkspaceLayout breadcrumb={<><span>My skills</span><span>/</span><span aria-current="page">Invoice field extractor</span></>}><main id="buyer-main" className="evaluation-main delivered-page">
    {!unlocked || !agreement ? <section className="workflow-gate"><LockKeyhole size={34}/><h1>Your skill is still locked.</h1><p>A passing result and confirmed completed demo capture are required. Opening this URL or reloading does not grant access.</p><Link className="button button--primary" to={state.approved ? '/buyer/evaluations/results' : '/buyer/evaluations/new'}>{state.approved ? 'Return to evaluation' : 'Set up a test'} <ArrowRight size={18}/></Link></section> : <>
      <header className="delivered-heading"><div><h1>Your tested skill is ready.</h1><p>The fixed instruction sample from your demo agreement.</p></div><span className="delivered-pill"><Check size={18}/>Demo payment captured</span></header>
      <div className="evaluation-columns delivered-columns"><div><section className="evaluation-card delivered-package"><div className="delivered-summary"><div className="delivered-illustration"><img src={assetUrls["skill-invoice.png"]} alt="Glass invoice document illustration"/></div><div><h2>{agreement.skill}</h2><p className="delivered-seller">Demo Studio <span>·</span> {agreement.version}</p><span className="delivered-pill"><Check size={17}/>Demo access unlocked</span><dl><div><dt>Tested version</dt><dd>{agreement.version} · illustrative</dd></div><div><dt>Evaluation</dt><dd>Displayed demo checks passed</dd></div><div><dt>Payment</dt><dd>USD 12.00 · simulated capture</dd></div></dl></div></div>
        <section className="skill-instructions"><div><h3>Skill instructions</h3><span>TEXT-ONLY SAMPLE</span></div><pre tabIndex={0} aria-label="Skill instructions text">{agreement.instructionText}</pre><div className="skill-download-actions"><Button onClick={download}><Download size={19}/>Download demo skill</Button><Button variant="outline" onClick={copy} disabled={copying}><Copy size={19}/>{copying ? 'Copying…' : 'Copy instructions'}</Button></div>{feedback && <p className={copyError ? 'form-error' : 'form-message'} role={copyError ? 'alert' : 'status'}>{feedback}</p>}</section>
      </section><section className="evaluation-card put-to-work"><span className="dataset-icon"><FileText size={25}/></span><div><h2>Put it to work</h2><p>Return to your original task with this skill.</p></div><button onClick={() => setRetry(true)}>Retry original task <ArrowRight size={18}/></button></section></div>
      <aside className="evaluation-card purchase-record"><div className="delivered-building" role="img" aria-label="Glass office building at sunset"/><h2>Purchase record</h2><dl><div><dt>Version</dt><dd>{agreement.version}</dd></div><div><dt>Payment method</dt><dd>PayPal Sandbox preview</dd></div><div><dt>Amount</dt><dd>USD 12.00</dd></div><div><dt>Status</dt><dd className="purchase-captured"><Check size={18}/>Demo captured</dd></div></dl><div className="purchase-record-links"><button onClick={() => setReceipt(true)}><FileText size={23}/>View demo receipt <ArrowRight size={17}/></button><Link to="/buyer/evaluations/results"><ChartNoAxesColumn size={23}/>View test evidence <ArrowRight size={17}/></Link></div><p><Info size={20}/>Demo access unlocked after simulated completed capture.</p></aside></div>
      <p className="evaluation-disclosure"><Info size={16}/>Illustrative text download only. No real PayPal payment, seller licence or model execution. Free-alternative and economic qualification remain unverified.</p>
      {receipt && <DemoReceipt agreement={agreement} onClose={() => setReceipt(false)}/>}
      {retry && <Modal title="Return to your original task" onClose={() => setRetry(false)}><p className="modal-lead">Copy the instructions into your agent to retry your original task. This frontend is not connected to your agent and has not run that task.</p><p>Any later task result must be recorded separately from the demo evaluation. No post-purchase outcome is available yet.</p><Button onClick={() => { setRetry(false); void copy(); }}><Copy size={18}/>Copy instructions for my agent</Button></Modal>}
    </>}
  </main></BuyerWorkspaceLayout>;
}


// ── services/mock/sellerService ──
export const demoSellerPolicy = 'Buyers approve a separate test agreement before authorization. Passing checks permits a capture request; delivery requires confirmed completed capture. Failed or inconclusive tests do not capture payment.';
/** @returns {SellerDraft} */
export function createSellerDraft() {
    return { name: 'Invoice field extractor', category: 'Documents', description: 'Extract key fields from invoice text.', version: 'v1.0', instructions: 'Extract invoice number, total and currency.\nUse only values present in the input.\nReturn the agreed structured fields.', expectedInput: 'Invoice text', expectedOutput: 'Invoice number, total, currency', price: '12.00', currency: 'USD', licence: 'Demo evaluation only; no commercial licence is granted.', exampleInput: 'Invoice INV-1042. Total USD 1250.00.', exampleOutput: '{"invoiceNumber":"INV-1042","total":"1250.00","currency":"USD"}' };
}
/** @returns {SellerListing[]} */
export function sellerListingFixtures() {
    return [
        { id: 'invoice-demo', status: 'AVAILABLE', draft: createSellerDraft(), contentHash: null, buyerPreview: '/buyer/skills/invoice-field-extractor' },
        { id: 'attributes-draft', status: 'DRAFT', draft: { ...createSellerDraft(), name: 'Product attribute mapper', category: 'Commerce', description: 'Maps product attributes to a standard schema.', version: 'v0.1', instructions: 'Extract brand, color, size and material. Use only attributes present in the input.', expectedInput: 'Product listing text', expectedOutput: 'Brand, color, size, material', price: '', exampleInput: 'Blue cotton shirt, size M.', exampleOutput: '{"color":"blue","size":"M","material":"cotton"}' }, contentHash: null, buyerPreview: null },
    ];
}
/** @type {SellerActivity[]} */
export const sellerActivityFixtures = [
    { id: 'AG-004', buyerLabel: 'Buyer 4', skill: 'Invoice field extractor', version: 'v1.0', started: 'Apr 25, 2025 10:14', status: 'TESTING' },
    { id: 'AG-003', buyerLabel: 'Buyer 3', skill: 'Invoice field extractor', version: 'v1.0', started: 'Apr 24, 2025 16:38', status: 'PAYMENT_PENDING' },
    { id: 'AG-002', buyerLabel: 'Buyer 2', skill: 'Invoice field extractor', version: 'v1.0', started: 'Apr 22, 2025 11:05', status: 'DELIVERED' },
    { id: 'AG-001', buyerLabel: 'Buyer 1', skill: 'Product attribute mapper', version: 'v0.1', started: 'Apr 20, 2025 09:21', status: 'FAILED' },
];
/** @param {SellerDraft} draft
 * @returns {SellerErrors} */
export function sellerErrors(draft) {
    /** @type {SellerErrors} */
    const errors = {};
    for (const key of /** @type {const} */ (['name', 'description', 'instructions', 'expectedInput', 'expectedOutput', 'licence', 'exampleInput', 'exampleOutput'])) {
        const max = key === 'instructions' ? 10000 : key === 'name' ? 100 : 2000;
        if (!draft[key].trim() || draft[key].length > max)
            errors[key] = `Enter ${key === 'name' ? 'a name' : 'text'} of 1–${max} characters.`;
    }
    if (!/^v?\d+\.\d+(?:\.\d+)?$/.test(draft.version.trim()) || draft.version.length > 30 || draft.version.trim().replace(/^v/, '').split('.').some(part => !Number.isSafeInteger(Number(part))))
        errors.version = 'Use a version such as v1.0 or v1.0.1.';
    if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(draft.price) || Number(draft.price) <= 0 || Number(draft.price) > 999999.99)
        errors.price = 'Enter a USD price from 0.01 to 999999.99, with at most two decimals.';
    if (!['Documents', 'Operations', 'Commerce'].includes(draft.category))
        errors.category = 'Choose a supported category.';
    if (draft.currency !== 'USD')
        errors.currency = 'This demo supports USD only.';
    return errors;
}
/** @param {SellerDraft} draft
 * @returns {SellerDraft} */
export function normalizedSellerDraft(draft) {
    return { name: draft.name.trim(), category: draft.category, description: draft.description.trim(), version: `v${draft.version.trim().replace(/^v/, '').split('.').map(Number).join('.')}`, instructions: draft.instructions.trim(), expectedInput: draft.expectedInput.trim(), expectedOutput: draft.expectedOutput.trim(), price: Number(draft.price).toFixed(2), currency: 'USD', licence: draft.licence.trim(), exampleInput: draft.exampleInput.trim(), exampleOutput: draft.exampleOutput.trim() };
}
/** @param {SellerDraft} draft */
export function sellerPackageText(draft) { return JSON.stringify({ ...normalizedSellerDraft(draft), evaluationPolicy: demoSellerPolicy }); }
/** @type {SellerService} */
export const mockSellerService = {
    async register(draft, listings) {
        if (Object.keys(sellerErrors(draft)).length)
            throw new Error('Correct the highlighted fields before registering.');
        const normalized = normalizedSellerDraft(draft);
        const existing = listings.find(item => item.status !== 'DRAFT' && item.draft.name.toLowerCase() === normalized.name.toLowerCase() && normalizedSellerDraft(item.draft).version === normalized.version);
        const serialized = sellerPackageText(normalized);
        if (existing && sellerPackageText(existing.draft) !== serialized)
            throw new Error('This name and version already exist. Use a new version to change the package or offer.');
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
        const contentHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        return { id: existing?.id ?? `local-${crypto.randomUUID()}`, status: existing?.status ?? 'LOCAL', draft: structuredClone(normalized), contentHash, buyerPreview: existing?.buyerPreview ?? null };
    },
};


// ── hooks/useSellerWorkspace ──
const SellerContext = /** @type {typeof createContext<{ listings: SellerListing[]; drafts: Record<string, SellerDraft | undefined>; setDraft: (key: string, draft: SellerDraft) => void; register: (draft: SellerDraft, editingId?: string) => Promise<SellerListing> } | null>} */ (createContext)(null);
/** @param {{ children: ReactNode; service?: SellerService }} props0 */
export function SellerWorkspaceProvider({ children, service = mockSellerService }) {
    const [listings, setListings] = useState(sellerListingFixtures);
    const [drafts, setDrafts] = /** @type {typeof useState<Record<string, SellerDraft | undefined>>} */ (useState)({});
    const setDraft = /** @param {string} key
     * @param {SellerDraft} value */ (key, value) => setDrafts(previous => ({ ...previous, [key]: structuredClone(value) }));
    const current = useRef(listings);
    const busy = useRef(false);
    const register = /** @param {SellerDraft} value
     * @param {string} [editingId] */ async (value, editingId) => {
        if (busy.current)
            throw new Error('Registration is already in progress.');
        busy.current = true;
        try {
            const listing = await service.register(structuredClone(value), current.current);
            const remaining = current.current.filter(item => !(item.id === editingId && item.status === 'DRAFT'));
            const next = remaining.some(item => item.id === listing.id) ? remaining.map(item => item.id === listing.id ? listing : item) : remaining.concat(listing);
            current.current = next;
            setListings(next);
            setDrafts(previous => { const nextDrafts = { ...previous }; delete nextDrafts[editingId ?? 'new']; return nextDrafts; });
            return structuredClone(listing);
        }
        finally {
            busy.current = false;
        }
    };
    return <SellerContext.Provider value={{ listings, drafts, setDraft, register }}>{children}</SellerContext.Provider>;
}
export function useSellerWorkspace() {
    const context = useContext(SellerContext);
    if (!context)
        throw new Error('SellerWorkspaceProvider is required');
    return context;
}


// ── components/layout/SellerShell ──
/** @param {{ children: ReactNode; registering?: boolean }} props0 */
export function SellerShell({ children, registering = false }) {
    const [profile, setProfile] = useState(false);
    const location = useLocation();
    return <div className="buyer-app seller-app"><a className="skip-link" href="#seller-main">Skip to seller workspace</a><aside className="buyer-sidebar" aria-label="Seller navigation"><Link to="/" className="buyer-brand" aria-label="AgentGain home"><BrandMark /><span>AgentGain</span></Link><p className="sidebar-label">SELLER WORKSPACE</p><nav className="buyer-nav" aria-label="Seller workspace"><Link to="/seller" className={!registering && !location.hash ? 'active' : ''}><House /><span>Overview</span></Link><Link to="/seller#listings" className={registering || location.hash === '#listings' ? 'active' : ''}><FileText /><span>My listings</span></Link><Link to="/seller#activity" className={location.hash === '#activity' ? 'active' : ''}><ChartNoAxesColumn /><span>Evaluation activity</span></Link></nav><button className="sidebar-profile" onClick={() => setProfile(true)} aria-label="Open seller profile"><span className="profile-avatar">DS</span><span><strong>Demo Studio</strong><small>Seller account</small></span><ChevronRight size={20}/></button></aside><div className="buyer-body"><header className="buyer-topbar"><nav className="buyer-breadcrumb" aria-label="Breadcrumb">{registering ? <><Link to="/seller#listings">My listings</Link><span>/</span><span aria-current="page">Register a skill</span></> : <><span>Seller workspace</span><span>/</span><span aria-current="page">Overview</span></>}</nav><div className="buyer-topbar-actions"><span className="buyer-demo-label">Illustrative demo</span><ThemeSelector /><span className="topbar-divider"/><button className="profile-avatar topbar-avatar" onClick={() => setProfile(true)} aria-label="Open seller profile menu">DS</button></div></header>{children}</div>{profile && <Modal title="Your seller profile" onClose={() => setProfile(false)}><p className="modal-lead">Demo Studio · fictional seller account</p><p>Selecting Seller does not sign you in. Registrations stay in this open frontend session and reset on reload. No listing is published to a server.</p></Modal>}</div>;
}


// ── pages/Seller/RegisterSkillPage ──
export function RegisterSkillPage() {
    const [params] = useSearchParams();
    return <RegistrationForm key={params.get('draft') ?? 'new'}/>;
}
function RegistrationForm() {
    const workspace = useSellerWorkspace();
    const [params] = useSearchParams();
    const editingId = params.get('draft');
    const editing = workspace.listings.find(item => item.id === editingId && item.status === 'DRAFT');
    const draftKey = editingId ?? 'new';
    const [value, setValue] = /** @type {typeof useState<SellerDraft>} */ (useState)(() => structuredClone((Object.hasOwn(workspace.drafts, draftKey) ? workspace.drafts[draftKey] : undefined) ?? editing?.draft ?? createSellerDraft()));
    const [errors, setErrors] = /** @type {typeof useState<SellerErrors>} */ (useState)({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [registered, setRegistered] = /** @type {typeof useState<SellerListing | null>} */ (useState)(null);
    const [confirmation, setConfirmation] = useState(false);
    const [policyOpen, setPolicyOpen] = useState(false);
    const form = /** @type {typeof useRef<HTMLFormElement>} */ (useRef)(null);
    const locked = busy || !!registered;
    const change = /** @param {keyof SellerDraft} key
     * @param {string} text */ (key, text) => {
        const next = { ...value, [key]: text };
        setValue(next);
        workspace.setDraft(editingId ?? 'new', next);
        setErrors(previous => ({ ...previous, [key]: undefined }));
        setError('');
    };
    const field = /** @param {keyof SellerDraft} key
     * @param {string} label */ (key, label, multiline = false) => <label className="seller-field" htmlFor={`seller-${key}`}>{label}{multiline ? <textarea id={`seller-${key}`} name={key} aria-label={label} value={value[key]} onChange={event => change(key, event.target.value)} disabled={locked} rows={key === 'instructions' ? 3 : 2} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} maxLength={key === 'instructions' ? 10000 : 2000}/> : <input id={`seller-${key}`} name={key} aria-label={label} value={value[key]} onChange={event => change(key, event.target.value)} disabled={locked} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : undefined} maxLength={key === 'name' ? 100 : key === 'version' ? 30 : 2000} inputMode={key === 'price' ? 'decimal' : undefined}/>}{errors[key] && <small id={`${key}-error`} className="seller-field-error">{errors[key]}</small>}</label>;
    const submit = /** @param {FormEvent} event */ async (event) => {
        event.preventDefault();
        if (locked)
            return;
        const invalid = sellerErrors(value);
        setErrors(invalid);
        if (Object.keys(invalid).length) {
            setError('Correct the highlighted fields before registering.');
            if (invalid.licence || invalid.exampleInput || invalid.exampleOutput)
                setPolicyOpen(true);
            requestAnimationFrame(() => ( /** @type {HTMLElement | null} */(form.current?.elements.namedItem(Object.keys(invalid)[0])))?.focus());
            return;
        }
        setBusy(true);
        setError('');
        try {
            const listing = await workspace.register(value, editingId ?? undefined);
            setRegistered(listing);
            setConfirmation(true);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Registration could not complete. Please retry.');
        }
        finally {
            setBusy(false);
        }
    };
    if (editingId && !editing && !registered)
        return <SellerShell registering><main id="seller-main" className="seller-main"><section className="seller-empty"><h1>Draft not available.</h1><p>This URL does not identify an editable draft in this demo session.</p><Link className="button button--primary" to="/seller#listings">Back to my listings</Link></section></main></SellerShell>;
    return <SellerShell registering><main id="seller-main" className="seller-main register-main"><form ref={form} noValidate onSubmit={submit} className="registration-grid"><div><header className="registration-heading"><h1>Give your skill a clear promise.</h1><p>Create a fixed version that buyers can test.</p></header>
    <section className="seller-card form-section"><h2><span>1</span>Describe the skill</h2><div className="seller-fields name-category">{field('name', 'Name')}<label className="seller-field" htmlFor="seller-category">Task category<select id="seller-category" value={value.category} onChange={event => change('category', event.target.value)} disabled={locked}>{['Documents', 'Operations', 'Commerce'].map(category => <option key={category}>{category}</option>)}</select></label></div>{field('description', 'Description', true)}</section>
    <section className="seller-card form-section"><h2><span>2</span>Define the version</h2><div className="seller-version-row">{field('version', 'Version')}<span>Text-only skill</span></div>{field('instructions', 'Skill instructions', true)}<div className="seller-fields">{field('expectedInput', 'Expected input')}{field('expectedOutput', 'Expected output')}</div></section>
    <section className="seller-card form-section"><h2><span>3</span>Set the offer</h2><div className="seller-fields">{field('price', 'Price')}<label className="seller-field" htmlFor="seller-currency">Currency<select id="seller-currency" value={value.currency} disabled={locked} onChange={event => change('currency', event.target.value)}><option>USD</option></select></label></div></section>
    <details className="seller-card package-policy" open={policyOpen} onToggle={event => setPolicyOpen(event.currentTarget.open)}><summary>Package policy and public example</summary>{field('licence', 'Licence terms', true)}{field('exampleInput', 'Public example input', true)}{field('exampleOutput', 'Public example output', true)}<h3>Published demo evaluation policy</h3><p>{demoSellerPolicy}</p><p>No file uploads or executable packages are accepted here. Public examples are separate from buyers’ private tests.</p></details>
    {error && <p className="seller-error" role="alert">{error}</p>}{registered && <p className="seller-success" role="status">Version registered locally. This form is now fixed; existing buyer agreements are unchanged.</p>}
    </div><aside className="seller-card listing-preview"><h2>Listing preview</h2><div className="listing-preview-scene" aria-hidden="true"><img src={assetUrls["skill-invoice.png"]} alt=""/></div><h3>{value.name.trim() || 'Your skill name'}</h3><p className="preview-seller">Demo Studio <span>·</span> {value.version || 'Version'}</p><strong className="preview-price">{sellerErrors(value).price ? 'Set a valid price' : `USD ${Number(value.price).toFixed(2)}`}</strong><p className="illustrative-price">Illustrative price</p><div className="seller-checkout-steps"><p>Buyers test this version against their agreed checks.</p><ol>{[{ icon: CreditCard, label: 'Authorize' }, { icon: FileText, label: 'Test' }, { icon: Check, label: 'Capture' }, { icon: Box, label: 'Deliver' }].map(item => <li key={item.label}><item.icon size={25}/><span>{item.label}</span></li>)}</ol><small>Capture only after passing; delivery only after confirmed completed capture.</small></div><Button type="submit" disabled={locked}>{busy ? 'Registering…' : registered ? 'Registered locally' : 'Register this version'} {!registered && <ArrowRight size={18}/>}</Button><Link className="button button--outline" to="/seller#listings">Back to my listings</Link><p className="seller-hint">New versions do not change existing agreements.</p><p className="seller-hint"><Info size={15}/>Local demo only. No server publication or checkout is created. Reload resets registrations.</p></aside>
    </form>
    {confirmation && registered && <Modal title="Version registered locally" onClose={() => setConfirmation(false)}><p className="modal-lead">{registered.draft.name} · {registered.draft.version}</p><p>The text package and offer are fixed in this open demo session. Nothing has been published to a server.</p><h3 className="hash-heading">SHA-256 · demo package</h3><code className="seller-hash">{registered.contentHash}</code><p className="modal-note">This hash identifies the local package bytes; it does not certify safety or model performance.</p><Link className="button button--primary" to="/seller#listings">View my listings <ArrowRight size={18}/></Link></Modal>}
  </main></SellerShell>;
}


// ── pages/Seller/SellerOverviewPage ──
/** @type {Record<SellerActivityStatus, string>} */
const activityLabels = {
    TESTING: 'Testing in progress', PAYMENT_PENDING: 'Checks passed · Payment pending',
    DELIVERED: 'Payment completed · Skill delivered', FAILED: 'Checks failed · No capture',
};
/** @type {Record<SellerActivityStatus, { evaluation: string; payment: string; delivery: string }>} */
const activityDetails = {
    TESTING: { evaluation: 'In progress', payment: 'Authorized · capture not started', delivery: 'Locked' },
    PAYMENT_PENDING: { evaluation: 'Checks passed', payment: 'Capture pending · not confirmed', delivery: 'Locked' },
    DELIVERED: { evaluation: 'Checks passed', payment: 'COMPLETED · simulated capture', delivery: 'Delivered · demo fixture' },
    FAILED: { evaluation: 'Checks failed', payment: 'Not captured · authorization voided', delivery: 'Locked' },
};
export function SellerOverviewPage() {
    const { listings } = useSellerWorkspace();
    const location = useLocation();
    const [copied, setCopied] = useState(false);
    const [manualLink, setManualLink] = useState('');
    const [listing, setListing] = /** @type {typeof useState<SellerListing | null>} */ (useState)(null);
    const [activity, setActivity] = /** @type {typeof useState<SellerActivity | null>} */ (useState)(null);
    const demoListing = required(listings.find(item => item.id === 'invoice-demo'));
    useEffect(() => {
        if (!['#listings', '#activity'].includes(location.hash))
            return;
        const section = document.getElementById(location.hash.slice(1));
        section?.scrollIntoView?.({ block: 'start' });
        section?.focus({ preventScroll: true });
    }, [location.hash, location.key]);
    const copyLink = async () => {
        const url = new URL(required(demoListing.buyerPreview), window.location.origin).href;
        setCopied(false);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        }
        catch {
            setManualLink(url);
        }
    };
    return <SellerShell><main id="seller-main" className="seller-overview">
    <header className="seller-hero">
      <div className="seller-hero-copy"><h1>Your skills, ready<br />to prove themselves.</h1><p>Publish a version. Share it. Let buyers test the fit.</p></div>
      <Link className="button button--primary" to="/seller/register">Register a skill <Plus size={19}/></Link>
    </header>
    <div className="seller-overview-content">
      <section id="listings" className="seller-card seller-listings" tabIndex={-1} aria-labelledby="listings-heading">
        <div className="seller-section-heading"><h2 id="listings-heading">My listings</h2><span>Local demo workspace</span></div>
        <p className="seller-scroll-hint">Scroll the table to see all columns and actions.</p>
        <div className="seller-table-scroll" role="region" aria-label="Skill listings" tabIndex={0}>
          <table className="seller-table listing-table"><thead><tr><th scope="col">Skill</th><th scope="col">Version</th><th scope="col">Availability</th><th scope="col">Price</th><th scope="col">Actions</th></tr></thead>
            <tbody>{listings.map(item => <tr key={item.id}>
              <td><div className="seller-listing-name"><span className="seller-document"><FileText size={29}/></span><div><strong>{item.draft.name}</strong><p>{item.draft.description}</p></div></div></td>
              <td>{item.draft.version}</td><td><span className={`seller-badge seller-badge--${item.status.toLowerCase()}`}>{item.status === 'DRAFT' ? 'Draft' : item.status === 'LOCAL' ? 'Registered locally' : 'Available for demo testing'}</span></td>
              <td className="seller-price">{item.status === 'DRAFT' ? '—' : `USD ${item.draft.price}`}</td>
              <td><div className="seller-listing-actions">{item.status === 'DRAFT' ? <Link className="button button--outline" to={`/seller/register?draft=${encodeURIComponent(item.id)}`}>Continue editing</Link> : item.buyerPreview ? <><Link className="button button--primary" to={item.buyerPreview}>View listing</Link><Button variant="outline" onClick={copyLink}><Link2 size={17}/>Copy demo link</Button></> : <Button variant="outline" onClick={() => setListing(item)}>View local package <ArrowRight size={16}/></Button>}</div></td>
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
          <p className="seller-hint"><LockKeyhole size={14}/>Buyer examples and checked answers stay private.</p>
        </section>
        <aside className="seller-card seller-share"><span className="seller-share-icon"><Link2 size={43} strokeWidth={1.5}/></span><h2>Share your skill</h2><p>Open the buyer’s view of the invoice demo.</p><Button variant="outline" onClick={copyLink}><Link2 size={18}/>Copy demo link</Button><p className="seller-share-note">Demo listing preview, not a live checkout. Localhost links work only on this computer.</p><p className="seller-copy-status" role="status">{copied ? 'Demo listing link copied.' : ''}</p></aside>
      </div>
      <p className="seller-session-note">Registrations stay in this open session and reset on reload. Nothing is published to a server.</p>
    </div>
    {manualLink && <Modal title="Copy the demo listing link" onClose={() => setManualLink('')}><p className="modal-lead">Automatic clipboard access was unavailable.</p><label className="seller-field">Demo listing URL<input readOnly value={manualLink} onFocus={event => event.target.select()}/></label><p className="modal-note">Select and copy this URL manually. This is the invoice preview on this host; localhost links cannot be opened on another computer.</p></Modal>}
    {listing && <Modal title="Local package details" onClose={() => setListing(null)}><p className="modal-lead">{listing.draft.name} · {listing.draft.version}</p><p>{listing.draft.description}</p><dl className="draft-details"><div><dt>Illustrative price</dt><dd>USD {listing.draft.price}</dd></div><div><dt>Category</dt><dd>{listing.draft.category}</dd></div><div><dt>Licence terms</dt><dd>{listing.draft.licence}</dd></div></dl><h3 className="hash-heading">SHA-256 · demo package</h3><code className="seller-hash">{listing.contentHash}</code><details className="seller-package-text"><summary>View fixed instructions and public example</summary><h3>Instructions</h3><pre>{listing.draft.instructions}</pre><h3>Public input</h3><pre>{listing.draft.exampleInput}</pre><h3>Public output</h3><pre>{listing.draft.exampleOutput}</pre></details><p className="modal-note">This version is registered only in this session. A checkout for custom packages requires backend integration; no buyer checkout link has been created.</p></Modal>}
    {activity && <Modal title={`${activity.id} · illustrative status`} onClose={() => setActivity(null)}><p className="modal-lead">{activity.skill} · {activity.version}</p><p>Historical demo fixture. No evaluation or payment was executed.</p><dl className="draft-details"><div><dt>Evaluation</dt><dd>{activityDetails[activity.status].evaluation}</dd></div><div><dt>Payment</dt><dd>{activityDetails[activity.status].payment}</dd></div><div><dt>Skill delivery</dt><dd>{activityDetails[activity.status].delivery}</dd></div></dl><p className="modal-note">Buyer examples, checked answers and record-level results are not exposed in the seller workspace.</p></Modal>}
  </main></SellerShell>;
}


// ── App ──
export default function App() {
    return <ThemeProvider><TestWorkflowProvider><SellerWorkspaceProvider><RouteScrollReset /><Routes>
    <Route path="/" element={<LandingPage />}/>
    <Route path="/buyer" element={<BuyerOverviewPage />}/>
    <Route path="/buyer/skills" element={<ExploreSkillsPage />}/>
    <Route path="/buyer/skills/:skillId" element={<SkillDetailPage />}/>
    <Route path="/buyer/evaluations/new" element={<TestSetupPage />}/>
    <Route path="/buyer/evaluations/review" element={<AgreementPage />}/>
    <Route path="/buyer/evaluations/progress" element={<EvaluationProgressPage />}/>
    <Route path="/buyer/evaluations/results" element={<EvaluationResultsPage />}/>
    <Route path="/buyer/my-skills/invoice-field-extractor" element={<DeliveredSkillPage />}/>
    <Route path="/seller/register" element={<RegisterSkillPage />}/>
    <Route path="/seller" element={<SellerOverviewPage />}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></SellerWorkspaceProvider></TestWorkflowProvider></ThemeProvider>;
}

const landingService = mockLandingService;
const buyerService = mockBuyerService;
const skillService = mockSkillService;
/** @param {HTMLElement} element */
export function mount(element) { return ReactDOM.createRoot(element).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>); }
