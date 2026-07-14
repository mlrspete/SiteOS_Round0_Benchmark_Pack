import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import path from 'node:path'

const screenshotDir = process.env.SITEOS_SCREENSHOT_DIR || '/tmp/siteos-round0-screenshots'

test.beforeEach(async ({ page }) => {
  const failures = []
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`)
  })
  await page.goto('/')
  await expect(page.locator('body')).toContainText('Keep critical sites moving.')
  page.__runtimeFailures = failures
})

test.afterEach(async ({ page }) => {
  expect(page.__runtimeFailures || [], 'runtime errors').toEqual([])
})

test('[F01|5][GATE] loads the correct slice without an error or blank page', async ({ page }) => {
  await expect(page).toHaveTitle(/Gridline/i)
  await expect(page.getByRole('heading', { level: 1, name: 'Keep critical sites moving.' })).toBeVisible()
  await expect(page.getByText('Industrial electrical + automation — Victoria')).toBeVisible()
  expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(500)
})

test('[F02|8][GATE] filter state controls cards, URL and browser history', async ({ page }) => {
  await page.getByTestId('filter-electrical').click()
  await expect(page).toHaveURL(/discipline=electrical/)
  await expect(page.getByTestId('service-count')).toContainText('2')
  await expect(page.getByTestId('service-card-shutdown-commissioning')).toBeVisible()
  await expect(page.getByTestId('service-card-plc-fault-finding')).not.toBeVisible()

  await page.getByTestId('filter-controls').click()
  await expect(page).toHaveURL(/discipline=controls/)
  await expect(page.getByTestId('service-count')).toContainText('2')
  await page.goBack()
  await expect(page.getByTestId('filter-electrical')).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/?discipline=reliability')
  await expect(page.getByTestId('filter-reliability')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('service-card-power-quality')).toBeVisible()
})

test('[F03|4][GATE] selecting a service reveals its supplied detail', async ({ page }) => {
  await page.getByTestId('service-card-plc-fault-finding').click()
  const detail = page.getByTestId('service-detail')
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('PLC + controls fault-finding')
  await expect(detail).toContainText('Fault chronology and evidence')
  await expect(detail).toContainText('Bring recent alarms')
})

test('[F04|4][GATE] dialog manages initial focus, Escape and focus return', async ({ page }) => {
  const opener = page.getByTestId('scope-review-open').first()
  await opener.click()
  const dialog = page.getByTestId('scope-review-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Request a scope review' })).toBeVisible()
  await expect(dialog.locator(':focus')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(opener).toBeFocused()
})

test('[F05|4][GATE] form exposes field errors and deterministic success', async ({ page }) => {
  await page.getByTestId('scope-review-open').first().click()
  const form = page.getByTestId('scope-review-form')
  await form.getByRole('button', { name: 'Submit request' }).click()
  for (const field of ['name', 'email', 'projectType', 'summary']) {
    await expect(page.getByTestId(`error-${field}`)).toBeVisible()
  }
  await form.getByLabel('Name').fill('Alex Morgan')
  await form.getByLabel('Work email').fill('alex@example.com')
  await form.getByLabel('Project type').selectOption({ index: 1 })
  await form.getByLabel('Project summary').fill('Recurring line trips during afternoon production runs.')
  await form.getByRole('button', { name: 'Submit request' }).click()
  await expect(page.getByTestId('scope-review-success')).toHaveText('Thanks — a scope engineer will reply within one business day.')
})

for (const viewport of [
  { width: 360, height: 800, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 1000, name: 'desktop' },
]) {
  test(`[R01-${viewport.name}|${viewport.name === 'desktop' ? 2 : 3}][GATE] no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.reload()
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1)
  })
}

test('[R02|5] long copy and missing-media fallback remain intentional', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  const longTitle = page.getByText('Switchboard modernisation, protection coordination + thermal risk review')
  await expect(longTitle).toBeVisible()
  expect(await longTitle.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  await expect(page.getByTestId('media-fallback')).toBeVisible()
  await expect(page.getByTestId('media-fallback')).toContainText(/power|image|field|quality/i)
})

test('[R03|2] supplied images load successfully', async ({ page }) => {
  const failures = await page.locator('img').evaluateAll((images) => images
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.getAttribute('src')))
  expect(failures).toEqual([])
})

test('[R04|5] mobile navigation is present and keyboard usable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  const toggle = page.getByTestId('mobile-menu-toggle')
  await expect(toggle).toBeVisible()
  await toggle.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByTestId('mobile-menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Services' })).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
})

test('[A01|8][GATE] base page has no serious or critical axe violations', async ({ page }) => {
  const result = await new AxeBuilder({ page }).analyze()
  const violations = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
})

test('[A02|4][GATE] open dialog has no serious or critical axe violations', async ({ page }) => {
  await page.getByTestId('scope-review-open').first().click()
  const result = await new AxeBuilder({ page }).include('[data-testid="scope-review-dialog"]').analyze()
  const violations = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
})

test('[A03|3] reduced-motion preference is recognized and suppresses long-running entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await page.waitForTimeout(100)
  const longAnimations = await page.evaluate(() => document.getAnimations()
    .filter((animation) => {
      const timing = animation.effect?.getComputedTiming()
      return animation.playState === 'running' && Number(timing?.duration || 0) > 100
    }).length)
  expect(longAnimations).toBe(0)
})

test('[EVIDENCE] captures full-page review screenshots', async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 800, name: '360' },
    { width: 768, height: 1024, name: '768' },
    { width: 1440, height: 1000, name: '1440' },
  ]) {
    await page.setViewportSize(viewport)
    await page.reload()
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}.png`), fullPage: true })
  }
})
