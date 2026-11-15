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
  let jobAudio = null

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
      status.textContent = 'The Amharic summary finished. The same words are written below.'
    }
    window.speechSynthesis.speak(utterance)
    status.textContent = 'Playing the Amharic summary. The same words are written below.'
  }

  button.addEventListener('click', function () {
    if (jobAudio) {
      jobAudio.pause()
      jobAudio = null
    }
    const audio = new Audio('audio/job-summary.mp3')
    jobAudio = audio
    audio.addEventListener('ended', function () {
      status.textContent = 'The Amharic summary finished. The same words are written below.'
    })
    audio.play().then(function () {
      status.textContent = 'Playing the Amharic summary. The same words are written below.'
    }).catch(function () {
      speak(summary)
    })
  })
})()
