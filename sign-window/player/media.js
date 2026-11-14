/*
 * Shared lesson helpers. No DOM.
 * The browser loads this file as a classic script (window.SignWindowShared).
 * Node requires it for the server and the unit tests, so the player and the
 * transcript API cannot drift apart.
 */
(function (root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) {
    module.exports = api
  } else {
    root.SignWindowShared = api
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseTimestamp(raw) {
    const value = String(raw || '').trim()
    let match = /^(\d{2,}):(\d{2}):(\d{2})\.(\d{3})$/.exec(value)
    if (match) {
      return (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3]) + (Number(match[4]) / 1000)
    }
    match = /^(\d{2}):(\d{2})\.(\d{3})$/.exec(value)
    if (match) {
      return (Number(match[1]) * 60) + Number(match[2]) + (Number(match[3]) / 1000)
    }
    return null
  }

  function parseVtt(raw) {
    if (typeof raw !== 'string') {
      const error = new Error('WebVTT must be text.')
      error.code = 'INVALID_VTT'
      throw error
    }
    const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (!/^WEBVTT(\s|$)/.test(text)) {
      const error = new Error('WebVTT must start with WEBVTT.')
      error.code = 'INVALID_VTT'
      throw error
    }

    const lines = text.split('\n')
    const cues = []
    let i = 1
    while (i < lines.length && lines[i].trim() !== '') i += 1
    while (i < lines.length) {
      if (lines[i].trim() === '') {
        i += 1
        continue
      }
      if (/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[i].trim())) {
        i += 1
        while (i < lines.length && lines[i].trim() !== '') i += 1
        continue
      }
      let timingIndex = i
      if (!lines[i].includes('-->') && lines[i + 1] && lines[i + 1].includes('-->')) {
        timingIndex = i + 1
      }
      if (!lines[timingIndex] || !lines[timingIndex].includes('-->')) {
        i += 1
        continue
      }
      const halves = lines[timingIndex].split('-->')
      const start = parseTimestamp(halves[0])
      const end = parseTimestamp(String(halves[1] || '').trim().split(/\s+/)[0])
      i = timingIndex + 1
      const textLines = []
      let audio = null
      while (i < lines.length && lines[i].trim() !== '') {
        if (lines[i].startsWith('AUDIO:')) audio = lines[i].slice('AUDIO:'.length).trim()
        else textLines.push(lines[i])
        i += 1
      }
      if (start == null || end == null || !(end > start)) continue
      cues.push({ start: start, end: end, text: textLines.join('\n'), audio: audio })
    }
    return cues
  }

  function activeAt(entries, time) {
    if (!Array.isArray(entries) || !Number.isFinite(time)) return null
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      if (!entry || !Number.isFinite(entry.start) || !Number.isFinite(entry.end)) continue
      if (time >= entry.start && time < entry.end) return entry
    }
    return null
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function formatClock(seconds) {
    const whole = Math.max(0, Math.floor(Number(seconds) || 0))
    const hours = Math.floor(whole / 3600)
    const minutes = Math.floor((whole % 3600) / 60)
    const secs = whole % 60
    const mm = String(minutes).padStart(2, '0')
    const ss = String(secs).padStart(2, '0')
    if (hours > 0) return hours + ':' + mm + ':' + ss
    return minutes + ':' + ss
  }

  const STANDALONE_CSS = [
    'body{margin:0;background:#fff;color:#1b1b1b;font-family:"Noto Sans Ethiopic","Segoe UI",sans-serif;font-size:1.125rem;line-height:1.5}',
    'main{max-width:40rem;margin:0 auto;padding:16px}',
    'a{color:#0b3d91;display:inline-flex;align-items:center;min-height:44px;min-width:44px}',
    ':focus-visible{outline:3px solid #0b3d91;outline-offset:2px}',
    'li{margin:8px 0}'
  ].join('')

  function transcriptDocument(options) {
    const opts = options || {}
    const lang = /^[a-z]{2}$/.test(opts.lang) ? opts.lang : 'en'
    const title = opts.title ? String(opts.title) : 'Lesson transcript'
    const cues = Array.isArray(opts.cues) ? opts.cues : []
    const items = cues.map(function (cue) {
      const safe = escapeHtml(cue.text).replace(/\n/g, '<br>')
      return '<li><span>' + escapeHtml(formatClock(cue.start)) + '</span> <span lang="' + lang + '">' + safe + '</span></li>'
    }).join('')
    const body = items || '<li><span lang="' + lang + '">No captions were found in this file.</span></li>'
    const style = opts.inlineCss
      ? '<style>' + STANDALONE_CSS + '</style>'
      : '<link rel="stylesheet" href="' + escapeHtml(opts.styleHref || '/demo/site.css') + '">'
    return [
      '<!DOCTYPE html>',
      '<html lang="' + lang + '">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>' + escapeHtml(title) + '</title>',
      style,
      '</head>',
      '<body>',
      '<a class="skip" href="#main">Skip to content</a>',
      '<main id="main">',
      '<h1>' + escapeHtml(title) + '</h1>',
      '<p>Text transcript. You can read this without playing the video.</p>',
      '<ol>' + body + '</ol>',
      '</main>',
      '</body>',
      '</html>'
    ].join('')
  }

  return {
    parseTimestamp: parseTimestamp,
    parseVtt: parseVtt,
    activeAt: activeAt,
    escapeHtml: escapeHtml,
    formatClock: formatClock,
    transcriptDocument: transcriptDocument
  }
})
