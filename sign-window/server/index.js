const fs = require('fs')
const path = require('path')
const express = require('express')
const archiver = require('archiver')
const { parseVtt, transcriptDocument } = require('../player/media')

const rootDir = path.join(__dirname, '..')
const playerDir = path.join(rootDir, 'player')
const demoDir = path.join(rootDir, 'demo')

const FAMILY_LESSON = {
  title: 'Family signs',
  files: ['en.vtt', 'am.vtt', 'ad.vtt', 'timeline.json', 'signs.json'],
  audio: 'audio-description.mp3'
}

const LESSONS = {
  'family-signs': FAMILY_LESSON,
  'greetings-numbers': FAMILY_LESSON
}

const app = express()
app.disable('x-powered-by')

app.use(function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self' data:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ].join('; '))
  next()
})

app.use(function logRequest(req, res, next) {
  res.on('finish', function () {
    // Path only. Query strings can carry certificate ids.
    const route = req.path.indexOf('/api/certificates/') === 0 ? '/api/certificates/:id' : req.path
    console.log(req.method + ' ' + route + ' ' + res.statusCode)
  })
  next()
})

function sendStatic(dir) {
  return express.static(dir, {
    index: false,
    setHeaders: function (res, filePath) {
      if (filePath.endsWith('.vtt')) {
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
      }
    }
  })
}

app.get('/', function (req, res) {
  res.redirect(302, '/demo/index.html')
})

app.get('/sw.js', function (req, res) {
  res.setHeader('Service-Worker-Allowed', '/')
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.sendFile(path.join(playerDir, 'sw.js'))
})

app.get('/player/sw.js', function (req, res) {
  res.setHeader('Service-Worker-Allowed', '/')
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.sendFile(path.join(playerDir, 'sw.js'))
})

app.use('/player', sendStatic(playerDir))
app.use('/demo', sendStatic(demoDir))

app.get('/api/signs', function (req, res) {
  res.type('json')
  res.sendFile(path.join(demoDir, 'signs.json'))
})

app.get('/api/transcript', function (req, res) {
  let enCues
  let amCues
  try {
    enCues = parseVtt(fs.readFileSync(path.join(demoDir, 'en.vtt'), 'utf8'))
    amCues = parseVtt(fs.readFileSync(path.join(demoDir, 'am.vtt'), 'utf8'))
  } catch (error) {
    return res.status(500).json({ error: 'The transcript could not be built.' })
  }
  res.type('html').send(transcriptDocument({
    title: 'Transcript: Family signs',
    lang: 'en',
    cues: enCues,
    amCues: amCues,
    styleHref: '/demo/site.css'
  }))
})

app.post('/api/transcript', express.text({ type: '*/*', limit: '512kb' }), function (req, res) {
  let vtt = req.body
  const type = String(req.headers['content-type'] || '')
  if (type.includes('application/json')) {
    try {
      const data = JSON.parse(req.body)
      vtt = data && data.vtt
    } catch (error) {
      return res.status(400).json({ error: 'Send valid JSON with a vtt string.' })
    }
  }
  if (typeof vtt !== 'string' || !vtt.trim()) {
    return res.status(400).json({ error: 'Send a WebVTT transcript in the body.' })
  }
  let cues
  try {
    cues = parseVtt(vtt)
  } catch (error) {
    return res.status(400).json({ error: 'That file is not WebVTT. It must start with WEBVTT.' })
  }
  const lang = /^[a-z]{2}$/.test(String(req.query.lang || '')) ? String(req.query.lang) : 'en'
  let title = 'Lesson transcript'
  if (typeof req.query.title === 'string') {
    const cleaned = req.query.title.replace(/[\r\n<>]/g, '').trim()
    if (cleaned && cleaned.length <= 120) title = cleaned
  }
  res.type('html').send(transcriptDocument({
    title: title,
    lang: lang,
    cues: cues,
    styleHref: '/demo/site.css'
  }))
})

app.get('/api/certificates/:id.jsonld', function (req, res) {
  const id = String(req.params.id || '')
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid certificate id.' })
  }
  let records
  try {
    records = JSON.parse(fs.readFileSync(path.join(demoDir, 'certificates.json'), 'utf8'))
  } catch (error) {
    return res.status(500).json({ error: 'The certificate file could not be read.' })
  }
  const record = records[id]
  if (!record) return res.status(404).json({ error: 'No certificate was found for this ID.' })
  res.json({
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    identifier: id,
    name: record.course,
    description: 'Demo credential only. This is not a signed Open Badges credential.',
    credentialCategory: 'certificate',
    dateCreated: record.date,
    recognizedBy: {
      '@type': 'Organization',
      name: 'Miliket demo'
    },
    about: {
      '@type': 'Person',
      name: record.name
    }
  })
})

app.get('/api/certificates/:id', function (req, res) {
  const id = String(req.params.id || '')
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid certificate id.' })
  }
  let records
  try {
    records = JSON.parse(fs.readFileSync(path.join(demoDir, 'certificates.json'), 'utf8'))
  } catch (error) {
    return res.status(500).json({ error: 'The certificate file could not be read.' })
  }
  const record = records[id]
  if (!record) return res.status(404).json({ error: 'No certificate was found for this ID.' })
  res.json({
    id: id,
    valid: record.valid === true,
    name: record.name,
    date: record.date,
    course: record.course
  })
})

app.get('/api/offline-pack', function (req, res) {
  const requested = req.query.lesson == null ? 'family-signs' : String(req.query.lesson)
  if (!/^[a-z0-9-]{1,64}$/.test(requested) || !LESSONS[requested]) {
    return res.status(400).json({ error: 'Unknown lesson.' })
  }
  const lesson = LESSONS[requested]
  let cues
  try {
    cues = parseVtt(fs.readFileSync(path.join(demoDir, 'en.vtt'), 'utf8'))
  } catch (error) {
    return res.status(500).json({ error: 'The transcript could not be built.' })
  }
  const html = transcriptDocument({
    title: lesson.title,
    lang: 'en',
    cues: cues,
    inlineCss: true
  })

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="' + requested + '-offline.zip"')

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('error', function () {
    if (!res.headersSent) res.status(500).json({ error: 'The pack could not be built.' })
    else res.end()
  })
  archive.pipe(res)
  archive.append(html, { name: 'transcript.html' })
  lesson.files.forEach(function (name) {
    const filePath = path.join(demoDir, name)
    if (fs.existsSync(filePath)) archive.file(filePath, { name: name })
  })
  const audioPath = path.join(demoDir, lesson.audio)
  if (fs.existsSync(audioPath)) archive.file(audioPath, { name: lesson.audio })
  archive.finalize()
})

app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Not found' })
})

app.use(function (err, req, res, next) {
  if (res.headersSent) return next(err)
  const status = err.status || err.statusCode || 500
  if (status === 413) return res.status(413).json({ error: 'That upload is too large.' })
  res.status(500).json({ error: 'Something went wrong.' })
})

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000
  app.listen(port, function () {
    console.log('Sign Window listening on ' + port)
  })
}

module.exports = { app }
