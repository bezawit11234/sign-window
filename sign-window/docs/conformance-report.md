# WCAG 2.2 AA conformance

Product: Sign Window demo (`sign-window/`)
Date: 15 November 2026
Scope: `demo/index.html`, `demo/job.html`, `demo/verify.html`, `demo/transcript.html`, and the player those pages embed.

Status values:

- **Pass** — the team did this by hand on 15 November 2026.
- **Supports** — an automated check in this session passed, and the notes say exactly what was checked.
- **TO TEST** — a person still has to try it. Notes can record a partial automated result. They are not a pass.

| Criterion | Status | How tested | Notes |
| --- | --- | --- | --- |
| 1.1.1 Non-text content | TO TEST | axe-core on the lesson, job, and certificate pages reported no serious or critical violations | The sign video is `aria-hidden` and the names are text. TalkBack read the captions and the buttons. Non-text content was not a separate check. The transcript says it has no images. |
| 1.2.2 Captions (prerecorded) | Pass | 15 November 2026, Chrome, sound off, captions only | The team used the lesson with sound off. Amharic captions and dictionary names were reviewed by a fluent Amharic speaker. See `docs/amharic-review.md`. |
| 1.2.5 Audio description | Pass | 15 November 2026, Chrome. Audio description turned on and off | The team passed both states. |
| 1.2.6 Sign language (prerecorded) | TO TEST | Playwright blocked `signs/*.mp4` and the window showed "Clip not available offline" with the name Mother, and the sign video had no `src` | This is a bonus criterion. Clips are single dictionary signs, not a continuous interpretation. The nine timeline files were downloaded and `f1.mp4` measured 426×240, but a person has not checked that each clip matches its word. |
| 1.4.1 Use of colour | TO TEST | Not a separate check | Play, mute, and full screen change their text as well as `aria-pressed`. A person should confirm that. |
| 1.4.3 Contrast (minimum) | Supports | axe-core `color-contrast` is included in the serious rules. Zero serious or critical violations on the lesson, job, and certificate pages. The lesson was checked again after Gold theme plus yellow-on-black captions at text size 5, then Dark theme plus white-on-black captions | Default caption background strength is 80% and the slider stops at 55%. Not every theme combination was opened. |
| 1.4.4 Resize text | Pass | 15 November 2026, Chrome. A person used browser zoom at 200% and at 400% | Both passed. |
| 1.4.10 Reflow | Pass | 15 November 2026, Chrome. A person used browser zoom at 400%. Automated check: at 320 CSS pixels, `scrollWidth` was within 1 pixel of `clientWidth` on the lesson, job card, certificate page, and transcript | The person check passed. |
| 1.4.11 Non-text contrast | TO TEST | Not measured with a contrast picker | Focus outline is `#ffe14a`. A person should check the 3:1 ratio on every control. |
| 1.4.12 Text spacing | Supports | On the lesson at 375px, `demo/text-spacing.css` set line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, and paragraph spacing 2em. No horizontal overflow. axe-core then reported no serious or critical violations | Job, certificate, and transcript pages were not given this override. |
| 2.1.1 Keyboard | Pass | 15 November 2026, Chrome, keyboard-only use | The team passed keyboard-only use. |
| 2.1.2 No keyboard trap | Supports | After focus entered the player, a later Tab landed outside it. A second test, after Min, also tabbed until focus left the player | Settings and full screen were not left open during the trap check. |
| 2.4.3 Focus order | TO TEST | Tab order follows the DOM. The test did not judge whether that order makes sense | A person should walk the lesson, job card, certificate page, and transcript. |
| 2.4.7 Focus visible | Supports | During the tab test, each focused control inside the player had computed `outline-style` other than `none` and `outline-width` other than `0px` | Chrome only. |
| 2.5.7 Dragging movements | Supports | With Move focused, ArrowDown changed `top`, and Shift+ArrowDown increased `top` by at least 50 pixels, on a 1280px viewport | Pointer dragging was not performed. On a viewport under 640px the window is docked and arrows do not drag it over the video. |
| 2.5.8 Target size (minimum) | Supports | At 375px on the lesson, every visible `a`, `button`, `input`, `select`, and `summary` had a bounding box of at least 24×24 CSS pixels | The styles aim for 44px. The automated check fails only below 24px. Other pages were not measured. |
| 3.1.1 Language of page | Supports | The lesson, job, and certificate pages are `<html lang="en">`. axe-core reported no serious or critical violations, which includes a missing page language | The transcript page is also `<html lang="en">`. It was not in the axe page list. |
| 3.1.2 Language of parts | TO TEST | The transcript unit test expects `lang="am"` on an Amharic cue. The player sets `lang="am"` on the Amharic name and caption | NVDA and TalkBack were used on 15 November 2026. TalkBack read the captions. The language switch itself was not reported as a separate check. |
| 3.3.1 Error identification | TO TEST | Not run with an unknown certificate id in the browser | The certificate page writes a text result. |
| 3.3.2 Labels or instructions | Supports | axe-core on the certificate page, which includes the labelled certificate field, reported no serious or critical label failures | Seek, volume, captions, speed, and background strength use visible label text. |
| 4.1.2 Name, role, value | Pass | 15 November 2026. NVDA on Windows. TalkBack on Android read the captions and the buttons correctly. axe-core reported no serious or critical name, role, or value failures on the lesson, job, and certificate pages | Both screen readers passed for the team. |
| 4.1.3 Status messages | TO TEST | Not reported as a separate check | Play, captions, mute, sign movement, and audio description write to a visually hidden `aria-live="polite"` region. NVDA and TalkBack were used. Status messages were not reported on their own. |

## Commands behind this report

```bash
npm test
npm run a11y
```

`npm test`: 13 passed, 0 failed.
`npm run a11y`: 12 passed, 0 failed, in installed Google Chrome (Playwright channel `chrome`). axe-core reported no serious or critical issues.

## Manual tests, 15 November 2026

All passed. Details are in `docs/test-log.md`.

| Test | Result | Tool |
| --- | --- | --- |
| Keyboard-only use | Pass | Chrome |
| NVDA on Windows | Pass | NVDA, Windows |
| TalkBack on Android. It read the captions and the buttons correctly | Pass | TalkBack, Android |
| Browser zoom at 200% and 400%, done by a person | Pass | Chrome |
| Sound off, captions only | Pass | Chrome |
| Audio description on and off | Pass | Chrome |
| Phone with touch | Pass | Phone |
| A mock host page: a separate plain HTML page that added the player with only the script tag | Pass | Chrome |

Open item: no co-designer test, and no test with a Deaf or blind learner. The team worked from home because of the power cut at the venue. That is the next step.
