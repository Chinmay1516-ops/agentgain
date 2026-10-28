import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'

test('responsive reference layout and equal navigation controls', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await mkdir('docs/verification', { recursive: true })
  for (const viewport of [{ width: 1440, height: 1000, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('radio', { name: 'Day', exact: true }).check()
    await expect(page.getByText('84 / 120 correct')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const sizes = await page.locator('.role-control, .theme-selector').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return [r.width, r.height] }))
    expect(sizes.length).toBe(4)
    for (const size of sizes) expect(size).toEqual(sizes[0])
    const rows = await page.locator('.role-control').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top))
    expect(new Set(rows).size).toBe(1)
    await expect(page.getByRole('button', { name: /^open demo$/i })).toHaveCount(0)
    await page.screenshot({ path: `docs/verification/${viewport.name}.png`, fullPage: true })
  }
  expect(errors).toEqual([])
})

test('role dialogs, focus restoration, anchors and local simulation', async ({ page }) => {
  await page.goto('/')
  for (const role of ['For Builder']) {
    const button = page.getByRole('button', { name: role, exact: true })
    await button.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText('awaiting its design reference')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(button).toBeFocused()
  }
  await page.getByRole('link', { name: 'How it works', exact: true }).click()
  await expect(page).toHaveURL(/#how-it-works$/)
  await page.getByRole('link', { name: 'AgentGain home' }).first().click()
  await page.getByRole('button', { name: 'Try the demo' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Show illustrative result' }).click()
  await expect(dialog.getByRole('status')).toContainText('Payment not captured')
  await dialog.getByRole('button', { name: 'Simulate capture request' }).click()
  await expect(dialog.getByRole('status')).toContainText('Not confirmed')
  await dialog.getByRole('button', { name: 'Simulate confirmed capture' }).click()
  await expect(dialog.getByRole('status')).toContainText('COMPLETED (simulated)')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Review evidence', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Payment not captured; skill not delivered')
  await page.screenshot({ path: 'docs/verification/evidence-dialog.png' })
})

test('theme preference persists and Auto follows the operating system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('radio', { name: 'Night', exact: true }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Night', exact: true })).toBeChecked()
  await page.screenshot({ path: 'docs/verification/night.png', fullPage: true })
  await page.getByRole('radio', { name: 'Auto', exact: true }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})

test('keyboard focus is trapped in dialogs and accessibility scan has no violations', async ({ page }) => {
  await page.goto('/')
  await page.getByText('84 / 120 correct').waitFor()
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(result.violations).toEqual([])
  }
  await page.getByRole('button', { name: 'For Builder', exact: true }).click()
  const dialog = page.getByRole('dialog')
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
  }
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(result.violations).toEqual([])
})
