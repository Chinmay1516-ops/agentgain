import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, readFile } from 'node:fs/promises'

async function runExample(page: Page, alternative = false) {
  await page.goto('/buyer/evaluations/new')
  if (alternative) await page.getByLabel('Illustrative example set').selectOption('below-target')
  await page.getByRole('button', { name: 'Review test terms' }).click()
  await page.getByRole('checkbox', { name: 'I approve these demo test terms.' }).check()
  await page.getByRole('button', { name: 'Simulate PayPal authorization' }).click()
  await page.getByRole('link', { name: 'Continue evaluation demo' }).click()
  await page.getByRole('button', { name: 'Advance demo to rule check' }).click()
  await page.getByRole('button', { name: 'Show demo results' }).click()
}

test('failed example matches its evidence and requires a new approval for retry', async ({ page }) => {
  await runExample(page, true)
  await expect(page.getByRole('heading', { name: 'This skill didn’t meet your checks.' })).toBeVisible()
  await expect(page.getByText('16 of 20 records', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Failed records')).toContainText('Invoice008')
  await expect(page.getByLabel('Failed records')).toContainText('EUR')
  await expect(page.getByLabel('Failed records')).toContainText('120.00')
  await expect(page.getByLabel('Failed records')).toContainText('102.00')
  await expect(page.getByRole('button', { name: 'Download skill' })).toBeDisabled()
  await page.getByRole('button', { name: 'Review failed records' }).click()
  await expect(page.getByLabel('Failed records').locator('tbody tr')).toHaveCount(4)
  await page.getByRole('button', { name: /Checked accuracy/ }).click()
  await expect(page.getByRole('dialog')).toContainText('16 of 20 records')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /Checked accuracy/ })).toBeFocused()
  await page.getByRole('button', { name: 'Create a new test' }).click()
  await expect(page.getByText('Not authorized', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Review test terms' }).click()
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Simulate PayPal authorization' })).toBeDisabled()
})

test('failure page reference layout, responsive themes and accessibility', async ({ page }) => {
  await mkdir('docs/verification/page-09', { recursive: true })
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await runExample(page, true)
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport); await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-09/${viewport.name}.png`, fullPage: true })
  }
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.screenshot({ path: 'docs/verification/page-09/night.png', fullPage: true })
  await page.getByRole('button', { name: /Improvement/ }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  expect(errors).toEqual([])
})

async function openDelivered(page: Page) {
  await runExample(page)
  await page.getByRole('button', { name: 'Simulate capture request' }).click()
  await page.getByRole('button', { name: 'Simulate completed capture' }).click()
  await page.getByRole('button', { name: 'Open demo skill' }).click()
}

test('delivered skill gates access and downloads the displayed text sample', async ({ page, context }) => {
  await page.goto('/buyer/my-skills/invoice-field-extractor')
  await expect(page.getByRole('heading', { name: 'Your skill is still locked.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download demo skill' })).toHaveCount(0)
  await openDelivered(page)
  await expect(page.getByRole('heading', { name: 'Your tested skill is ready.' })).toBeVisible()
  const instructions = await page.getByLabel('Skill instructions text').textContent()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download demo skill' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('agentgain-invoice-field-extractor-v1.0-demo.txt')
  const text = await readFile((await download.path())!, 'utf8')
  expect(text).toContain(instructions); expect(text).toContain('No actual purchase')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy instructions', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Instructions copied.')
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(instructions)
  await page.getByRole('button', { name: 'View demo receipt' }).click()
  await expect(page.getByRole('dialog')).toContainText('USD 12.00')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Retry original task' }).click()
  await expect(page.getByRole('dialog')).toContainText('has not run that task')
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'View test evidence' }).click()
  await page.getByRole('button', { name: 'My skills', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your tested skill is ready.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your skill is still locked.' })).toBeVisible()
})

test('delivered skill handles clipboard failure and matches responsive reference', async ({ page }) => {
  await mkdir('docs/verification/page-10', { recursive: true })
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await openDelivered(page)
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport); await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-10/${viewport.name}.png`, fullPage: true })
  }
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.screenshot({ path: 'docs/verification/page-10/night.png', fullPage: true })
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }) })
  await page.getByRole('button', { name: 'Copy instructions', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Select and copy')
  await page.getByRole('button', { name: 'Retry original task' }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Retry original task' })).toBeFocused()
  expect(errors).toEqual([])
})
