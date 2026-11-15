/*
 * <sign-window> embeddable player.
 * Light DOM on purpose: axe-core and screen readers see real buttons.
 * The host page adds one script tag. This file pulls in the stylesheet,
 * the shared caption helpers, and the service worker.
 */
(function () {
  const SCRIPT_URL = (document.currentScript && document.currentScript.src) || '/player/signwindow.js'
  const SIZES = [18, 24, 32, 40, 52]
  const PRESETS = { small: 160, medium: 240, large: 340 }
  const SETTINGS_KEY = 'sign-window-settings'
  const POSITION_KEY = 'sign-window-position-v2'

  function ensureCss() {
    const href = new URL('signwindow.css', SCRIPT_URL).href
    if (document.querySelector('link[data-sign-window-css]')) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute('data-sign-window-css', '')
    link.addEventListener('load', function () {
      document.querySelectorAll('sign-window').forEach(function (node) {
        if (!node.layout) return
        if (node.userPlaced) node.fitSign()
        else node.applyDefaultPosition()
      })
    })
    document.head.appendChild(link)
  }

  function registerWorker() {
    if (!('serviceWorker' in navigator)) return
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return
    const worker = new URL('../sw.js', SCRIPT_URL)
    const scope = new URL('./', worker)
    navigator.serviceWorker.register(worker, { scope: scope.href }).catch(function () {})
  }

  function el(tag, attrs, text) {
    const node = document.createElement(tag)
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'className') node.className = attrs[key]
        else node.setAttribute(key, attrs[key])
      })
    }
    if (text != null) node.textContent = text
    return node
  }

  function readStore(key) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch (error) {
      return null
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      /* Storage can be blocked. The player still works for this visit. */
    }
  }

  function resolveUrl(value, base) {
    if (!value) return ''
    try {
      return new URL(value, base || document.baseURI).href
    } catch (error) {
      return value
    }
  }

  function amharicVoice() {
    if (!window.speechSynthesis || !window.speechSynthesis.getVoices) return null
    const voices = window.speechSynthesis.getVoices() || []
    for (let i = 0; i < voices.length; i += 1) {
      if (/^am([-_]|$)/i.test(voices[i].lang || '')) return voices[i]
    }
    return null
  }

  let sequence = 0

  class SignWindow extends HTMLElement {
    connectedCallback() {
      if (!this.built) this.build()
      const player = this
      this.onResize = function () {
        if (player.userPlaced) player.fitSign()
        else player.applyDefaultPosition()
      }
      window.addEventListener('resize', this.onResize)
      window.addEventListener('load', this.onResize)
    }

    disconnectedCallback() {
      if (this.onResize) {
        window.removeEventListener('resize', this.onResize)
        window.removeEventListener('load', this.onResize)
      }
      if (this.lesson) this.lesson.pause()
      if (this.signVideo) this.signVideo.pause()
    }

    build() {
      this.built = true
      this.idBase = 'sw' + (++sequence)
      const saved = readStore(SETTINGS_KEY) || {}
      this.captionLang = saved.captionLang || 'both'
      this.sizeIndex = Number.isInteger(saved.sizeIndex) ? saved.sizeIndex : 1
      this.theme = saved.theme || 'white-on-black'
      this.opacity = Number.isFinite(saved.opacity) ? saved.opacity : 0.8
      this.announceSigns = saved.announceSigns === true
      this.adOn = saved.adOn === true
      this.rate = saved.rate || 1
      this.volume = Number.isFinite(saved.volume) ? saved.volume : 1
      this.muted = saved.muted === true
      this.timeline = []
      this.signMap = new Map()
      this.enCues = []
      this.amCues = []
      this.adCues = []
      this.activeSignId = null
      this.activeAd = null
      this.signWidth = PRESETS.medium
      this.signLeft = 8
      this.signTop = 8
      this.dragging = null
      this.userPlaced = false
      this.minimized = false

      const root = el('div', { className: 'sw' })
      root.appendChild(el('a', { className: 'sw-skip', href: '#' + this.idBase + '-play' }, 'Skip to playback controls'))

      this.layout = el('div', { className: 'sw-layout' })
      this.mainCol = el('div', { className: 'sw-main' })
      this.stage = el('div', { className: 'sw-stage' })
      this.lesson = el('video', {
        className: 'sw-lesson',
        playsinline: '',
        preload: 'metadata',
        'aria-label': 'Lesson video',
        tabindex: '-1'
      })
      this.lesson.src = resolveUrl(this.getAttribute('video'))
      this.addCaptionTrack(this.getAttribute('captions-en'), 'en', 'English', true)
      this.addCaptionTrack(this.getAttribute('captions-am'), 'am', 'Amharic', false)
      this.stage.appendChild(this.lesson)
      this.captionBox = el('div', { className: 'sw-captions', 'aria-live': 'polite', 'aria-atomic': 'true' })
      this.captionEn = el('p', { className: 'sw-cap-en', lang: 'en' })
      this.captionAm = el('p', { className: 'sw-cap-am', lang: 'am' })
      this.captionBox.appendChild(this.captionEn)
      this.captionBox.appendChild(this.captionAm)
      this.captionBox.hidden = true
      this.stage.appendChild(this.captionBox)
      this.mainCol.appendChild(this.stage)

      this.controls = el('div', { className: 'sw-controls' })
      const transport = el('div', { className: 'sw-transport' })
      this.playBtn = el('button', { id: this.idBase + '-play', type: 'button', 'aria-pressed': 'false' }, 'Play')
      this.backBtn = el('button', { type: 'button', 'aria-label': 'Back 10 seconds' }, 'Back')
      this.forwardBtn = el('button', { type: 'button', 'aria-label': 'Forward 10 seconds' }, 'Forward')
      this.seek = el('input', { type: 'range', min: '0', max: '0', step: '0.1', value: '0', 'aria-valuetext': '0:00 of 0:00' })
      const seekLabel = el('label', { className: 'sw-seek' }, 'Seek')
      seekLabel.appendChild(this.seek)
      this.currentTime = el('span', { 'data-part': 'current' }, '0:00')
      this.durationTime = el('span', { 'data-part': 'duration' }, '0:00')
      const time = el('p', { className: 'sw-time' })
      time.appendChild(el('span', { className: 'sw-visually-hidden' }, 'Elapsed'))
      time.appendChild(this.currentTime)
      time.appendChild(el('span', { 'aria-hidden': 'true' }, ' / '))
      time.appendChild(el('span', { className: 'sw-visually-hidden' }, 'Duration'))
      time.appendChild(this.durationTime)
      this.muteBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Mute')
      this.volumeInput = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: '1' })
      const volumeLabel = el('label', { className: 'sw-volume' }, 'Volume')
      volumeLabel.appendChild(this.volumeInput)
      this.captionSelect = el('select', { className: 'sw-caption-select' })
      ;[['both', 'English and Amharic'], ['en', 'English'], ['am', 'Amharic'], ['off', 'Off']].forEach(function (pair) {
        this.captionSelect.appendChild(el('option', { value: pair[0] }, pair[1]))
      }, this)
      this.settingsBtn = el('button', {
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': this.idBase + '-settings'
      }, 'Settings')
      this.fullscreenBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Full screen')
      transport.appendChild(this.playBtn)
      transport.appendChild(this.backBtn)
      transport.appendChild(this.forwardBtn)
      transport.appendChild(time)
      transport.appendChild(this.muteBtn)
      transport.appendChild(volumeLabel)
      transport.appendChild(this.settingsBtn)
      transport.appendChild(this.fullscreenBtn)
      this.controls.appendChild(seekLabel)
      this.controls.appendChild(transport)

      this.dock = el('div', { className: 'sw-dock' })
      this.sign = el('div', { className: 'sw-sign', role: 'region', 'aria-label': 'Sign language window' })
      const head = el('div', { className: 'sw-sign-head' })
      head.appendChild(el('p', { className: 'sw-sign-title' }, 'Sign language'))
      this.signMenuBtn = el('button', {
        type: 'button',
        className: 'sw-sign-menu',
        'aria-expanded': 'false',
        'aria-controls': this.idBase + '-sign-tools'
      }, 'Sign window')
      head.appendChild(this.signMenuBtn)
      const bar = el('div', { id: this.idBase + '-sign-tools', className: 'sw-sign-bar' })
      bar.hidden = true
      this.signBar = bar
      this.signToolsOpen = false
      this.moveBtn = el('button', { className: 'sw-move', type: 'button', 'aria-label': 'Move sign language window', 'aria-keyshortcuts': 'ArrowUp ArrowDown ArrowLeft ArrowRight' }, 'Move')
      this.minBtn = el('button', { type: 'button', 'aria-pressed': 'false', 'aria-label': 'Min, minimize sign language window' }, 'Min')
      bar.appendChild(this.moveBtn)
      bar.appendChild(this.minBtn)
      this.signVideo = el('video', { className: 'sw-sign-video', muted: '', playsinline: '', 'aria-hidden': 'true' })
      this.sourceLabel = el('p', { className: 'sw-sign-source' }, 'Key sign from the MiliketApp dictionary')
      this.label = el('p', { className: 'sw-sign-label' })
      this.label.hidden = true
      this.labelEn = el('span', { lang: 'en' })
      this.labelAm = el('span', { lang: 'am' })
      this.label.appendChild(this.labelEn)
      this.label.appendChild(document.createTextNode(' · '))
      this.label.appendChild(this.labelAm)
      this.empty = el('p', { className: 'sw-sign-empty' }, 'No key-term sign at this moment.')
      this.sign.appendChild(head)
      this.sign.appendChild(this.sourceLabel)
      this.sign.appendChild(bar)
      this.sign.appendChild(this.signVideo)
      this.sign.appendChild(this.label)
      this.sign.appendChild(this.empty)

      this.layout.appendChild(this.mainCol)
      this.layout.appendChild(this.dock)
      this.layout.appendChild(this.sign)
      root.appendChild(this.layout)
      root.appendChild(this.controls)

      this.under = el('div', { className: 'sw-under' })
      root.appendChild(this.under)

      this.adBox = el('p', { className: 'sw-ad' })
      this.adBox.hidden = true
      root.appendChild(this.adBox)

      this.settings = el('div', { id: this.idBase + '-settings', className: 'sw-settings' })
      this.settings.hidden = true
      this.tools = el('div', { className: 'sw-tools' })
      this.downloadLink = el('a', { href: 'family-signs-offline.zip', download: 'sign-window-offline.zip' }, 'Download for offline')
      this.tools.appendChild(this.settings)
      root.appendChild(this.tools)

      this.buildSettings()
      this.tools.appendChild(this.downloadLink)
      this.help = el('details', { className: 'sw-keys' })
      this.help.appendChild(el('summary', {}, 'Keyboard shortcuts'))
      this.help.appendChild(el('p', {}, 'When the player is focused: Space or K plays or pauses, Left and Right seek 5 seconds, M mutes, C changes captions, F is full screen. Open Sign window, then focus Move. Arrow keys move the sign window. Shift plus an arrow key moves it 50 pixels. On a narrow screen the sign window stays below the video. Minimize hides the picture and keeps the name.'))
      root.appendChild(this.help)
      this.videoError = el('p', { className: 'sw-video-error' }, 'The lesson video could not be loaded.')
      this.videoError.hidden = true
      root.appendChild(this.videoError)
      this.live = el('div', { className: 'sw-visually-hidden', 'aria-live': 'polite' })
      root.appendChild(this.live)
      this.appendChild(root)

      this.bind()
      this.applySavedSettings()
      const position = readStore(POSITION_KEY)
      if (position && position.placed === true && Number.isFinite(position.width)) {
        this.userPlaced = true
        this.signWidth = position.width
        this.signLeft = position.left || 0
        this.signTop = position.top || 0
      }
      if (position && position.preset) this.dockPreset = position.preset
      const player = this
      requestAnimationFrame(function () {
        if (player.userPlaced) player.fitSign()
        else player.applyDefaultPosition()
      })
      this.loadExtras()
    }

    buildSettings() {
      const captionLabel = el('label', {}, 'Captions')
      captionLabel.appendChild(this.captionSelect)
      this.settings.appendChild(captionLabel)
      this.langButtons = this.choiceGroup('Caption language', [
        ['both', 'English and Amharic'],
        ['en', 'English'],
        ['am', 'Amharic'],
        ['off', 'Off']
      ], 'lang')
      this.sizeButtons = this.choiceGroup('Caption text size', [
        ['0', 'Text size 1'],
        ['1', 'Text size 2'],
        ['2', 'Text size 3'],
        ['3', 'Text size 4'],
        ['4', 'Text size 5, very large']
      ], 'size')
      this.themeButtons = this.choiceGroup('Caption colours', [
        ['white-on-black', 'White on black'],
        ['yellow-on-black', 'Yellow on black'],
        ['black-on-white', 'Black on white']
      ], 'theme')

      this.opacityInput = el('input', { type: 'range', min: '55', max: '100', step: '5', value: '100' })
      const opacityLabel = el('label', {}, 'Caption background strength')
      opacityLabel.appendChild(this.opacityInput)
      this.settings.appendChild(opacityLabel)

      this.rateSelect = el('select', {})
      ;[['0.75', '0.75 times'], ['1', '1 times'], ['1.25', '1.25 times'], ['1.5', '1.5 times']].forEach(function (pair) {
        this.rateSelect.appendChild(el('option', { value: pair[0] }, pair[1]))
      }, this)
      const rateLabel = el('label', {}, 'Playback speed')
      rateLabel.appendChild(this.rateSelect)
      this.settings.appendChild(rateLabel)

      this.announceBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Announce signs')
      this.adBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Audio description')
      this.settings.appendChild(this.announceBtn)
      this.settings.appendChild(this.adBtn)

      const sizeGroup = el('div', { className: 'sw-group sw-size', role: 'group', 'aria-label': 'Sign window size' })
      this.smallBtn = this.sizeChoice('S', 'small')
      this.mediumBtn = this.sizeChoice('M', 'medium')
      this.largeBtn = this.sizeChoice('L', 'large')
      this.resetBtn = el('button', { type: 'button' }, 'Reset')
      sizeGroup.appendChild(this.smallBtn)
      sizeGroup.appendChild(this.mediumBtn)
      sizeGroup.appendChild(this.largeBtn)
      sizeGroup.appendChild(this.resetBtn)
      this.signBar.appendChild(sizeGroup)
    }

    sizeChoice(letter, word) {
      const button = el('button', { type: 'button', 'aria-pressed': 'false' })
      button.appendChild(document.createTextNode(letter))
      button.appendChild(el('span', { className: 'sw-visually-hidden' }, ' ' + word))
      return button
    }

    choiceGroup(label, pairs, kind) {
      const group = el('div', { className: 'sw-group', role: 'group', 'aria-label': label })
      const buttons = pairs.map(function (pair) {
        const button = el('button', { type: 'button', 'aria-pressed': 'false' }, pair[1])
        button.dataset[kind] = pair[0]
        group.appendChild(button)
        return button
      })
      this.settings.appendChild(group)
      return buttons
    }

    addCaptionTrack(src, lang, label, isDefault) {
      if (!src) return
      const track = el('track', {
        kind: 'captions',
        src: resolveUrl(src),
        srclang: lang,
        label: label
      })
      if (isDefault) track.default = true
      track.addEventListener('load', this.applyTrackModes.bind(this))
      this.lesson.appendChild(track)
    }

    bind() {
      const player = this
      this.addEventListener('keydown', function (event) { player.onKey(event) })
      this.playBtn.addEventListener('click', function () { player.togglePlay(true) })
      this.backBtn.addEventListener('click', function () { player.seekBy(-10) })
      this.forwardBtn.addEventListener('click', function () { player.seekBy(10) })
      this.seek.addEventListener('input', function () {
        player.lesson.currentTime = Number(player.seek.value)
        player.updateClock()
      })
      this.muteBtn.addEventListener('click', function () { player.toggleMute(true) })
      this.volumeInput.addEventListener('input', function () {
        player.volume = Number(player.volumeInput.value)
        player.lesson.volume = player.volume
        player.muted = player.volume === 0
        player.lesson.muted = player.muted
        player.syncMuteUi(false)
        player.persist()
      })
      this.captionSelect.addEventListener('change', function () {
        player.setLang(player.captionSelect.value, true)
      })
      this.settingsBtn.addEventListener('click', function () { player.toggleSettings() })
      this.fullscreenBtn.addEventListener('click', function () { player.toggleFullscreen() })
      this.signMenuBtn.addEventListener('click', function () {
        player.setSignTools(!player.signToolsOpen)
        player.announce(player.signToolsOpen ? 'Sign window tools open' : 'Sign window tools closed')
      })
      this.minBtn.addEventListener('click', function () {
        player.minimized = !player.minimized
        player.sign.classList.toggle('is-min', player.minimized)
        player.minBtn.setAttribute('aria-pressed', String(player.minimized))
        player.minBtn.textContent = player.minimized ? 'Restore' : 'Min'
        player.minBtn.setAttribute('aria-label', player.minimized ? 'Restore sign language window' : 'Min, minimize sign language window')
        player.fitSign()
        player.announce(player.minimized ? 'Sign window minimized' : 'Sign window restored')
      })
      this.opacityInput.addEventListener('input', function () {
        player.opacity = Number(player.opacityInput.value) / 100
        player.applyCaptionStyle()
        player.persist()
      })
      this.rateSelect.addEventListener('change', function () {
        player.rate = Number(player.rateSelect.value)
        player.lesson.playbackRate = player.rate
        player.signVideo.playbackRate = player.rate
        player.persist()
        player.announce('Playback speed ' + player.rateSelect.selectedOptions[0].textContent)
      })
      this.announceBtn.addEventListener('click', function () {
        player.announceSigns = !player.announceSigns
        player.announceBtn.setAttribute('aria-pressed', String(player.announceSigns))
        player.persist()
        player.announce(player.announceSigns ? 'Sign announcements on' : 'Sign announcements off')
      })
      this.adBtn.addEventListener('click', function () {
        player.adOn = !player.adOn
        player.adBtn.setAttribute('aria-pressed', String(player.adOn))
        player.activeAd = null
        player.persist()
        if (!player.adOn) player.stopDescription()
        player.announce(player.adOn ? 'Audio description on' : 'Audio description off')
        if (player.adOn) player.syncDescription()
      })
      this.langButtons.forEach(function (button) {
        button.addEventListener('click', function () { player.setLang(button.dataset.lang, true) })
      })
      this.sizeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          player.sizeIndex = Number(button.dataset.size)
          player.applyCaptionStyle()
          player.syncChoice(player.sizeButtons, 'size', String(player.sizeIndex))
          player.persist()
          player.announce(button.textContent)
        })
      })
      this.themeButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          player.theme = button.dataset.theme
          player.applyCaptionStyle()
          player.syncChoice(player.themeButtons, 'theme', player.theme)
          player.persist()
          player.announce(button.textContent)
        })
      })
      this.smallBtn.addEventListener('click', function () { player.setPreset('small') })
      this.mediumBtn.addEventListener('click', function () { player.setPreset('medium') })
      this.largeBtn.addEventListener('click', function () { player.setPreset('large') })
      this.resetBtn.addEventListener('click', function () { player.resetSign() })

      this.lesson.addEventListener('loadedmetadata', function () {
        player.applyTrackModes()
        player.updateClock()
        player.lesson.playbackRate = player.rate
      })
      this.lesson.addEventListener('timeupdate', function () { player.onTime() })
      this.lesson.addEventListener('seeked', function () {
        player.activeSignId = null
        player.activeAd = null
        player.onTime()
      })
      this.lesson.addEventListener('play', function () { player.syncPlayUi(true, false) })
      this.lesson.addEventListener('pause', function () { player.syncPlayUi(false, false) })
      this.lesson.addEventListener('ended', function () { player.syncPlayUi(false, false) })
      this.lesson.addEventListener('error', function () {
        player.videoError.hidden = false
        player.announce('The lesson video could not be loaded')
      })
      this.signVideo.addEventListener('error', function () { player.noteMissingClip() })
      this.signVideo.addEventListener('ended', function () {
        if (player.signMode !== 'clip' || player.lesson.paused) return
        player.signVideo.currentTime = 0
        player.signVideo.play().catch(function () {})
      })
      document.addEventListener('fullscreenchange', function () { player.syncFullscreen() })

      this.bindDrag(this.sign, 'move')
    }

    bindDrag(handle, mode) {
      const player = this
      handle.addEventListener('pointerdown', function (event) {
        if (event.button !== 0) return
        if (player.isNarrow()) return
        const pressed = event.target.closest('button, a, input, select')
        if (pressed && pressed !== player.moveBtn) return
        event.preventDefault()
        player.sign.setPointerCapture(event.pointerId)
        player.userPlaced = true
        player.releaseDock()
        player.dragging = {
          mode: mode,
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          left: player.signLeft,
          top: player.signTop,
          width: player.signWidth
        }
      })
      handle.addEventListener('pointermove', function (event) {
        if (!player.dragging || player.dragging.id !== event.pointerId || player.dragging.mode !== mode) return
        if (mode === 'move') {
          player.signLeft = player.dragging.left + (event.clientX - player.dragging.x)
          player.signTop = player.dragging.top + (event.clientY - player.dragging.y)
          player.clampSign()
        } else {
          player.signWidth = Math.max(120, player.dragging.width + (event.clientX - player.dragging.x))
          player.clearPreset()
          player.fitSign()
        }
      })
      function endDrag(event) {
        if (!player.dragging || player.dragging.id !== event.pointerId) return
        player.userPlaced = true
        player.dragging = null
        player.persistPosition()
      }
      handle.addEventListener('pointerup', endDrag)
      handle.addEventListener('pointercancel', endDrag)
    }

    applySavedSettings() {
      this.lesson.volume = this.volume
      this.lesson.muted = this.muted
      this.volumeInput.value = String(this.volume)
      this.lesson.playbackRate = this.rate
      this.rateSelect.value = String(this.rate)
      this.opacityInput.value = String(Math.round(this.opacity * 100))
      this.announceBtn.setAttribute('aria-pressed', String(this.announceSigns))
      this.adBtn.setAttribute('aria-pressed', String(this.adOn))
      this.setLang(this.captionLang, false)
      this.syncChoice(this.sizeButtons, 'size', String(this.sizeIndex))
      this.syncChoice(this.themeButtons, 'theme', this.theme)
      this.applyCaptionStyle()
      this.syncMuteUi(false)
    }

    loadExtras() {
      const player = this
      this.loadShared().then(function () {
        return Promise.all([
          player.fetchJson(player.getAttribute('signs')),
          player.fetchJson(player.getAttribute('timeline')),
          player.fetchCues(player.getAttribute('captions-en')),
          player.fetchCues(player.getAttribute('captions-am')),
          player.fetchCues(player.getAttribute('descriptions'))
        ])
      }).then(function (results) {
        const signs = Array.isArray(results[0]) ? results[0] : []
        const signsUrl = resolveUrl(player.getAttribute('signs'))
        signs.forEach(function (sign) {
          if (sign && sign.id) {
            sign.videoUrl = resolveUrl(sign.video, signsUrl)
            player.signMap.set(sign.id, sign)
          }
        })
        player.timeline = Array.isArray(results[1]) ? results[1] : []
        player.enCues = results[2] || []
        player.amCues = results[3] || []
        player.adCues = results[4] || []
        player.onTime()
      }).catch(function () {
        player.announce('Some lesson files could not be loaded')
      })
    }

    loadShared() {
      if (window.SignWindowShared) return Promise.resolve(window.SignWindowShared)
      if (!this.sharedPromise) {
        this.sharedPromise = new Promise(function (resolve) {
          const script = document.createElement('script')
          script.src = new URL('media.js', SCRIPT_URL).href
          script.onload = function () { resolve(window.SignWindowShared || null) }
          script.onerror = function () { resolve(null) }
          document.head.appendChild(script)
        })
      }
      return this.sharedPromise
    }

    fetchJson(attribute) {
      const url = resolveUrl(attribute)
      if (!url) return Promise.resolve(null)
      return fetch(url).then(function (response) {
        if (!response.ok) throw new Error('missing')
        return response.json()
      })
    }

    fetchCues(attribute) {
      const url = resolveUrl(attribute)
      if (!url || !window.SignWindowShared) return Promise.resolve([])
      return fetch(url).then(function (response) {
        if (!response.ok) return []
        return response.text()
      }).then(function (text) {
        try {
          return window.SignWindowShared.parseVtt(text)
        } catch (error) {
          return []
        }
      })
    }

    onTime() {
      this.updateClock()
      this.paintCaptionsFromTime()
      this.syncSign()
      this.syncDescription()
    }

    updateClock() {
      const current = this.lesson.currentTime || 0
      const duration = Number.isFinite(this.lesson.duration) ? this.lesson.duration : 0
      this.currentTime.textContent = window.SignWindowShared
        ? window.SignWindowShared.formatClock(current)
        : this.fallbackClock(current)
      this.durationTime.textContent = window.SignWindowShared
        ? window.SignWindowShared.formatClock(duration)
        : this.fallbackClock(duration)
      this.seek.max = String(duration || 0)
      if (document.activeElement !== this.seek) this.seek.value = String(current)
      const label = this.currentTime.textContent + ' of ' + this.durationTime.textContent
      this.seek.setAttribute('aria-valuetext', label)
    }

    fallbackClock(seconds) {
      const whole = Math.max(0, Math.floor(seconds || 0))
      return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0')
    }

    paintCaptionsFromTime() {
      const time = this.lesson.currentTime || 0
      if (this.captionLang === 'off') {
        this.paintCaption('', '')
        return
      }
      const en = this.captionLang === 'am' ? '' : this.linesFor('en', time)
      const am = this.captionLang === 'en' ? '' : this.linesFor('am', time)
      this.paintCaption(en, am)
    }

    linesFor(lang, time) {
      const parsed = lang === 'am' ? this.amCues : this.enCues
      if (parsed && parsed.length) {
        return parsed.filter(function (cue) {
          return time >= cue.start && time < cue.end
        }).map(function (cue) { return cue.text }).join('\n')
      }
      const track = this.trackFor(lang)
      if (!track || !track.cues) return ''
      const lines = []
      for (let i = 0; i < track.cues.length; i += 1) {
        const cue = track.cues[i]
        if (time >= cue.startTime && time < cue.endTime) lines.push(cue.text)
      }
      return lines.join('\n')
    }

    paintCaption(enText, amText) {
      const en = enText || ''
      const am = amText || ''
      if (this.captionEn.textContent === en && this.captionAm.textContent === am) return
      this.captionEn.textContent = en
      this.captionAm.textContent = am
      this.captionEn.hidden = !en
      this.captionAm.hidden = !am
      this.captionBox.hidden = !en && !am
    }

    trackFor(lang) {
      const tracks = this.lesson.textTracks
      for (let i = 0; i < tracks.length; i += 1) {
        if (tracks[i].language === lang) return tracks[i]
      }
      return null
    }

    applyTrackModes() {
      const tracks = this.lesson.textTracks
      for (let i = 0; i < tracks.length; i += 1) {
        const on = this.captionLang !== 'off' && (this.captionLang === 'both' || tracks[i].language === this.captionLang)
        tracks[i].mode = on ? 'hidden' : 'disabled'
      }
    }

    syncSign() {
      if (!window.SignWindowShared) return
      const entry = window.SignWindowShared.activeAt(this.timeline, this.lesson.currentTime || 0)
      const id = entry && entry.signId ? entry.signId : null
      if (id !== this.activeSignId) {
        this.activeSignId = id
        this.showSign(id, entry ? entry.start : 0)
      }
      this.signVideo.playbackRate = this.lesson.playbackRate || 1
      if (!id) return
      if (this.signMode === 'missing' || !this.signVideo.src) return
      if (this.signMode === 'lesson' && this.signVideo.src) {
        const drift = Math.abs((this.signVideo.currentTime || 0) - (this.lesson.currentTime || 0))
        if (drift > 0.45 && this.signVideo.readyState >= 1) {
          this.signVideo.currentTime = this.lesson.currentTime || 0
        }
      }
      if (this.lesson.paused) this.signVideo.pause()
      else if (this.signVideo.src && this.signVideo.paused && !this.signVideo.ended) {
        this.signVideo.play().catch(function () {})
      }
    }

    showSign(id, start) {
      const player = this
      const sign = id ? this.signMap.get(id) : null
      if (!sign) {
        this.signMode = ''
        this.label.hidden = true
        this.empty.hidden = false
        this.empty.textContent = 'No key-term sign at this moment.'
        this.signVideo.removeAttribute('src')
        this.signVideo.load()
        this.sign.classList.add('is-novideo')
        return
      }
      this.labelEn.textContent = sign.en || ''
      this.labelAm.textContent = sign.am || ''
      this.label.hidden = false
      this.empty.hidden = true
      this.signStart = start || 0
      if (this.announceSigns) this.announce('Sign: ' + (sign.en || '') + '. ' + (sign.am || ''))
      const clip = sign.videoUrl
      const check = clip
        ? fetch(clip, { method: 'HEAD' }).then(function (response) { return response.ok }).catch(function () { return false })
        : Promise.resolve(false)
      check.then(function (exists) {
        if (player.activeSignId !== id) return
        if (exists) player.playSignSource(clip, 0, 'clip')
        else if (player.lessonFallback()) player.playSignSource(player.lesson.currentSrc || player.lesson.src, player.lesson.currentTime || start || 0, 'lesson')
        else player.showUnavailable(sign)
      })
      this.fitSign()
    }

    playSignSource(url, time, mode) {
      const player = this
      if (!url) {
        this.empty.hidden = false
        this.empty.textContent = 'The sign video is not available.'
        return
      }
      this.signMode = mode
      this.empty.hidden = true
      this.sign.classList.add('is-novideo')
      this.signVideo.loop = mode === 'clip'
      const seek = function () {
        player.sign.classList.remove('is-novideo')
        const target = mode === 'lesson' ? (player.lesson.currentTime || time || 0) : 0
        if (player.signVideo.readyState >= 1) player.signVideo.currentTime = target
        const playing = player.signVideo.play()
        if (playing && playing.then) {
          playing.then(function () {
            if (player.lesson.paused) player.signVideo.pause()
          }).catch(function () {})
        }
      }
      if (this.signVideo.src !== url) {
        this.signVideo.src = url
        this.signVideo.addEventListener('loadeddata', seek, { once: true })
      } else {
        seek()
      }
    }

    lessonFallback() {
      return this.getAttribute('sign-fallback') === 'lesson'
    }

    showUnavailable(sign) {
      this.signMode = 'missing'
      this.signVideo.pause()
      this.signVideo.removeAttribute('src')
      this.signVideo.load()
      this.sign.classList.add('is-novideo')
      this.labelEn.textContent = (sign && sign.en) || ''
      this.labelAm.textContent = (sign && sign.am) || ''
      this.label.hidden = false
      this.empty.hidden = false
      this.empty.textContent = 'Clip not available offline'
    }

    noteMissingClip() {
      if (!this.activeSignId) return
      const sign = this.signMap.get(this.activeSignId)
      if (this.lessonFallback()) {
        this.playSignSource(this.lesson.currentSrc || this.lesson.src, this.lesson.currentTime || this.signStart || 0, 'lesson')
        return
      }
      this.showUnavailable(sign)
    }

    syncDescription() {
      if (!this.adOn || !window.SignWindowShared) return
      const cue = window.SignWindowShared.activeAt(this.adCues, this.lesson.currentTime || 0)
      if (!cue) {
        this.activeAd = null
        this.adBox.hidden = true
        this.adBox.textContent = ''
        return
      }
      if (cue === this.activeAd) return
      this.activeAd = cue
      this.adBox.hidden = false
      this.adBox.lang = 'am'
      this.adBox.textContent = cue.text
      this.announce(cue.text)
      if (cue.audio) this.playDescriptionAudio(resolveUrl(cue.audio))
      else this.speakDescription(cue.text)
    }

    stopDescription() {
      this.adBox.hidden = true
      this.adBox.textContent = ''
      if (this.descriptionAudio) {
        this.descriptionAudio.pause()
        this.descriptionAudio = null
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }

    speakDescription(text) {
      if (!window.speechSynthesis) return
      const player = this
      let started = false
      const start = function () {
        if (started || !player.adOn) return
        started = true
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'am-ET'
        const voice = amharicVoice()
        if (voice) utterance.voice = voice
        else player.announce('No Amharic voice is installed on this device')
        window.speechSynthesis.speak(utterance)
      }
      if (window.speechSynthesis.getVoices().length) start()
      else {
        window.speechSynthesis.addEventListener('voiceschanged', start, { once: true })
        window.setTimeout(start, 400)
      }
    }

    playDescriptionAudio(src) {
      const player = this
      const audio = new Audio(src)
      this.descriptionAudio = audio
      audio.addEventListener('ended', function () {})
      audio.play().catch(function () {
        player.speakDescription(player.adBox.textContent.replace(/^Audio description\. /, ''))
      })
    }

    togglePlay(announce) {
      const player = this
      if (this.lesson.paused) {
        this.lesson.play().then(function () {
          player.syncPlayUi(true, announce)
        }).catch(function () {
          player.announce('The video could not play')
        })
      } else {
        this.lesson.pause()
        this.syncPlayUi(false, announce)
      }
    }

    syncPlayUi(playing, announce) {
      this.playBtn.textContent = playing ? 'Pause' : 'Play'
      this.playBtn.setAttribute('aria-pressed', String(playing))
      if (announce) this.announce(playing ? 'Playing' : 'Paused')
      if (!playing) this.signVideo.pause()
    }

    toggleMute(announce) {
      this.muted = !this.muted
      if (!this.muted && this.volume === 0) {
        this.volume = 0.5
        this.volumeInput.value = '0.5'
        this.lesson.volume = 0.5
      }
      this.lesson.muted = this.muted
      this.syncMuteUi(announce)
      this.persist()
    }

    syncMuteUi(announce) {
      const muted = this.muted || this.volume === 0
      this.muteBtn.textContent = muted ? 'Unmute' : 'Mute'
      this.muteBtn.setAttribute('aria-pressed', String(muted))
      if (announce) this.announce(muted ? 'Muted' : 'Sound on')
    }

    seekBy(delta) {
      const duration = Number.isFinite(this.lesson.duration) ? this.lesson.duration : 0
      const next = Math.min(Math.max(0, (this.lesson.currentTime || 0) + delta), duration || 0)
      this.lesson.currentTime = next
      this.announce((delta < 0 ? 'Back ' : 'Forward ') + Math.abs(delta) + ' seconds')
    }

    setLang(lang, announce) {
      this.captionLang = lang
      this.captionSelect.value = lang
      this.syncChoice(this.langButtons, 'lang', lang)
      this.applyTrackModes()
      this.paintCaptionsFromTime()
      this.persist()
      this.dispatchEvent(new CustomEvent('sign-language', { bubbles: true, detail: lang }))
      if (announce) {
        const names = { both: 'English and Amharic', en: 'English', am: 'Amharic' }
        this.announce(lang === 'off' ? 'Captions off' : 'Captions on: ' + (names[lang] || lang))
      }
    }

    cycleLang() {
      const order = ['both', 'en', 'am', 'off']
      const next = order[(order.indexOf(this.captionLang) + 1) % order.length]
      this.setLang(next, true)
    }

    syncChoice(buttons, key, value) {
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset[key] === value))
      })
    }

    applyCaptionStyle() {
      const themes = {
        'white-on-black': { en: '#ffffff', am: '#ffe14a', rgb: [0, 0, 0] },
        'yellow-on-black': { en: '#ffe14a', am: '#ffffff', rgb: [0, 0, 0] },
        'black-on-white': { en: '#1b1b1b', am: '#0a3d91', rgb: [255, 255, 255] }
      }
      const theme = themes[this.theme] || themes['white-on-black']
      const size = SIZES[this.sizeIndex] || SIZES[1]
      const strength = Math.min(1, Math.max(0.55, this.opacity))
      this.captionEn.style.color = theme.en
      this.captionAm.style.color = theme.am
      this.captionBox.style.backgroundColor = 'rgba(' + theme.rgb.join(',') + ',' + strength + ')'
      this.captionBox.style.fontSize = 'calc(' + size + 'px * var(--kit-scale, 1))'
    }

    toggleSettings() {
      const open = this.settings.hidden
      this.settings.hidden = !open
      this.settingsBtn.setAttribute('aria-expanded', String(open))
      if (open) {
        const first = this.settings.querySelector('button, select, input')
        if (first) first.focus()
        this.announce('Settings open')
      } else {
        this.announce('Settings closed')
      }
    }

    toggleFullscreen() {
      const player = this
      if (!document.fullscreenEnabled && !this.requestFullscreen) {
        this.announce('Full screen is not available')
        return
      }
      const active = document.fullscreenElement === this
      const action = active ? document.exitFullscreen() : this.requestFullscreen()
      Promise.resolve(action).then(function () {
        player.syncFullscreen()
        player.announce(document.fullscreenElement === player ? 'Full screen' : 'Left full screen')
      }).catch(function () {
        player.announce('Full screen is not available')
      })
    }

    syncFullscreen() {
      const on = document.fullscreenElement === this
      this.fullscreenBtn.setAttribute('aria-pressed', String(on))
      this.fullscreenBtn.textContent = on ? 'Exit full screen' : 'Full screen'
    }

    setPreset(name) {
      this.dockPreset = name
      this.signWidth = PRESETS[name] || PRESETS.medium
      this.smallBtn.setAttribute('aria-pressed', String(name === 'small'))
      this.mediumBtn.setAttribute('aria-pressed', String(name === 'medium'))
      this.largeBtn.setAttribute('aria-pressed', String(name === 'large'))
      this.fitSign()
      this.persistPosition()
      this.announce('Sign window size ' + name)
    }

    clearPreset() {
      ;[this.smallBtn, this.mediumBtn, this.largeBtn].forEach(function (button) {
        button.setAttribute('aria-pressed', 'false')
      })
    }

    resetSign() {
      try { localStorage.removeItem(POSITION_KEY) } catch (error) {}
      this.userPlaced = false
      this.minimized = false
      this.sign.classList.remove('is-min')
      this.minBtn.setAttribute('aria-pressed', 'false')
      this.minBtn.textContent = 'Min'
      this.minBtn.setAttribute('aria-label', 'Min, minimize sign language window')
      this.applyDefaultPosition()
      this.announce('Sign window position reset')
    }

    setSignTools(open) {
      this.signToolsOpen = open === true
      this.signBar.hidden = !this.signToolsOpen
      this.signMenuBtn.setAttribute('aria-expanded', String(this.signToolsOpen))
    }

    isNarrow() {
      return !!(this.layout && this.layout.clientWidth > 0 && this.layout.clientWidth < 640)
    }

    applyDefaultPosition() {
      if (!this.layout) return
      const preset = this.dockPreset || 'small'
      this.dockPreset = preset
      const cap = Math.max(140, this.layout.clientWidth - 24)
      this.signWidth = Math.min(PRESETS[preset] || PRESETS.medium, cap)
      this.sign.classList.remove('is-docked')
      this.sign.style.height = ''
      this.smallBtn.setAttribute('aria-pressed', String(preset === 'small'))
      this.mediumBtn.setAttribute('aria-pressed', String(preset === 'medium'))
      this.largeBtn.setAttribute('aria-pressed', String(preset === 'large'))
      this.userPlaced = false
      this.fitSign()
    }

    releaseDock() {
      this.sign.classList.remove('is-docked')
      this.sign.style.height = ''
      const width = this.sign.offsetWidth || this.signWidth || PRESETS.medium
      if (this.minimized) {
        this.signVideo.style.height = '0px'
        return
      }
      this.signVideo.style.height = Math.round(width * 9 / 16) + 'px'
      const room = this.layout ? this.layout.clientHeight - this.sign.offsetHeight : 24
      if (room < 24) {
        const next = Math.max(72, this.signVideo.offsetHeight - (24 - room))
        this.signVideo.style.height = next + 'px'
      }
    }

    fitSign() {
      if (!this.layout) return
      if (this.isNarrow()) {
        this.layout.classList.add('is-narrow')
        this.sign.classList.add('is-docked')
        this.sign.style.height = ''
        this.sign.style.left = 'auto'
        this.sign.style.top = 'auto'
        const width = Math.min(220, Math.max(140, this.layout.clientWidth - 16))
        this.sign.style.width = width + 'px'
        this.signVideo.style.height = this.minimized ? '0px' : Math.round(width * 9 / 16) + 'px'
        return
      }
      this.layout.classList.remove('is-narrow')
      this.sign.classList.remove('is-docked')
      this.sign.style.height = ''
      const maxWidth = Math.max(140, this.layout.clientWidth - 16)
      const width = Math.min(this.signWidth, maxWidth)
      this.sign.style.width = width + 'px'
      this.signVideo.style.height = this.minimized ? '0px' : Math.round(width * 9 / 16) + 'px'
      if (!this.userPlaced) {
        this.signLeft = Math.max(8, this.layout.clientWidth - width - 12)
        this.signTop = 12
      }
      this.clampSign()
    }

    clampSign() {
      if (this.isNarrow()) {
        this.sign.style.left = 'auto'
        this.sign.style.top = 'auto'
        return
      }
      const bounds = this.layout || this.stage
      const maxLeft = Math.max(0, bounds.clientWidth - this.sign.offsetWidth)
      const maxTop = Math.max(0, bounds.clientHeight - this.sign.offsetHeight)
      this.signLeft = Math.min(Math.max(0, this.signLeft), maxLeft)
      this.signTop = Math.min(Math.max(0, this.signTop), maxTop)
      this.sign.style.left = this.signLeft + 'px'
      this.sign.style.top = this.signTop + 'px'
    }

    moveSign(key, step) {
      if (this.isNarrow()) {
        this.announce('The sign window stays below the video on a narrow screen')
        return
      }
      this.userPlaced = true
      this.releaseDock()
      if (key === 'ArrowLeft') this.signLeft -= step
      if (key === 'ArrowRight') this.signLeft += step
      if (key === 'ArrowUp') this.signTop -= step
      if (key === 'ArrowDown') this.signTop += step
      this.clampSign()
      this.persistPosition()
      const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[key]
      this.announce('Sign window moved ' + direction)
    }

    resizeByKey(key, step) {
      const delta = (key === 'ArrowRight' || key === 'ArrowDown') ? step : -step
      this.signWidth = Math.max(120, this.signWidth + delta)
      this.clearPreset()
      this.fitSign()
      this.persistPosition()
      this.announce('Sign window resized')
    }

    onKey(event) {
      if (!this.contains(document.activeElement)) return
      const key = event.key
      const target = event.target
      const typing = target.matches('input, select, textarea')
      if (target === this.moveBtn && key.indexOf('Arrow') === 0) {
        event.preventDefault()
        this.moveSign(key, event.shiftKey ? 50 : 10)
        return
      }
      if (key === 'Escape' && this.signToolsOpen && this.signBar.contains(target)) {
        event.preventDefault()
        this.setSignTools(false)
        this.signMenuBtn.focus()
        this.announce('Sign window tools closed')
        return
      }
      if (key === 'Escape' && !this.settings.hidden) {
        event.preventDefault()
        this.settings.hidden = true
        this.settingsBtn.setAttribute('aria-expanded', 'false')
        this.settingsBtn.focus()
        this.announce('Settings closed')
        return
      }
      if (typing) return
      if ((key === ' ' || key === 'Enter') && target.closest('button, a, select')) return
      if (key === ' ' || key === 'k' || key === 'K') {
        event.preventDefault()
        this.togglePlay(true)
      } else if (key === 'ArrowLeft') {
        event.preventDefault()
        this.seekBy(-5)
      } else if (key === 'ArrowRight') {
        event.preventDefault()
        this.seekBy(5)
      } else if (key === 'm' || key === 'M') {
        event.preventDefault()
        this.toggleMute(true)
      } else if (key === 'c' || key === 'C') {
        event.preventDefault()
        this.cycleLang()
      } else if (key === 'f' || key === 'F') {
        event.preventDefault()
        this.toggleFullscreen()
      }
    }

    announce(message) {
      const live = this.live
      live.textContent = ''
      window.setTimeout(function () { live.textContent = message }, 40)
    }

    persist() {
      writeStore(SETTINGS_KEY, {
        captionLang: this.captionLang,
        sizeIndex: this.sizeIndex,
        theme: this.theme,
        opacity: this.opacity,
        announceSigns: this.announceSigns,
        adOn: this.adOn,
        rate: this.rate,
        volume: this.volume,
        muted: this.muted
      })
    }

    persistPosition() {
      writeStore(POSITION_KEY, {
        left: this.signLeft,
        top: this.signTop,
        width: this.signWidth,
        placed: this.userPlaced === true,
        preset: this.dockPreset || ''
      })
    }
  }

  ensureCss()
  registerWorker()
  if (!customElements.get('sign-window')) customElements.define('sign-window', SignWindow)
})()
