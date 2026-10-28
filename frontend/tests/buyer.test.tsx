import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { ThemeProvider } from '../src/hooks/useTheme'
import { BuyerOverviewPage } from '../src/pages/Buyer/BuyerOverviewPage'
import { buyerOverviewFixture, mockBuyerService } from '../src/services/mock/buyerService'

function mount(path = '/buyer') { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>) }

describe('Buyer workspace', () => {
  it('connects the landing Buyer action and preserves the theme', async () => {
    const user = userEvent.setup(); mount('/')
    await user.click(screen.getByRole('radio', { name: 'Night' }))
    await user.click(screen.getByRole('button', { name: 'Buyer' }))
    expect(await screen.findByText('Extract invoice fields')).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Night' })).toBeChecked()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('redirects the old buyer link to the workspace', async () => {
    mount('/?panel=buyer')
    expect(await screen.findByText('Extract invoice fields')).toBeVisible()
    expect(screen.getByText('Illustrative demo')).toBeVisible()
  })
  it('distinguishes prepared records from approved contracts, payments and execution', async () => {
    const user = userEvent.setup(); mount()
    await user.click(await screen.findByRole('button', { name: 'View Invoice field extractor' }))
    const dialog = screen.getByRole('dialog', { name: 'Invoice field extractor' })
    for (const text of ['Not yet approved', 'Not authorized', 'Not run', 'Not purchased']) expect(within(dialog).getByText(text)).toBeVisible()
    expect(within(dialog).getByText(/20 test records/)).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Back to evaluations' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'View Order categorizer' }))
    expect(within(screen.getByRole('dialog')).getByText('Draft setup')).toBeVisible()
  })
  it('explains the task concern and opens skill discovery', async () => {
    const user = userEvent.setup(); mount()
    await user.click(await screen.findByRole('button', { name: 'Your workspace' }))
    expect(within(screen.getByRole('dialog')).getByText(/not a measured accuracy score/)).toBeVisible()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Find a matching skill' }))
    expect(await screen.findByRole('heading', { name: 'Find your agent’s next skill.' })).toBeVisible()
    expect(await screen.findByRole('link', { name: 'View Invoice field extractor' })).toBeVisible()
  })
  it('recovers from a service failure without inventing workspace data', async () => {
    const user = userEvent.setup()
    const service = { getOverview: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(structuredClone(buyerOverviewFixture)) }
    render(<MemoryRouter><ThemeProvider><BuyerOverviewPage service={service} /></ThemeProvider></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load')
    expect(screen.queryByText('Ready to test')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry workspace' }))
    expect(await screen.findByText('Ready to test')).toBeVisible()
  })
  it('renders an empty evaluations state without fictitious rows', async () => {
    const service = { getOverview: async () => ({ ...structuredClone(buyerOverviewFixture), evaluations: [] }) }
    render(<MemoryRouter><ThemeProvider><BuyerOverviewPage service={service} /></ThemeProvider></MemoryRouter>)
    expect(await screen.findByText(/No evaluations yet/)).toBeVisible()
    expect(screen.queryByText('Invoice field extractor')).not.toBeInTheDocument()
  })
  it('isolates demo responses and rejects aborted requests', async () => {
    const first = await mockBuyerService.getOverview(); first.evaluations.length = 0
    expect((await mockBuyerService.getOverview()).evaluations).toHaveLength(2)
    const controller = new AbortController(); controller.abort()
    await expect(mockBuyerService.getOverview(controller.signal)).rejects.toThrow()
  })
})
