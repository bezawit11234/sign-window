(function () {
  const button = document.getElementById('play-summary')
  const status = document.getElementById('audio-status')
  const summary = document.getElementById('summary').textContent

  function speak(text) {
    if (!window.speechSynthesis) {
      status.textContent = 'This device cannot speak. The same summary is written below.'
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en'
    utterance.onend = function () {
      status.textContent = 'Audio summary finished. The same words are written below.'
    }
    window.speechSynthesis.speak(utterance)
    status.textContent = 'Playing the audio summary. The same words are written below.'
  }

  button.addEventListener('click', function () {
    status.textContent = 'Checking for the audio summary'
    fetch('job-summary.mp3').then(function (response) {
      if (!response.ok) throw new Error('missing')
      return response.blob()
    }).then(function (blob) {
      const audio = new Audio(URL.createObjectURL(blob))
      audio.addEventListener('ended', function () {
        URL.revokeObjectURL(audio.src)
        status.textContent = 'Audio summary finished. The same words are written below.'
      })
      return audio.play().then(function () {
        status.textContent = 'Playing the recorded audio summary. The same words are written below.'
      })
    }).catch(function () {
      speak(summary)
    })
  })
})()
