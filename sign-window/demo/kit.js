(function () {
  const root = document.documentElement
  const key = 'miliket-kit'
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(key) || '{}') || {}
  } catch (error) {
    saved = {}
  }

  const steps = [1, 1.125, 1.25, 1.5, 1.75]
  let scale = steps.indexOf(saved.scale) >= 0 ? saved.scale : 1.125
  let theme = saved.theme || 'blue'

  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify({ scale: scale, theme: theme }))
    } catch (error) {}
  }

  function applyScale(next) {
    scale = next
    root.style.fontSize = (16 * scale) + 'px'
    root.style.setProperty('--kit-scale', String(scale))
    persist()
  }

  function applyTheme(next) {
    theme = next
    root.dataset.theme = theme
    document.querySelectorAll('[data-theme-choice]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-choice') === theme))
    })
    persist()
  }

  applyScale(scale)
  applyTheme(theme)

  const smaller = document.getElementById('text-smaller')
  const larger = document.getElementById('text-larger')
  if (smaller) {
    smaller.addEventListener('click', function () {
      const index = Math.max(0, steps.indexOf(scale) - 1)
      applyScale(steps[index])
    })
  }
  if (larger) {
    larger.addEventListener('click', function () {
      const index = Math.min(steps.length - 1, steps.indexOf(scale) + 1)
      applyScale(steps[index])
    })
  }
  document.querySelectorAll('[data-theme-choice]').forEach(function (button) {
    button.addEventListener('click', function () {
      applyTheme(button.getAttribute('data-theme-choice'))
    })
  })
})()
