# Sign Window

Sign Window is an embeddable lesson player for Ethiopian Sign Language. A training site adds one script tag and gets a captioned video, a movable sign window, and a text transcript. It is a plugin, not a replacement for the MiliketApp.

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

## Quick start

You need Node.js 20 or newer.

```bash
cd sign-window
npm install
npm start
```

Open http://localhost:3000 . The lesson is at http://localhost:3000/demo/index.html .

With Docker, from this folder:

```bash
docker compose up --build
```

That serves the same site on port 3000. Docker Desktop was installed here but the engine was not running, so this command was not executed in this session.

## Player attributes

| Attribute | Required | Meaning |
| --- | --- | --- |
| `video` | yes | Lesson video URL |
| `captions-en` | no | English WebVTT captions |
| `captions-am` | no | Amharic WebVTT captions |
| `descriptions` | no | Audio-description WebVTT. A cue may include a line `AUDIO:file.mp3` |
| `timeline` | no | JSON cues `{ "start", "end", "signId" }` in seconds |
| `signs` | no | JSON dictionary. `video` paths are relative to this file |

`GET /api/offline-pack` is the "Download for offline" link. It zips a transcript, the caption files, and `demo/audio-description.mp3` if that file exists.

## Keyboard

Shortcuts run only while focus is inside the player.

| Key | Action |
| --- | --- |
| Space or K | Play or pause |
| Left / Right | Seek 5 seconds |
| M | Mute |
| C | Cycle captions: English, Amharic, off |
| F | Full screen |
| Escape | Close settings |
| Arrow keys on Move | Move the sign window 10px (Shift: 50px) |
| Arrow keys on Resize | Resize the sign window |

Back 10 seconds and Forward 10 seconds are buttons. Small, Medium, Large, and Reset position do not need a pointer.

## API

Details are in `docs/openapi.yaml`.

- `GET /api/signs` returns the dictionary.
- `POST /api/transcript` accepts WebVTT (`text/vtt`, `text/plain`, or JSON `{ "vtt" }`, max 512 KB) and returns an HTML transcript. `?lang=en` or `?lang=am`. `?title=` is optional and limited to 120 characters.
- `GET /api/offline-pack?lesson=greetings-numbers` returns a zip. Any other lesson id is rejected.

The server does not call other websites and does not log request bodies or query strings.

## Accessibility

- Real buttons, links, and inputs in the page, not a canvas.
- Captions are drawn by the player. The WebVTT tracks stay on the video in hidden mode.
- Caption size has five steps. Colours are white on black, yellow on black, or black on white. Background strength stops at 55% so the text stays on a dark player surface.
- Settings are stored in `localStorage` inside try/catch.
- Amharic text uses `lang="am"` and the local Noto Sans Ethiopic files.
- The sign window can be dragged or moved with the keyboard.
- "Announce signs" is off by default.
- "Audio description" puts each description in a polite live region and plays a cue audio file when one is listed.
- A service worker caches the player, fonts, and demo lesson after the first visit.
- `prefers-reduced-motion` turns off animation.

## How this was tested

On 14 November 2026, in Chrome, from this folder:

- `npm test` — 9 passed (VTT parser, transcript escaping, timeline boundaries, and the three API routes).
- `npm run a11y` — 4 passed. axe-core reported no critical or serious violations on `/demo/index.html`, `/demo/job.html`, and `/demo/verify.html?id=ETH-2026-001`. A second test tabbed through the player and reached a control outside it. Focused player controls had a visible outline. The K key did not start the video while focus was on a link outside the player. ArrowDown moved the sign window.
- A 320px-wide viewport on the lesson, job card, certificate page, and transcript did not create a horizontal scrollbar.
- Setting the lesson video to 1 second showed the caption `Hello.` The sign window showed the English and Amharic names for that cue.
- `ETH-2026-001` showed: Valid. Hana Bekele earned it on 1 November 2026.

Not done: NVDA, TalkBack, browser zoom at 200% or 400%, a Deaf co-designer session, or a fluent Amharic review. See `docs/conformance-report.md`.

## Honest limitations

- Sign clips are the MiliketApp dictionary: one sign at a time, not a translation of a full sentence.
- Those clips are Google Drive files. A download attempt timed out. Until you run the download script, the window shows the English and Amharic names and says the clip is not on the device.
- `demo/lesson.mp4` is a 48-second placeholder with the word PLACEHOLDER and a tone. Replace it.
- Amharic captions are the dictionary headwords copied from the app. They are marked as a draft. The app's "Dizzy" string is stored as `머리 ያወዛል` (Hangul plus Ethiopic). It was copied unchanged and needs a human correction.
- Amharic speech uses the device voice, if the device has one. This project does not ship a speech engine.
- The demo is one lesson: greetings and numbers.
- The job card plays `demo/job-summary.mp3` only when that file is present. The same summary is always on the page as text.
- Offline cache covers this demo's files, not every lesson a host might add later.

## Credits

- Sign names and Drive ids: MiliketApp `lib/data/app_data.dart`. Confirm you have permission before publishing the videos.
- Noto Sans Ethiopic: Google Fonts, SIL Open Font License. See `player/fonts/LICENSE`.
- Server: Node.js, Express, archiver.
- Tests: Node's test runner, Playwright, axe-core.

## Co-design

TODO (you must fill this in before the panel scores the module):

- [ ] Deaf co-designer name and how they want to be credited
- [ ] Date and place of the unaided session
- [ ] The task they were asked to complete
- [ ] What they finished without help
- [ ] What blocked them
- [ ] What you changed afterwards

Write the session up in `docs/cocreation-notes.md`. Use `docs/test-log.md` for NVDA, TalkBack, and zoom notes.
