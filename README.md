# Muraqba Academy

A single, cohesive learning website merging the **Google Ads** and **Meta Ads** course files
into one 4-section architecture, with dynamic per-course branding.

## Open it

Just open `index.html` in any modern browser — no server, no build step, no dependencies.
(Works from `file://`; Google Fonts load when online, with system fallbacks offline.)

## Structure

```
index.html            # app shell (header / main / footer mount points)
assets/css/styles.css # design system: 3 themes (agency / google / meta) + all components
assets/js/app.js      # hash router, views, manual progress, quizzes, widgets
data/google.js        # Google Ads course content (11 modules, 79 lessons, 30 widgets…)
data/meta.js          # Meta Ads course content (11 modules, 53 lessons, figures…)
extract.mjs           # build script that extracted the data files from the source
                      #   course files (run: node extract.mjs)
test-render.mjs       # render smoke test: every view + every widget (run: node test-render.mjs)
```

## Routes (hash-based)

| Route | View |
|---|---|
| `#/` | Agency landing — intro, what you get, who/why, 4 course cards |
| `#/google`, `#/meta` | Course home — hero, manual progress, module list, toolkit |
| `#/google/m/:id`, `#/meta/m/:id` | Module page — lessons, widgets, quiz, prev/next |
| `#/…/visuals` | Visual Library (figures + interactive simulators) |
| `#/…/templates` | Copy/download templates |
| `#/…/glossary` | Searchable glossary |
| `#/…/qa` | Advanced practitioner Q&A |

## Design rules enforced

- **Phase 1 (landing):** minimal — 4 course boxes (Google Ads + Meta Ads live,
  2 locked “Coming Soon” cards). No hero, no stats, no marketing sections, no
  Visual Library cards. Header carries an All courses link, search and the
  dark-mode toggle.
- **Visual Library:** not a nav tab and not on the landing — reachable from the
  “Practice & reference” toolkit card on each course home (and the in-course footer).
- **Phase 2 (courses):** entering a course removes all agency branding; the theme
  switches completely (Google: white + `#4285F4/#EA4335/#FBBC05/#34A853`, Roboto,
  sharp cards · Meta: bright whites + `#0081FB`, Inter, rounded cards with soft glow).
- **Boxed layout:** every content block lives in a themed `.box` container.
- **Manual progress only:** no scroll-spy, no auto-fill, no auto-scroll. Learners tick
  “Mark lesson complete” per section; progress bars derive solely from those ticks and
  persist in `localStorage` (`muraqba.progress.v1`).
- **Interactive widgets**: Google — tabs, steps, checklists, node maps, decision trees
  and 7 working simulators/calculators, all extracted with their original logic.
  Meta — tabs, steps, checklists, node maps, decision trees and 8 working
  simulators, extracted verbatim from the course file and rendered inline where
  they are referenced (no more “view in the Visual Library” detours).
- **Global search** (`⌘K` / Ctrl+K or the header button): searches all lessons,
  modules and glossary terms across both courses, with keyboard navigation.
- **“On this page” contents** on every module: manual anchor jumps (no scroll-spy).
- **Dark mode**: per-course dark palettes, header toggle, OS-preference default,
  persisted per device (`muraqba.theme.v1`).
- **Resume bookmark**: course home offers “Pick up where you left off”.
- **Per-course favicon + theme-color**: the browser tab changes costume per course.
- **Print stylesheet**: templates and glossaries print cleanly.
- Course cards carry platform identity edges (Google 4-color / Meta blue gradient);
  Coming-Soon cards are honest — no fake CTAs.

## Regenerating data

If the source course files change, re-run `node extract.mjs` (it reads
`../user/files/index.html` and `../user/files/index-3.html`), then
`node test-render.mjs` to verify every view still renders.
