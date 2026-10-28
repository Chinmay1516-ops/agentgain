import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuyerShell, type BuyerPanel } from './BuyerShell'
import { BuyerDialogs } from '../../pages/Buyer/BuyerDialogs'
import { buyerService } from '../../services'
import type { BuyerOverview } from '../../types/buyer'
import '../../pages/Buyer/buyer.css'

export function BuyerWorkspaceLayout({ children, breadcrumb }: { children: ReactNode; breadcrumb: ReactNode }) {
  const [overview, setOverview] = useState<BuyerOverview | null>(null)
  const [panel, setPanel] = useState<BuyerPanel | null>(null)
  const navigate = useNavigate()
  useEffect(() => {
    const controller = new AbortController()
    buyerService.getOverview(controller.signal).then(data => { if (!controller.signal.aborted) setOverview(data) }).catch(() => {})
    return () => controller.abort()
  }, [])
  const openPanel = (value: BuyerPanel) => value === 'explore' ? navigate('/buyer/skills') : setPanel(value)
  return <BuyerShell profile={overview?.profile} openPanel={openPanel} breadcrumb={breadcrumb}>
    {children}
    {panel && <BuyerDialogs panel={panel} overview={overview} openPanel={openPanel} close={() => setPanel(null)} />}
  </BuyerShell>
}
