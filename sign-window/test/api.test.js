const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { app } = require('../server/index')

function request(port, options) {
  return new Promise(function (resolve, reject) {
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      method: options.method || 'GET',
      path: options.path,
      headers: options.headers || {}
    }, function (res) {
      const chunks = []
      res.on('data', function (chunk) { chunks.push(chunk) })
      res.on('end', function () {
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
      })
    })
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

test('signs, transcript, and offline pack', async function (t) {
  const server = app.listen(0)
  const port = server.address().port
  t.after(function () { server.close() })

  const signs = await request(port, { path: '/api/signs' })
  assert.equal(signs.status, 200)
  const list = JSON.parse(signs.body.toString('utf8'))
  assert.equal(list.length, 88)
  assert.equal(list[0].en, 'Hello')
  assert.equal(list[0].am, 'ሰላም')
  const dizzy = list.find(function (sign) { return sign.id === 'e9' })
  assert.equal(dizzy.am, 'ያወዛል')
  assert.equal(list.some(function (sign) { return sign.id === 'f10' || sign.id === 'f11' }), false)

  const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n<script>alert(1)</script>\n'
  const transcript = await request(port, {
    method: 'POST',
    path: '/api/transcript?lang=en&title=Demo',
    headers: { 'content-type': 'text/vtt' },
    body: vtt
  })
  assert.equal(transcript.status, 200)
  const html = transcript.body.toString('utf8')
  assert.equal(html.includes('<script>alert'), false)
  assert.equal(html.includes('&lt;script&gt;'), true)

  const bad = await request(port, {
    method: 'POST',
    path: '/api/transcript',
    headers: { 'content-type': 'text/plain' },
    body: 'hello'
  })
  assert.equal(bad.status, 400)

  const pack = await request(port, { path: '/api/offline-pack' })
  assert.equal(pack.status, 200)
  assert.equal(pack.body.slice(0, 2).toString(), 'PK')
  assert.match(String(pack.headers['content-type']), /zip/)

  const escaped = await request(port, { path: '/api/offline-pack?lesson=../secrets' })
  assert.equal(escaped.status, 400)

  const page = await request(port, { path: '/api/transcript' })
  assert.equal(page.status, 200)
  const transcriptPage = page.body.toString('utf8')
  assert.match(transcriptPage, /<table>/)
  assert.match(transcriptPage, /lang="am"/)
  assert.match(transcriptPage, /Print or save as PDF/)
  assert.match(transcriptPage, /This transcript has no images/)
  assert.equal(transcriptPage.includes('tagged PDF file'), false)

  const badge = await request(port, { path: '/api/certificates/ETH-2026-001.jsonld' })
  assert.equal(badge.status, 200)
  const credential = JSON.parse(badge.body.toString('utf8'))
  assert.equal(credential['@type'], 'EducationalOccupationalCredential')
  assert.equal(credential.identifier, 'ETH-2026-001')
  assert.match(credential.description, /not a signed Open Badges/)

  const certificate = await request(port, { path: '/api/certificates/ETH-2026-001' })
  assert.equal(certificate.status, 200)
  const record = JSON.parse(certificate.body.toString('utf8'))
  assert.equal(record.valid, true)
  assert.equal(record.name, 'Hana Bekele')
  assert.equal(record.date, '2026-11-01')

  const missing = await request(port, { path: '/api/certificates/NO-SUCH-ID' })
  assert.equal(missing.status, 404)
})
