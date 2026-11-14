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

  fetch('/api/certificates/' + encodeURIComponent(id)).then(function (response) {
    if (response.status === 404) {
      show('No certificate was found for this ID.')
      return null
    }
    if (!response.ok) throw new Error('bad')
    return response.json()
  }).then(function (record) {
    if (!record) return
    const state = record.valid ? 'Valid' : 'Not valid'
    show(state + '. ' + record.name + ' earned it on ' + formatDate(record.date) + '. Course: ' + record.course + '.')
  }).catch(function () {
    show('The certificate could not be checked.')
  })
})()
