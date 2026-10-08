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

- **Cell value = piece type = color index.** `board` is a `ROWS × COLS` matrix of `0` (empty) or `1–7`. Each shape in `PIECES[type]` is filled with its own type number, so `merge()` copies shape values straight into the board and `drawBlock` looks them up in `COLORS`. When adding/changing pieces, keep `PIECES`, `COLORS`, and the `randomPiece()` range (`* 7 + 1`) in sync.
- **Shapes are square matrices**, rotated clockwise by `rotateCW` (transpose + reverse). `tryRotate` applies simple horizontal wall kicks `[0, -1, 1, -2, 2]` — this is not SRS.
- **`collide(shape, x, y)`** is the single source of truth for legality (bounds + overlap); movement, rotation, gravity, ghost piece (`ghostY`), and spawn/game-over all go through it. Cells with `y < 0` are allowed (above the board).
- **Game loop**: `loop(ts)` via `requestAnimationFrame`, accumulating `dropAccum` until `dropInterval`; the whole board is redrawn every frame by `draw()`. The next-piece preview (`drawNext`) is only redrawn on `spawn()`.
- **Piece lifecycle**: `lockPiece()` → `merge()` → `clearLines()` (updates lines/score/level/`dropInterval`) → `spawn()` (promotes `next` to `current`; if it collides immediately → `endGame()`).
- **Scoring/levels**: `LINE_SCORES[cleared] * level`; soft drop +1/row, hard drop +2/row; level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)`.
- **HUD** is plain DOM text updated through `updateHUD()`; it is not refreshed automatically by the loop.
- **State reset**: `init()` reinitializes all globals and is also the restart button handler.

If you change `COLS`, `ROWS`, or `BLOCK`, also update the `width`/`height` of `<canvas id="board">` in `index.html` (`COLS*BLOCK × ROWS*BLOCK`). The preview canvas assumes a 4×4 grid of 30px cells (120×120).

### Known quirks in the current code

- `togglePause()` shows the overlay when pausing but never re-adds the `hidden` class when resuming.
