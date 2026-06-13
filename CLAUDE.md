# CLAUDE.md

Shardfall — a top-down pixel dungeon-crawler RPG in vanilla JS (no framework, no
build step, no asset files).

**Read [`AGENTS.md`](AGENTS.md) for the full engineering guide** — architecture, the
data-driven content model (`js/content.js`), how to add enemies/bosses/acts/affixes/
consumables, balance knobs, the save format, and the test/deploy workflow.

Quick reference:
- Run: `npm run serve` → http://localhost:8000
- Test (required before done): `npm test` (`node smoke.mjs`)
- The live `Game` instance is `window.__g`.
- Plain `.js` ES modules — no TypeScript, no bundler, no runtime deps.
- Branch + PR; don't push `main`.
