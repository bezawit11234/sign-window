const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default

async function violations(page) {
  const results = await new AxeBuilder({ page }).analyze()
  return results.violations.filter(function (item) {
    return item.impact === 'critical' || item.impact === 'serious'
  }).map(function (item) {
    return {
      id: item.id,
      impact: item.impact,
      help: item.help,
      nodes: item.nodes.slice(0, 3).map(function (node) { return node.target.join(' ') })
    }
  })
}

test('lesson, job, and certificate pages have no serious axe issues', async function ({ page }) {
  for (const path of ['/demo/index.html', '/demo/job.html', '/demo/verify.html?id=ETH-2026-001']) {
    await page.goto(path)
    await page.locator('h1').waitFor()
    const found = await violations(page)
    expect(found, path + ' ' + JSON.stringify(found, null, 2)).toEqual([])
  }
})

test('keyboard can reach the player controls and then leave', async function ({ page }) {
  await page.goto('/demo/index.html')
  await page.locator('sign-window button', { hasText: 'Play' }).waitFor()
  let sawInside = false
  let leftAfter = false
  for (let i = 0; i < 50; i += 1) {
    await page.keyboard.press('Tab')
    const state = await page.evaluate(function () {
      const el = document.activeElement
      const style = window.getComputedStyle(el)
      return {
        inside: !!el.closest('sign-window'),
        outline: style.outlineStyle,
        width: style.outlineWidth
      }
    })
    if (state.inside) {
      sawInside = true
      expect(state.outline, 'focused control needs a visible outline').not.toBe('none')
      expect(state.width).not.toBe('0px')
    }
    if (sawInside && !state.inside) leftAfter = true
  }
  expect(sawInside).toBe(true)
  expect(leftAfter).toBe(true)
})

test('shortcuts do nothing until the player is focused', async function ({ page }) {
  await page.goto('/demo/index.html')
  await page.locator('a[href="job.html"]').first().focus()
  await page.keyboard.press('k')
  const paused = await page.locator('sign-window video.sw-lesson').evaluate(function (video) {
    return video.paused
  })
  expect(paused).toBe(true)
})

test('arrow keys move the sign window when Move is focused', async function ({ page }) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/demo/index.html')
  await page.waitForFunction(function () {
    const node = document.querySelector('.sw-sign')
    return node && node.style.top !== '' && node.style.top !== 'auto'
  })
  await page.getByRole('button', { name: 'Sign window', exact: true }).click()
  const move = page.getByRole('button', { name: 'Move sign language window' })
  await move.focus()
  const before = await page.locator('.sw-sign').evaluate(function (node) { return node.style.top })
  await page.keyboard.press('ArrowDown')
  const after = await page.locator('.sw-sign').evaluate(function (node) { return node.style.top })
  expect(after).not.toBe(before)
  await page.keyboard.press('Shift+ArrowDown')
  const shifted = await page.locator('.sw-sign').evaluate(function (node) { return parseFloat(node.style.top) })
  expect(shifted).toBeGreaterThanOrEqual(parseFloat(after) + 50)
})

test('sign window keyboard controls change size, reset, and minimize', async function ({ page }) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/demo/index.html')
  await page.getByRole('button', { name: 'Sign window', exact: true }).click()
  await page.getByRole('button', { name: 'S small' }).click()
  const small = await page.locator('.sw-sign').evaluate(function (node) { return node.getBoundingClientRect().width })
  await page.getByRole('button', { name: 'L large' }).click()
  const large = await page.locator('.sw-sign').evaluate(function (node) { return node.getBoundingClientRect().width })
  expect(large).toBeGreaterThan(small)
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('button', { name: 'Min, minimize sign language window' }).click()
  await expect(page.locator('.sw-sign')).toHaveClass(/is-min/)
  for (let i = 0; i < 40; i += 1) await page.keyboard.press('Tab')
  const left = await page.evaluate(function () {
    const el = document.activeElement
    return !el || !el.closest('sign-window')
  })
  expect(left).toBe(true)
})

function boxesOverlap(a, b) {
  if (!a || !b || a.width === 0 || b.width === 0) return false
  return a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1
}

test('job, certificate, and transcript pages reflow at 320px', async function ({ page }) {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const path of ['/demo/job.html', '/demo/verify.html?id=ETH-2026-001', '/demo/transcript.html']) {
    await page.goto(path)
    await page.locator('h1').waitFor()
    const overflow = await page.evaluate(function () {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    })
    expect(overflow, path).toBe(true)
  }
})

