# Sign Window

Sign Window is an embeddable lesson player for Ethiopian Sign Language. A host page adds one script tag. The player is vanilla JavaScript and CSS. It does not use a CDN, a tracking script, or a runtime framework.

The demo lesson is Family signs, filmed with Deaf youth at Yekatit 23 School in Bahir Dar. `demo/lesson.mp4` is that film (about 1 minute 39 seconds, 640×360). It is not a placeholder.

## Install in 1 hour

You need Node.js 20 or newer.

```bash
cd sign-window
npm install
npm start
```

Open http://localhost:3000/demo/index.html .

If `demo/signs/f1.mp4` is missing, the sign window still shows the English and Amharic names and the words "Clip not available offline". To fetch the nine clips this lesson uses:

```bash
node scripts/download-videos.js f1 f5 f2 f6 f3 f4 f12 f15 f17
```

Then compress them to 240 pixels tall. From Git Bash or another shell that has `sh`:

```bash
sh scripts/compress-videos.sh
```

On this Windows machine `sh` was not on the PATH. The same ffmpeg command from that script was run directly: `scale=-2:240`, `libx264`, `crf 30`, `aac` at 64k, `+faststart`. After that, `ffprobe` reported `demo/signs/f1.mp4` as 426×240.

`npm test` and `npm run a11y` are below. `npm start` only needs the dependencies in `dependencies` (`express` and `archiver`). Playwright and the font package are dev dependencies.

## Embed

```html
<script src="/player/signwindow.js"></script>
<sign-window
  video="lesson.mp4"
  captions-en="en.vtt"
  captions-am="am.vtt"
  descriptions="ad.vtt"
  timeline="timeline.json"
  signs="signs.json"></sign-window>
```

Paths are resolved from the page that contains the tag. On this demo they live in `demo/`.

Add `sign-fallback="lesson"` only if a missing dictionary clip should copy the lesson video into the sign window. The default is not to do that. A missing clip shows the English name, the Amharic name, and "Clip not available offline".

### Attributes

| Attribute | Required | Meaning |
| --- | --- | --- |
| `video` | yes | Lesson video URL |
| `captions-en` | no | English WebVTT captions |
| `captions-am` | no | Amharic WebVTT captions |
| `descriptions` | no | Audio-description WebVTT. A cue may include a line `AUDIO:file.mp3` |
| `timeline` | no | JSON cues `{ "start", "end", "signId" }` in seconds |
| `signs` | no | JSON dictionary. `video` paths are relative to this file |
| `sign-fallback` | no | Set to `lesson` to replay the lesson video when a clip file is missing. Any other value, including omitting it, shows the names and "Clip not available offline" |

## How the player behaves

- On a screen at least 640 CSS pixels wide, the sign window floats on the lesson, starts at size Small in the top-right, and can be dragged. Open **Sign window** for Move, Min, S, M, and L, and Reset. Arrow keys move it when Move is focused. Shift plus an arrow moves 50 pixels.
- Below 640 CSS pixels the sign window sits under the lesson as a thumbnail. It does not cover the picture, the captions, or the control bar. Keyboard move does not pull it back on top of the video.
- Captions default to a semi-transparent background (80% strength). The settings slider can go from 55% to 100%. There are five text sizes and three colour themes: white on black, yellow on black, and black on white.
- The visible line in the sign window is "Key sign from the MiliketApp dictionary".
- Keyboard shortcuts are in one disclosure under the player, titled "Keyboard shortcuts".

## Try it in the Savanna starter

The Savanna starter was not in this folder. When your mentor sends it:

1. Copy `player/` onto a path the starter already serves as static files.
2. Put the lesson media next to the page, or point the attributes at URLs the starter can load from this same origin. The player does not load third-party scripts.
3. Add the embed above to a lesson page in the starter.
4. Leave `sign-fallback` off unless you specifically want the lesson film copied into the sign window.
5. Open that page, play the lesson, switch captions, and move the sign window with the keyboard.

## Keyboard

Shortcuts run only while focus is inside the player.

| Key | Action |
| --- | --- |
| Space or K | Play or pause |
| Left / Right | Seek 5 seconds |
| M | Mute |
| C | Cycle captions: both, English, Amharic, off |
| F | Full screen |
| Escape | Close settings, or close the sign-window tools when focus is inside them |
| Arrow keys on Move | Move the sign window 10px (Shift: 50px) on a wide screen |

Back 10 seconds and Forward 10 seconds are buttons. S, M, L, and Reset are buttons inside **Sign window**.

## API

Details are in `docs/openapi.yaml`.

- `GET /api/signs` returns the dictionary.
- `GET /api/transcript` returns the Family signs transcript as HTML, with English and Amharic in a table. Amharic cells are empty when `demo/am.vtt` has no cue at that time.
- `POST /api/transcript` accepts WebVTT (`text/vtt`, `text/plain`, or JSON `{ "vtt" }`, max 512 KB) and returns an HTML transcript. `?lang=en` or `?lang=am`. `?title=` is optional and limited to 120 characters.
- `GET /api/offline-pack?lesson=family-signs` returns a zip. `greetings-numbers` is still accepted as an alias for the same files. Any other lesson id is rejected. The lesson page button points at `demo/family-signs-offline.zip`, which is that same pack saved in the repo, so the download works on GitHub Pages.
- `GET /api/certificates/:id` returns the demo certificate JSON.
- `GET /api/certificates/:id.jsonld` returns schema.org `EducationalOccupationalCredential` JSON-LD for that demo record. It is not a signed Open Badges 3.0 credential.

