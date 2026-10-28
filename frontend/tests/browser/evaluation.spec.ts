import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir } from 'node:fs/promises'
import type { Page } from '@playwright/test'

async function startDemo(page: Page) {
  await page.goto('/buyer/evaluations/new')
  await page.getByRole('button', { name: 'Review test terms' }).click()
  await page.getByRole('checkbox', { name: 'I approve these demo test terms.' }).check()
  await page.getByRole('button', { name: 'Simulate PayPal authorization' }).click()
  await page.getByRole('link', { name: 'Continue evaluation demo' }).click()
}

async function finishDemo(page: Page) {
  await page.getByRole('button', { name: 'Advance demo to rule check' }).click()
  await page.getByRole('button', { name: 'Show demo results' }).click()
}

test('setup renders responsively and passes checked accessibility states', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await mkdir('docs/verification/page-05', { recursive: true })
  await page.goto('/buyer/evaluations/new')
  await page.getByRole('heading', { name: 'Define what passing means.' }).waitFor()
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport)
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-05/${viewport.name}.png`, fullPage: true })
  }
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.screenshot({ path: 'docs/verification/page-05/night.png', fullPage: true })
  expect(errors).toEqual([])
})

test('setup rejects malformed uploads and restores explicitly saved drafts', async ({ page }) => {
  await page.goto('/buyer/evaluations/new')
  const file = page.getByLabel('Replace checked examples file')
  await file.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') })
  await expect(page.getByRole('alert')).toContainText('not valid JSON')
  await expect(page.getByRole('button', { name: 'Review test terms' })).toBeDisabled()
  const records = [{ id: 'Local001', input: 'Invoice 1', expected: { invoiceNumber: '1', total: '100.00', currency: 'USD' } }]
  await file.setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(records)) })
  await expect(page.getByRole('status')).toContainText('1 record passed format checks')
  await page.getByRole('spinbutton', { name: /Minimum checked accuracy/ }).fill('80')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await page.reload()
  await expect(page.getByRole('spinbutton', { name: /Minimum checked accuracy/ })).toHaveValue('80')
  await expect(page.getByText('local.json', { exact: true })).toBeVisible()
  await expect(page.getByText('Not authorized', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Local001.txt' }).click()
  await expect(page.getByRole('dialog')).toContainText('100.00')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Local001.txt' })).toBeFocused()
})

test('agreement requires explicit consent, locks terms and stays local', async ({ page }) => {
  const external: string[] = []; page.on('request', request => { if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname)) external.push(request.url()) })
  await page.goto('/buyer/evaluations/review')
  await expect(page.getByRole('heading', { name: 'Start with your test agreement.' })).toBeVisible()
  await page.getByRole('link', { name: 'Set up a test' }).click()
  await page.getByRole('button', { name: 'Review test terms' }).click()
  await expect(page.getByRole('heading', { name: 'Your test agreement' })).toBeVisible()
  const authorize = page.getByRole('button', { name: 'Simulate PayPal authorization' })
  await expect(authorize).toBeDisabled()
  await page.getByRole('checkbox', { name: 'I approve these demo test terms.' }).check()
  await authorize.click()
  await expect(page.getByRole('status')).toContainText('Demo authorization confirmed')
  await expect(page.getByRole('link', { name: 'Edit test setup' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Start with your test agreement.' })).toBeVisible()
  expect(external).toEqual([])
})

test('agreement reference layout, responsive themes and accessibility', async ({ page }) => {
  await mkdir('docs/verification/page-06', { recursive: true })
  await page.goto('/buyer/evaluations/new')
  await page.getByRole('button', { name: 'Review test terms' }).click()
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-06/${viewport.name}.png`, fullPage: true })
  }
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.screenshot({ path: 'docs/verification/page-06/night.png', fullPage: true })
  await page.getByText('Evaluation scope and limits', { exact: true }).click()
  await expect(page.getByText('Not supplied. Full purchase qualification is unverified.')).toBeVisible()
})

