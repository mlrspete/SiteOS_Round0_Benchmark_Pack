import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function expectActiveFilter(page, testId) {
  const control = page.getByTestId(testId)
  await expect(control).toBeVisible()
  const active = await control.evaluate((element) => (
    element.getAttribute('aria-pressed') === 'true'
    || element.getAttribute('aria-selected') === 'true'
    || (element instanceof HTMLInputElement && element.checked)
  ))
  expect(active, `${testId} must expose its active state semantically`).toBe(true)
}

function durationToMs(value) {
  if (value.endsWith('ms')) return Number.parseFloat(value)
  if (value.endsWith('s')) return Number.parseFloat(value) * 1000
  return 0
}

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

test('[F01|5][GATE] loads the correct substantial slice', async ({ page }) => {
  await expect(page).toHaveTitle(/Gridline/i)
  await expect(page.getByRole('heading', { level: 1, name: 'Keep critical sites moving.' })).toBeVisible()
  await expect(page.getByText('Industrial electrical + automation — Victoria')).toBeVisible()
  expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(500)
})

test('[F02A|6][GATE] filtering controls cards, URL state and direct loading', async ({ page }) => {
  await page.getByTestId('filter-electrical').click()
  await expect(page).toHaveURL(/discipline=electrical/)
  await expectActiveFilter(page, 'filter-electrical')
  await expect(page.getByTestId('service-count')).toContainText('2')
  await expect(page.getByTestId('service-card-shutdown-commissioning')).toBeVisible()
  await expect(page.getByTestId('service-card-plc-fault-finding')).not.toBeVisible()

  await page.getByTestId('filter-controls').click()
  await expect(page).toHaveURL(/discipline=controls/)
  await expectActiveFilter(page, 'filter-controls')
  await expect(page.getByTestId('service-count')).toContainText('2')

  await page.goto('/?discipline=reliability')
  await expectActiveFilter(page, 'filter-reliability')
  await expect(page.getByTestId('service-card-power-quality')).toBeVisible()
})

test('[F02B|2] browser back and forward restore filter state', async ({ page }) => {
  await page.getByTestId('filter-electrical').click()
  await page.getByTestId('filter-controls').click()
  await page.goBack()
  await expectActiveFilter(page, 'filter-electrical')
  await expect(page).toHaveURL(/discipline=electrical/)
  await page.goForward()
  await expectActiveFilter(page, 'filter-controls')
  await expect(page).toHaveURL(/discipline=controls/)
})

test('[F03|4][GATE] a keyboard-operable service button reveals supplied detail', async ({ page }) => {
  const card = page.getByTestId('service-card-plc-fault-finding')
  const trigger = card.getByRole('button').first()
  await expect(trigger).toBeVisible()
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  const detail = page.getByTestId('service-detail')
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('PLC + controls fault-finding')
  await expect(detail).toContainText('Fault chronology and evidence')
  await expect(detail).toContainText('Bring recent alarms')
})

test('[F04|4][GATE] dialog traps focus, closes with Escape and returns focus', async ({ page }) => {
  const opener = page.getByTestId('scope-review-open').first()
  await opener.click()
  const dialog = page.getByTestId('scope-review-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Request a scope review' })).toBeVisible()
  await expect(dialog.locator(':focus')).toBeVisible()
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => {
      const dialogElement = document.querySelector('[data-testid="scope-review-dialog"]')
      return Boolean(dialogElement?.contains(document.activeElement))
    }), `focus left the dialog after Tab ${index + 1}`).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(opener).toBeFocused()
})

test('[F05|4][GATE] the native-select form has errors and deterministic success', async ({ page }) => {
  await page.getByTestId('scope-review-open').first().click()
  const form = page.getByTestId('scope-review-form')
  await expect(form.getByLabel('Project type')).toHaveJSProperty('tagName', 'SELECT')
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
  { width: 360, height: 800, name: 'mobile', points: 3 },
  { width: 768, height: 1024, name: 'tablet', points: 3 },
  { width: 1440, height: 1000, name: 'desktop', points: 2 },
]) {
  test(`[R01-${viewport.name}|${viewport.points}][GATE] no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.reload()
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1)
  })
}

test('[R02|5] long copy is not clamped or clipped and missing media has a fallback', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  const longTitle = page.getByText('Switchboard modernisation, protection coordination + thermal risk review')
  await expect(longTitle).toBeVisible()
  const titleGeometry = await longTitle.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflow: style.overflow,
      overflowY: style.overflowY,
      textOverflow: style.textOverflow,
      lineClamp: style.webkitLineClamp,
    }
  })
  expect(titleGeometry.scrollWidth).toBeLessThanOrEqual(titleGeometry.clientWidth + 1)
  expect(titleGeometry.textOverflow).not.toBe('ellipsis')
  expect(['none', '0', '']).toContain(titleGeometry.lineClamp)
  if (['hidden', 'clip'].includes(titleGeometry.overflow) || ['hidden', 'clip'].includes(titleGeometry.overflowY)) {
    expect(titleGeometry.scrollHeight).toBeLessThanOrEqual(titleGeometry.clientHeight + 1)
  }
  await expect(page.getByTestId('media-fallback')).toBeVisible()
  await expect(page.getByTestId('media-fallback')).toContainText(/power|image|field|quality/i)
})

test('[R03|2] images are local and load successfully when used', async ({ page }) => {
  const imageState = await page.locator('img').evaluateAll((images) => images.map((image) => ({
    src: image.getAttribute('src') || '',
    loaded: image.complete && image.naturalWidth > 0,
  })))
  expect(imageState.filter((image) => /^https?:/i.test(image.src)), 'remote images are forbidden').toEqual([])
  expect(imageState.filter((image) => !image.loaded), 'broken local images').toEqual([])
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

test('[A02|4][GATE] whole page remains accessible while the modal is open', async ({ page }) => {
  await page.getByTestId('scope-review-open').first().click()
  const result = await new AxeBuilder({ page }).analyze()
  const violations = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
})

test('[A03|3] reduced motion suppresses long animations and transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
  await page.waitForTimeout(100)
  const state = await page.evaluate(() => ({
    activeLongAnimations: document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getComputedTiming()
      return animation.playState === 'running' && Number(timing?.duration || 0) > 100
    }).length,
    durations: [...document.querySelectorAll('*')].flatMap((element) => {
      const style = getComputedStyle(element)
      return [...style.animationDuration.split(','), ...style.transitionDuration.split(',')]
    }),
  }))
  const maximumDuration = Math.max(0, ...state.durations.map(durationToMs))
  expect(state.activeLongAnimations).toBe(0)
  expect(maximumDuration).toBeLessThanOrEqual(100)
})
