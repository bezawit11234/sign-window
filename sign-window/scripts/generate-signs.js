const fs = require('fs')
const path = require('path')

const dartPath = path.join(__dirname, '..', '..', 'lib', 'data', 'app_data.dart')
const outPath = path.join(__dirname, '..', 'demo', 'signs.json')

const text = fs.readFileSync(dartPath, 'utf8')
const re = /LessonItem\(\s*id:\s*'([^']+)',\s*categoryId:\s*'([^']+)',\s*sign:\s*'((?:\\'|[^'])*)',\s*signAm:\s*'((?:\\'|[^'])*)',[\s\S]*?videoUrl:\s*'([^']*)'/g
const signs = []
let match
while ((match = re.exec(text))) {
  const videoUrl = match[5]
  const driveId = videoUrl.startsWith('drive:') ? videoUrl.slice('drive:'.length) : videoUrl
  signs.push({
    id: match[1],
    en: match[3].replace(/\\'/g, "'"),
    am: match[4].replace(/\\'/g, "'"),
    category: match[2],
    video: 'signs/' + match[1] + '.mp4',
    driveId: driveId
  })
}

if (signs.length < 1) {
  console.error('No lessons found in app_data.dart')
  process.exit(1)
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(signs, null, 2) + '\n', 'utf8')
console.log('Wrote ' + signs.length + ' signs to ' + outPath)
