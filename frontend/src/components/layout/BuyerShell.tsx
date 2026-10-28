import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, House, LayoutGrid, Search } from 'lucide-react'
import { BrandMark } from '../shared/Brand'
import { ThemeSelector } from '../ui/ThemeSelector'
import type { BuyerOverview } from '../../types/buyer'
import { useDemoDelivery } from '../../hooks/useTestWorkflow'

export type BuyerPanel = 'explore' | 'evaluations' | 'profile' | 'workspace' | 'invoice-example' | 'order-example'

export function BuyerShell({ children, profile, openPanel, breadcrumb }: { children: ReactNode; profile?: BuyerOverview['profile']; openPanel: (panel: BuyerPanel) => void; breadcrumb?: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const delivered = useDemoDelivery()
  const scrollToSkills = () => {
    if (delivered) { navigate('/buyer/my-skills/invoice-field-extractor'); return }
    if (location.pathname !== '/buyer') { navigate('/buyer#purchased-skills'); return }
    const target = document.getElementById('purchased-skills')
    target?.scrollIntoView({ block: 'center' })
    target?.focus({ preventScroll: true })
  }
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
        <span className="profile-avatar">{profile?.initials ?? '…'}</span><span><strong>{profile?.displayName ?? 'Loading profile'}</strong><small>Buyer</small></span><ChevronRight size={21} />
      </button>
    </aside>
    <div className="buyer-body">
      <header className="buyer-topbar">
        <nav className="buyer-breadcrumb" aria-label="Breadcrumb">{breadcrumb ?? <><span>Buyer workspace</span><ChevronRight size={15} /><span aria-current="page">Overview</span></>}</nav>
        <div className="buyer-topbar-actions"><span className="buyer-demo-label">Illustrative demo</span><ThemeSelector /><span className="topbar-divider" /><button className="profile-avatar topbar-avatar" onClick={() => openPanel('profile')} aria-label="Open profile menu">{profile?.initials ?? '…'}</button></div>
      </header>
      {children}
    </div>
  </div>
}
