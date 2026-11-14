const test = require('node:test')
const assert = require('node:assert/strict')
const { transcriptDocument } = require('../player/media')

test('escapes caption text in the transcript page', function () {
  const html = transcriptDocument({
    title: 'Greetings <script>',
    lang: 'en',
    cues: [{ start: 0, end: 2, text: '<script>alert(1)</script>' }]
  })
  assert.equal(html.includes('<script>alert'), false)
  assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true)
  assert.equal(html.includes('<html lang="en">'), true)
  assert.equal(html.includes('Greetings &lt;script&gt;'), true)
  assert.equal(html.includes('<main id="main">'), true)
})

test('marks Amharic transcripts with lang am', function () {
  const html = transcriptDocument({
    title: 'Amharic',
    lang: 'am',
    cues: [{ start: 65, end: 70, text: 'ሰላም' }]
  })
  assert.equal(html.includes('<html lang="am">'), true)
  assert.equal(html.includes('lang="am">ሰላም'), true)
  assert.equal(html.includes('>1:05<'), true)
})
