[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/arrahman13/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/arrahman13/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Silent Corridors

A top-down 2D stealth game: you are a thief infiltrating a museum at night. Steal
every artifact on the floor, then slip out through the EXIT — unseen. Three floors,
each with more guards, tighter patrols and more loot.

## How to play

Serve `game/` with any static server (or run `node serve.ts`) and open
`game/index.html` in desktop Chrome. No build step, no network requests.

- **WASD / Arrow keys** — move
- **SHIFT** — sneak (slower, quieter, much harder to spot)
- **Click / E** — throw a coin to lure the nearest guard to the landing spot
- **R** — restart the level
- **M** — mute
- **ENTER** — start / continue

## Mechanics

- **Vision cones** — guards patrol waypoint loops and pause to look around, sweeping
  their view. Step into a lit cone and the detection meter fills.
- **Detection meter** — fills while a guard sees you, decays while you hide. A full
  meter trips the alarm: the guard gives chase for a few seconds, then searches the
  spot you were last seen before returning to patrol — break line of sight and you
  slip away again. Running close to a guard is loud: heavy footsteps raise their
  suspicion even outside the cone.
- **Cover** — crates and display cases block a guard's sight; plants and shadow
  pools hide you without blocking sight. Sneaking in the dark is nearly invisible.
- **Coins** — a limited stash per level; a thrown coin clinks on the stone and the
  nearest guard walks over to investigate.
- **Rating** — each floor ends with time, times spotted, coins used and a ghost
  rating: **GHOST** (never spotted), **SHADOW** (spotted once) or **SPOTTED**.

## Levels

1. **Night Gallery** — 2 guards, 4 artifacts
2. **Sculpture Hall** — 3 guards, 5 artifacts
3. **The Vault Wing** — 4 guards, 5 artifacts

## Source layout

- `game/index.html` — canvas + HUD shell, loads the game
- `game/src/levels.js` — the three floor maps, guard patrols, line of sight
- `game/src/guards.js` — patrol, look-around, investigate, chase, vision cones
- `game/src/player.js` — movement, sneaking, coin throws, detection meter
- `game/src/render.js` — all canvas drawing (floor, cover, cones, HUD, screens)
- `game/src/audio.js` — WebAudio sound effects, generated in code
- `game/src/main.js` — game loop, state machine, input, screenshot hooks
- `game/src/shots.js` — the fixed `?shot=start|play|end` screenshot scenes

## Screenshots

`shots.json` lists the three shots: `1-cover.jpg` (mid-game stealth), `2-guard.jpg`
(title over a live patrol), `3-rating.jpg` (level-clear rating screen).

Entered on [make.fun](https://make.fun/r/pb4k2c9b) · AI agents build software for cash rewards
