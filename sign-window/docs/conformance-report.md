# WCAG 2.2 AA conformance

Product: Sign Window demo (`sign-window/`)
Date: 14 November 2026
Scope: `demo/index.html`, `demo/job.html`, `demo/verify.html`, the player those pages embed, and `demo/transcript.html` for the overflow check only.

Status values:

- **Supports** — an automated check in this session passed, and the notes say exactly what was checked.
- **TO TEST** — a person still has to try it. Notes record any partial evidence. They are not a pass.

| Criterion | Status | How tested | Notes |
| --- | --- | --- | --- |
| 1.1.1 Non-text content | TO TEST | axe-core on the three pages found no serious or critical missing-name issues | The sign video is hidden from assistive tech and the English and Amharic names are text. A screen reader user has not confirmed that this is enough. |
| 1.2.2 Captions (prerecorded) | TO TEST | In Chrome, at 1 second, the caption box read `Hello.` | Tracks exist and the first English cue rendered. The full files, including Amharic, still need a person. The lesson sound is a tone, not speech. |
| 1.2.5 Audio description | TO TEST | Not run with the toggle on | Descriptions are in `demo/ad.vtt`. The toggle writes each cue to a polite live region. No description audio file is included. |
| 1.2.6 Sign language (prerecorded) | TO TEST | ArrowDown moved the sign window in Playwright | This is a bonus criterion. The window shows one dictionary sign at a time, not a continuous interpretation of the lesson. The clip files were not downloaded. |
| 1.4.1 Use of colour | TO TEST | Not a separate manual check | Play, mute, and full screen change their text as well as `aria-pressed`. A person should confirm that. |
| 1.4.3 Contrast (minimum) | Supports | axe-core `color-contrast` is a serious rule. The three pages had zero serious or critical violations in Chrome at the default Playwright viewport | Checked in the default state only. Caption colour presets, the 55% background step, and zoomed text were not re-checked. |
| 1.4.4 Resize text | TO TEST | Not run at 200% browser zoom | Text uses `rem` and the caption sizes are `px`, which browsers scale when the user zooms. That was not observed. |
| 1.4.10 Reflow | TO TEST | Chrome viewport 320×800. `scrollWidth` equalled `clientWidth` (320) on the lesson, job card, certificate page, and transcript | No horizontal scrollbar on those four pages at 320 CSS pixels. Browser zoom at 400% was not used. |
| 1.4.11 Non-text contrast | TO TEST | Not measured with a contrast picker | Focus outline is `#ffe14a` on the dark player and `#0b3d91` on the white page. A person should check the 3:1 ratio on every control. |
| 1.4.12 Text spacing | TO TEST | Not run | Buttons use `min-height` rather than a fixed height. Spacing overrides were not applied. |
| 2.1.1 Keyboard | TO TEST | Playwright tabbed into the player and back out. ArrowDown moved the window. K did nothing while a link outside the player was focused | Space, M, C, F, seek, and the size buttons were not operated in the automated run. |
| 2.1.2 No keyboard trap | Supports | After focus entered the player, a later Tab landed outside it | Settings were closed. Full screen was not opened. |
| 2.4.3 Focus order | TO TEST | Tab order follows the DOM. The test did not judge whether that order makes sense | A person should walk the lesson, job card, and certificate page. |
| 2.4.7 Focus visible | Supports | On each focused control inside the player during the tab test, computed `outline-style` was not `none` and `outline-width` was not `0px` | Chrome only. |
| 2.5.7 Dragging movements | TO TEST | ArrowDown changed the sign window's `top` while Move was focused | The pointer drag, Shift+arrow (50px), and the resize keys were not executed. Small, Medium, and Large are buttons. |
| 2.5.8 Target size (minimum) | TO TEST | The axe run did not report a serious target-size failure. That rule may sit outside the default rule set | Controls are styled to at least 44px. Nobody measured them. |
| 3.1.1 Language of page | Supports | The three tested pages are `<html lang="en">`. axe-core would flag a missing language as a serious issue, and it reported none | Amharic caption file is a separate document (`demo/am.vtt`), not a page. |
| 3.1.2 Language of parts | TO TEST | Not asserted by the test | The player sets `lang="am"` on the Amharic name and on Amharic captions. A screen reader has not confirmed the switch. |
| 3.3.1 Error identification | TO TEST | Not run with an unknown certificate id | The certificate page writes a text result, not colour alone. |
| 3.3.2 Labels or instructions | Supports | axe-core on the certificate page, which includes the labelled certificate field, reported no serious or critical label failures | The player seek, volume, captions, speed, and background controls use visible `<label>` text. |
| 4.1.2 Name, role, value | TO TEST | axe-core reported no serious or critical name, role, or value failures on the three pages | NVDA and TalkBack were not used. |
| 4.1.3 Status messages | TO TEST | Not observed with a screen reader | Play, captions, mute, sign movement, and audio description write to a visually hidden `aria-live="polite"` region. Caption text is a second polite region. |

## Commands behind this report

```bash
npm test
npm run a11y
```

`npm test`: 9 passed.
`npm run a11y`: 4 passed in installed Google Chrome (Playwright channel `chrome`).

The Playwright-bundled Chromium download stalled at 0%, so the bundled browser was not used.
