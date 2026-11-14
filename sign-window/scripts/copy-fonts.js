/**
 * Copies Noto Sans Ethiopic woff2 files out of the npm package into player/fonts.
 * Run: npm run copy-fonts
 */
const fs = require('fs')
const path = require('path')

const sourceDir = path.join(__dirname, '..', 'node_modules', '@fontsource', 'noto-sans-ethiopic', 'files')
const destDir = path.join(__dirname, '..', 'player', 'fonts')
const packageRoot = path.join(__dirname, '..', 'node_modules', '@fontsource', 'noto-sans-ethiopic')

if (!fs.existsSync(sourceDir)) {
  console.error('Install @fontsource/noto-sans-ethiopic first (npm install).')
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })
const files = fs.readdirSync(sourceDir).filter(function (name) {
  return name.endsWith('.woff2') && name.includes('400-normal') && name.includes('ethiopic')
})

if (!files.length) {
  console.error('No Ethiopic woff2 files found in the font package.')
  process.exit(1)
}

files.forEach(function (name) {
  fs.copyFileSync(path.join(sourceDir, name), path.join(destDir, name))
  console.log('copied ' + name)
})

const licenseNames = ['LICENSE', 'OFL.txt', 'LICENSE.txt']
licenseNames.forEach(function (name) {
  const from = path.join(packageRoot, name)
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, path.join(destDir, name))
    console.log('copied ' + name)
  }
})
