(function () {
  const calendar = window.SignWindowShared && window.SignWindowShared.ethiopianDate
    ? window.SignWindowShared.ethiopianDate('2026-11-30')
    : null
  const am = document.getElementById('deadline-eth-am')
  const en = document.getElementById('deadline-eth-en')
  if (calendar && am && en) {
    am.textContent = calendar.am || ''
    en.textContent = calendar.en || 'Ethiopian date unavailable on this browser'
  }

  const button = document.getElementById('play-summary')
  const status = document.getElementById('audio-status')
  const summary = document.getElementById('summary-am').textContent

  function amharicVoice() {
    const voices = window.speechSynthesis.getVoices() || []
    for (let i = 0; i < voices.length; i += 1) {
      if (/^am([-_]|$)/i.test(voices[i].lang || '')) return voices[i]
    }
    return null
  }

  function speak(text) {
    if (!window.speechSynthesis) {
      status.textContent = 'This device cannot speak. The Amharic summary is written below.'
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'am-ET'
    const voice = amharicVoice()
    if (voice) utterance.voice = voice
    utterance.onend = function () {
      status.textContent = voice
        ? 'The Amharic summary finished. The same words are written below.'
        : 'No Amharic voice is installed, so this may not sound Amharic. The words are written below.'
    }
    window.speechSynthesis.speak(utterance)
    status.textContent = voice
      ? 'Playing the Amharic summary. The same words are written below.'
      : 'No Amharic voice is installed. Add Amharic in Windows speech settings. The words are written below.'
  }

  button.addEventListener('click', function () {
    const start = function () { speak(summary) }
    if (window.speechSynthesis && window.speechSynthesis.getVoices().length) start()
    else if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', start, { once: true })
      window.setTimeout(start, 400)
    } else start()
  })
})()
