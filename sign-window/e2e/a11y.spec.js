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
  await page.goto('/demo/index.html')
  await page.waitForFunction(function () {
    const node = document.querySelector('.sw-sign')
    return node && node.style.top !== ''
  })
  const move = page.getByRole('button', { name: 'Move sign language window' })
  await move.focus()
  const before = await page.locator('.sw-sign').evaluate(function (node) { return node.style.top })
  await page.keyboard.press('ArrowDown')
  const after = await page.locator('.sw-sign').evaluate(function (node) { return node.style.top })
  expect(after).not.toBe(before)
})
