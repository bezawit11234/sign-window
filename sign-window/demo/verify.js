(function () {
  const params = new URLSearchParams(location.search)
  const id = (params.get('id') || '').trim()
  const input = document.getElementById('cert-id')
  const result = document.getElementById('result')
  if (id) input.value = id

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  function formatDate(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
    if (!match) return iso || ''
    const month = months[Number(match[2]) - 1]
    if (!month) return iso
    return Number(match[3]) + ' ' + month + ' ' + match[1]
  }

  function show(text) {
    result.replaceChildren()
    const paragraph = document.createElement('p')
    paragraph.textContent = text
    result.appendChild(paragraph)
  }

  if (!id) {
    show('Enter a certificate ID to check it.')
    return
  }

  function showRecord(record) {
    const state = record.valid ? 'Valid' : 'Not valid'
    const calendar = window.SignWindowShared && window.SignWindowShared.ethiopianDate
      ? window.SignWindowShared.ethiopianDate(record.date)
      : null
    result.replaceChildren()
    const paragraph = document.createElement('p')
    paragraph.appendChild(document.createTextNode(state + '. ' + record.name + ' earned it on ' + formatDate(record.date) + '. '))
    if (calendar && calendar.am) {
      paragraph.appendChild(document.createTextNode('Ethiopian calendar: '))
      const am = document.createElement('span')
      am.lang = 'am'
      am.textContent = calendar.am
      paragraph.appendChild(am)
      paragraph.appendChild(document.createTextNode(calendar.en ? ' (' + calendar.en + '). ' : '. '))
    }
    paragraph.appendChild(document.createTextNode('Course: ' + record.course + '.'))
    result.appendChild(paragraph)
    const badge = document.getElementById('badge-link')
    if (badge) badge.href = 'credentials/' + encodeURIComponent(id) + '.jsonld'
  }

  function fromFile() {
    return fetch('certificates.json').then(function (response) {
      if (!response.ok) throw new Error('bad')
      return response.json()
    }).then(function (records) {
      const record = records[id]
      if (!record) {
        show('No certificate was found for this ID.')
        return
      }
      showRecord(record)
    })
  }

  fromFile().catch(function () {
    show('The certificate could not be checked.')
  })
})()
