import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';

const ROOT = process.cwd();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(req.url.split('?')[0]));
    if (p === '/') p = '/index.html';
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 780, isMobile: true, hasTouch: true });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const visible = (id) => page.evaluate(i => !document.getElementById(i).classList.contains('hidden'), id);

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
await wait(400);

const checks = {};

// New game -> opening dialog -> act intro -> play
await page.click('#ovBtn'); await wait(250);
checks.openingDialog = await visible('dialog');
await page.click('#dialog'); await wait(250);   // advance opening -> act I intro
checks.actIntroDialog = await visible('dialog');
await page.click('#dialog'); await wait(250);   // advance act intro -> play
checks.inPlay = await page.evaluate(() => window.__g.state === 'play');

// Combat + movement burst
for (let i = 0; i < 4; i++) { await page.keyboard.down('d'); await wait(120); await page.keyboard.press('j'); await page.keyboard.up('d'); }

// Shrine -> codex grows
const shrine = await page.evaluate(async () => {
  const g = window.__g;
  if (!g.shrine) return { noShrine: true };
  g.player.x = g.shrine.x; g.player.y = g.shrine.y;   // teleport onto it
  await new Promise(r => setTimeout(r, 60));
  return { had: true };
});
await wait(200);
checks.shrineDialog = await visible('dialog');
const codexBefore = await page.evaluate(() => window.__g.player.codex.length);
await page.click('#dialog'); await wait(150);
checks.codexGained = codexBefore >= 1;

// Inventory shows codex section
await page.keyboard.press('i'); await wait(200);
checks.codexInPanel = await page.evaluate(() => document.querySelectorAll('#codex .lore').length >= 1);
await page.screenshot({ path: 'smoke-inventory.png' });
await page.keyboard.press('i'); await wait(150);
checks.invClosed = await page.evaluate(() => window.__g.state === 'play');

// Biome variety across acts
checks.biomes = await page.evaluate(() => {
  const g = window.__g; const tints = new Set();
  for (const n of [1, 6, 11, 16, 21]) { g.floorNum = n - 1; g.descend(true); tints.add(g.biome.tint); }
  return tints.size;
});

