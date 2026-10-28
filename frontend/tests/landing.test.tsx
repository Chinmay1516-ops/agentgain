import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { ThemeProvider } from '../src/hooks/useTheme'
import { LandingPage } from '../src/pages/Landing/LandingPage'
import { mockLandingService, previewFixture } from '../src/services/mock/landingService'

function mount(path = '/') { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>) }

describe('Landing page', () => {
  it('shows three comparison arms and an authorization, never a captured payment', async () => {
    mount()
    expect(await screen.findByText('84 / 120 correct')).toBeVisible()
    expect(screen.getByText('89 / 120 correct')).toBeVisible()
    expect(screen.getByText('106 / 120 correct')).toBeVisible()
    expect(screen.getByText('Authorized · not captured')).toBeVisible()
    expect(screen.queryByRole('button', { name: /^open demo$/i })).not.toBeInTheDocument()
  })
  it.each([['For Builder', 'Build your agent’s next advantage.']])('opens honest pending-screen feedback from %s', async (button, title) => {
    const user = userEvent.setup(); mount()
    await user.click(screen.getByRole('button', { name: button }))
    const dialog = screen.getByRole('dialog', { name: title })
    expect(within(dialog).getByText(/awaiting its design reference/)).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Back to AgentGain' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('persists explicit day/night preference and supports auto', async () => {
    const user = userEvent.setup(); mount()
    await user.click(screen.getByRole('radio', { name: 'Night' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('night'))
    expect(localStorage.getItem('agentgain.theme')).toBe('night')
    await user.click(screen.getByRole('radio', { name: 'Day' }))
    expect(document.documentElement.dataset.theme).toBe('day')
    await user.click(screen.getByRole('radio', { name: 'Auto' }))
    expect(localStorage.getItem('agentgain.theme')).toBe('auto')
  })
  it('requires separate local actions for result, capture request, and capture confirmation', async () => {
    const user = userEvent.setup(); mount()
    await screen.findByText('84 / 120 correct')
    await user.click(screen.getByRole('button', { name: /Try the demo/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/No AI evaluation runs and no payment is made/)).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: /Show illustrative result/ }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('Payment not captured')
    await user.click(within(dialog).getByRole('button', { name: /Simulate capture request/ }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('Not confirmed. Skill not delivered.')
    await user.click(within(dialog).getByRole('button', { name: /Simulate confirmed capture/ }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('COMPLETED (simulated)')
    expect(within(dialog).getByRole('status')).toHaveTextContent('No real payment or skill delivery occurred')
    await user.click(within(dialog).getByRole('button', { name: /Reset local simulation/ }))
    expect(within(dialog).getByRole('status')).toHaveTextContent('No completed purchase')
    expect(screen.getByText('Authorized · not captured')).toBeVisible()
  })
  it('loads direct evidence links with accurate expense and confidence disclosures', async () => {
    mount('/?panel=evidence')
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('$422.50')).toBeVisible()
    expect(within(dialog).getByText(/model assumption, not a checkout charge/)).toBeVisible()
    expect(within(dialog).getByText(/not independently statistically verified/)).toBeVisible()
    expect(within(dialog).getByText(/Payment not captured; skill not delivered/)).toBeVisible()
  })
  it('renders a recoverable service error instead of invented evidence', async () => {
    const user = userEvent.setup()
    const service = { getPreview: vi.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce(structuredClone(previewFixture)) }
    render(<MemoryRouter><ThemeProvider><LandingPage service={service} /></ThemeProvider></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('could not load')
    expect(screen.queryByText('84 / 120 correct')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry preview' }))
    expect(await screen.findByText('84 / 120 correct')).toBeVisible()
  })
  it('isolates mock responses and rejects aborted requests', async () => {
    const first = await mockLandingService.getPreview()
    first.arms[0].correct = 0
    expect((await mockLandingService.getPreview()).arms[0].correct).toBe(84)
    const controller = new AbortController(); controller.abort()
    await expect(mockLandingService.getPreview(controller.signal)).rejects.toThrow()
  })
})
