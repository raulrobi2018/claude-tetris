# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris in vanilla JavaScript + HTML5 Canvas + CSS. No dependencies, no `package.json`, no build step, no test suite, no linter. User-facing text (README, UI strings, overlay messages) is in **Spanish** — keep new UI text in Spanish.

## Running

Open `index.html` directly in a browser (`start index.html` on Windows), or serve the folder statically (preferred):

```bash
python -m http.server 8000   # then open http://localhost:8000
npx serve .
```

There are no automated tests; verify changes by playing the game in a browser.

## Architecture

Three files: `index.html` (DOM: `#board` canvas, side panel HUD, `#next-canvas`, `#overlay`), `style.css` (dark theme), and `game.js`, which holds all logic as module-less globals in `'use strict'` mode, loaded via a plain `<script>` tag.

Key concepts in `game.js`:

- **Cell value = piece type = color index.** `board` is a `ROWS × COLS` matrix of `0` (empty) or `1–8`. Each shape in `PIECES[type]` is filled with its own type number, so `merge()` copies shape values straight into the board and `drawBlock` looks them up in the active skin's `colors`. When adding/changing pieces, keep `PIECES` and **every** palette in `SKINS` in sync (`randomPiece()` derives its range from `PIECES.length`). Type 8 is the "tuerca" (nut): a 3×3 ring with an empty center, added as a challenge piece.
- **Skins**: `SKINS[key] = { label, colors, boardBg, gridColor, drawCell(ctx, px, py, size, color) }`; `skin` holds the active one. `drawBlock` wraps `drawCell` in `save()/restore()` (so skins may set `shadowBlur` etc. freely). `boardBg: null` means `clearRect` and let the CSS theme background show; `gridColor: null` falls back to the theme's `--grid`. `applySkin()` redraws board + preview.
- **States**: `state` is `'start' | 'playing' | 'paused' | 'over'`. The `#overlay` holds three panels (`#start-screen`, `#pause-menu`, `#gameover-screen`) toggled by `showScreen(name|null)`. The page loads into the start screen; `startGame()` (Jugar / Reiniciar / Jugar de nuevo) resets all game globals and starts the loop.
- **Input**: keydown ignores events from `<input>` (name field); `P`/`Esc` toggle pause; game keys only act when `state === 'playing'`, call `preventDefault()` and blur any focused control. `resumeGuard` drops auto-repeat keydowns after resuming until the next keyup.
- **Records**: `records = { top: [{name, score, lines, level}], bestCombo, maxLines }` in `localStorage['tetris-records']`. `combo` counts consecutive locks that clear lines. `endGame()` updates bestCombo/maxLines and, if `qualifiesForTop(score)`, shows the name form; `saveRecord()` inserts and highlights. `renderRecords()` fills every `.records-body` / `.records-stats` (use `textContent`, names are user input).
- **localStorage keys** (all access via `storageGet`/`storageSet`, which swallow errors): `tetris-theme`, `tetris-skin`, `tetris-start-level`, `tetris-records`, `tetris-last-name`.
- **Shapes are square matrices**, rotated clockwise by `rotateCW` (transpose + reverse). `tryRotate` applies simple horizontal wall kicks `[0, -1, 1, -2, 2]` — this is not SRS.
- **`collide(shape, x, y)`** is the single source of truth for legality (bounds + overlap); movement, rotation, gravity, ghost piece (`ghostY`), and spawn/game-over all go through it. Cells with `y < 0` are allowed (above the board).
- **Game loop**: `loop(ts)` via `requestAnimationFrame`, accumulating `dropAccum` until `dropInterval`; the whole board is redrawn every frame by `draw()`. The next-piece preview (`drawNext`) is only redrawn on `spawn()`.
- **Piece lifecycle**: `lockPiece()` → `merge()` → `clearLines()` (updates lines/score/level/`dropInterval`) → `spawn()` (promotes `next` to `current`; if it collides immediately → `endGame()`).
- **Scoring/levels**: `LINE_SCORES[cleared] * level`; soft drop +1/row, hard drop +2/row; level = `max(startLevel, floor(lines / 10) + 1)`; `dropInterval = intervalFor(level)` = `max(100, 1000 - (level - 1) * 90)`. `startLevel` (1–15) is chosen in the start/pause menus and applies to the next game.
- **HUD** is plain DOM text updated through `updateHUD()`; it is not refreshed automatically by the loop.

If you change `COLS`, `ROWS`, or `BLOCK`, also update the `width`/`height` of `<canvas id="board">` in `index.html` (`COLS*BLOCK × ROWS*BLOCK`). The preview canvas assumes a 4×4 grid of 30px cells (120×120).