// --- new combat mechanics ---
// Dash: sets i-frames + cooldown + dash velocity
checks.dash = await page.evaluate(() => {
  const g = window.__g; g.player.dashCd = 0; g.player.dashing = 0; g.player.facing = { x: 1, y: 0 };
  g.tryDash(1, 0);
  return g.player.dashing > 0 && g.player.invuln > 0 && g.player.dashCd > 0;
});
// Weapon affix inflicts a status on hit
checks.affixStatus = await page.evaluate(() => {
  const g = window.__g;
  g.player.equip.weapon.affix = { key: 'flaming', name: 'Flaming', dps: 12, dur: 3 };
  const e = g.spawnEnemy('rat', g.player.x + 12, g.player.y, null);
  e.x = g.player.x + 12; e.y = g.player.y; g.player.facing = { x: 1, y: 0 };
  g.playerAttack(g.stats());
  return !!(e.statuses && e.statuses.burn);
});
// Status DoT actually damages over time
checks.statusDoT = await page.evaluate(() => {
  const g = window.__g; const e = g.spawnEnemy('bigrat', g.player.x + 40, g.player.y, null);
  e.hp = 999; g.applyStatus(e, 'poison', { dur: 5, dps: 20 });
  const before = e.hp;
  for (let i = 0; i < 60; i++) g.updateStatuses(e, 0.1, false);
  return e.hp < before;
});
// Consumable: heal potion restores HP and is consumed
checks.consumableHeal = await page.evaluate(() => {
  const g = window.__g; g.player.consumables = [{ key: 'health', name: 'Health Potion', color: '#f55', icon: '♥', kind: 'heal', count: 2, slot: 'consumable' }];
  g.player.hp = 1; g.useConsumable('health');
  return g.player.hp > 1 && g.player.consumables[0] && g.player.consumables[0].count === 1;
});
// Consumable: bomb spawns a thrown projectile
checks.bombThrow = await page.evaluate(() => {
  const g = window.__g; g.player.consumables = [{ key: 'firebomb', name: 'Fire Bomb', color: '#f82', icon: '✸', kind: 'bomb', count: 1, slot: 'consumable' }];
  const before = g.projectiles.length; g.useConsumable('firebomb');
  return g.projectiles.some(p => p.isBomb) && g.projectiles.length > before && g.player.consumables.length === 0;
});
// Buff elixir applies a timed buff that boosts attack
checks.buffElixir = await page.evaluate(() => {
  const g = window.__g; const base = g.stats().atk;
  g.player.buffs = {}; g.player.consumables = [{ key: 'rage', name: 'Elixir of Rage', color: '#f53', icon: '⚔', kind: 'buff', count: 1, slot: 'consumable' }];
  g.useConsumable('rage');
  return !!g.player.buffs.rage && g.stats().atk > base;
});
// Boss attacks are telegraphed before firing
checks.telegraph = await page.evaluate(() => {
  const g = window.__g; g.player.shards = 0; g.floorNum = 4; g.descend(true); g.spawnBoss();
  const b = g.boss; let saw = false;
  for (let i = 0; i < 50; i++) { g.updateBoss(b, 0.1, g.stats(), 60, 1, 0); if (b.tele > 0) saw = true; }
  return saw;
});
// Consumable quick-bar renders buttons
checks.consBar = await page.evaluate(() => {
  const g = window.__g; g.player.consumables = [{ key: 'health', name: 'h', color: '#f55', icon: '♥', count: 2, slot: 'consumable' }];
  g.update(0.016);
  return document.querySelectorAll('#consumables .cons-btn').length >= 1;
});

// Pause menu opens, toggles a setting, and resumes
checks.pause = await (async () => {
  await page.evaluate(() => { window.__g.state = 'play'; window.__g.togglePause(); });
  await wait(120);
  const open = await visible('pause');
  const before = await page.evaluate(() => window.__g.shakeOn);
  await page.click('#pauseBody .toggle:nth-child(2)'); await wait(90);
  const toggled = await page.evaluate((b) => window.__g.shakeOn !== b, before);
  await page.click('#pauseResume'); await wait(120);
  const resumed = await page.evaluate(() => window.__g.state === 'play');
  return open && toggled && resumed;
})();

// Boss reward flow on the first boss
const reward = await page.evaluate(async () => {
  const g = window.__g;
  g.player.shards = 0; g.floorNum = 4; g.descend(true); // -> floor 5 (warden)
  g.spawnBoss();
  const st = g.stats();
  for (let i = 0; i < 20; i++) g.updateBoss(g.boss, 0.2, st, 50, 1, 0);
  const projDuringFight = g.projectiles.length;
  g.player.hp = 1;
  g.killEnemy(g.boss, st);
  return { boss: BOSS_DEF_NAME(g), projDuringFight, stateAfterKill: g.state, shards: g.player.shards };
  function BOSS_DEF_NAME(g) { return g._lastBossName || 'warden-area'; }
});
await wait(200);
checks.bossSlainDialog = await visible('dialog');
await page.click('#dialog'); await wait(250);     // advance slain -> loot chooser
checks.lootChooser = await visible('lootchoice');
const invBefore = await page.evaluate(() => window.__g.player.inventory.length);
await page.click('#lootList .item'); await wait(200);  // take first reward
checks.rewardTaken = await page.evaluate(() => {
  const g = window.__g; return g.player.inventory.length >= 1 && g.player.hp === g.stats().maxHp;
});

// After a boss we should be in the Sanctum hub, with gold from the fight
checks.sanctumEntered = await page.evaluate(() => window.__g.isSanctum === true && !!window.__g.floor.interactables);
checks.goldEarned = await page.evaluate(() => window.__g.player.gold > 0);
checks.minimap = await page.evaluate(() => { const c = document.getElementById('minimap'); return !!(c && c.width > 0) && !!window.__g.explored; });

