import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import type { SellerDraft, SellerListing, SellerService } from '../types/seller'
import { mockSellerService, sellerListingFixtures } from '../services/mock/sellerService'

const Context = createContext<{ listings: SellerListing[]; drafts: Record<string, SellerDraft | undefined>; setDraft: (key: string, draft: SellerDraft) => void; register: (draft: SellerDraft, editingId?: string) => Promise<SellerListing> } | null>(null)
export function SellerWorkspaceProvider({ children, service = mockSellerService }: { children: ReactNode; service?: SellerService }) {
  const [listings, setListings] = useState(sellerListingFixtures)
  const [drafts, setDrafts] = useState<Record<string, SellerDraft | undefined>>({})
  const setDraft = (key: string, value: SellerDraft) => setDrafts(previous => ({ ...previous, [key]: structuredClone(value) }))
  const current = useRef(listings)
  const busy = useRef(false)
  const register = async (value: SellerDraft, editingId?: string) => {
    if (busy.current) throw new Error('Registration is already in progress.')
    busy.current = true
    try {
      const listing = await service.register(structuredClone(value), current.current)
      const remaining = current.current.filter(item => !(item.id === editingId && item.status === 'DRAFT'))
      const next = remaining.some(item => item.id === listing.id) ? remaining.map(item => item.id === listing.id ? listing : item) : remaining.concat(listing)
      current.current = next; setListings(next)
      setDrafts(previous => { const nextDrafts = { ...previous }; delete nextDrafts[editingId ?? 'new']; return nextDrafts })
      return structuredClone(listing)
    } finally { busy.current = false }
  }
  return <Context.Provider value={{ listings, drafts, setDraft, register }}>{children}</Context.Provider>
}
export function useSellerWorkspace() { const context = useContext(Context); if (!context) throw new Error('SellerWorkspaceProvider is required'); return context }
