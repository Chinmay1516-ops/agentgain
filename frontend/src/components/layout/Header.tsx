import { Brand } from '../shared/Brand'
import { ThemeSelector } from '../ui/ThemeSelector'

export type LandingPanel = 'demo' | 'evidence' | 'builder' | 'buyer' | 'seller'
export function Header({ openPanel }: { openPanel: (panel: LandingPanel) => void }) {
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
  </header>
}
