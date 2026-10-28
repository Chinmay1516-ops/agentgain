import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'

test('invoice detail responsive design and frontend-only runtime', async ({ page }) => {
  const errors: string[] = []; const external: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(request.url()) })
  await mkdir('docs/verification/page-04', { recursive: true })
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport); await page.goto('/buyer/skills/invoice-field-extractor')
    await page.getByRole('radio', { name: 'Day', exact: true }).check()
    await expect(page.getByRole('heading', { name: 'Invoice field extractor', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Prove the fit before you buy.' })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-04/${viewport.name}.png`, fullPage: true })
  }
  expect(errors).toEqual([]); expect(external).toEqual([])
})

test('invoice detail tabs, keyboard, deep links and honest setup action', async ({ page }) => {
  await page.goto('/buyer/skills?q=invoice')
  await page.getByRole('link', { name: 'View Invoice field extractor' }).click()
  await expect(page.getByRole('link', { name: 'Explore skills', exact: true }).first()).toHaveAttribute('aria-current', 'page')
  const overview = page.getByRole('tab', { name: 'Overview', exact: true })
  await overview.focus(); await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Input & output' })).toBeFocused()
  await expect(page.getByRole('tabpanel')).toContainText('credible free alternative')
  await page.screenshot({ path: 'docs/verification/page-04/input-output.png', fullPage: true })
  await page.keyboard.press('End'); await expect(page.getByRole('tab', { name: 'Version' })).toBeFocused()
  await expect(page).toHaveURL(/tab=version$/); await page.reload()
  await expect(page.getByRole('tabpanel')).toContainText('Not purchased')
  await page.screenshot({ path: 'docs/verification/page-04/version.png', fullPage: true })
  await page.getByRole('button', { name: 'Set up a test' }).click()
  await expect(page.getByRole('heading', { name: 'Define what passing means.' })).toBeVisible()
  await page.goBack()
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Explore skills' }).click()
  await expect(page.getByRole('article')).toHaveCount(4)
  await page.goto('/buyer/skills/unknown'); await expect(page.getByRole('heading', { name: 'Skill not available' })).toBeVisible()
})

test('invoice detail accessible tabs, themes and mobile layout', async ({ page }) => {
  await page.goto('/buyer/skills/invoice-field-extractor')
  await page.getByRole('heading', { name: 'Invoice field extractor', level: 1 }).waitFor()
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    for (const tab of ['Overview', 'Input & output', 'Version']) {
      await page.getByRole('tab', { name: tab, exact: true }).click()
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    }
  }
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Extracts key fields from invoice text.')
  await page.screenshot({ path: 'docs/verification/page-04/night.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('radio', { name: 'Day', exact: true }).check()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
})