test('progress advances only on explicit actions and keeps delivery locked', async ({ page }) => {
  await page.goto('/buyer/evaluations/progress')
  await expect(page.getByRole('heading', { name: 'Start with your test agreement.' })).toBeVisible()
  await startDemo(page)
  await expect(page.getByRole('heading', { name: 'Putting the skill to the test.' })).toBeVisible()
  await expect(page.getByText('Capture: Not started', { exact: true })).toBeVisible()
  await expect(page.getByText('Skill delivery: Locked', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Advance demo to rule check' }).click()
  await expect(page.getByText('90%', { exact: true })).toBeVisible()
  await expect(page.getByText('Capture: Not started', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'View agreement' }).click()
  await expect(page.getByText('This demo snapshot is approved and locked.')).toBeVisible()
  await page.getByRole('link', { name: 'Continue evaluation demo' }).click()
  await expect(page.getByRole('button', { name: 'Show demo results' })).toBeVisible()
})

test('progress reference layout and accessible day and night states', async ({ page }) => {
  await mkdir('docs/verification/page-07', { recursive: true })
  await startDemo(page)
  await page.getByRole('radio', { name: 'Night', exact: true }).check()
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-07/${viewport.name}.png`, fullPage: true })
  }
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.getByRole('radio', { name: 'Day', exact: true }).check()
  await page.screenshot({ path: 'docs/verification/page-07/day.png', fullPage: true })
})

test('results distinguish pass, requested capture and completed delivery', async ({ page }) => {
  const errors: string[] = []; const external: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname)) external.push(request.url()) })
  await startDemo(page); await finishDemo(page)
  await expect(page.getByRole('heading', { name: 'Your demo test passed.' })).toBeVisible()
  await expect(page.getByText('60%', { exact: true })).toBeVisible()
  await expect(page.getByText('90%', { exact: true })).toBeVisible()
  await expect(page.getByText('+30', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Skill delivery locked' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'View demo receipt' })).toBeDisabled()
  await page.getByRole('button', { name: 'View all records' }).click()
  await expect(page.getByRole('button', { name: /^Inspect Invoice/ })).toHaveCount(20)
  await page.getByRole('button', { name: 'Inspect Invoice019' }).click()
  await expect(page.getByRole('heading', { name: 'Selected record detail — Invoice019' })).toBeVisible()
  await expect(page.getByLabel('Selected record field comparison')).toContainText('SGD')
  await page.getByRole('button', { name: 'Simulate capture request' }).click()
  await expect(page.getByRole('status')).toContainText('Payment remains pending')
  await expect(page.getByRole('button', { name: 'Skill delivery locked' })).toBeDisabled()
  await page.getByRole('button', { name: 'Simulate completed capture' }).click()
  await expect(page.getByText('Demo captured', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View demo receipt' }).click()
  await expect(page.getByRole('dialog')).toContainText('no package hash or transaction was created')
  for (let index = 0; index < 4; index++) { await page.keyboard.press('Tab'); expect(await page.getByRole('dialog').evaluate(node => node.contains(document.activeElement))).toBe(true) }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'View demo receipt' })).toBeFocused()
  await page.getByRole('button', { name: 'Open demo skill' }).click()
  await expect(page.getByRole('heading', { name: 'Your tested skill is ready.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your skill is still locked.' })).toBeVisible()
  expect(errors).toEqual([]); expect(external).toEqual([])
})

test('failed thresholds and uploaded data cannot capture or unlock delivery', async ({ page }) => {
  for (const mode of ['fail', 'local']) {
    await page.goto('/buyer/evaluations/new')
    if (mode === 'fail') await page.getByRole('spinbutton', { name: /Minimum checked accuracy/ }).fill('95')
    else await page.getByLabel('Replace checked examples file').setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ id: 'Real001', input: 'Unprocessed', expected: { invoiceNumber: '1', total: '100.00', currency: 'USD' } }])) })
    await page.getByRole('button', { name: 'Review test terms' }).click()
    await page.getByRole('checkbox', { name: 'I approve these demo test terms.' }).check()
    await page.getByRole('button', { name: 'Simulate PayPal authorization' }).click()
    await page.getByRole('link', { name: 'Continue evaluation demo' }).click()
    await finishDemo(page)
    await expect(page.getByRole('heading', { name: mode === 'fail' ? 'This skill didn’t meet your checks.' : 'Your test is inconclusive.' })).toBeVisible()
    await expect(page.getByText(mode === 'fail' ? 'Demo voided' : 'Demo cancelled', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Simulate capture request' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: mode === 'fail' ? 'Download skill' : 'Skill delivery locked' })).toBeDisabled()
    if (mode === 'local') await expect(page.getByText('90%', { exact: true })).toHaveCount(0)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.screenshot({ path: `docs/verification/page-08/${mode}.png`, fullPage: true })
  }
})

test('results layout, day and night accessibility, pending and receipt states', async ({ page }) => {
  await mkdir('docs/verification/page-08', { recursive: true })
  await startDemo(page); await finishDemo(page)
  await page.screenshot({ path: 'docs/verification/page-08/authorized.png', fullPage: true })
  await page.getByRole('button', { name: 'Simulate capture request' }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: 'docs/verification/page-08/pending.png', fullPage: true })
  await page.getByRole('button', { name: 'Simulate completed capture' }).click()
  for (const viewport of [{ width: 1536, height: 1024, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'small-mobile' }]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `docs/verification/page-08/${viewport.name}.png`, fullPage: true })
  }
  for (const theme of ['Day', 'Night']) {
    await page.getByRole('radio', { name: theme, exact: true }).check()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  }
  await page.setViewportSize({ width: 1536, height: 1024 })
  await page.screenshot({ path: 'docs/verification/page-08/night.png', fullPage: true })
  await page.getByRole('button', { name: 'View demo receipt' }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: 'docs/verification/page-08/receipt.png' })
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open demo skill' }).click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
})
