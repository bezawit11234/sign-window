const test = require('node:test')
const assert = require('node:assert/strict')
const { activeAt } = require('../player/media')

const entries = [
  { start: 0, end: 6, signId: 'g1' },
  { start: 6, end: 12, signId: 'g3' }
]

test('returns the cue that contains the time', function () {
  assert.equal(activeAt(entries, 0).signId, 'g1')
  assert.equal(activeAt(entries, 5.9).signId, 'g1')
  assert.equal(activeAt(entries, 6).signId, 'g3')
})

test('returns null when nothing is active', function () {
  assert.equal(activeAt(entries, 12), null)
  assert.equal(activeAt(entries, -1), null)
  assert.equal(activeAt(null, 1), null)
})

test('ignores broken rows and keeps the first match', function () {
  const rows = [{ start: 'x', end: 4 }, { start: 1, end: 4, signId: 'a' }, { start: 1, end: 4, signId: 'b' }]
  assert.equal(activeAt(rows, 2).signId, 'a')
})
