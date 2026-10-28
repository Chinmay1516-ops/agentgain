import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../app.jsx'
import { ThemeProvider } from '../app.jsx'
import { SkillDetailPage } from '../app.jsx'
import { invoiceSkillFixture, mockSkillService } from '../app.jsx'
import type { SkillDetailService } from '../app.jsx'

function mount(path = '/buyer/skills/invoice-field-extractor', service?: SkillDetailService) {
  return render(<MemoryRouter initialEntries={[path]}>{service ? <ThemeProvider><Routes><Route path="/buyer/skills/:skillId" element={<SkillDetailPage service={service} />} /></Routes></ThemeProvider> : <App />}</MemoryRouter>)
}
describe('Invoice skill details', () => {
  it('opens the supplied invoice listing and keeps its price illustrative', async () => {
    const user = userEvent.setup(); mount('/buyer/skills')
    await user.click(await screen.findByRole('link', { name: 'View Invoice field extractor' }))
    expect(await screen.findByRole('heading', { name: 'Invoice field extractor', level: 1 })).toBeVisible()
    expect(screen.getByText('USD 12.00')).toBeVisible()
    expect(screen.getByText('Illustrative price')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Prove the fit before you buy.' })).toBeVisible()
    expect(screen.getByText('Preview · not connected')).toBeVisible()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('not an executed evaluation result')
  })
  it('supports all tabs and distinguishes metadata from a purchased licence', async () => {
    const user = userEvent.setup(); mount()
    await user.click(await screen.findByRole('tab', { name: 'Input & output' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('credible free alternative')
    await user.click(screen.getByRole('tab', { name: 'Version' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Not supplied in this preview')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Not purchased')
    await user.click(screen.getByRole('tab', { name: 'Overview' }))
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByRole('heading', { name: 'What it does' })).toBeVisible()
    expect(within(panel).getByText('INV-1042')).toBeVisible()
  })
  it('opens test setup without authorizing payment', async () => {
    const user = userEvent.setup(); mount()
    await user.click(await screen.findByRole('button', { name: 'Set up a test' }))
    expect(await screen.findByRole('heading', { name: 'Define what passing means.' })).toBeVisible()
    expect(screen.getByText('Not authorized')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('restores deep linked tabs and handles unknown skills without showing the invoice', async () => {
    mount('/buyer/skills/not-a-skill?tab=version')
    expect(await screen.findByRole('heading', { name: 'Skill not available' })).toBeVisible()
    expect(screen.queryByText('USD 12.00')).not.toBeInTheDocument()
    expect(await mockSkillService.getSkill('not-a-skill')).toBeNull()
  })
  it('recovers a detail request failure and isolates the example data', async () => {
    const user = userEvent.setup()
    const service = { getSkill: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(structuredClone(invoiceSkillFixture)) }
    mount('/buyer/skills/invoice-field-extractor?tab=version', service)
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load')
    await user.click(screen.getByRole('button', { name: 'Retry skill' }))
    expect(await screen.findByRole('tabpanel')).toHaveTextContent('Version v1.0')
    const first = await mockSkillService.getSkill('invoice-field-extractor'); first!.example.total = '0'
    expect((await mockSkillService.getSkill('invoice-field-extractor'))!.example.total).toBe('1,250.00')
    const controller = new AbortController(); controller.abort()
    await expect(mockSkillService.getSkill('invoice-field-extractor', controller.signal)).rejects.toThrow()
  })
})
