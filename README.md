# 초록의 파도 — ESKARA 2026 mini game

A mobile take on Chrome's offline T-Rex runner for the 2026 ESKARA: 초록의 파도
festival. 은행잎이 — a gold ginkgo leaf in an ESKARA bandana — runs across the
field past 삼성학술정보관 and 명륜당, jumping curling waves and dodging the
인자셔틀, which flies in on little wings where the original's pterodactyl would. Day turns to the night show every 700
points.

```sh
pnpm install
pnpm dev          # → http://localhost:5191 (also on the LAN, for a phone)
pnpm test         # simulation tests, including a fairness autopilot
pnpm --filter @skkuverse/wave-run art   # regenerate the skyline PNGs
```

Node 22 (`.nvmrc`), pnpm 11. Same workspace shape as the other miniapps:
`apps/webview` is the game. The app bridge is not copied — it comes from npm
as `@skkuverse/miniapp`, published from
[spencer0124/skkuverse-miniapp](https://github.com/spencer0124/skkuverse-miniapp),
which owns the protocol.

## Controls

Right half: tap to jump, hold to jump higher, tap again in mid-air for a double
jump. Left half: hold to duck, or to drop fast in mid-air (handy for landing
early after a double jump). Space/↑ and ↓ on a
keyboard. The controls flash up for a moment at the start of every run.

## Layout

```
src/game/constants.ts   every tunable number (speeds, gaps, view width)
src/game/sprites.ts     pixel art as strings, and the hitboxes
src/game/engine.ts      the simulation: pure, fixed 60 Hz ticks, seeded RNG
src/game/loop.ts        rAF loop, interpolation, pause, haptics, game over
src/game/render/        canvas drawing: sky, light waves, skyline, crowd, sprites, water fx
src/assets/skyline/     삼성학술정보관 and 명륜당, day and night PNGs
scripts/skyline-art.mjs how those PNGs were drawn (replace the PNGs freely)
src/App.tsx             title / pause / result overlays
```

The simulation never reads the clock or `Math.random`, so a run is fully
described by `GameResult` — its seed and the inputs stamped with their tick.
Replaying those reproduces the score exactly (tested). That is the hook for a
leaderboard later: the server can re-run a submitted result instead of trusting
its number. `GameLoop`'s `onGameOver` is the one place a submission would go.

## Debug

- `?debug=1` draws hitboxes and speed.
- `?speed=11` / `?score=690` start partway into a run.
- `?only=bus` (or `ripple`, `wave`) spawns a single kind of obstacle.

None of these runs set the best score.

## Obstacles

| | appears | beat it by |
|---|---|---|
| 잔물결, 큰 파도 | from the start; groups of up to three curls at speed | jumping |
| 인자셔틀 | from speed 8.5, at three heights — the pterodactyl's slot, size and flap | jump low, duck mid, ignore high |

Waves are generated in `sprites.ts`: a ring of water curling over an open
barrel, a face rising under it, a back sloping away. A group is one body with
several curls, and its hitboxes come from the pixels (never the barrel). Four
frames loop: the curl breathes and ripples roll back along the surface.

`render/water.ts` adds the rest, on the display clock and outside the
simulation (so replays never depend on it): spray off every crest, whitewater at
the foot, a wake of foam behind, a 첨벙 when a wave passes under a jumping
runner, and the wave breaking over a runner it catches.

The bus's three heights are derived from its hitboxes and the runner's, so
they keep their meaning if the art changes; tests pin low/mid/high.

## Deploy

- **Live:** https://wave-run.mini.skkuverse.com (Cloudflare Pages project
  `miniapp-wave-run`, also at https://miniapp-wave-run.pages.dev). A push to
  `main` deploys production; any other branch (`dev`) gets a preview deploy.
  Build: `pnpm build` → `apps/webview/dist`, `PNPM_VERSION=11.20.0`.
- **Registered** in skkuverse-server as `wave-run`: `src/miniapps/index.json`
  (🏄, order 11), `src/miniapps/details/wave-run.json` (shell bar `top`, so the
  bottom bar stays off the touch zones), and `WAVE_RUN_MINIAPP_ORIGIN` in
  `src/infra/origins.ts`'s `BRIDGE_ORIGINS`, which is what lets `web:haptic`
  through. The app itself needs no release; it reads `GET /miniapps`.
- **Shell manifest:** `apps/webview/public/skkuverse.json` declares the rest of
  the shell (`header: opaque`, `statusBar: dark`, `background: #073E32` — the
  page paints below the opaque native header today, unchanged; `background`
  only shows while loading or on overscroll) — skkuverse-server fetches it and
  merges it over the registry entry above.

How all of this was set up: `NEW-MINIAPP.md` in the parent `miniapp/` folder.

## Not done yet

Google sign-in with a leaderboard.