// Mute toggle
const muteBefore = await page.evaluate(() => document.getElementById('mute').textContent);
await page.click('#mute'); await wait(80);
checks.muteToggles = await page.evaluate((b) => document.getElementById('mute').textContent !== b, muteBefore);
await page.click('#mute'); await wait(80);

// Shop: buy an item
await page.evaluate(() => { window.__g.player.gold = 99999; window.__g.openShop(); });
await wait(150);
checks.shopOpens = await visible('shop');
const sBefore = await page.evaluate(() => {
  const g = window.__g;
  const items = g.player.inventory.length + Object.values(g.player.equip).filter(Boolean).length;
  const cons = (g.player.consumables || []).reduce((a, c) => a + c.count, 0);
  return { g: g.player.gold, owned: items + cons };
});
await page.click('#shopList .buy-row button'); await wait(150);
checks.shopBuy = await page.evaluate((b) => {
  const g = window.__g;
  const items = g.player.inventory.length + Object.values(g.player.equip).filter(Boolean).length;
  const cons = (g.player.consumables || []).reduce((a, c) => a + c.count, 0);
  return g.player.gold < b.g && (items + cons) > b.owned;
}, sBefore);
await page.click('#shopClose'); await wait(120);
checks.shopCloses = await page.evaluate(() => window.__g.state === 'play');

// Forge: upgrade equipped weapon
await page.evaluate(() => { window.__g.player.gold = 99999; window.__g.openForge(); });
await wait(150);
checks.forgeOpens = await visible('forge');
const forgedBefore = await page.evaluate(() => window.__g.player.equip.weapon.forged || 0);
await page.click('#forgeList .buy-row button'); await wait(150);
checks.forgeUpgrades = await page.evaluate((fb) => (window.__g.player.equip.weapon.forged || 0) > fb, forgedBefore);
await page.click('#forgeClose'); await wait(120);

// Win + epilogue on final boss
const winFlow = await page.evaluate(async () => {
  const g = window.__g;
  g.player.shards = 4; g.floorNum = 24; g.descend(true); // -> floor 25 (hollowking)
  g.spawnBoss();
  const st = g.stats();
  for (let i = 0; i < 10; i++) g.updateBoss(g.boss, 0.2, st, 50, 1, 0);
  g.killEnemy(g.boss, st);
  return { state: g.state, shards: g.player.shards };
});
await wait(200);
checks.finalSlainDialog = await visible('dialog');
await page.click('#dialog'); await wait(250);   // slain -> win() -> epilogue dialog
checks.epilogueDialog = await visible('dialog');
await page.click('#dialog'); await wait(250);   // epilogue -> overlay
checks.winOverlay = await page.evaluate(() => {
  const o = document.getElementById('overlay');
  return !o.classList.contains('hidden') && document.getElementById('ovTitle').textContent.includes('REFORGED');
});

// New Game+ from the win screen (primary button)
await page.click('#ovBtn'); await wait(250);
checks.ngPlus = await page.evaluate(() => window.__g.ngPlus === 1 && (window.__g.state === 'play' || window.__g.state === 'story'));

await page.screenshot({ path: 'smoke-play.png' });
await browser.close();
server.close();

console.log('reward fight projectiles:', reward.projDuringFight, '| win shards:', winFlow.shards);
console.log('checks:', JSON.stringify(checks, null, 0));
const failed = Object.entries(checks).filter(([k, v]) => k === 'biomes' ? v < 5 : !v).map(([k]) => k);
console.log('errors:', errors.length ? errors : 'NONE');
console.log(failed.length ? 'FAILED: ' + failed.join(', ') : 'ALL CHECKS PASS');
process.exit(failed.length || errors.length ? 1 : 0);
