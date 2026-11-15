(function () {
  const player = document.querySelector('sign-window')
  const video = player ? player.querySelector('video.sw-lesson') : null
  const list = document.getElementById('cue-list')
  const langButtons = document.querySelectorAll('[data-caption]')
  const adToggle = document.getElementById('ad-toggle')
  const adStatus = document.getElementById('ad-status')
  const listen = document.getElementById('listen-job')
  const jobStatus = document.getElementById('job-status')
  const jobSummary = document.getElementById('job-summary')

  function seconds(value) {
    const clean = value.trim().split(/\s/)[0]
    const bits = clean.split(':')
    const sec = Number(bits.pop())
    const min = Number(bits.pop() || 0)
    const hour = Number(bits.pop() || 0)
    return (hour * 3600) + (min * 60) + sec
  }

  function parseVtt(text) {
    return text.replace(/\r/g, '').split(/\n\n+/).map(function (block) {
      const lines = block.split('\n').filter(function (line) { return line && line.indexOf('NOTE') !== 0 && line !== 'WEBVTT' })
      const timing = lines.filter(function (line) { return line.indexOf('-->') !== -1 })[0]
      if (!timing) return null
      const start = seconds(timing.split('-->')[0])
      const body = lines.slice(lines.indexOf(timing) + 1).join(' ').trim()
      return { start: start, text: body }
    }).filter(Boolean)
  }

  function clock(value) {
    const whole = Math.max(0, Math.floor(value))
    return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0')
  }

  function syncLang(lang) {
    langButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-caption') === lang))
    })
  }

  function syncAd() {
    if (!player || !adToggle) return
    const button = player.querySelector('.sw-settings button[aria-pressed]')
    const ad = Array.prototype.find.call(player.querySelectorAll('button'), function (item) {
      return item.textContent === 'Audio description'
    })
    if (!ad) return
    const on = ad.getAttribute('aria-pressed') === 'true'
    adToggle.setAttribute('aria-pressed', String(on))
    adToggle.textContent = on ? 'Turn audio description off' : 'Turn audio description on'
    if (adStatus) adStatus.textContent = on ? 'Audio description is on. It is spoken in Amharic, and the same words appear under the video.' : 'Audio description is off.'
    return button
  }

  langButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const select = player && player.querySelector('select.sw-caption-select')
      if (!select) return
      select.value = button.getAttribute('data-caption')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  })

  const under = document.querySelector('.under-videos')
  const slot = player && player.querySelector('.sw-under')
  if (under && slot) slot.insertBefore(under, slot.firstChild)

  if (player) {
    player.addEventListener('sign-language', function (event) { syncLang(event.detail) })
    const select = player.querySelector('select.sw-caption-select')
    if (select) syncLang(select.value)
  }

  if (adToggle && player) {
    adToggle.addEventListener('click', function () {
      const ad = Array.prototype.find.call(player.querySelectorAll('button'), function (item) {
        return item.textContent === 'Audio description'
      })
      if (ad) ad.click()
      syncAd()
    })
    syncAd()
  }

  let jobAudio = null

  function speakJob(text) {
    if (!window.speechSynthesis) {
      jobStatus.textContent = 'This device cannot speak. The same summary is written below.'
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'am-ET'
    const voices = window.speechSynthesis.getVoices() || []
    let voice = null
    for (let v = 0; v < voices.length; v += 1) {
      if (/^am([-_]|$)/i.test(voices[v].lang || '')) voice = voices[v]
    }
    if (voice) utterance.voice = voice
    utterance.onend = function () {
      jobStatus.textContent = 'The Amharic summary finished. The same words are on the job card.'
    }
    window.speechSynthesis.speak(utterance)
    jobStatus.textContent = voice
      ? 'Playing the Amharic summary.'
      : 'The recorded summary could not play. The words are on the job card.'
  }

  if (listen && jobSummary && jobStatus) {
    listen.addEventListener('click', function () {
      if (jobAudio) {
        jobAudio.pause()
        jobAudio = null
      }
      const audio = new Audio('audio/job-summary.mp3')
      jobAudio = audio
      audio.addEventListener('ended', function () {
        jobStatus.textContent = 'The Amharic summary finished. The same words are on the job card.'
      })
      audio.play().then(function () {
        jobStatus.textContent = 'Playing the Amharic summary.'
      }).catch(function () {
        speakJob(jobSummary.textContent)
      })
    })
  }

  if (!list || !video) return

  Promise.all([
    fetch('en.vtt').then(function (response) { return response.text() }),
    fetch('am.vtt').then(function (response) { return response.text() })
  ]).then(function (files) {
    const english = parseVtt(files[0])
    const amharic = parseVtt(files[1])
    english.forEach(function (cue) {
      const match = amharic.filter(function (item) { return Math.abs(item.start - cue.start) < 0.2 })[0]
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'cue'
      button.dataset.start = String(cue.start)
      const time = document.createElement('span')
      time.className = 'cue-time'
      time.textContent = clock(cue.start)
      const en = document.createElement('span')
      en.lang = 'en'
      en.textContent = cue.text
      button.appendChild(time)
      button.appendChild(en)
      if (match && match.text) {
        const am = document.createElement('span')
        am.lang = 'am'
        am.textContent = match.text
        button.appendChild(am)
      }
      button.addEventListener('click', function () {
        video.currentTime = cue.start
        const play = video.play()
        if (play && play.catch) play.catch(function () {})
      })
      list.appendChild(button)
    })

    video.addEventListener('timeupdate', function () {
      const now = video.currentTime || 0
      const buttons = list.querySelectorAll('.cue')
      let current = null
      buttons.forEach(function (button) {
        const start = Number(button.dataset.start)
        if (start <= now) current = button
      })
      buttons.forEach(function (button) {
        const on = button === current
        if (on) button.setAttribute('aria-current', 'true')
        else button.removeAttribute('aria-current')
      })
    })
  }).catch(function () {
    list.textContent = 'The transcript could not be loaded. The full text page is still available.'
  })
})()
