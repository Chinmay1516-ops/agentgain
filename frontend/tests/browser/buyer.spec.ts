import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'

test('buyer responsive layouts, local assets and runtime health', async ({ page }) => {
  const errors: string[] = []; const external: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(request.url()) })
  await mkdir('docs/verification/page-02', { recursive: true })
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport); await page.goto('/buyer')
    await page.getByRole('radio', { name: 'Day', exact: true }).check()
    await expect(page.getByText('Extract invoice fields', { exact: true })).toBeVisible()
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())) })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (viewport.name === 'tablet') {
      const copy = await page.locator('.current-task-copy').boundingBox()
      const scene = await page.locator('.workspace-scene').boundingBox()
      expect(scene!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height)
      await expect(page.getByText('Illustrative demo', { exact: true })).toBeVisible()
    }
    await page.screenshot({ path: `docs/verification/page-02/${viewport.name}.png`, fullPage: true })
  }
  expect(errors).toEqual([]); expect(external).toEqual([])
})

test('buyer entry, details, navigation, focus and unchanged payment state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Buyer', exact: true }).click()
  await expect(page).toHaveURL('/buyer')
  await page.getByText('Extract invoice fields', { exact: true }).waitFor()
  for (const button of [page.getByRole('link', { name: 'Explore skills', exact: true }), page.getByRole('button', { name: 'Explore skills', exact: true }), page.getByRole('button', { name: 'Find a matching skill', exact: true }), page.getByRole('button', { name: 'Browse skills', exact: true })]) {
    await button.click(); await expect(page).toHaveURL('/buyer/skills')
    await expect(page.getByRole('heading', { name: 'Find your agent’s next skill.' })).toBeInViewport()
    await page.getByRole('link', { name: 'Overview', exact: true }).click()
  }
  await page.getByRole('button', { name: 'My skills', exact: true }).click()
  await expect(page.locator('#purchased-skills')).toBeFocused()
  await page.getByRole('button', { name: 'View all', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'View Invoice field extractor' }).click()
  await expect(page.getByRole('dialog')).toContainText('Not authorized')
  await expect(page.getByRole('dialog')).toContainText('Not run')
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press('Tab')
    expect(await page.getByRole('dialog').evaluate(node => node.contains(document.activeElement))).toBe(true)
  }
  await page.screenshot({ path: 'docs/verification/page-02/evaluation-details.png' })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open profile menu' }).click()
  await expect(page.getByRole('dialog')).toContainText('fictional demo profile')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Explore workspace', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('not a measured accuracy score')
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'AgentGain home' }).click()
  await expect(page.getByText('Authorized · not captured')).toBeVisible()
})

test('buyer themes persist across routes and accessible desktop/mobile dialogs', async ({ page }) => {
  await page.goto('/buyer'); await page.getByText('Ready to test', { exact: true }).waitFor()
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.screenshot({ path: 'docs/verification/page-02/night.png', fullPage: true })
  await page.getByRole('link', { name: 'AgentGain home' }).click()
  await expect(page.getByRole('radio', { name: 'Night', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Buyer', exact: true }).click()
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.getByRole('button', { name: 'View Invoice field extractor' }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('radio', { name: 'Day', exact: true }).check()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
})
