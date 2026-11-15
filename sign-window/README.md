# Sign Window

Track 2: Accessible learning media. Digital Bridge Accessibility Hackathon 2026.

Team: Bezawit Megersa, Masresha Alemu, Samuel Mesfin.

Sign Window is an open plug-in, not a special app. A host page adds one script tag and one `<sign-window>` element. The player is vanilla JavaScript and CSS. It does not use a framework, a CDN, a login, or a tracking script.

It is an embeddable accessible video player, plus a transcript and an offline pack. It is for Deaf learners, hard of hearing learners, blind learners, and learners on a slow connection. The same demo includes a Career Gateway: an accessible job card with an Amharic audio summary, and a certificate page that checks an id.

The Amharic captions and the dictionary names were reviewed by a fluent Amharic speaker. See [sign-window/docs/amharic-review.md](sign-window/docs/amharic-review.md).

Live lesson: https://sign-window.onrender.com/demo/index.html

The free Render server may take up to a minute to wake up after it has been idle. A GitHub Pages copy cannot run the API.

## Features

- English and Amharic captions. Five text sizes. Three colour themes: white on black, yellow on black, and black on white. The caption background can be made stronger or lighter.
- An Ethiopian Sign Language window. On a wide screen it floats, and it can be dragged, resized, and moved with the keyboard. On a narrow screen it sits under the lesson so it does not cover the picture.
- Audio description. Turn it on and a voice describes what is on screen. The same words appear under the video. The demo uses recorded Amharic audio.
- A written transcript. Choose a line to jump to that moment.
- An offline pack and a service worker that caches the player, the font, the lesson, and the sign clips after the first visit.
- Ethiopian calendar dates on the job deadline and on certificate dates.
- Noto Sans Ethiopic, hosted in `sign-window/player/fonts/`. The page does not fetch a font from the internet.
- No account. No tracking.

## Quick start

You need Node.js 20 or newer. From a new checkout:

```bash
git clone https://github.com/bezawit11234/sign-window.git
cd sign-window/sign-window
npm install
npm start
```

Open http://localhost:3000/demo/index.html .

`npm start` only needs `express` and `archiver`. Playwright and the font package are dev dependencies.

### Level 1: embed the player

Paths are resolved from the page that contains the tag. In this demo the files live in `sign-window/demo/`.

```html
<script src="/player/signwindow.js"></script>
<sign-window
  video="lesson.mp4"
  captions-en="en.vtt"
  captions-am="am.vtt"
  descriptions="ad.vtt"
  timeline="timeline.json"
  signs="signs.json"
  offline-pack="/api/offline-pack"></sign-window>
```

`offline-pack` is optional. If you leave it out, **Download for offline** points at `family-signs-offline.zip` next to the page.

Add `sign-fallback="lesson"` only when a missing dictionary clip should copy the lesson video into the sign window. Leave it off otherwise. A missing clip shows the English name, the Amharic name, and the words "Clip not available offline".

| Attribute | Required | Meaning |
| --- | --- | --- |
| `video` | yes | Lesson video URL |
| `captions-en` | no | English WebVTT captions |
| `captions-am` | no | Amharic WebVTT captions |
| `descriptions` | no | Audio-description WebVTT. A cue may include a line `AUDIO:file.mp3` |
| `timeline` | no | JSON cues `{ "start", "end", "signId" }` in seconds |
| `signs` | no | JSON dictionary. Each `video` path is relative to this file |
| `sign-fallback` | no | Set to `lesson` to replay the lesson when a clip file is missing. Any other value, including leaving it out, shows the names and "Clip not available offline" |
| `offline-pack` | no | URL for the **Download for offline** link. If omitted, the link is `family-signs-offline.zip` |

Keyboard shortcuts work while focus is inside the player. Space or K plays or pauses. Left and Right seek 5 seconds. M mutes. C cycles captions (both, English, Amharic, off). F is full screen. Open **Sign window**, focus **Move**, then use the arrow keys. Shift plus an arrow moves 50 pixels. This keyboard move works on a wide screen. Below 640 CSS pixels the window stays under the video.

