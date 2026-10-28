import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChartNoAxesColumn, ChevronRight, FileText, House } from 'lucide-react'
import { BrandMark } from '../shared/Brand'
import { ThemeSelector } from '../ui/ThemeSelector'
import { Modal } from '../ui/Modal'
import '../../pages/Buyer/buyer.css'
import '../../pages/Seller/seller.css'

export function SellerShell({ children, registering = false }: { children: ReactNode; registering?: boolean }) {
  const [profile, setProfile] = useState(false)
  const location = useLocation()
  return <div className="buyer-app seller-app"><a className="skip-link" href="#seller-main">Skip to seller workspace</a><aside className="buyer-sidebar" aria-label="Seller navigation"><Link to="/" className="buyer-brand" aria-label="AgentGain home"><BrandMark /><span>AgentGain</span></Link><p className="sidebar-label">SELLER WORKSPACE</p><nav className="buyer-nav" aria-label="Seller workspace"><Link to="/seller" className={!registering && !location.hash ? 'active' : ''}><House /><span>Overview</span></Link><Link to="/seller#listings" className={registering || location.hash === '#listings' ? 'active' : ''}><FileText /><span>My listings</span></Link><Link to="/seller#activity" className={location.hash === '#activity' ? 'active' : ''}><ChartNoAxesColumn /><span>Evaluation activity</span></Link></nav><button className="sidebar-profile" onClick={() => setProfile(true)} aria-label="Open seller profile"><span className="profile-avatar">DS</span><span><strong>Demo Studio</strong><small>Seller account</small></span><ChevronRight size={20} /></button></aside><div className="buyer-body"><header className="buyer-topbar"><nav className="buyer-breadcrumb" aria-label="Breadcrumb">{registering ? <><Link to="/seller#listings">My listings</Link><span>/</span><span aria-current="page">Register a skill</span></> : <><span>Seller workspace</span><span>/</span><span aria-current="page">Overview</span></>}</nav><div className="buyer-topbar-actions"><span className="buyer-demo-label">Illustrative demo</span><ThemeSelector /><span className="topbar-divider" /><button className="profile-avatar topbar-avatar" onClick={() => setProfile(true)} aria-label="Open seller profile menu">DS</button></div></header>{children}</div>{profile && <Modal title="Your seller profile" onClose={() => setProfile(false)}><p className="modal-lead">Demo Studio · fictional seller account</p><p>Selecting Seller does not sign you in. Registrations stay in this open frontend session and reset on reload. No listing is published to a server.</p></Modal>}</div>
}
