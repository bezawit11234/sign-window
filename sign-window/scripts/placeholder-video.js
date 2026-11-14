/**
 * Builds demo/lesson.mp4: a 48 second placeholder with a label and a tone.
 * Replace this file with a real lesson before the co-designer session.
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const dest = path.join(__dirname, '..', 'demo', 'lesson.mp4')
fs.mkdirSync(path.dirname(dest), { recursive: true })

const draw = 'drawtext=fontfile=C\\\\:/Windows/Fonts/arial.ttf:text=PLACEHOLDER:fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2'
const args = [
  '-y',
  '-f', 'lavfi', '-i', 'color=c=0x12352f:s=640x360:r=15:d=48',
  '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=48',
  '-vf', draw,
  '-shortest',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '30',
  '-c:a', 'aac',
  '-b:a', '64k',
  '-movflags', '+faststart',
  dest
]

const result = spawnSync('ffmpeg', args, { stdio: 'inherit', shell: false })
if (result.status !== 0) {
  console.error('ffmpeg failed. Refresh the terminal PATH, or pass the full path to ffmpeg.')
  process.exit(result.status || 1)
}
console.log('Wrote ' + dest)
