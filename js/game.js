// Shardfall — core game: entities, combat, leveling, loot, bosses, story, loop.
import { makeRNG, hashSeed } from './rng.js';
import { genItem, itemScore, genConsumable, CONSUMABLES } from './items.js';
import { genFloor, genSanctum, isSolid, TILE, STAIRS } from './dungeon.js';
import { SPRITES, drawSprite } from './sprites.js';
import { input, initInput, pollInput, clearPressed } from './input.js';
import { SFX } from './audio.js';
import {
  BIOMES, ENEMY_DEFS, BOSS_DEFS, ACTS, TOTAL_FLOORS, SHARDS_TOTAL,
  floorInfo, actOf, isActStart, OPENING, EPILOGUE, LORE,
} from './content.js';
import * as UI from './ui.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.state = 'title';
    this.cam = { x: 0, y: 0 };
    this.last = 0;
    this.shake = 0;
    this.particles = [];
    this.floaters = [];
    this.projectiles = [];
    this.drops = [];
    this.enemies = [];
    this.biome = BIOMES.drains;
    this.hitstop = 0;
    this._hpRatio = 1;
    this.shakeOn = localStorage.getItem('shardfall.shake') !== '0';
    this.hapticsOn = localStorage.getItem('shardfall.haptics') !== '0';
    this.resize();
    window.addEventListener('resize', () => this.resize());
    initInput(canvas);
    UI.init(this);
  }

  resize() {
    const cw = window.innerWidth, ch = window.innerHeight;
    const VH = 224;
    const VW = Math.max(140, Math.round(VH * (cw / ch)));
    this.VW = VW; this.VH = VH;
    this.canvas.width = VW; this.canvas.height = VH;
    this.ctx.imageSmoothingEnabled = false;
  }

  newGame() {
    this.seed = hashSeed(Math.floor(performance.now()) || 12345, 9931);
    this.player = {
      x: 0, y: 0, r: 5, facing: { x: 0, y: 1 },
      level: 1, xp: 0, xpToNext: 24,
      base: { maxHp: 60, atk: 10, def: 2 },
      hp: 60, equip: { weapon: null, armor: null, ring: null }, inventory: [],
      atkCd: 0, swing: 0, invuln: 0, kb: { x: 0, y: 0 },
      dashCd: 0, dashing: 0, dashVX: 0, dashVY: 0, trail: [],
      statuses: {}, buffs: {},
      consumables: [
        { ...genConsumable(makeRNG(1), 'health'), count: 3 },
        { ...genConsumable(makeRNG(1), 'firebomb'), count: 1 },
      ],
      shards: 0, kills: 0, codex: [], gold: 0,
    };
    const rng = makeRNG(this.seed);
    const starter = genItem(rng, 1, 'weapon');
    starter.name = 'Rusty Dagger'; starter.rarity = 'common'; starter.rarityColor = '#b8b8c0'; starter.affix = null;
    this.player.equip.weapon = starter;
    this.floorNum = 0; this.loreIndex = 0; this.ngPlus = 0;
    this.descend(true);
    this.state = 'story';
    UI.dialog(OPENING, () => { this.beginFloor(); });
  }

  startNGPlus() {
    this.player.shards = 0;
    this.player.hp = this.stats().maxHp;
    this.floorNum = 0; this.loreIndex = 0; this.ngPlus = (this.ngPlus || 0) + 1;
    this.seed = hashSeed(this.seed, this.ngPlus, 4040);
    this.descend(true);
    this.state = 'play';
    SFX.ngplus();
    UI.toast(`NEW GAME+${this.ngPlus} — the dark grows bolder`, '#ff5a6a');
    this.beginFloor();
  }

  ngMult() { return 1 + 0.6 * (this.ngPlus || 0); }

  stats() {
    const p = this.player, e = p.equip, b = p.buffs || {};
    const add = (k) => (e.weapon?.stats[k] || 0) + (e.armor?.stats[k] || 0) + (e.ring?.stats[k] || 0);
    let atk = p.base.atk + add('atk');
    let atkSpeed = (e.weapon?.stats.speed || 1) + (e.ring?.stats.speed || 0);
    let lifesteal = e.weapon?.stats.lifesteal || 0;
    if (b.rage) { atk = Math.round(atk * 1.4); atkSpeed *= 1.3; }
    const af = e.weapon?.affix || null;
    if (af && af.key === 'vampiric') lifesteal += af.steal;
    return {
      maxHp: p.base.maxHp + add('maxHp'),
      atk,
      def: p.base.def + add('def'),
      crit: Math.min(75, add('crit')),
      atkSpeed,
      lifesteal,
      thorns: e.armor?.stats.thorns || 0,
      dr: b.stoneskin ? 0.4 : 0,        // damage reduction
      affix: af,
    };
  }

  descend(silent = false) {
    this.floorNum++;
    const info = floorInfo(this.floorNum);
    this.isBoss = info.isBoss;
    this.biome = BIOMES[info.biome] || BIOMES.crypt;
    this.act = ACTS[info.actIndex];
    this.floor = genFloor(this.seed, this.floorNum, this.isBoss);
    const f = this.floor;
    this.player.x = (f.spawn.x + 0.5) * TILE;
    this.player.y = (f.spawn.y + 0.5) * TILE;
    this.enemies = []; this.projectiles = []; this.drops = []; this.floaters = []; this.particles = [];
    this.boss = null; this.stairsOpen = !this.isBoss; this.bossPending = info.boss;
    this.shrine = null; this.isSanctum = false;
    this.explored = new Uint8Array(this.floor.w * this.floor.h);

    if (this.isBoss) {
      this.bossSpawned = false;
    } else {
      const rng = makeRNG(hashSeed(this.seed, this.floorNum, 4242));
      const pool = actOf(this.floorNum).enemies;
      for (const spot of f.enemySpots) {
        const type = rng.pick(pool);
        const elite = rng.chance(0.08 + this.floorNum * 0.004);
        this.spawnEnemy(type, (spot.x + 0.5) * TILE, (spot.y + 0.5) * TILE, rng, elite);
      }
      if (f.shrineSpot) {
        const lore = LORE[this.loreIndex % LORE.length]; this.loreIndex++;
        this.shrine = { x: (f.shrineSpot.x + 0.5) * TILE, y: (f.shrineSpot.y + 0.5) * TILE, read: false, lore, bob: 0 };
      }
    }
    this.clampPlayerToFloor();
    this.save();
    if (!silent) this.beginFloor();
  }

  // Shown after the entry dialog (opening / act intro / boss slain) resolves.
  beginFloor() {
    this.state = 'play';
    if (isActStart(this.floorNum)) {
      this.state = 'story';
      UI.dialog(this.act.intro, () => { this.state = 'play'; UI.toast(`${this.act.name}`, this.biome.tint); });
    } else {
      UI.toast(this.isBoss ? `${this.act.name} — DANGER` : `Floor ${this.floorNum}/${TOTAL_FLOORS}`, this.isBoss ? '#ff5a6a' : this.biome.tint);
    }
    // one-time control tips on the very first floor of a fresh save
    if (this.floorNum === 1 && localStorage.getItem('shardfall.tips') !== '1') {
      localStorage.setItem('shardfall.tips', '1');
      setTimeout(() => UI.toast('Move: stick / WASD', '#cfe'), 1600);
      setTimeout(() => UI.toast('Strike: A / J', '#cfe'), 3400);
      setTimeout(() => UI.toast('Dash: ⟫ / Shift — invincible mid-roll, use it to dodge!', '#bfe8ff'), 5200);
      setTimeout(() => UI.toast('Items: tap the pouch or press 1–9', '#cfe'), 7200);
    }
  }

  spawnEnemy(type, x, y, rng, elite = false) {
    const d = ENEMY_DEFS[type];
    const fl = this.floorNum, ng = this.ngMult();
    const hpM = (1 + 0.20 * (fl - 1)) * ng, atkM = (1 + 0.16 * (fl - 1)) * ng, xpM = 1 + 0.14 * (fl - 1);
    const e = {
      type, x, y, r: d.r + (elite ? 1 : 0), sprite: d.sprite, kind: d.kind, elite,
      maxHp: Math.round(d.hp * hpM * (elite ? 2.6 : 1)), hp: 0,
      atk: Math.round(d.atk * atkM * (elite ? 1.35 : 1)), def: d.def + Math.floor(fl / 4),
      speed: d.speed, xp: Math.round(d.xp * xpM * (elite ? 3 : 1)),
      cd: rng ? rng.float(0, 1.5) : 0, flash: 0, kb: { x: 0, y: 0 }, wob: rng ? rng.float(0, 6.28) : 0,
    };
    e.hp = e.maxHp;
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const key = this.bossPending;
    const d = BOSS_DEFS[key];
    const bs = this.floor.bossSpot;
    const ng = this.ngMult();
    const b = {
      key, type: key, name: d.name, sprite: d.sprite, isBoss: true, pattern: d.pattern,
      x: (bs.x + 0.5) * TILE, y: (bs.y + 0.5) * TILE, r: d.r, kind: 'boss',
      maxHp: Math.round(d.hp * ng), hp: Math.round(d.hp * ng), atk: Math.round(d.atk * ng), def: d.def, speed: d.speed, xp: d.xp,
      cd: 2, special: 3, phase: 1, flash: 0, kb: { x: 0, y: 0 }, wob: 0, t: 0,
    };
    this.enemies.push(b); this.boss = b; this.bossSpawned = true;
    SFX.boss(); this.vibrate([50, 40, 90]);
    UI.setBoss(b);
  }

  enterSanctum() {
    this.floor = genSanctum();
    this.isSanctum = true; this.isBoss = false; this.boss = null;
    this.biome = BIOMES.sanctum; this.act = { name: 'Sanctum' };
    this.enemies = []; this.projectiles = []; this.drops = []; this.shrine = null;
    this.explored = new Uint8Array(this.floor.w * this.floor.h).fill(1); // small room, all visible
    this.stairsOpen = true;
    const f = this.floor;
    this.player.x = (f.spawn.x + 0.5) * TILE; this.player.y = (f.spawn.y + 0.5) * TILE;
    this.player.hp = this.stats().maxHp;
    this.state = 'play';
    UI.toast('A Sanctum — rest, trade, reforge', BIOMES.sanctum.tint);
    this.save();
  }

  // ---------- update ----------
  update(dt) {
    if (this.state !== 'play') return;
    const p = this.player, st = this.stats();
    if (p.hp > st.maxHp) p.hp = st.maxHp;
    this._hpRatio = p.hp / st.maxHp;

    // boss trigger
    if (this.isBoss && !this.bossSpawned) {
      const bs = this.floor.bossSpot;
      const dx = p.x - (bs.x + 0.5) * TILE, dy = p.y - (bs.y + 0.5) * TILE;
      if (Math.hypot(dx, dy) < 130) {
        const d = BOSS_DEFS[this.bossPending];
        this.state = 'story';
        UI.dialog(d.intro, () => { this.state = 'play'; this.spawnBoss(); });
        return;
      }
    }

    // shrine (auto-read on contact)
    if (this.shrine && !this.shrine.read) {
      this.shrine.bob += dt * 3;
      if (Math.hypot(p.x - this.shrine.x, p.y - this.shrine.y) < p.r + 9) {
        this.shrine.read = true; SFX.shrine();
        const lore = this.shrine.lore;
        if (!p.codex.some(c => c.title === lore.title)) p.codex.push(lore);
        this.state = 'story';
        UI.dialog([`✦ ${lore.title}`, ...lore.lines, '', '(recorded in your Codex)'], () => { this.state = 'play'; });
        this.save();
        return;
      }
    }

    // --- timers / status / buffs ---
    p.atkCd -= dt; p.swing = Math.max(0, p.swing - dt); p.invuln = Math.max(0, p.invuln - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    this.updateBuffs(dt);
    this.updateStatuses(p, dt, true);
    if (p.hp <= 0) { this.die(); return; }

    // --- input + movement (dash overrides normal speed, grants i-frames) ---
    pollInput();
    let mx = input.move.x, my = input.move.y;
    if (mx || my) { p.facing.x = mx; p.facing.y = my; const m = Math.hypot(p.facing.x, p.facing.y); p.facing.x /= m; p.facing.y /= m; }
    if (input.dashPressed && !p.statuses.stun) this.tryDash(mx, my);
    let vx, vy;
    if (p.dashing > 0) {
      p.dashing -= dt; vx = p.dashVX; vy = p.dashVY;
      p.trail.push({ x: p.x, y: p.y, life: 0.22, flip: p.facing.x < -0.3 });
    } else {
      const chill = p.statuses.chill ? (1 - p.statuses.chill.slow) : 1;
      const SPEED = 74 * chill;
      vx = mx * SPEED + p.kb.x; vy = my * SPEED + p.kb.y;
    }
    p.kb.x *= 0.86; p.kb.y *= 0.86;
    this.moveEntity(p, vx * dt, vy * dt);
    this.clampPlayerToFloor();
    this.markExplored();
    for (const tr of p.trail) tr.life -= dt;
    p.trail = p.trail.filter(tr => tr.life > 0);

    // --- attack / interact ---
    if (input.attack && p.atkCd <= 0 && !p.statuses.stun) this.playerAttack(st);
    if (input.interactPressed) this.tryInteract();
    clearPressed();

    // --- enemies ---
    for (const e of this.enemies) this.updateEnemy(e, dt, st);
    this.enemies = this.enemies.filter(e => e.hp > 0 || e._dyingHandled);

    // --- projectiles ---
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      const tx = Math.floor(pr.x / TILE), ty = Math.floor(pr.y / TILE);
      if (pr.life <= 0 || isSolid(this.floor, tx, ty)) {
        pr.dead = true;
        if (pr.isBomb) this.explode(pr.x, pr.y, pr.status, pr.color);
        continue;
      }
      if (pr.fromPlayer) {
        if (pr.isBomb) continue; // bombs explode on landing, not contact
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.r + pr.r) { this.damageEnemy(e, pr.dmg, false, st); pr.dead = true; break; }
        }
      } else {
        if (p.invuln <= 0 && Math.hypot(p.x - pr.x, p.y - pr.y) < p.r + pr.r) {
          this.hurtPlayer(pr.dmg, pr.x, pr.y, st);
          if (pr.statusType) this.applyStatus(p, pr.statusType, pr.statusType === 'poison' ? { dur: 4, dps: 3 } : { dur: 3, dps: 4 });
          pr.dead = true;
        }
      }
    }
    this.projectiles = this.projectiles.filter(pr => !pr.dead);

    // --- drops pickup ---
    for (const d of this.drops) {
      d.bob += dt * 4;
      if (Math.hypot(p.x - d.x, p.y - d.y) < p.r + 8) { this.pickup(d); d.taken = true; }
    }
    this.drops = this.drops.filter(d => !d.taken);

    // --- floaters / particles ---
    for (const f of this.floaters) { f.y += f.vy * dt; f.vy += 24 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter(f => f.life > 0);
    for (const pt of this.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.9; pt.vy *= 0.9; pt.life -= dt; }
    this.particles = this.particles.filter(pt => pt.life > 0);

    this.shake = Math.max(0, this.shake - dt * 60);

    this.cam.x = Math.max(0, Math.min(this.floor.w * TILE - this.VW, p.x - this.VW / 2));
    this.cam.y = Math.max(0, Math.min(this.floor.h * TILE - this.VH, p.y - this.VH / 2));

    UI.setHUD(p, st, this.floorNum, this.act, this.ngPlus);
    UI.tickBoss();
    this.drawMinimap();

    if (p.hp <= 0) this.die();
  }

  playerAttack(st) {
    const p = this.player;
    p.atkCd = 0.5 / st.atkSpeed;
    p.swing = 0.16;
    SFX.swing();
    const af = st.affix, cleave = af && af.key === 'cleaving';
    p.swingWide = cleave;
    const range = cleave ? 34 : 26, thresh = cleave ? -0.6 : 0.25;
    const fx = p.facing.x, fy = p.facing.y;
    const cx = p.x + fx * 12, cy = p.y + fy * 12;
    let hitAny = false, critAny = false;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range + e.r) continue;
      const dot = (dx / (dist || 1)) * fx + (dy / (dist || 1)) * fy;
      if (dot < thresh && dist > e.r + 6) continue;
      const crit = Math.random() * 100 < st.crit;
      let dmg = Math.max(1, Math.round(st.atk * (0.85 + Math.random() * 0.3)) - Math.floor(e.def / 2));
      if (crit) dmg = Math.round(dmg * 2);
      this.damageEnemy(e, dmg, crit, st);
      hitAny = true; critAny = critAny || crit;
      const k = (af && af.key === 'heavy' ? 260 : e.isBoss ? 30 : 120);
      e.kb.x += (dx / (dist || 1)) * k; e.kb.y += (dy / (dist || 1)) * k;
      if (st.lifesteal) { const heal = Math.max(1, Math.round(dmg * st.lifesteal / 100)); p.hp = Math.min(st.maxHp, p.hp + heal); }
      if (af) {
        if (af.key === 'flaming') this.applyStatus(e, 'burn', { dur: af.dur, dps: af.dps });
        else if (af.key === 'venomous') this.applyStatus(e, 'poison', { dur: af.dur, dps: af.dps });
        else if (af.key === 'frost') this.applyStatus(e, 'chill', { dur: af.dur, slow: af.slow });
        else if (af.key === 'shocking' && Math.random() < af.chance) this.applyStatus(e, 'stun', { dur: af.dur });
        else if (af.key === 'heavy') { for (const o of this.enemies) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < 18) this.damageEnemy(o, Math.max(1, af.aoe), false, st); }
      }
    }
    if (hitAny) SFX[critAny ? 'crit' : 'hit']();
    this.particles.push({ x: cx, y: cy, vx: fx * 30, vy: fy * 30, life: 0.16, color: '#fff', size: 2 });
  }

  damageEnemy(e, dmg, crit, st) {
    e.hp -= dmg; e.flash = 0.12;
    this.floater(e.x, e.y - e.r, `${dmg}`, crit ? '#ffd24a' : '#ffffff', crit);
    if (crit) this.hitstop = Math.max(this.hitstop, 0.045);
    if (e.hp <= 0) this.killEnemy(e, st);
  }

  killEnemy(e, st) {
    if (e._dyingHandled) return;
    e._dyingHandled = true; e.hp = 0;
    this.hitstop = Math.max(this.hitstop, e.isBoss ? 0.14 : 0.05);
    const p = this.player; p.kills++;
    const col = e.isBoss ? '#c98fff' : e.elite ? '#ffd24a' : '#9a3b5a';
    for (let i = 0; i < (e.isBoss ? 16 : 8); i++) this.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 110, vy: (Math.random() - 0.5) * 110, life: 0.5, color: col, size: 2 });
    this.gainXp(e.xp);

    // gold
    const gold = Math.max(1, Math.round(e.xp * (e.isBoss ? 8 : e.elite ? 2.2 : 0.7) * (0.8 + Math.random() * 0.5)));
    p.gold += gold;
    this.floater(e.x, e.y + 2, `+${gold}g`, '#ffd24a');
    SFX[e.isBoss ? 'shard' : 'die']();

    const rng = makeRNG(hashSeed(this.seed, Math.round(e.x), Math.round(e.y), p.kills));
    if (e.isBoss) {
      this.onBossDefeated(e);
    } else {
      const dropChance = e.elite ? 1 : 0.34;
      if (rng.chance(dropChance)) this.dropItem(genItem(rng, this.floorNum + (e.elite ? 2 : 0)), e.x, e.y);
      else if (rng.chance(0.16)) this.dropItem(genConsumable(rng), e.x, e.y);
    }
  }

  onBossDefeated(e) {
    const p = this.player; p.shards++;
    this.boss = null; UI.setBoss(null);
    this.stairsOpen = true;
    const bs = this.floor.bossSpot;
    this.floor.stairs = { x: bs.x, y: bs.y - 3 };
    this.floor.tiles[(bs.y - 3) * this.floor.w + bs.x] = STAIRS;
    const d = BOSS_DEFS[e.key];
    this.state = 'story';
    const final = p.shards >= SHARDS_TOTAL;
    UI.dialog(d.slain, () => {
      if (final) { this.win(); return; }
      this.offerBossLoot();
    });
    this.save();
  }

  offerBossLoot() {
    const rng = makeRNG(hashSeed(this.seed, this.floorNum, this.player.kills, 555));
    const slots = ['weapon', 'armor', 'ring'];
    const rolls = slots.map(s => {
      let best = genItem(rng, this.floorNum + 3, s);
      for (let i = 0; i < 2; i++) { const alt = genItem(rng, this.floorNum + 3, s); if (itemScore(alt) > itemScore(best)) best = alt; }
      return best;
    });
    this.state = 'story';
    UI.lootChoice(rolls, (chosen) => {
      const p = this.player;
      p.inventory.push(chosen);
      if (!p.equip[chosen.slot] || itemScore(chosen) > itemScore(p.equip[chosen.slot])) this.equip(chosen);
      SFX.pickup();
      this.enterSanctum(); // rest/trade/reforge before the next act
      this.save();
    });
  }

  // ---------- shop & forge (Sanctum) ----------
  openShop() {
    const rng = makeRNG(hashSeed(this.seed, this.floorNum, this.player.gold, this.shopRoll || 0));
    const stock = [];
    for (let i = 0; i < 3; i++) {
      const it = genItem(rng, this.floorNum + 2 + (this.ngPlus || 0) * 2);
      it.price = Math.max(20, Math.round(itemScore(it) * 3.2));
      stock.push(it);
    }
    for (let i = 0; i < 2; i++) {
      const c = genConsumable(rng);
      const def = CONSUMABLES[c.key];
      c.price = def.kind === 'heal' ? (c.key === 'greater' ? 90 : 40) : def.kind === 'buff' ? 75 : 55;
      stock.push(c);
    }
    this.state = 'shop';
    UI.openShop(stock, this.player, (it) => this.buyItem(it), () => this.rerollShop(), () => { this.state = 'play'; UI.closeShop(); });
  }
  buyItem(it) {
    const p = this.player;
    if (p.gold < it.price) { UI.toast('Not enough gold', '#ff5a6a'); return false; }
    p.gold -= it.price;
    if (it.slot === 'consumable') { this.addConsumable(it.key); }
    else {
      p.inventory.push(it);
      if (!p.equip[it.slot] || itemScore(it) > itemScore(p.equip[it.slot])) this.equip(it);
    }
    SFX.coin(); this.save();
    return true;
  }
  rerollShop() {
    const cost = 15 + (this.ngPlus || 0) * 10;
    if (this.player.gold < cost) { UI.toast('Not enough gold to reroll', '#ff5a6a'); return; }
    this.player.gold -= cost; this.shopRoll = (this.shopRoll || 0) + 1; SFX.coin();
    this.openShop();
  }

  openForge() {
    this.state = 'forge';
    UI.openForge(this.player, (slot) => this.forgeUpgrade(slot), () => { this.state = 'play'; UI.closeForge(); });
  }
  forgeCost(item) {
    return Math.max(30, Math.round(itemScore(item) * 2.5 * (1 + (item.forged || 0) * 0.6)));
  }
  forgeUpgrade(slot) {
    const p = this.player, item = p.equip[slot];
    if (!item) return false;
    const cost = this.forgeCost(item);
    if (p.gold < cost) { UI.toast('Not enough gold', '#ff5a6a'); return false; }
    p.gold -= cost;
    for (const k in item.stats) {
      if (k === 'speed') item.stats[k] = +(item.stats[k] + (item.slot === 'weapon' ? 0.05 : 0.03)).toFixed(2);
      else item.stats[k] = Math.ceil(item.stats[k] * 1.18);
    }
    item.forged = (item.forged || 0) + 1;
    item.ilvl += 2;
    item.name = item.name.replace(/ \+\d+$/, '') + ` +${item.forged}`;
    const st = this.stats(); if (p.hp > st.maxHp) p.hp = st.maxHp;
    SFX.forge(); this.save();
    return true;
  }

  gainXp(amount) {
    const p = this.player; p.xp += amount;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext; p.level++;
      p.xpToNext = Math.round(22 * Math.pow(p.level, 1.4));
      p.base.maxHp += 10; p.base.atk += 2; p.base.def += 1;
      p.hp = this.stats().maxHp;
      this.floater(p.x, p.y - 14, 'LEVEL UP!', '#5fd16b', true);
      this.shake = 6; SFX.level(); this.vibrate([15, 30, 15]);
    }
  }

  dropItem(item, x, y) { this.drops.push({ item, x, y, bob: Math.random() * 6 }); }

  pickup(d) {
    const p = this.player, slot = d.item.slot;
    if (slot === 'consumable') {
      this.addConsumable(d.item.key);
      SFX.pickup();
      UI.toast(`${d.item.icon} ${d.item.name}`, d.item.color);
      this.floater(d.x, d.y - 8, d.item.name, d.item.color);
      return;
    }
    p.inventory.push(d.item);
    const equipped = p.equip[slot];
    const upgrade = !equipped || itemScore(d.item) > itemScore(equipped);
    if (!equipped) this.equip(d.item);
    SFX.pickup();
    UI.toast(`${d.item.name}${upgrade ? '  ▲' : ''}`, d.item.rarityColor);
    this.floater(d.x, d.y - 8, d.item.name, d.item.rarityColor);
  }

  equip(item) {
    const p = this.player, slot = item.slot;
    const prev = p.equip[slot];
    p.equip[slot] = item;
    p.inventory = p.inventory.filter(i => i.id !== item.id);
    if (prev) p.inventory.push(prev);
    const st = this.stats();
    if (p.hp > st.maxHp) p.hp = st.maxHp;
    this.save();
  }

  discard(item) { this.player.inventory = this.player.inventory.filter(i => i.id !== item.id); this.save(); }

  tryInteract() {
    const p = this.player, f = this.floor;
    if (f.interactables) {
      for (const it of f.interactables) {
        const ix = (it.x + 0.5) * TILE, iy = (it.y + 0.5) * TILE;
        if (Math.hypot(p.x - ix, p.y - iy) < 18) {
          if (it.type === 'merchant') this.openShop();
          else if (it.type === 'forge') this.openForge();
          return;
        }
      }
    }
    if (!f.stairs || !this.stairsOpen) return;
    const sx = (f.stairs.x + 0.5) * TILE, sy = (f.stairs.y + 0.5) * TILE;
    if (Math.hypot(p.x - sx, p.y - sy) < 16) {
      SFX.descend();
      if (this.floorNum >= TOTAL_FLOORS) { this.win(); return; }
      this.descend();
    }
  }

  markExplored() {
    const f = this.floor, ex = this.explored; if (!ex) return;
    const px = Math.floor(this.player.x / TILE), py = Math.floor(this.player.y / TILE), R = 4;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const tx = px + dx, ty = py + dy;
      if (tx < 0 || ty < 0 || tx >= f.w || ty >= f.h) continue;
      if (dx * dx + dy * dy <= R * R) ex[ty * f.w + tx] = 1;
    }
  }

  // ---------- enemy AI ----------
  updateEnemy(e, dt, st) {
    if (e.hp <= 0) return;
    e.flash = Math.max(0, e.flash - dt);
    this.updateStatuses(e, dt, false);
    if (e.hp <= 0) return; // DoT finished it
    e.cd -= dt; e.wob += dt * 6;
    const p = this.player;
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;

    if (e.kind === 'boss') return this.updateBoss(e, dt, st, dist, ux, uy);

    let vx = e.kb.x, vy = e.kb.y;
    e.kb.x *= 0.84; e.kb.y *= 0.84;
    const stunned = !!(e.statuses && e.statuses.stun);
    const sp = e.speed * (e.statuses && e.statuses.chill ? 1 - e.statuses.chill.slow : 1) * (stunned ? 0 : 1);

    if (e.kind === 'ranged') {
      const want = 90;
      const mv = dist > want + 14 ? 1 : dist < want - 14 ? -0.7 : 0;
      vx += ux * sp * mv; vy += uy * sp * mv;
      if (!stunned && e.cd <= 0 && dist < 220) { this.enemyShoot(e, ux, uy); e.cd = 1.8; }
    } else if (e.kind === 'erratic') {
      vx += (ux + Math.cos(e.wob) * 0.6) * sp;
      vy += (uy + Math.sin(e.wob) * 0.6) * sp;
    } else {
      vx += ux * sp; vy += uy * sp;
    }
    this.moveEntity(e, vx * dt, vy * dt);

    if (!stunned && dist < e.r + p.r + 1 && p.invuln <= 0 && e.cd <= 0) {
      this.hurtPlayer(e.atk, e.x, e.y, st);
      e.cd = e.kind === 'ranged' ? 1.8 : 0.8;
    }
  }

  updateBoss(b, dt, st, dist, ux, uy) {
    const p = this.player; b.t += dt;
    this.updateStatuses(b, dt, false);
    if (b.hp <= 0) return;
    b.phase = b.hp < b.maxHp * 0.33 ? 3 : b.hp < b.maxHp * 0.66 ? 2 : 1;
    const stunned = !!(b.statuses && b.statuses.stun);
    const chillF = b.statuses && b.statuses.chill ? 1 - b.statuses.chill.slow : 1;
    let vx = b.kb.x, vy = b.kb.y; b.kb.x *= 0.9; b.kb.y *= 0.9;
    const aggro = b.speed * (b.phase >= 2 ? 1.2 : 1) * chillF * (stunned ? 0 : 1) * (b.tele > 0 ? 0.3 : 1);
    vx += ux * aggro; vy += uy * aggro;
    this.moveEntity(b, vx * dt, vy * dt);

    if (!stunned && dist < b.r + p.r + 2 && p.invuln <= 0 && b.cd <= 0) { this.hurtPlayer(b.atk, b.x, b.y, st); b.cd = 0.9; }
    b.cd -= dt;

    // telegraph then fire — gives the player a window to read & dodge
    if (b.tele > 0) { b.tele -= dt; if (b.tele <= 0) this.fireBossSpecial(b); return; }
    if (stunned) return;
    b.special -= dt;
    if (b.special <= 0) { b.special = 3.4 - b.phase * 0.5; b.tele = 0.55; this.shake = 3; }
  }

  fireBossSpecial(b) {
    const p = this.player;
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    const ang = Math.atan2(uy, ux);
    if (b.pattern === 'ring') {
      const n = 10 + b.phase * 2;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; this.bossBullet(b, Math.cos(a), Math.sin(a), 60, b.atk * 0.6); }
      this.shake = 8;
    } else if (b.pattern === 'brood') {
      if (this.enemies.length < 10) {
        const rng = makeRNG(hashSeed(this.seed, Math.round(b.t * 60), 13));
        for (let i = 0; i < 2 + b.phase; i++) this.spawnEnemy(rng.pick(['rat', 'roach', 'rat']), b.x + rng.float(-30, 30), b.y + rng.float(-30, 30), rng);
      }
      for (let k = -1; k <= 1; k++) { const a = ang + k * 0.35; this.bossBullet(b, Math.cos(a), Math.sin(a), 90, b.atk * 0.5); }
    } else if (b.pattern === 'tide') {
      // sweeping wave of bullets across the boss's facing + a slow spiral
      for (let k = -3; k <= 3; k++) { const a = ang + k * 0.18; this.bossBullet(b, Math.cos(a), Math.sin(a), 95, b.atk * 0.5); }
      const n = 8 + b.phase * 2;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + b.t * 1.5; this.bossBullet(b, Math.cos(a), Math.sin(a), 55, b.atk * 0.45); }
      this.shake = 6;
    } else if (b.pattern === 'choir') {
      // rotating cross/X burst + summon cultists
      const off = (b.t % 1) * 0.4;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + off; this.bossBullet(b, Math.cos(a), Math.sin(a), 80, b.atk * 0.5); }
      if (this.enemies.length < 7 && b.phase >= 2) {
        const rng = makeRNG(hashSeed(this.seed, Math.round(b.t * 70), 27));
        for (let i = 0; i < b.phase; i++) this.spawnEnemy('spittermut', b.x + rng.float(-34, 34), b.y + rng.float(-34, 34), rng);
      }
      this.shake = 7;
    } else { // king
      const f = this.floor, bs = f.bossSpot;
      const rng = makeRNG(hashSeed(this.seed, Math.round(b.t * 90), 99));
      b.x = (bs.x + rng.int(-6, 6) + 0.5) * TILE; b.y = (bs.y + rng.int(-4, 4) + 0.5) * TILE;
      const n = 14 + b.phase * 3;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + b.t; this.bossBullet(b, Math.cos(a), Math.sin(a), 75, b.atk * 0.55); }
      if (b.phase >= 3 && this.enemies.length < 6) {
        for (let i = 0; i < 2; i++) this.spawnEnemy('ghoul', b.x + rng.float(-30, 30), b.y + rng.float(-30, 30), rng);
      }
      this.shake = 10;
    }
  }

  enemyShoot(e, ux, uy) {
    const col = e.type === 'plaguerat' ? '#9aff8a' : e.type === 'spittermut' ? '#b6ff2a' : e.type === 'scavenger' ? '#d8c0a0' : '#c9ff6a';
    const spd = e.type === 'scavenger' ? 150 : 110;
    const statusType = (e.type === 'plaguerat' || e.type === 'spittermut') ? 'poison' : null;
    SFX.shoot();
    this.projectiles.push({ x: e.x, y: e.y, vx: ux * spd, vy: uy * spd, r: 3, dmg: e.atk, life: 3, fromPlayer: false, color: col, statusType });
  }
  bossBullet(b, ux, uy, spd, dmg) {
    this.projectiles.push({ x: b.x, y: b.y, vx: ux * spd, vy: uy * spd, r: 3.5, dmg: Math.round(dmg), life: 4.5, fromPlayer: false, color: '#ff6a8a' });
  }

  hurtPlayer(raw, fromX, fromY, st) {
    const p = this.player;
    const dmg = Math.max(1, Math.round(raw) - Math.floor(st.def / 2));
    p.hp -= dmg; p.invuln = 0.55; this.shake = 7; SFX.hurt(); this.vibrate(28);
    this.floater(p.x, p.y - 12, `${dmg}`, '#ff5a6a');
    const dx = p.x - fromX, dy = p.y - fromY, d = Math.hypot(dx, dy) || 1;
    p.kb.x += (dx / d) * 130; p.kb.y += (dy / d) * 130;
    if (st.thorns) {
      for (const e of this.enemies) if (e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r + 3) { this.damageEnemy(e, st.thorns, false, st); break; }
    }
  }

  floater(x, y, text, color, big = false) { this.floaters.push({ x, y, text, color, life: 0.8, vy: -26, big }); }
  vibrate(pattern) { if (this.hapticsOn && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (_) {} } }

  // ---------- status effects ----------
  applyStatus(t, type, opts) {
    const st = t.statuses || (t.statuses = {});
    if (type === 'poison') {
      const cur = st.poison;
      if (cur) { cur.dur = Math.max(cur.dur, opts.dur); cur.stacks = Math.min(8, (cur.stacks || 1) + 1); cur.dps = Math.max(cur.dps, opts.dps); }
      else st.poison = { dur: opts.dur, dps: opts.dps, stacks: 1, tick: 0.5 };
    } else if (type === 'burn') {
      st.burn = { dur: Math.max(opts.dur, st.burn?.dur || 0), dps: Math.max(opts.dps, st.burn?.dps || 0), tick: 0.5 };
    } else if (type === 'chill') {
      st.chill = { dur: Math.max(opts.dur, st.chill?.dur || 0), slow: opts.slow };
    } else if (type === 'stun') {
      st.stun = { dur: Math.max(opts.dur, st.stun?.dur || 0) };
    }
  }
  updateStatuses(t, dt, isPlayer) {
    const st = t.statuses; if (!st) return;
    for (const key of ['burn', 'poison']) {
      const s = st[key]; if (!s) continue;
      s.dur -= dt; s.tick -= dt;
      if (s.tick <= 0) {
        s.tick = 0.5;
        const dmg = Math.max(1, Math.round(s.dps * (key === 'poison' ? (s.stacks || 1) : 1) * 0.5));
        const col = key === 'burn' ? '#ff8a2a' : '#9affb0';
        if (isPlayer) this.hurtPlayerRaw(dmg, col);
        else this.dotEnemy(t, dmg, col);
        SFX.burn();
      }
      if (s.dur <= 0) delete st[key];
    }
    if (st.chill) { st.chill.dur -= dt; if (st.chill.dur <= 0) delete st.chill; }
    if (st.stun) { st.stun.dur -= dt; if (st.stun.dur <= 0) delete st.stun; }
  }
  dotEnemy(e, dmg, color) {
    if (e.hp <= 0) return;
    e.hp -= dmg; this.floater(e.x, e.y - e.r, `${dmg}`, color);
    if (e.hp <= 0) this.killEnemy(e, this.stats());
  }
  hurtPlayerRaw(raw, color) {
    const p = this.player, st = this.stats();
    const dmg = Math.max(1, Math.round(raw * (1 - st.dr)));
    p.hp -= dmg; this.floater(p.x, p.y - 12, `${dmg}`, color);
    if (p.hp <= 0) this.die();
  }
  updateBuffs(dt) {
    const b = this.player.buffs; if (!b) return;
    for (const k in b) { b[k].dur -= dt; if (b[k].dur <= 0) delete b[k]; }
  }

  // ---------- consumables ----------
  addConsumable(key) {
    const p = this.player;
    const ex = p.consumables.find(c => c.key === key);
    if (ex) ex.count++;
    else p.consumables.push({ ...genConsumable(makeRNG(1), key), count: 1 });
  }
  useConsumable(key) {
    if (this.state !== 'play') return;
    const p = this.player, c = p.consumables.find(x => x.key === key && x.count > 0);
    if (!c) return;
    const def = CONSUMABLES[key], st = this.stats();
    if (def.kind === 'heal') {
      p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * def.mag));
      this.floater(p.x, p.y - 14, `+${Math.round(def.mag * 100)}% HP`, '#5fd16b', true); SFX.potion();
    } else if (def.kind === 'buff') {
      p.buffs[def.buff] = { dur: def.dur };
      this.floater(p.x, p.y - 14, def.name.toUpperCase(), def.color, true); SFX.buff();
    } else if (def.kind === 'bomb') {
      this.throwBomb(def.status, def.color); SFX.bomb();
    }
    c.count--;
    if (c.count <= 0) p.consumables = p.consumables.filter(x => x.count > 0);
    this.save();
  }
  throwBomb(status, color) {
    const p = this.player, f = p.facing;
    this.projectiles.push({ x: p.x, y: p.y, vx: f.x * 130, vy: f.y * 130, r: 4, dmg: 0, life: 0.42, fromPlayer: true, isBomb: true, status, color });
  }
  explode(x, y, status, color) {
    const st = this.stats();
    const dmg = Math.round(st.atk * 1.6 + this.floorNum * 2);
    for (let i = 0; i < 18; i++) this.particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.5, color, size: 2 });
    this.shake = 8;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (Math.hypot(e.x - x, e.y - y) < 34 + e.r) {
        this.damageEnemy(e, dmg, false, st);
        if (status === 'burn') this.applyStatus(e, 'burn', { dur: 4, dps: Math.round(st.atk * 0.35) });
        else if (status === 'poison') this.applyStatus(e, 'poison', { dur: 5, dps: Math.round(st.atk * 0.2) });
        else if (status === 'chill') this.applyStatus(e, 'chill', { dur: 3.5, slow: 0.6 });
      }
    }
  }

  // ---------- dash ----------
  tryDash(mx, my) {
    const p = this.player;
    if (p.dashCd > 0 || p.dashing > 0) return;
    let dx = mx, dy = my;
    if (!dx && !dy) { dx = p.facing.x; dy = p.facing.y; }
    const m = Math.hypot(dx, dy) || 1;
    const DASH = 230;
    p.dashVX = (dx / m) * DASH; p.dashVY = (dy / m) * DASH;
    p.dashing = 0.18; p.dashCd = 0.7; p.invuln = Math.max(p.invuln, 0.26);
    SFX.dash();
  }

  // ---------- physics ----------
  moveEntity(ent, dx, dy) { this.axisMove(ent, dx, 0); this.axisMove(ent, 0, dy); }
  axisMove(ent, dx, dy) {
    const r = ent.r;
    let nx = ent.x + dx, ny = ent.y + dy;
    const checkX = dx > 0 ? nx + r : nx - r;
    const checkY = dy > 0 ? ny + r : ny - r;
    if (dx !== 0) {
      const tx = Math.floor(checkX / TILE);
      if (isSolid(this.floor, tx, Math.floor((ent.y - r + 1) / TILE)) || isSolid(this.floor, tx, Math.floor((ent.y + r - 1) / TILE))) {
        nx = dx > 0 ? tx * TILE - r - 0.01 : (tx + 1) * TILE + r + 0.01;
      }
      ent.x = nx;
    }
    if (dy !== 0) {
      const ty = Math.floor(checkY / TILE);
      if (isSolid(this.floor, Math.floor((ent.x - r + 1) / TILE), ty) || isSolid(this.floor, Math.floor((ent.x + r - 1) / TILE), ty)) {
        ny = dy > 0 ? ty * TILE - r - 0.01 : (ty + 1) * TILE + r + 0.01;
      }
      ent.y = ny;
    }
  }
  clampPlayerToFloor() {
    const p = this.player;
    p.x = Math.max(8, Math.min(this.floor.w * TILE - 8, p.x));
    p.y = Math.max(8, Math.min(this.floor.h * TILE - 8, p.y));
  }

  // ---------- state transitions ----------
  die() {
    this.state = 'dead';
    UI.overlay('YOU FELL', `${this.act.name} · Floor ${this.floorNum}/${TOTAL_FLOORS} · Level ${this.player.level} · ${this.player.shards}/${SHARDS_TOTAL} shards`, 'Try again', () => this.newGame());
    localStorage.removeItem('shardfall.save');
  }
  win() {
    this.state = 'win';
    localStorage.removeItem('shardfall.save');
    UI.dialog(EPILOGUE, () => {
      const ng = this.ngPlus ? ` (NG+${this.ngPlus})` : '';
      UI.winScreen(
        `All five shards recovered at Level ${this.player.level}${ng}. ${this.player.codex.length}/${LORE.length} lore found.`,
        `New Game+${(this.ngPlus || 0) + 1}`, () => this.startNGPlus(),
        'Fresh start', () => this.newGame(),
      );
    });
  }
  closeInventory() { if (this.state === 'inventory') { this.state = 'play'; UI.closeInventory(); } }

  // ---------- pause & settings ----------
  togglePause() {
    if (this.state === 'play') { this.state = 'paused'; UI.pauseMenu(this); }
    else if (this.state === 'paused') this.resumeGame();
  }
  resumeGame() { if (this.state === 'paused') { this.state = 'play'; UI.closePause(); } }
  setShake(on) { this.shakeOn = on; localStorage.setItem('shardfall.shake', on ? '1' : '0'); }
  setHaptics(on) { this.hapticsOn = on; localStorage.setItem('shardfall.haptics', on ? '1' : '0'); if (on) this.vibrate(25); }
  abandonRun() { UI.closePause(); this.state = 'title'; this.boss = null; UI.setBoss(null); localStorage.removeItem('shardfall.save'); UI.titleScreen(); }

  // ---------- save/load ----------
  save() {
    if (!this.player) return;
    try {
      const p = this.player;
      const data = { seed: this.seed, floorNum: this.floorNum, loreIndex: this.loreIndex, ngPlus: this.ngPlus || 0, inSanctum: !!this.isSanctum, player: {
        level: p.level, xp: p.xp, xpToNext: p.xpToNext, base: p.base, hp: p.hp,
        equip: p.equip, inventory: p.inventory, shards: p.shards, kills: p.kills, codex: p.codex, gold: p.gold || 0, consumables: p.consumables || [] } };
      localStorage.setItem('shardfall.save', JSON.stringify(data));
    } catch (_) {}
  }
  static hasSave() { try { return !!localStorage.getItem('shardfall.save'); } catch (_) { return false; } }
  load() {
    try {
      const data = JSON.parse(localStorage.getItem('shardfall.save'));
      if (!data) return false;
      this.seed = data.seed; this.loreIndex = data.loreIndex || 0; this.ngPlus = data.ngPlus || 0;
      const d = data.player;
      this.player = {
        x: 0, y: 0, r: 5, facing: { x: 0, y: 1 },
        level: d.level, xp: d.xp, xpToNext: d.xpToNext, base: d.base, hp: d.hp,
        equip: d.equip, inventory: d.inventory, atkCd: 0, swing: 0, invuln: 0, kb: { x: 0, y: 0 },
        dashCd: 0, dashing: 0, dashVX: 0, dashVY: 0, trail: [], statuses: {}, buffs: {},
        consumables: d.consumables || [],
        shards: d.shards, kills: d.kills || 0, codex: d.codex || [], gold: d.gold || 0,
      };
      if (data.inSanctum) {
        // resume standing in a fresh Sanctum after the boss we'd cleared
        this.floorNum = data.floorNum; this.act = ACTS[floorInfo(this.floorNum).actIndex];
        this.enterSanctum();
      } else {
        this.floorNum = data.floorNum - 1; // descend() will ++ back
        this.descend(true);
        this.beginFloor();
      }
      return true;
    } catch (_) { return false; }
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx, VW = this.VW, VH = this.VH;
    ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, VW, VH);
    if (this.state === 'title') { this.renderTitle(); return; }
    if (!this.floor) return;

    ctx.save();
    let sx = 0, sy = 0;
    if (this.shake > 0 && this.shakeOn) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
    ctx.translate(-Math.floor(this.cam.x) + sx, -Math.floor(this.cam.y) + sy);

    this.renderTiles();

    if (this.shrine && !this.shrine.read) {
      const sh = this.shrine, yo = Math.sin(sh.bob) * 1.5;
      ctx.globalAlpha = 0.3; ctx.fillStyle = this.biome.tint;
      ctx.beginPath(); ctx.arc(sh.x, sh.y, 10 + Math.sin(sh.bob) * 2, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
      drawSprite(ctx, SPRITES.shrine, sh.x - 5, sh.y - 8 + yo, 1);
    }

    // sanctum interactables
    if (this.floor.interactables) {
      for (const it of this.floor.interactables) {
        const ix = (it.x + 0.5) * TILE, iy = (it.y + 0.5) * TILE;
        const spr = it.type === 'merchant' ? SPRITES.merchant : SPRITES.anvil;
        ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(ix, iy + 6, 6, 3, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
        drawSprite(ctx, spr, ix - 6, iy - 7, 1);
        const near = Math.hypot(this.player.x - ix, this.player.y - iy) < 18;
        ctx.fillStyle = near ? '#fff' : '#9a93b8'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
        ctx.fillText(it.type === 'merchant' ? 'Merchant' : 'Forge', ix, iy - 12);
        if (near) ctx.fillText('▸ B', ix, iy + 16);
        ctx.textAlign = 'left';
      }
    }

    for (const d of this.drops) {
      const yo = Math.sin(d.bob) * 2, col = d.item.color || d.item.rarityColor;
      ctx.globalAlpha = 0.5; ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(d.x, d.y + 6, 7, 3, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
      if (d.item.slot === 'consumable') {
        // little bottle / bomb
        ctx.fillStyle = '#1a1428'; ctx.fillRect(d.x - 3, d.y - 5 + yo, 6, 8);
        ctx.fillStyle = col; ctx.fillRect(d.x - 2, d.y - 2 + yo, 4, 5);
        ctx.fillStyle = '#d8d8e8'; ctx.fillRect(d.x - 1, d.y - 7 + yo, 2, 2);
      } else {
        drawSprite(ctx, SPRITES.chest, d.x - 5, d.y - 6 + yo, 1);
        ctx.fillStyle = col; ctx.fillRect(d.x - 6, d.y - 9 + yo, 12, 1);
      }
    }

    for (const e of this.enemies) this.renderEnemy(e);
    this.renderPlayer();

    for (const pr of this.projectiles) {
      if (pr.isBomb) {
        ctx.globalAlpha = 0.4; ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 6 + Math.sin(this.player.kills + pr.life * 30), 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#1a1428'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 3.5, 0, 6.28); ctx.fill();
        ctx.fillStyle = pr.color; ctx.fillRect(pr.x - 1, pr.y - 5, 2, 2);
        continue;
      }
      ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r + 1.5, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
    }

    for (const pt of this.particles) { ctx.globalAlpha = Math.max(0, pt.life * 2); ctx.fillStyle = pt.color; ctx.fillRect(pt.x - 1, pt.y - 1, pt.size || 2, pt.size || 2); }
    ctx.globalAlpha = 1;

    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
      ctx.font = `${f.big ? 8 : 6}px monospace`; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(f.text, f.x + 0.6, f.y + 0.6);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';

    ctx.restore();

    // interaction hints
    const p = this.player;
    if (this.floor.stairs && this.stairsOpen) {
      const f = this.floor;
      const sxp = (f.stairs.x + 0.5) * TILE, syp = (f.stairs.y + 0.5) * TILE;
      if (Math.hypot(p.x - sxp, p.y - syp) < 16) {
        ctx.fillStyle = '#fff'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
        ctx.fillText(this.floorNum >= TOTAL_FLOORS ? 'descend' : 'descend ▼', VW / 2, VH - 16);
        ctx.textAlign = 'left';
      }
    }

    // off-screen boss arrow — points to the boss when it's out of view
    if (this.boss && this.boss.hp > 0) {
      const bx = this.boss.x - this.cam.x, by = this.boss.y - this.cam.y, m = 10;
      if (bx < 0 || bx > VW || by < 0 || by > VH) {
        const cx = VW / 2, cy = VH / 2, a = Math.atan2(by - cy, bx - cx);
        const ex = Math.max(m, Math.min(VW - m, cx + Math.cos(a) * VW)), ey = Math.max(m, Math.min(VH - m, cy + Math.sin(a) * VH));
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
        ctx.fillStyle = '#ff3a6a'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    // low-HP danger vignette
    if (this._hpRatio < 0.3) {
      const pulse = 0.25 + 0.18 * Math.abs(Math.sin(performance.now() / 220));
      const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(200,20,40,${pulse * (1 - this._hpRatio / 0.3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    }
  }

  renderTiles() {
    const ctx = this.ctx, f = this.floor, bm = this.biome;
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE)), x1 = Math.min(f.w - 1, Math.ceil((this.cam.x + this.VW) / TILE));
    const y0 = Math.max(0, Math.floor(this.cam.y / TILE)), y1 = Math.min(f.h - 1, Math.ceil((this.cam.y + this.VH) / TILE));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = f.tiles[ty * f.w + tx];
        const px = tx * TILE, py = ty * TILE;
        if (t === 0) {
          ctx.fillStyle = bm.wallFace; ctx.fillRect(px, py, TILE, TILE);
          if (ty + 1 < f.h && f.tiles[(ty + 1) * f.w + tx] !== 0) {
            ctx.fillStyle = bm.wallTop; ctx.fillRect(px, py + TILE - 4, TILE, 4);
            ctx.fillStyle = bm.wallEdge; ctx.fillRect(px, py + TILE - 1, TILE, 1);
          }
        } else {
          const n = ((tx * 73 + ty * 31) % 7);
          ctx.fillStyle = n === 0 ? bm.floorA : n === 1 ? bm.floorB : bm.floorC;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
          if (t === STAIRS) {
            const lit = this.stairsOpen;
            ctx.fillStyle = lit ? '#0c0a16' : '#181428'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = lit ? bm.tint : '#3a3160';
            for (let i = 0; i < 4; i++) ctx.fillRect(px + 3, py + 3 + i * 3, TILE - 6, 1);
          }
        }
      }
    }
  }

  renderEnemy(e) {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r - 1, e.r, e.r * 0.45, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
    const s = e.sprite, scale = e.isBoss ? 1.6 : 1;
    const w = s.w * scale, h = s.h * scale;
    const stt = e.statuses || {};
    let tint = e.flash > 0 ? '#ffffff' : null;
    if (!tint) {
      const flick = Math.floor((e.x + e.y + performance.now() / 80)) % 3 === 0;
      if (stt.stun) tint = '#ffe98a';
      else if (flick && stt.burn) tint = '#ff8a2a';
      else if (flick && stt.poison) tint = '#9affb0';
      else if (flick && stt.chill) tint = '#6fd0e0';
    }
    if (e.elite && !tint) {
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffd24a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
    }
    // boss telegraph: a pulsing warning ring before a special
    if (e.isBoss && e.tele > 0) {
      const f = 1 - e.tele / 0.55;
      ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ffea4a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4 + f * 26, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    drawSprite(ctx, s, e.x - w / 2, e.y - h / 2, scale, false, tint);
    if (e.isBoss) {
      ctx.globalAlpha = 0.12 + (e.phase - 1) * 0.06; ctx.fillStyle = '#ff3a6a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
    } else if (e.hp < e.maxHp) {
      ctx.fillStyle = '#000'; ctx.fillRect(e.x - 7, e.y - e.r - 5, 14, 2);
      ctx.fillStyle = e.elite ? '#ffd24a' : '#ff5a6a'; ctx.fillRect(e.x - 7, e.y - e.r - 5, 14 * (e.hp / e.maxHp), 2);
    }
    // status pips
    const pips = [];
    if (stt.burn) pips.push('#ff8a2a'); if (stt.poison) pips.push('#9affb0'); if (stt.chill) pips.push('#6fd0e0'); if (stt.stun) pips.push('#ffe98a');
    pips.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(e.x - pips.length * 2 + i * 4, e.y - e.r - 8, 3, 3); });
  }

  renderPlayer() {
    const ctx = this.ctx, p = this.player;
    // dash afterimages
    for (const tr of p.trail) {
      ctx.globalAlpha = Math.max(0, tr.life * 1.6);
      drawSprite(ctx, SPRITES.hero, tr.x - 6, tr.y - 7, 1, tr.flip, '#7fd0ff');
    }
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r - 1, p.r + 1, p.r * 0.5, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
    const flip = p.facing.x < -0.3;
    const blink = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
    // status tint while burning/poisoned/chilled
    const stt = p.statuses;
    const tint = stt.burn ? '#ff8a2a' : stt.poison ? '#9affb0' : stt.chill ? '#6fd0e0' : null;
    if (!blink) drawSprite(ctx, SPRITES.hero, p.x - 6, p.y - 7, 1, flip, tint && Math.floor(p.x + p.y) % 3 === 0 ? tint : null);
    if (p.buffs.rage) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
    if (p.buffs.stoneskin) { ctx.globalAlpha = 0.5; ctx.strokeStyle = '#9aa0b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; }
    // facing indicator — small chevron showing attack direction (aim aid)
    const fa = Math.atan2(p.facing.y, p.facing.x);
    ctx.save(); ctx.translate(p.x + p.facing.x * 11, p.y + p.facing.y * 11); ctx.rotate(fa);
    ctx.globalAlpha = 0.7; ctx.fillStyle = p.dashCd <= 0 ? '#bfe8ff' : '#7a8aa0';
    ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(-2, -2.5); ctx.lineTo(-2, 2.5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.restore();
    if (p.swing > 0) {
      const a = Math.atan2(p.facing.y, p.facing.x);
      const t = 1 - p.swing / 0.16;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8 * (1 - t);
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, a - 0.9 + t * 1.8, a - 0.5 + t * 1.8); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
  }

  drawMinimap() {
    const cv = this._mm || (this._mm = document.getElementById('minimap'));
    if (!cv || !this.floor) return;
    const ctx = this._mmctx || (this._mmctx = cv.getContext('2d'));
    const f = this.floor, ex = this.explored, W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const scale = Math.min(W / f.w, H / f.h);
    const ox = (W - f.w * scale) / 2, oy = (H - f.h * scale) / 2;
    const seen = (x, y) => !ex || ex[y * f.w + x];
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      if (!seen(x, y)) continue;
      const t = f.tiles[y * f.w + x];
      if (t === 0) continue;
      ctx.fillStyle = t === STAIRS ? this.biome.tint : '#544f6a';
      ctx.fillRect(ox + x * scale, oy + y * scale, Math.ceil(scale), Math.ceil(scale));
    }
    if (this.shrine && !this.shrine.read) {
      const sx = Math.floor(this.shrine.x / TILE), sy = Math.floor(this.shrine.y / TILE);
      if (seen(sx, sy)) { ctx.fillStyle = '#6fe0ff'; ctx.fillRect(ox + sx * scale - 1, oy + sy * scale - 1, 3, 3); }
    }
    if (f.interactables) for (const it of f.interactables) {
      ctx.fillStyle = it.type === 'merchant' ? '#5fd16b' : '#ff8a2a';
      ctx.fillRect(ox + it.x * scale - 1, oy + it.y * scale - 1, 3, 3);
    }
    for (const e of this.enemies) {
      const ex2 = Math.floor(e.x / TILE), ey2 = Math.floor(e.y / TILE);
      if (!e.isBoss && !seen(ex2, ey2)) continue;
      ctx.fillStyle = e.isBoss ? '#ff3a6a' : e.elite ? '#ffd24a' : '#c25a6a';
      const s = e.isBoss ? 3 : 2; ctx.fillRect(ox + ex2 * scale - s / 2, oy + ey2 * scale - s / 2, s, s);
    }
    const px = this.player.x / TILE, py = this.player.y / TILE;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + px * scale - 1.5, oy + py * scale - 1.5, 3, 3);
  }

  renderTitle() {
    const ctx = this.ctx, VW = this.VW, VH = this.VH;
    for (let i = 0; i < 40; i++) { const x = (i * 97) % VW, y = (i * 53) % VH; ctx.globalAlpha = 0.2 + ((i * 7) % 5) / 12; ctx.fillStyle = '#8fb86a'; ctx.fillRect(x, y, 1, ((i * 13) % 4) + 1); }
    ctx.globalAlpha = 1;
    drawSprite(ctx, SPRITES.rat, VW / 2 - 12, VH / 2 - 44, 2);
    ctx.textAlign = 'center';
    ctx.font = '16px monospace'; ctx.fillStyle = '#b6e02a'; ctx.fillText('SHARDFALL', VW / 2, VH / 2 + 4);
    ctx.font = '7px monospace'; ctx.fillStyle = '#8a946a'; ctx.fillText('into the sewers · take five crowns', VW / 2, VH / 2 + 18);
    ctx.textAlign = 'left';
  }

  loop(ts) {
    const dt = Math.min(0.033, (ts - this.last) / 1000 || 0);
    this.last = ts;
    if (this.hitstop > 0) { this.hitstop -= dt; this.render(); requestAnimationFrame((t) => this.loop(t)); return; }
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
  start() { requestAnimationFrame((t) => { this.last = t; this.loop(t); }); }
}
