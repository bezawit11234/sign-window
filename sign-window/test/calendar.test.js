const test = require('node:test')
const assert = require('node:assert/strict')
const { ethiopianDate } = require('../player/media')

test('converts 30 November 2026 with the Ethiopian calendar', function () {
  const result = ethiopianDate('2026-11-30')
  const date = new Date('2026-11-30T12:00:00Z')
  const am = new Intl.DateTimeFormat('am-ET-u-ca-ethiopic', {
    dateStyle: 'long',
    timeZone: 'UTC'
  }).format(date)
  const en = new Intl.DateTimeFormat('en-GB-u-ca-ethiopic', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)
  assert.equal(result.am, am)
  assert.equal(result.en, en)
  assert.match(result.am, /ኅዳር/)
  assert.match(result.am, /2019/)
  assert.match(result.en, /Hedar/)
})

test('converts the sample certificate date', function () {
  const result = ethiopianDate('2026-11-01')
  assert.match(result.am, /ጥቅምት/)
  assert.match(result.en, /2019/)
})

test('returns null for a date that is not ISO', function () {
  assert.equal(ethiopianDate('30 November 2026'), null)
})
