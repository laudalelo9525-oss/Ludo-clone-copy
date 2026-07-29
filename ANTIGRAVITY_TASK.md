# Antigravity — task brief

**Read this whole file before touching anything. Follow it literally.**

You are the **architect and design systems** role on LudoVerse (see `README.md`).
You produce specifications, tokens and reusable assets. You do **not** write
gameplay logic, networking code, or tests — Claude Code owns those, is actively
working in this repository, and edits to its files will collide.

Current state: the game is playable in a browser (server-authoritative Ludo,
live two-player match). The board renders correctly but looks amateur. That is
your job.

Context you should read first, in order:
1. `docs/HANDOFF.md` — what exists and what does not
2. `client/README.md` — how the client is built and run
3. `client/src/style.css` and `client/src/main.ts` — the current visual layer

---

## Your task: a design system and the assets to make LudoVerse look premium

Work in this order. Finish each deliverable before starting the next, and
commit after each one. If you run out of time, a smaller amount of finished,
committed work is far better than four half-finished things.

### Deliverable 1 — `design/DESIGN_SYSTEM.md`

The written specification. Must contain:

- **Colour palette.** The four seat colours are **fixed** and must not change:
  Red `#e5484d`, Green `#30a46c`, Yellow `#f5d90a`, Blue `#0090ff`. Build the
  rest of the palette around them: board surface, cell fill, cell stroke,
  page background, text, muted text, success, danger, and a gradient
  specification for the page background. Give every colour a token name.
- **Both themes.** Light and dark values for every token. The board itself
  stays light in both (a dark Ludo board reads badly); the surrounding page
  changes.
- **Contrast.** Every text/background pair must state its contrast ratio and
  meet WCAG AA (4.5:1 for body, 3:1 for large text). Yellow `#f5d90a` fails
  against white — specify what it pairs with instead.
- **Typography.** Scale in `rem` (page title, section, body, caption, numeric),
  weights, and line heights. The blueprint names Inter, Poppins, SF Pro and
  Nunito — pick **one** primary plus a fallback stack and justify it in two
  sentences. Self-hosted or system only; **no external font CDN** (see rules).
- **Spacing and radii.** A 4px-based scale, and the radii used for cards,
  buttons and the board frame.
- **Elevation.** Two or three shadow levels, plus the glassmorphism recipe
  (background alpha, blur radius, border colour).
- **Motion.** Durations and easing curves for: pawn move, dice roll, button
  press, screen transition. State a maximum duration for a pawn step — the
  board must never feel slow when a pawn moves six cells.

### Deliverable 2 — `client/src/styles/tokens.css`

The palette above as CSS custom properties on `:root`, with a
`@media (prefers-color-scheme: dark)` block. Token names must match the
document exactly. **Do not import it anywhere and do not edit any other CSS
file** — Claude Code will wire it in. Add a comment at the top saying so.

### Deliverable 3 — SVG assets in `assets/ui/`

Hand-authored, optimised SVGs. Each must be a standalone file, viewBox-based,
no fixed width/height, no embedded raster images, and use `currentColor` or a
documented fill so it can be recoloured.

- `pawn.svg` — a Ludo pawn seen from the front: rounded head, tapered body,
  weighted base. Must read clearly at **24×24 px**, because that is roughly its
  size on a phone board. Test that.
- `die-1.svg` … `die-6.svg` — six faces, rounded square, correct pip layouts.
- `star-safe.svg` — the safe-square marker.
- `arrow-start.svg` — the direction arrow on a start cell.
- `crown-winner.svg` — winner indicator.

Add `assets/ui/README.md` listing each asset, its intended pixel size, and how
it is meant to be recoloured.

### Deliverable 4 — `design/BOARD_SPEC.md`

A precise visual specification of the board, for Claude Code to implement
against. The board is a 15×15 grid; the geometry already exists in
`client/src/game/board-geometry.ts` and **must not change** — you are
specifying appearance only. Cover: yard block treatment, track cell fill and
stroke weight, start cell treatment, safe cell marker, home column colouring,
the centre triangles, pawn rendering (including how two pawns on one cell
should stack), and the active-player highlight.

Include a **states table**: how a cell or pawn looks when it is idle,
selectable (the player may move it), moving, captured, and home.

---

## Hard rules

**Files you may create or edit — nothing else:**

```
ANTIGRAVITY_TASK.md          (only to tick the checklist at the bottom)
design/**
assets/**
client/src/styles/tokens.css (new file only)
```

**Files you must NOT touch, under any circumstance:**

```
server/**                    Claude Code is actively editing this
client/src/**                except the one new file above
client/package.json          no new dependencies
docs/**                      including MILESTONES.md and HANDOFF.md
shared/**                    board constants are a tested contract
.github/**                   CI config
tests/**
```

If a task seems to require editing a forbidden file, **stop and write the
request in `design/HANDOFF_REQUESTS.md`** instead. Do not edit it yourself.

**Other rules:**

1. **No new dependencies.** No npm packages, no CDN links, no Google Fonts, no
   icon libraries. The client bundle must stay self-contained — it ships as an
   Android app where external requests may fail.
2. **No behaviour changes.** You are not to alter game logic, network code, or
   anything under test. Nothing you write should change what any test asserts.
3. **Verify before every commit:**
   ```bash
   cd client && npm run build && npm test
   ```
   Both must pass. If `tokens.css` breaks the build, fix it or remove it —
   never commit a red build.
4. **Branch:** work on `antigravity/design-system`, branched from
   `claude/code-quality-readme-alignment-v5ffqu`. Do **not** commit to
   `claude/...` or `Code` directly.
5. **Commits:** one per deliverable, present tense, explaining *why* a choice
   was made, not just what changed. Example:
   `design: add colour tokens with AA-compliant pairings for the yellow seat`
6. **Do not refactor, rename, reorganise or "tidy" anything** outside your
   allowlist, however tempting.

---

## Definition of done

- [ ] `design/DESIGN_SYSTEM.md` covers every section listed, with real contrast
      ratios calculated — not asserted
- [ ] `client/src/styles/tokens.css` exists, matches the document's token names,
      handles light and dark, and is imported by nothing
- [ ] All eleven SVGs exist, are viewBox-based, and `pawn.svg` is legible at 24px
- [ ] `assets/ui/README.md` documents every asset
- [ ] `design/BOARD_SPEC.md` includes the states table
- [ ] `cd client && npm run build && npm test` passes
- [ ] Committed to `antigravity/design-system` and pushed
- [ ] Anything you wanted but could not do is written in
      `design/HANDOFF_REQUESTS.md`

## If you get stuck or run low on time

Commit what is finished, then write clearly in `design/HANDOFF_REQUESTS.md`:
what you completed, what you did not, and what you would do next. Do not leave
uncommitted work, and do not push a broken build.

---

*Written by Claude Code at the end of a session, based on the specific gap
found when the board was first rendered and reviewed: the geometry was correct
but the visual design was not designed at all. Recommendations here come from
that finding and from established mobile board-game UI conventions — there was
no session budget left for live design research, so treat the font and palette
guidance as a starting point to justify or overrule, not as received wisdom.*
