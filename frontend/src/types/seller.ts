export interface SellerDraft {
  name: string; category: 'Documents' | 'Operations' | 'Commerce'; description: string
  version: string; instructions: string; expectedInput: string; expectedOutput: string
  price: string; currency: 'USD'; licence: string; exampleInput: string; exampleOutput: string
}
export interface SellerListing { id: string; status: 'AVAILABLE' | 'DRAFT' | 'LOCAL'; draft: SellerDraft; contentHash: string | null; buyerPreview: string | null }
export type SellerActivityStatus = 'TESTING' | 'PAYMENT_PENDING' | 'DELIVERED' | 'FAILED'
export interface SellerActivity { id: string; buyerLabel: string; skill: string; version: string; started: string; status: SellerActivityStatus }
export interface SellerService { register(draft: SellerDraft, listings: SellerListing[]): Promise<SellerListing> }
