import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../app.jsx'
import { createSellerDraft, mockSellerService, sellerErrors, sellerListingFixtures, sellerPackageText } from '../app.jsx'

beforeEach(() => vi.stubGlobal('crypto', webcrypto))
afterEach(() => vi.unstubAllGlobals())

describe('Seller registration', () => {
  it('hashes normalized package bytes, isolates inputs and treats identical versions idempotently', async () => {
    const draft = createSellerDraft(); const listings = sellerListingFixtures()
    const result = await mockSellerService.register(draft, listings)
    expect(result.contentHash).toBe(createHash('sha256').update(sellerPackageText(draft)).digest('hex'))
    expect(result.id).toBe('invoice-demo')
    draft.instructions = 'Changed'
    expect(result.draft.instructions).not.toBe(draft.instructions)
    expect(listings[0].contentHash).toBeNull()
    const same = await mockSellerService.register({ ...result.draft, version: '1.0', price: '12' }, [result])
    expect(same.id).toBe(result.id); expect(same.contentHash).toBe(result.contentHash)
  })
  it('rejects edits to registered versions and accepts a distinct version', async () => {
    const listings = sellerListingFixtures(); const draft = { ...createSellerDraft(), instructions: 'Updated text' }
    await expect(mockSellerService.register(draft, listings)).rejects.toThrow('new version')
    const result = await mockSellerService.register({ ...draft, version: 'v1.1' }, listings)
    expect(result.status).toBe('LOCAL'); expect(result.buyerPreview).toBeNull()
    expect(listings[0].draft.version).toBe('v1.0')
  })
  it('rejects empty package details, malformed versions and invalid prices', () => {
    for (const price of ['0', '-1', '12.001', '1e3', '1000000', '']) expect(sellerErrors({ ...createSellerDraft(), price }).price).toBeTruthy()
    expect(sellerErrors({ ...createSellerDraft(), licence: '', instructions: '', version: 'latest' })).toMatchObject({ licence: expect.any(String), instructions: expect.any(String), version: expect.any(String) })
  })
  it('shows preview changes, validation feedback, and a fixed successful package', async () => {
    const user = userEvent.setup(); render(<MemoryRouter initialEntries={['/seller/register']}><App /></MemoryRouter>)
    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(name); await user.click(screen.getByRole('button', { name: 'Register this version' }))
    expect(screen.getByRole('alert')).toHaveTextContent('highlighted fields')
    await user.type(name, 'New text skill')
    expect(screen.getByRole('heading', { name: 'New text skill' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Register this version' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('SHA-256')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Registered locally' })).toBeDisabled()
    expect(name).toBeDisabled()
  })
})

describe('Seller workspace', () => {
  it('enters through Seller and keeps pending capture distinct from delivery', async () => {
    const user = userEvent.setup(); render(<MemoryRouter><App /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Seller' }))
    expect(screen.getByRole('heading', { name: /Your skills, ready/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'View AG-003 status' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Capture pending · not confirmed')
    expect(dialog).toHaveTextContent('Locked')
    expect(dialog).not.toHaveTextContent('Invoice001')
  })
  it('registers a draft locally without assigning the invoice checkout to a different package', async () => {
    const user = userEvent.setup(); render(<MemoryRouter initialEntries={['/seller']}><App /></MemoryRouter>)
    await user.click(screen.getByRole('link', { name: 'Continue editing' }))
    await user.type(screen.getByLabelText('Price', { exact: true }), '19.95')
    await user.click(screen.getByRole('button', { name: 'Register this version' }))
    const confirmation = await screen.findByRole('dialog')
    await user.click(within(confirmation).getByRole('link', { name: 'View my listings' }))
    expect(screen.queryByRole('link', { name: 'Continue editing' })).not.toBeInTheDocument()
    expect(screen.getByText('USD 19.95')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'View local package' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Product attribute mapper · v0.1')
    expect(screen.getByRole('dialog')).toHaveTextContent('no buyer checkout link has been created')
    expect(within(screen.getByRole('dialog')).queryByRole('link')).not.toBeInTheDocument()
  })
})
