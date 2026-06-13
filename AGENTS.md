# AGENTS.md — working on Shardfall

Guide for AI agents (and humans) modifying this codebase. Read this before editing.
`CLAUDE.md` points here; this is the canonical engineering doc.

## TL;DR

- **Vanilla JS ES modules. No framework, no bundler, no build step, no asset files.**
  The browser loads `js/*.js` directly. Sprites are drawn from character grids;
  sound is synthesized. Don't introduce a build tool or npm runtime deps without a
  very good reason — the zero-dependency, single-static-folder property is the point.
- **It's TypeScript-free plain `.js`.** No type annotations, JSX, or `import type`.
- **Always run the test before claiming done:** `npm test` (`node smoke.mjs`) spins up
  a static server + headless Chrome and drives a full playthrough with 31 assertions.
- **Most content changes happen in `js/content.js`** (data-driven). The engine reads it.

## Architecture

Single `requestAnimationFrame` loop in `game.js` → `update(dt)` then `render()`.

### State machine (`game.state`)
`title → story → play → (inventory | shop | forge) → … → dead | win`

`update()` early-returns unless `state === 'play'`, so opening any menu/dialog pauses
the world. Menus are DOM (in `ui.js`) and handle their own events; they call back into
the `Game` instance to mutate state, then set `state` back to `'play'`.

### Module map

| File | Responsibility |
|------|----------------|
| `js/main.js` | bootstrap: `initAudio()`, `new Game()`, `titleScreen()` |
| `js/game.js` | **the hub** — `Game` class: loop, combat, physics, AI, status effects, dash, consumables, render, save/load |
| `js/content.js` | **all data**: `ACTS`, `BIOMES`, `ENEMY_DEFS`, `BOSS_DEFS`, `LORE`, `OPENING`/`EPILOGUE`, derived `FLOOR_PLAN` |
| `js/items.js` | item/affix/consumable generation, `RARITIES`, `itemScore`, `statLines`, `rollAffix` |
| `js/dungeon.js` | `genFloor()` (rooms+corridors), `genSanctum()`, `TILE`/`WALL`/`FLOOR`/`STAIRS`, `isSolid()` |
| `js/sprites.js` | `SPRITES`, `BOSSES` (char-grid art) + `drawSprite()` |
| `js/input.js` | unified keyboard + touch → `input` object; `pollInput()`, `clearPressed()` |
| `js/ui.js` | DOM UI: HUD, dialog, inventory, shop, forge, overlays, toasts, consumable bar, minimap is in game.js |
| `js/audio.js` | procedural Web Audio: `SFX.*`, mute toggle |
| `js/rng.js` | `makeRNG(seed)` (mulberry32) + `hashSeed()` |

### Determinism

Floors are generated from `makeRNG(hashSeed(seed, floorNum, salt))` so a given run is
reproducible. `Math.random()` is used only for transient combat variance (crit rolls,
particles) — never for world generation. Keep it that way.

### Debug hook

`window.__g` is the live `Game` instance. The smoke test drives the game through it
(e.g. `window.__g.spawnBoss()`, `window.__g.player`). Keep it exposed.

## How to add content (the common task)

Almost everything is data in `js/content.js`:

- **New enemy:** add a sprite to `js/sprites.js`, then an entry to `ENEMY_DEFS`
  (`{sprite, hp, atk, def, speed, xp, r, kind}` where `kind ∈ melee|ranged|erratic`),
  then list its key in some act's `enemies` array.
- **New boss:** add a `BOSSES` sprite, a `BOSS_DEFS` entry (`hp/atk/def/speed/xp/r`,
  `pattern`, and `intro`/`slain` dialogue), point an act's `boss` at its key, and add a
  branch for its `pattern` in `Game.fireBossSpecial()` in `game.js`.
- **New act / floors:** add an `ACTS` entry (`name`, `biome`, `boss`, `normalFloors`,
  `enemies`, `intro`). `FLOOR_PLAN`, `TOTAL_FLOORS`, and `SHARDS_TOTAL` auto-derive.
- **New biome palette:** add to `BIOMES` and reference it from an act.
- **New lore:** append to `LORE` (one is placed per normal floor at a shrine).
- **New weapon affix:** add to `AFFIX_KEYS` + `rollAffix()` + `affixLabel()` in
  `items.js`, then handle its `key` in `Game.playerAttack()` (on-hit) in `game.js`.
- **New consumable:** add to `CONSUMABLES` (+ `CONSUMABLE_WEIGHTS`) in `items.js`, and
  if it's a new `kind`, handle it in `Game.useConsumable()`.

## Combat / balance knobs (in `game.js` unless noted)

- Enemy scaling per floor: `spawnEnemy()` (`hpM`/`atkM`/`xpM`) × `ngMult()` (New Game+).
- Boss HP/atk: `BOSS_DEFS` (content.js) × `ngMult()`.
- Player growth on level-up: `gainXp()`. Dash distance/cooldown/i-frames: `tryDash()`.
- Attack reach/arc/affix application: `playerAttack()`. Damage formula: `damageEnemy()` / `hurtPlayer()`.
- Status DoT cadence + effects: `applyStatus()` / `updateStatuses()`.
- Boss telegraph window: `updateBoss()` (`b.tele = 0.55`), fired in `fireBossSpecial()`.

## Sprites

`SPRITES.x = spr([...rows], palette)` where each row is a string, one char per pixel,
`'.'`/`' '` = transparent, other chars map to colors via `palette`. **Keep all rows the
same width.** `drawSprite(ctx, sprite, x, y, scale, flipX, tint)` — `tint` recolors
*every* visible pixel (used for hit-flash and status flicker), so it flattens detail;
don't use tint for normal rendering.

## Saving

`localStorage['shardfall.save']`, written by `Game.save()` on floor change / equip / etc.
**When you change the player/save shape, add a default-guard in `Game.load()`** so older
saves don't crash (see how `consumables`, `statuses`, `gold`, `ngPlus` are defaulted).
A new run clears the save; death/win clears it.

## Testing

```bash
npm test          # node smoke.mjs  — REQUIRED to pass before deploy/PR
```

`smoke.mjs`: serves the folder, launches headless Chrome (Puppeteer), starts a new game,
and asserts the full feature surface (dialogs, combat, dash, affix status, DoT,
consumables/bombs/buffs, telegraph, loot chooser, sanctum/shop/forge, minimap, mute,
the whole campaign to the win screen, and New Game+). It writes `smoke-*.png` screenshots
(gitignored). `live-check.mjs` boots the deployed URL and checks for console errors.

The first `npm test` downloads a Chromium for Puppeteer (`npx puppeteer browsers install chrome`).

## Deploy

Static site. Options:
- **This box (preview):** `docker compose up -d` → nginx behind Traefik at
  `shardfall.night.enkiduck.com`. `docker-compose.yml` mounts the source files
  read-only (no build step). `nginx.conf` sets `Cache-Control: no-store` so updates
  show on refresh.
- **Cloudflare Pages / any static host:** `npm run build` then deploy `dist/` (or the
  repo root). `dist/` is just a copy of `index.html` + `styles.css` + `js/`.

## Conventions

- Match the surrounding terse style; no comments that restate code.
- Commits: short, imperative, lowercase. No AI/coauthor trailers.
- Don't push `main` — branch + PR.
- Keep the no-dependencies-at-runtime, no-build, no-asset-files invariant.
