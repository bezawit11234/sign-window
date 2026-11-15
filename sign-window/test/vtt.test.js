const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parseVtt, parseTimestamp } = require('../player/media')

test('parses hour and minute timestamps', function () {
  assert.equal(parseTimestamp('00:00:01.000'), 1)
  assert.equal(parseTimestamp('00:01.500'), 1.5)
  assert.equal(parseTimestamp('01:02:03.250'), 3723.25)
})

test('parses cues and skips notes', function () {
  const cues = parseVtt([
    'WEBVTT',
    '',
    'NOTE keep this out of the cues',
    '',
    '00:00:01.000 --> 00:00:04.000',
    'Hello & welcome',
    '',
    '00:01.500 --> 00:02.000',
    'Second line',
    'continues',
    'AUDIO:clip.mp3'
  ].join('\n'))
  assert.equal(cues.length, 2)
  assert.equal(cues[0].text, 'Hello & welcome')
  assert.equal(cues[1].text, 'Second line\ncontinues')
  assert.equal(cues[1].audio, 'clip.mp3')
  assert.equal(cues[1].start, 1.5)
})

test('rejects files that are not WebVTT', function () {
  assert.throws(function () { parseVtt('not captions') }, /WEBVTT/)
})

test('lesson caption files use dotted timestamps and do not overlap', function () {
  ;['en.vtt', 'am.vtt', 'ad.vtt'].forEach(function (name) {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'demo', name), 'utf8')
    assert.match(raw, /^WEBVTT/)
    assert.equal(/\d{2}:\d{2}:\d{2},\d{3}/.test(raw), false)
    const times = raw.match(/\d{2}:\d{2}:\d{2}\.\d{3}/g) || []
    assert.ok(times.length >= 2, name + ' has timestamps')
    const cues = parseVtt(raw)
    cues.forEach(function (cue, index) {
      assert.ok(cue.end > cue.start, name + ' cue ' + index)
      if (index > 0) assert.ok(cue.start >= cues[index - 1].end, name + ' overlaps at ' + index)
    })
  })
})
