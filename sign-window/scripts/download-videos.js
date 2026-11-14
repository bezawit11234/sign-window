/**
 * Downloads MiliketApp sign clips from the Google Drive ids in demo/signs.json.
 * Saves them to demo/signs/{id}.mp4. Skips files that are already there.
 *
 * Google Drive often shows a confirmation page. This script follows that once.
 * If a file still comes back as HTML, it is skipped and listed at the end.
 *
 * Usage: node scripts/download-videos.js
 */
const fs = require('fs')
const path = require('path')
const https = require('https')

const signsPath = path.join(__dirname, '..', 'demo', 'signs.json')
const destDir = path.join(__dirname, '..', 'demo', 'signs')

function get(url, redirects) {
  return new Promise(function (resolve, reject) {
    const request = https.get(url, {
      headers: { 'User-Agent': 'sign-window-downloader' }
    }, function (response) {
      const status = response.statusCode || 0
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume()
        if (redirects > 5) return reject(new Error('Too many redirects'))
        const next = new URL(response.headers.location, url).href
        return resolve(get(next, redirects + 1))
      }
      const chunks = []
      response.on('data', function (chunk) { chunks.push(chunk) })
      response.on('end', function () {
        resolve({
          status: status,
          type: String(response.headers['content-type'] || ''),
          body: Buffer.concat(chunks)
        })
      })
    })
    request.setTimeout(45000, function () { request.destroy(new Error('Timed out')) })
    request.on('error', reject)
  })
}

function looksLikeHtml(buffer, type) {
  if (type.includes('text/html')) return true
  const start = buffer.slice(0, 20).toString('utf8').trim().toLowerCase()
  return start.startsWith('<!doctype') || start.startsWith('<html')
}

async function downloadOne(sign) {
  const dest = path.join(destDir, sign.id + '.mp4')
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    return 'skip'
  }
  const firstUrl = 'https://drive.usercontent.google.com/download?id=' + encodeURIComponent(sign.driveId) + '&export=download&confirm=t'
  let result = await get(firstUrl, 0)
  if (looksLikeHtml(result.body, result.type)) {
    const html = result.body.toString('utf8')
    const confirm = /confirm=([0-9A-Za-z_-]+)/.exec(html)
    if (!confirm) return 'html'
    const second = firstUrl + '&confirm=' + confirm[1]
    result = await get(second, 0)
  }
  if (result.status !== 200 || looksLikeHtml(result.body, result.type) || result.body.length < 1000) {
    return 'html'
  }
  fs.writeFileSync(dest, result.body)
  return 'ok'
}

async function main() {
  const wanted = process.argv.slice(2)
  let signs = JSON.parse(fs.readFileSync(signsPath, 'utf8'))
  if (wanted.length) {
    const allow = new Set(wanted)
    signs = signs.filter(function (sign) { return allow.has(sign.id) })
  }
  fs.mkdirSync(destDir, { recursive: true })
  const failed = []
  for (const sign of signs) {
    if (!sign.driveId) {
      failed.push(sign.id + ' (no drive id)')
      continue
    }
    try {
      const status = await downloadOne(sign)
      console.log(status + ' ' + sign.id)
      if (status === 'html') failed.push(sign.id)
    } catch (error) {
      console.log('error ' + sign.id + ' ' + error.message)
      failed.push(sign.id)
    }
  }
  if (failed.length) {
    console.log('Could not download: ' + failed.join(', '))
    process.exitCode = 1
  }
}

main()