There is no `/api/transcript.pdf`. Use **Print or save as PDF** on the transcript page. The browser's print dialog can save a PDF. This project does not generate a tagged PDF file.

The server does not call other websites and does not log request bodies or query strings. Certificate paths are logged as `/api/certificates/:id`.

## Ethiopian calendar

The job deadline 30 November 2026 and the certificate dates are also formatted with `Intl.DateTimeFormat` and the `ethiopic` calendar (`am-ET` for Amharic, `en-GB` for the English fallback). On this machine, 30 November 2026 formatted as `21 ኅዳር 2019 AM` and `21 Hedar 2019 AM`.

## Docker

`Dockerfile` has a `HEALTHCHECK` that requests `/demo/index.html`. `docker-compose.yml` sets `restart: unless-stopped`. `.dockerignore` excludes `*.md`, tests, and `node_modules`. It does not exclude `server/`, `player/`, or `demo/`.

`docker compose up --build` was run on Windows with Docker Desktop on 15 November 2026 and served http://localhost:3000.

```bash
docker compose up --build
```

`render.yaml` at the repository root is a Render Docker web service. The Dockerfile context is `sign-window/`. Render should use the `PORT` it injects. The health check path is `/demo/index.html`.

## Tests run on 15 November 2026

From `sign-window/`, in installed Google Chrome (Playwright channel `chrome`):

- `npm test` — 13 passed, 0 failed. That covers the VTT parser, the lesson VTT files (dotted milliseconds, no overlapping cues), transcript escaping, timeline boundaries, the Ethiopian calendar conversion, and the API routes including `GET /api/transcript` and the schema.org credential.
- `npm run a11y` — 12 passed, 0 failed. axe-core reported no critical or serious violations on the lesson, job card, and certificate page. Further checks, all in this same run:
  - lesson layout at 320, 375, 640, and 1280 CSS pixels, with screenshots under `test-results/` (that folder is gitignored)
  - at 320 and 375 the sign window's box starts at or below the lesson video and does not intersect the control bar
  - job, certificate, and transcript pages at 320 pixels have no horizontal overflow
  - Gold page theme with yellow-on-black captions at the largest caption size, then Dark page theme with white-on-black captions, both with no serious axe violations
  - WCAG 1.4.12 spacing (`demo/text-spacing.css`) on the lesson at 375 pixels, no horizontal overflow, axe still clean
  - `documentElement` zoom 2 at a 640 pixel viewport, no horizontal overflow
  - visible links, buttons, inputs, selects, and the keyboard-shortcuts summary on the lesson at 375 pixels are at least 24px in both directions
  - Move plus ArrowDown, then Shift+ArrowDown (50 pixels), S, M, L, Reset, and Min
  - Tab enters the player and later leaves it
  - a blocked dictionary clip does not copy the lesson into the sign window

## Honest limitations

- Dictionary clips are one sign at a time. They are not a translation of a full sentence.
- The nine Family signs clips used by `demo/timeline.json` were downloaded from the Drive ids in `demo/signs.json` and compressed to 240p in this session. Other dictionary ids are still not on disk. `.gitignore` no longer ignores `demo/signs/*.mp4`, so those nine files can be committed. Confirm you have permission before publishing the sign videos or `demo/lesson.mp4`.
- Amharic captions are a draft. They copy the `am` field from `demo/signs.json` and nothing else. A fluent speaker has not reviewed them. The list is `docs/amharic-review.md`.
- Amharic speech uses the device voice, if the device has one. This project does not ship a speech engine.
- The offline service worker caches the player, fonts, the lesson film, and the nine sign clips above. It does not cache every file a host might add later.
- No testing with Deaf or blind learners has been done. NVDA and TalkBack have not been run.
- Browser zoom at 200% and 400% in a normal browser window, used by a person, was not done. The Playwright zoom check above is not that test.
- The print flow is HTML plus the browser print dialog. It is not a tagged PDF.
- The certificate JSON-LD is demo data. It is not a signed Open Badges credential.
- `scripts/generate-signs.js` still expects the old Flutter `app_data.dart` file. Do not run it. `demo/signs.json` is already generated. The Dizzy entry (`e9`) still has the stored string `머리 ያወዛል`. It was not corrected.

## Credits

- Sign names and Drive ids came from the MiliketApp data that was used to build `demo/signs.json`. Confirm permission before you share the videos.
- Noto Sans Ethiopic: SIL Open Font License. See `player/fonts/LICENSE`.
- Server: Node.js, Express, archiver.
- Tests: Node's test runner, Playwright, axe-core.

## Team

Bezawit Megersa, Masresha Alemu, Samuel Mesfin.

No testing with Deaf or blind learners has been done.