The player was also tested on a mock host page: a separate plain HTML page that added the player with only the script tag.

### Level 2: REST API

The contract is [sign-window/docs/openapi.yaml](sign-window/docs/openapi.yaml). The server does not call other websites. It does not log request bodies or query strings.

Base URL when you run it locally: `http://localhost:3000`

| Method and path | What it does |
| --- | --- |
| `GET /api/signs` | The dictionary as JSON |
| `GET /api/transcript` | The Family signs transcript as HTML, English and Amharic |
| `POST /api/transcript` | Turns WebVTT into an HTML transcript. Send `text/vtt`, `text/plain`, or JSON `{ "vtt" }`. Maximum 512 KB. `?lang=en` or `?lang=am`. `?title=` is optional and limited to 120 characters |
| `GET /api/offline-pack?lesson=family-signs` | A zip of the transcript and caption files. `greetings-numbers` is an alias for the same files. Any other lesson id is rejected |
| `GET /api/certificates/:id` | The demo certificate as JSON |
| `GET /api/certificates/:id.jsonld` | The same demo record as schema.org `EducationalOccupationalCredential` JSON-LD. It is not a signed Open Badges credential |

There is no PDF endpoint. The transcript page has **Print or save as PDF**, which opens the browser print dialog.

## Run it

Docker, from `sign-window/`:

```bash
docker compose up --build
```

Then open http://localhost:3000 . The lesson is http://localhost:3000/demo/index.html .

`docker compose up --build` was run on Windows with Docker Desktop on 15 November 2026 and served that page.

Without Docker, from `sign-window/`:

```bash
npm install
npm start
```

The same URLs work. The port is `PORT` if you set it, otherwise 3000.

## Deployment

`render.yaml` in this repository root is a Render Docker web service. The Docker context is `sign-window/`. The health check path is `/demo/index.html`.

Live lesson: https://sign-window.onrender.com/demo/index.html

The free Render server may take up to a minute to wake up after it has been idle.

A GitHub Pages copy cannot run the API.

## Tests run on 15 November 2026

From `sign-window/`. Recorded in [sign-window/docs/conformance-report.md](sign-window/docs/conformance-report.md) and [sign-window/docs/test-log.md](sign-window/docs/test-log.md).

- `npm test`: 13 passed, 0 failed.
- `npm run a11y`: 12 passed, 0 failed. axe-core reported no serious or critical issues.

Manual tests by the team, all passed:

- Keyboard-only use
- NVDA on Windows
- TalkBack on Android. It read the captions and the buttons correctly
- Browser zoom at 200% and 400%, done by a person
- Sound off, captions only
- Audio description on and off
- Phone with touch
- A mock host page: a separate plain HTML page that added the player with only the script tag

Tools: Chrome, NVDA on Windows, and TalkBack on Android.

## Honest limitations

- No co-designer or Deaf/blind learner testing was done. The team worked from home because of the venue power cut. It is the next step.
- The module is not installed in the official Savanna starter, because the team did not get it. It was tested on a mock host page instead.
- Sign clips are single words and phrases, not sentence translation.
- Confirm permission before sharing the videos.

## Project structure

```
README.md                 this file
render.yaml               Render Docker service
sign-window/
  player/                 the embeddable player, font, and service worker
  server/                 Express API
  demo/                   Family signs lesson, captions, job card, certificate page
  docs/                   OpenAPI, conformance report, test log, Amharic review
  test/                   unit tests
  e2e/                    Playwright and axe-core tests
  Dockerfile
  docker-compose.yml
  package.json
  LICENSE                 MIT
```

## Licence

[MIT](sign-window/LICENSE). Copyright (c) 2026 Sign Window contributors.

Noto Sans Ethiopic is under the SIL Open Font License. See `sign-window/player/fonts/LICENSE`.

## Credits

Bezawit Megersa, Masresha Alemu, Samuel Mesfin.

Server: Node.js, Express, and archiver. Tests: Node's test runner, Playwright, and axe-core.
