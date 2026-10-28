import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { ThemeProvider } from '../src/hooks/useTheme'
import { ExploreSkillsPage } from '../src/pages/Skills/ExploreSkillsPage'
import { mockSkillService, skillCatalogFixture } from '../src/services/mock/skillService'

describe('Explore skills', () => {
  it('filters by task and category together, with a recoverable empty state', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/buyer/skills']}><App /></MemoryRouter>)
    expect(await screen.findAllByRole('article')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Operations' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await user.type(screen.getByRole('searchbox', { name: 'Search skills' }), 'RETURNS')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Returns classifier' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Documents' }))
    expect(screen.getByRole('heading', { name: 'No matching skills' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })
  it('restores URL filters and labels sample price without inventing other prices', async () => {
    render(<MemoryRouter initialEntries={['/buyer/skills?q=invoice&category=Documents']}><App /></MemoryRouter>)
    const card = (await screen.findAllByRole('article'))[0]
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Documents' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(card).getByText('USD 12.00')).toBeVisible()
    expect(within(card).getByText('Illustrative price')).toBeInTheDocument()
  })
  it('keeps unprovided detail destinations explicit', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/buyer/skills']}><App /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'View Returns classifier' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('No test or payment has started')
  })
  it('recovers failed catalogue requests and keeps fixtures isolated', async () => {
    const user = userEvent.setup()
    const service = { getCatalog: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(structuredClone(skillCatalogFixture)) }
    render(<MemoryRouter><ThemeProvider><ExploreSkillsPage service={service} /></ThemeProvider></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load')
    await user.click(screen.getByRole('button', { name: 'Retry skills' }))
    expect(await screen.findAllByRole('article')).toHaveLength(4)
    const first = await mockSkillService.getCatalog(); first.skills.length = 0
    expect((await mockSkillService.getCatalog()).skills).toHaveLength(4)
    const controller = new AbortController(); controller.abort()
    await expect(mockSkillService.getCatalog(controller.signal)).rejects.toThrow()
  })
})