test('layouts at 320, 375, 640, and 1280 do not clip the controls', async function ({ page }) {
  for (const width of [320, 375, 640, 1280]) {
    await page.setViewportSize({ width: width, height: 800 })
    await page.goto('/demo/index.html')
    await page.locator('sign-window button', { hasText: 'Play' }).waitFor()
    await page.screenshot({ path: 'test-results/layout-' + width + '.png', fullPage: true })
    const metrics = await page.evaluate(function () {
      function box(selector) {
        const node = document.querySelector(selector)
        if (!node) return null
        const rect = node.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      }
      const forward = document.querySelector('button[aria-label="Forward 10 seconds"]')
      const forwardBox = forward.getBoundingClientRect()
      return {
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        narrow: document.querySelector('.sw-layout').classList.contains('is-narrow'),
        sign: box('.sw-sign'),
        stage: box('.sw-stage'),
        controls: box('.sw-controls'),
        forward: { x: forwardBox.x, y: forwardBox.y, width: forwardBox.width, height: forwardBox.height, right: forwardBox.right }
      }
    })
    expect(metrics.scroll, 'horizontal overflow at ' + width).toBeLessThanOrEqual(metrics.client + 1)
    expect(metrics.forward.x).toBeGreaterThanOrEqual(-1)
    expect(metrics.forward.right).toBeLessThanOrEqual(width + 1)
    expect(metrics.forward.width).toBeGreaterThanOrEqual(24)
    expect(metrics.forward.height).toBeGreaterThanOrEqual(24)
    if (width < 640) {
      expect(metrics.narrow).toBe(true)
      expect(boxesOverlap(metrics.sign, metrics.controls), 'sign overlaps controls at ' + width).toBe(false)
      expect(metrics.sign.y, 'sign should sit below the video at ' + width).toBeGreaterThanOrEqual(metrics.stage.y + metrics.stage.height - 2)
    }
  }
})

test('caption themes and the largest text size stay inside the page', async function ({ page }) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/demo/index.html')
  await page.getByRole('button', { name: 'Gold' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Yellow on black' }).click()
  await page.getByRole('button', { name: 'Text size 5, very large' }).click()
  let found = await violations(page)
  expect(found, JSON.stringify(found)).toEqual([])
  await page.getByRole('button', { name: 'Dark' }).click()
  await page.getByRole('button', { name: 'White on black' }).click()
  found = await violations(page)
  expect(found, JSON.stringify(found)).toEqual([])
})

test('text spacing does not clip the lesson page', async function ({ page }) {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/demo/index.html')
  await page.locator('sign-window button', { hasText: 'Play' }).waitFor()
  await page.addStyleTag({ url: '/demo/text-spacing.css' })
  const overflow = await page.evaluate(function () {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  })
  expect(overflow).toBe(true)
  const found = await violations(page)
  expect(found, JSON.stringify(found)).toEqual([])
})

test('200 percent zoom at a 640px viewport does not add horizontal overflow', async function ({ page }) {
  await page.setViewportSize({ width: 640, height: 800 })
  await page.goto('/demo/index.html')
  await page.locator('h1').waitFor()
  await page.evaluate(function () { document.documentElement.style.zoom = '2' })
  const overflow = await page.evaluate(function () {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  })
  expect(overflow).toBe(true)
})

test('targets are at least 24px', async function ({ page }) {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/demo/index.html')
  await page.locator('sign-window button', { hasText: 'Play' }).waitFor()
  const small = await page.evaluate(function () {
    const nodes = document.querySelectorAll('a, button, input, select, summary')
    const found = []
    nodes.forEach(function (node) {
      const rect = node.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      if (rect.width < 24 || rect.height < 24) {
        found.push((node.getAttribute('aria-label') || node.textContent || node.tagName).trim().slice(0, 40) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height))
      }
    })
    return found
  })
  expect(small).toEqual([])
})

test('a missing dictionary clip does not mirror the lesson', async function ({ page }) {
  await page.route('**/signs/*.mp4', function (route) {
    route.fulfill({ status: 404, body: '' })
  })
  await page.goto('/demo/index.html')
  await page.waitForFunction(function () {
    const player = document.querySelector('sign-window')
    return player && player.signMap && player.signMap.size > 0
  })
  await page.locator('.sw-lesson').evaluate(function (video) {
    video.currentTime = 13
    video.dispatchEvent(new Event('timeupdate'))
  })
  await expect(page.locator('.sw-sign-empty')).toHaveText('Clip not available offline')
  await expect(page.locator('.sw-sign-label')).toContainText('Mother')
  const src = await page.locator('.sw-sign-video').evaluate(function (video) {
    return video.getAttribute('src')
  })
  expect(src).toBeNull()
})
