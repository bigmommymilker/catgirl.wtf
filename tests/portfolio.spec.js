const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const { createHash } = require('node:crypto')

async function openProject(page, title = 'The design build') {
  const opener = page.getByRole('button', { name: new RegExp(title) }).last()
  await opener.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  return opener
}

async function openCad(page) {
  await openProject(page)
  await page.getByRole('tab', { name: 'CAD Model' }).click()
  await expect(page.getByText('3D viewer ready.', { exact: true })).toBeVisible()
  return page.locator('canvas')
}

async function audit(page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(result.violations).toEqual([])
}

async function frameHash(page, canvas) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  return createHash('sha256').update(await canvas.screenshot()).digest('hex')
}

test.beforeEach(async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  // Wait for hydration so interactions test React handlers, including the dialog.
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/)
  page.runtimeErrors = errors
})

test.afterEach(async ({ page }) => {
  expect(page.runtimeErrors).toEqual([])
})

test('home has language, skip navigation, pausable motion and accessible themes', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const pause = page.getByRole('button', { name: 'Pause flight animation' })
  await pause.click()
  await expect(pause).toHaveAttribute('aria-pressed', 'true')
  expect(await page.locator('[class*="planeWrap"]').first().evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused')
  await audit(page)
  await page.getByRole('button', { name: 'Dark mode' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await audit(page)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('dialog isolates background, traps focus, switches tabs and restores the opener', async ({ page }) => {
  const opener = await openProject(page)
  const close = page.getByRole('button', { name: 'Close project' })
  await expect(close).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.locator('header a').first().evaluate((el) => el.focus())
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('tabpanel', { name: 'Field Notes' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await audit(page)

  const notes = page.getByRole('tab', { name: 'Field Notes' })
  const cad = page.getByRole('tab', { name: 'CAD Model' })
  await notes.focus()
  await page.keyboard.press('ArrowRight')
  await expect(cad).toBeFocused()
  await expect(cad).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('3D viewer ready.', { exact: true })).toBeVisible()
  await page.keyboard.press('Home')
  await expect(notes).toBeFocused()
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.keyboard.press('End')
  await expect(cad).toBeFocused()
  await expect(page.locator('canvas')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')

  await openProject(page, 'The analysis')
  await expect(page.getByRole('tab', { name: 'CAD Model' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close project' }).click()
  await opener.click()
  await expect(cad).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('canvas')).toHaveCount(1)
})

test('CAD renders and its modes, presets, non-drag controls and shortcuts change the view', async ({ page }, testInfo) => {
  const canvas = await openCad(page)
  await page.screenshot({ path: testInfo.outputPath('cad-light.png') })
  expect(await canvas.evaluate((el) => el.width > 0 && el.height > 0)).toBe(true)
  let previous = await frameHash(page, canvas)
  const actions = ['Top', 'Front', 'Side', 'ISO', 'Wireframe', 'Shaded', 'Shaded + Edges', 'Rotate left', 'Rotate right', 'Rotate up', 'Rotate down', 'Pan left', 'Pan right', 'Pan up', 'Pan down', 'Zoom in', 'Zoom out']
  for (const action of actions) {
    await page.getByRole('button', { name: action, exact: true }).click()
    const current = await frameHash(page, canvas)
    expect(current, `${action} should change the rendered pixels`).not.toBe(previous)
    previous = current
  }
  const viewport = page.getByRole('region', { name: '3D view of Aero Bracket MK-IV' })
  await viewport.focus()
  for (const key of ['ArrowLeft', 'ArrowUp', 'Shift+ArrowRight', '+', '-', 'r']) {
    await page.keyboard.press(key)
    const current = await frameHash(page, canvas)
    expect(current, `${key} should change the rendered pixels`).not.toBe(previous)
    previous = current
  }
  await page.keyboard.press('a')
  await expect(page.getByRole('button', { name: 'Auto-rotate' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => frameHash(page, canvas)).not.toBe(previous)
  await page.keyboard.press('a')
  await expect(page.getByRole('button', { name: 'Auto-rotate' })).toHaveAttribute('aria-pressed', 'false')
  await audit(page)
  await page.getByRole('button', { name: 'Close project' }).click()
  await page.getByRole('button', { name: 'Dark mode' }).click()
  await openCad(page)
  await audit(page)
  await page.screenshot({ path: testInfo.outputPath('cad-dark.png') })
})

test('viewer recovers from a lost context and survives repeated tab unmounts', async ({ page }) => {
  const canvas = await openCad(page)
  await canvas.evaluate((el) => el.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
  await expect(page.getByText(/The 3D viewer is unavailable/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rotate left' })).toBeDisabled()
  await page.getByRole('button', { name: 'Retry 3D viewer' }).click()
  await expect(page.getByText('3D viewer ready.', { exact: true })).toBeVisible()
  for (let index = 0; index < 3; index++) {
    await page.getByRole('tab', { name: 'Field Notes' }).click()
    await expect(canvas).toHaveCount(0)
    await page.getByRole('tab', { name: 'CAD Model' }).click()
    await expect(page.getByText('3D viewer ready.', { exact: true })).toBeVisible()
    await expect(canvas).toHaveCount(1)
  }
})

test('WebGL failure exposes a text alternative and keeps project navigation working', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args)
    }
  })
  await page.reload()
  await openProject(page)
  await page.getByRole('tab', { name: 'CAD Model' }).click()
  await expect(page.getByText(/The 3D viewer is unavailable/)).toBeVisible()
  await expect(page.getByText(/seven through holes/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled()
  await audit(page)
  await page.getByRole('tab', { name: 'Field Notes' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Field Notes' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('narrow screens reflow, and reduced motion stops automatic movement', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await expect(page.locator('body')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await openCad(page)
  await page.screenshot({ path: testInfo.outputPath('cad-narrow.png') })
  expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await audit(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const rotate = page.getByRole('button', { name: 'Auto-rotate' })
  await rotate.click()
  await expect(rotate).toHaveAttribute('aria-pressed', 'true')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(rotate).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Close project' }).click()
  expect(await page.locator('[class*="planeWrap"]').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
})
