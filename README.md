# Stabi Escape playtest

An original, fan-made sliding-block puzzle for Zarrr's Stabilizer community projects. 15 authored/generated levels, touch dragging, keyboard and tap controls, optional one-move hints, undo/restart, and device-local progress. Levels 11–15 have shortest-solution targets of 16, 18, 20, 22, and 24 moves.

Sliding sounds and a short victory chime are synthesized locally with Web Audio after user interaction. The sound button remembers its setting separately from level progress. Muting, switching levels, or leaving the page cancels scheduled sounds. Unsupported audio leaves the puzzle playable. The portal and victory animations respect reduced-motion preferences.

The Level & score menu and victory screen show best-star totals out of 45. The score dialog exports a 1200×800 PNG from the current best records, including partial progress, using the existing mascot. The native file share button appears when supported; X sharing opens a prefilled text draft, and the downloaded PNG can be attached manually. The private playtest address is omitted from share text. No score is posted automatically.

Hint solves the current board in a Web Worker and highlights one suggested block, direction, and distance without moving it or changing the score. A move, undo, restart, or level change cancels stale hints. Successful hints are limited to three per level and their usage persists across undo, restart, level changes, and refresh. Cancelled or failed requests do not use a hint. All gameplay text is in English. Existing ten-level saves keep their records and unlock Level 11 once Level 10 has been completed.

Open `index.html` through static hosting for the landing page, short instructions, and a play/continue link. The original game is at `play.html`, with a home link in its header. Both routes share the same device-local progress key; the landing page only reads progress. No installation or build step.

Run `node verify.cjs` to check all 15 solutions, movement boundaries, inverse moves, star thresholds, progress migration, hint-worker responses, and local page references. The minimum move targets count one uninterrupted slide as one move.

The active artwork comes from the user's supplied Stabi, MEV, and Slippage block images. The landing page follows the visual shell of Stabi Survive: a full-height hero, orb portrait, Field Notes, and Field Guide. It uses the current Escape artwork. See `ASSETS.md` for provenance. This repository mirrors the current Work game and its original artwork.

The published `levels.js` is the source of truth; no level generation or build step is required.

## Master sync

All 17 public game files are copied byte-for-byte from Work version 11, source commit `aa73b25bbea09ee331e90aa2ab68d55bd551845a`. The public files are at the repository root so static hosting can serve `index.html` and `play.html` directly. `MASTER-SOURCE.json` records their hashes.
