import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'

test('catalogue responsive rendering and local assets', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await mkdir('docs/verification/page-03', { recursive: true })
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport); await page.goto('/buyer/skills')
    await expect(page.getByRole('article')).toHaveCount(4)
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode())) })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-03/${viewport.name}.png`, fullPage: true })
  }
  expect(errors).toEqual([])
})

test('catalogue search, categories, deep links, unavailable details and navigation', async ({ page }) => {
  await page.goto('/buyer/skills')
  await page.getByRole('button', { name: 'Operations', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.getByRole('searchbox').fill('returns')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.reload(); await expect(page.getByRole('searchbox')).toHaveValue('returns')
  await page.getByRole('button', { name: 'View Returns classifier' }).click()
  await expect(page.getByRole('dialog')).toContainText('No test or payment has started')
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'View Returns classifier' })).toBeFocused()
  await page.getByRole('button', { name: 'Commerce', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No matching skills' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('article')).toHaveCount(4)
  await page.getByRole('button', { name: 'My skills', exact: true }).click()
  await expect(page).toHaveURL('/buyer#purchased-skills'); await expect(page.locator('#purchased-skills')).toBeFocused()
})

test('catalogue day/night and mobile accessibility', async ({ page }) => {
  await page.goto('/buyer/skills'); await expect(page.getByRole('article')).toHaveCount(4)
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.screenshot({ path: 'docs/verification/page-03/night.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('radio', { name: 'Day', exact: true }).check()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
})
