// DOM UI layer: HUD, dialog, inventory, boss bar, overlays, toasts.
import { statLines, itemScore, affixLabel, CONSUMABLES } from './items.js';
import { TOTAL_FLOORS, SHARDS_TOTAL } from './content.js';
import { toggleMute, isMuted, resumeAudio } from './audio.js';

let game = null;
let dialogCb = null;
let overlayCb = null;
let overlayCb2 = null;
const $ = (id) => document.getElementById(id);

export function init(g) {
  game = g;
  // dialog advance
  $('dialog').addEventListener('click', advanceDialog);
  $('dialog').addEventListener('touchstart', (e) => { e.preventDefault(); advanceDialog(); }, { passive: false });
  // inventory button
  $('btnInv').addEventListener('click', () => toggleInventory());
  $('invClose').addEventListener('click', () => { game.closeInventory(); });
  $('ovBtn').addEventListener('click', overlayPrimary);
  $('ovBtn2').addEventListener('click', () => { const cb = overlayCb2; overlayCb2 = null; hideOverlay(); if (cb) cb(); });
  $('mute').addEventListener('click', () => { resumeAudio(); $('mute').textContent = toggleMute() ? '🔇' : '🔊'; });
  $('shopReroll').addEventListener('click', () => shopState && shopState.onReroll());
  $('shopClose').addEventListener('click', () => shopState && shopState.onClose());
  $('forgeClose').addEventListener('click', () => forgeState && forgeState.onClose());
  $('btnPause').addEventListener('click', () => game.togglePause());
  $('pauseResume').addEventListener('click', () => game.resumeGame());
  $('pauseAbandon').addEventListener('click', () => game.abandonRun());
  // first user gesture unlocks audio
  const unlock = () => { resumeAudio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  $('mute').textContent = isMuted() ? '🔇' : '🔊';

  window.addEventListener('keydown', (e) => {
    if (!$('dialog').classList.contains('hidden')) { advanceDialog(); return; }
    if (!$('overlay').classList.contains('hidden')) { if (e.key === 'Enter' || e.key === ' ') overlayPrimary(); return; }
    if ((e.key === 'i' || e.key === 'I') && (game.state === 'play' || game.state === 'inventory')) { e.preventDefault(); toggleInventory(); }
    else if (e.key === 'Escape') { if (game.state === 'inventory') game.closeInventory(); else if (game.state === 'play' || game.state === 'paused') game.togglePause(); }
    else if ((e.key === 'p' || e.key === 'P') && (game.state === 'play' || game.state === 'paused')) game.togglePause();
    else if (game.state === 'play' && e.key >= '1' && e.key <= '9') {
      const c = (game.player.consumables || [])[+e.key - 1];
      if (c) game.useConsumable(c.key);
    }
  });
}

function toggleInventory() {
  if (game.state === 'play') { game.state = 'inventory'; openInventory(); }
  else if (game.state === 'inventory') game.closeInventory();
}

// ---------- HUD ----------
let _prevHp = null, _prevShards = null, _prevLevel = null;
const _restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
export function setHUD(p, st, floorNum, act, ngPlus) {
  const hpPct = Math.max(0, (p.hp / st.maxHp) * 100);
  $('hpFill').style.width = `${hpPct}%`;
  $('hpChip').style.width = `${hpPct}%`;
  $('hpText').textContent = `${Math.max(0, Math.ceil(p.hp))}/${st.maxHp}`;
  const hb = document.querySelector('.bar.hp');
  if (hb) {
    hb.classList.toggle('low', hpPct < 30);
    if (_prevHp != null && p.hp > _prevHp + 0.5) _restart(hb, 'heal');
  }
  _prevHp = p.hp;

  $('xpFill').style.width = `${(p.xp / p.xpToNext) * 100}%`;
  if (_prevLevel != null && p.level > _prevLevel) _restart(document.querySelector('.bar.xp'), 'gain');
  _prevLevel = p.level;

  $('lvl').textContent = `LV ${p.level}${ngPlus ? ` ·NG+${ngPlus}` : ''}`;
  $('floor').textContent = `${act ? act.name + ' · ' : ''}${floorNum}/${TOTAL_FLOORS}`;
  const sh = $('shards'); sh.textContent = `👑 ${p.shards}/${SHARDS_TOTAL}`;
  if (_prevShards != null && p.shards > _prevShards) _restart(sh, 'pop');
  _prevShards = p.shards;
  $('gold').textContent = `${p.gold || 0}g`;

  renderConsumables(p);
  renderStatus(p);
  const dash = $('btnDash'); if (dash) dash.style.setProperty('--cd', Math.max(0, Math.min(1, (p.dashCd || 0) / 0.7)));
}
export function transition() { const f = $('fade'); if (f) _restart(f, 'flash'); }

let lastConsSig = '';
function renderConsumables(p) {
  const sig = (p.consumables || []).map(c => c.key + c.count).join(',');
  if (sig === lastConsSig) return;
  lastConsSig = sig;
  const bar = $('consumables'); if (!bar) return;
  bar.innerHTML = '';
  (p.consumables || []).forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'cons-btn'; b.style.borderColor = c.color;
    b.innerHTML = `<span class="cic" style="color:${c.color}">${c.icon}</span><span class="cct">${c.count}</span><span class="ckey">${i + 1}</span>`;
    b.onclick = () => { resumeAudio(); game.useConsumable(c.key); };
    bar.appendChild(b);
  });
}
function renderStatus(p) {
  const el = $('statusbar'); if (!el) return;
  const s = p.statuses || {}, bf = p.buffs || {}, parts = [];
  if (s.burn) parts.push(`<span style="color:#ff8a2a">🔥${Math.ceil(s.burn.dur)}</span>`);
  if (s.poison) parts.push(`<span style="color:#9affb0">☣${s.poison.stacks || 1}</span>`);
  if (s.chill) parts.push(`<span style="color:#6fd0e0">❄${Math.ceil(s.chill.dur)}</span>`);
  if (bf.rage) parts.push(`<span style="color:#ff5a3a">⚔${Math.ceil(bf.rage.dur)}</span>`);
  if (bf.stoneskin) parts.push(`<span style="color:#9aa0b8">◈${Math.ceil(bf.stoneskin.dur)}</span>`);
  el.innerHTML = parts.join(' ');
}

// ---------- boss bar ----------
export function setBoss(b) {
  const el = $('boss');
  if (!b) { el.classList.add('hidden'); el._b = null; return; }
  el.classList.remove('hidden'); el._b = b;
  $('bossName').textContent = b.name;
}
export function tickBoss() {
  const el = $('boss'); const b = el._b;
  if (b && !el.classList.contains('hidden')) {
    const pct = `${Math.max(0, (b.hp / b.maxHp) * 100)}%`;
    $('bossFill').style.width = pct;
    $('bossChip').style.width = pct;
  }
}

// ---------- dialog ----------
export function dialog(lines, cb) {
  dialogCb = cb;
  $('dialogText').innerHTML = lines.map((l, i) => `<div class="${i === 0 ? 'dlg-title' : ''}">${l || '&nbsp;'}</div>`).join('');
  $('dialog').classList.remove('hidden');
}
function advanceDialog() {
  if ($('dialog').classList.contains('hidden')) return;
  $('dialog').classList.add('hidden');
  const cb = dialogCb; dialogCb = null;
  if (cb) cb();
}

// ---------- toast ----------
export function toast(text, color = '#fff') {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text; t.style.color = color; t.style.borderColor = color;
  $('toasts').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 1800);
}

// ---------- overlay (title / death / win) ----------
export function overlay(title, body, btnText, cb) {
  overlayCb = cb; overlayCb2 = null;
  $('ovTitle').textContent = title;
  $('ovBody').textContent = body;
  const b = $('ovBtn'); b.textContent = btnText;
  $('ovBtn2').classList.add('hidden');
  $('overlay').classList.remove('hidden');
}
export function titleScreen() {
  overlayCb = () => game.newGame();
  $('ovTitle').textContent = 'SHARDFALL';
  $('ovBody').textContent = 'Down into the sewers — five crowns, one Rat King. Move: stick/WASD · Strike: A/J · Dash (i-frames): ⟫/Shift · Interact: B/E · Items: pouch or 1–9 · 🎒 gear & Codex · ⏸/Esc pause.';
  const b = $('ovBtn'); b.textContent = 'New Game';
  const b2 = $('ovBtn2');
  if (game.constructor.hasSave()) {
    b2.classList.remove('hidden'); b2.textContent = 'Continue';
    overlayCb2 = () => { if (!game.load()) game.newGame(); };
  } else { b2.classList.add('hidden'); overlayCb2 = null; }
  $('overlay').classList.remove('hidden');
}

// win screen with two choices: New Game+ / fresh start
export function winScreen(body, btn1, cb1, btn2, cb2) {
  overlayCb = cb1; overlayCb2 = cb2;
  $('ovTitle').textContent = 'THE WATER RUNS CLEAN';
  $('ovBody').textContent = body;
  $('ovBtn').textContent = btn1;
  const b2 = $('ovBtn2'); b2.classList.remove('hidden'); b2.textContent = btn2;
  $('overlay').classList.remove('hidden');
}
function overlayPrimary() { const cb = overlayCb; overlayCb = null; hideOverlay(); if (cb) cb(); }
function hideOverlay() { $('overlay').classList.add('hidden'); }

// ---------- boss reward: choose one of three ----------
export function lootChoice(items, cb) {
  const list = $('lootList'); list.innerHTML = '';
  for (const it of items) {
    const card = itemCard(it, false, game.player.equip[it.slot]);
    card.classList.add('loot-card');
    card.onclick = () => { $('lootchoice').classList.add('hidden'); cb(it); };
    list.appendChild(card);
  }
  $('lootchoice').classList.remove('hidden');
}

// ---------- pause menu (with settings) ----------
export function pauseMenu(g) { renderPause(g); $('pause').classList.remove('hidden'); }
export function closePause() { $('pause').classList.add('hidden'); }
function renderPause(g) {
  const b = $('pauseBody'); b.innerHTML = '';
  const mk = (label, on, fn) => {
    const btn = document.createElement('button');
    btn.className = 'toggle ' + (on ? 'on' : 'off');
    btn.textContent = `${label}: ${on ? 'ON' : 'OFF'}`;
    btn.onclick = () => { fn(); renderPause(g); };
    return btn;
  };
  b.appendChild(mk('Sound', !isMuted(), () => { toggleMute(); $('mute').textContent = isMuted() ? '🔇' : '🔊'; }));
  b.appendChild(mk('Screen shake', g.shakeOn, () => g.setShake(!g.shakeOn)));
  b.appendChild(mk('Haptics', g.hapticsOn, () => g.setHaptics(!g.hapticsOn)));
}

// ---------- shop (Sanctum merchant) ----------
let shopState = null;
export function openShop(stock, player, onBuy, onReroll, onClose) {
  shopState = { stock, player, onBuy, onReroll, onClose };
  renderShop();
  $('shop').classList.remove('hidden');
}
export function closeShop() { $('shop').classList.add('hidden'); shopState = null; }
function renderShop() {
  if (!shopState) return;
  const { stock, player } = shopState;
  $('shopGold').textContent = `${player.gold || 0}g`;
  const list = $('shopList'); list.innerHTML = '';
  for (const it of stock) {
    if (it.bought) continue;
    const card = itemCard(it, false, player.equip[it.slot]);
    const row = document.createElement('div'); row.className = 'buy-row';
    const price = document.createElement('span'); price.className = 'price'; price.textContent = `${it.price}g`;
    const btn = document.createElement('button'); btn.textContent = 'Buy';
    if ((player.gold || 0) < it.price) btn.disabled = true;
    btn.onclick = () => { if (shopState.onBuy(it)) { it.bought = true; renderShop(); } };
    row.appendChild(price); row.appendChild(btn); card.appendChild(row); list.appendChild(card);
  }
  if (!list.children.length) list.innerHTML = '<div class="empty-note">Sold out. Return deeper.</div>';
}

// ---------- forge (Sanctum anvil) ----------
let forgeState = null;
export function openForge(player, onUpgrade, onClose) {
  forgeState = { player, onUpgrade, onClose };
  renderForge();
  $('forge').classList.remove('hidden');
}
export function closeForge() { $('forge').classList.add('hidden'); forgeState = null; }
function renderForge() {
  if (!forgeState) return;
  const { player } = forgeState;
  $('forgeGold').textContent = `${player.gold || 0}g`;
  const list = $('forgeList'); list.innerHTML = '';
  for (const slot of ['weapon', 'armor', 'ring']) {
    const it = player.equip[slot];
    if (!it) { const e = document.createElement('div'); e.className = 'item empty'; e.innerHTML = `<div class="item-meta">${slot}: empty</div>`; list.appendChild(e); continue; }
    const card = itemCard(it);
    const cost = game.forgeCost(it);
    const row = document.createElement('div'); row.className = 'buy-row';
    const price = document.createElement('span'); price.className = 'price'; price.textContent = `${cost}g`;
    const btn = document.createElement('button'); btn.textContent = 'Reforge ▲';
    if ((player.gold || 0) < cost) btn.disabled = true;
    btn.onclick = () => { if (forgeState.onUpgrade(slot)) renderForge(); };
    row.appendChild(price); row.appendChild(btn); card.appendChild(row); list.appendChild(card);
  }
}

// ---------- inventory ----------
export function openInventory() {
  $('inventory').classList.remove('hidden');
  renderInventory();
}
export function closeInventory() { $('inventory').classList.add('hidden'); }

function consumableDesc(key) {
  const d = CONSUMABLES[key]; if (!d) return '';
  if (d.kind === 'heal') return `Restores ${Math.round(d.mag * 100)}% HP`;
  if (d.kind === 'buff') return d.buff === 'rage' ? '+40% ATK & attack speed (9s)' : '−40% damage taken (9s)';
  if (d.kind === 'bomb') return `Throw — explodes, applies ${d.status} in an area`;
  return '';
}
function spd(item) { const v = (item.stats || {}).speed || 0; return item.slot === 'weapon' ? Math.round((v - 1) * 100) : Math.round(v * 100); }
function statDeltaHTML(item, other) {
  const a = item.stats || {}, b = (other && other.stats) || {}, out = [];
  for (const [k, label, suf] of [['atk', 'ATK', ''], ['def', 'DEF', ''], ['maxHp', 'HP', ''], ['crit', 'Crit', '%'], ['lifesteal', 'Lifesteal', '%'], ['thorns', 'Thorns', '']]) {
    const av = a[k] || 0, bv = b[k] || 0; if (!av && !bv) continue;
    const diff = av - bv, cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    out.push(`<span class="sline">+${av}${suf} ${label} ${other ? `<b class="${cls}">(${diff >= 0 ? '+' : ''}${diff})</b>` : ''}</span>`);
  }
  if (a.speed || b.speed) {
    const av = spd(item), bv = other ? spd(other) : 0, diff = av - bv, cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    out.push(`<span class="sline">+${av}% Spd ${other ? `<b class="${cls}">(${diff >= 0 ? '+' : ''}${diff})</b>` : ''}</span>`);
  }
  if (item.affix) out.push(`<span class="sline affix">${affixLabel(item.affix)}</span>`);
  return out.join('') || '—';
}
function itemCard(item, equipped, compareTo) {
  const div = document.createElement('div');
  div.className = 'item';
  if (item.slot === 'consumable') {
    div.style.borderColor = item.color || '#888';
    div.innerHTML = `<div class="item-head"><span class="item-name" style="color:${item.color}">${item.icon || ''} ${item.name}</span></div>
      <div class="item-stats">${consumableDesc(item.key)}</div>`;
    return div;
  }
  div.style.borderColor = item.rarityColor;
  let delta = '';
  if (compareTo !== undefined) {
    const d = itemScore(item) - itemScore(compareTo);
    if (d > 0.5) delta = `<span class="up">▲ upgrade</span>`;
    else if (d < -0.5) delta = `<span class="down">▼ weaker</span>`;
    else delta = `<span class="same">≈</span>`;
  }
  const body = compareTo !== undefined ? statDeltaHTML(item, compareTo) : statLines(item).map(l => `<span class="sline">${l}</span>`).join('');
  div.innerHTML = `
    <div class="item-head"><span class="item-name" style="color:${item.rarityColor}">${item.name}</span> ${delta}</div>
    <div class="item-meta">${item.slot} · ilvl ${item.ilvl}${item.forged ? ` · +${item.forged}` : ''}</div>
    <div class="item-stats">${body}</div>`;
  return div;
}

function renderInventory() {
  const p = game.player, st = game.stats();
  // equipped
  const eqWrap = $('equipped'); eqWrap.innerHTML = '';
  for (const slot of ['weapon', 'armor', 'ring']) {
    const it = p.equip[slot];
    const cell = document.createElement('div');
    cell.className = 'slot';
    if (it) { const c = itemCard(it); c.classList.add('equipped'); cell.appendChild(c); }
    else { cell.innerHTML = `<div class="item empty"><div class="item-meta">${slot}: empty</div></div>`; }
    eqWrap.appendChild(cell);
  }
  // derived totals
  $('totals').innerHTML =
    `<span>❤ ${st.maxHp}</span><span>⚔ ${st.atk}</span><span>🛡 ${st.def}</span>` +
    `<span>✷ ${st.crit}%</span><span>⚡ ${Math.round(st.atkSpeed * 100)}%</span>` +
    (st.lifesteal ? `<span>🩸 ${st.lifesteal}%</span>` : '') + (st.thorns ? `<span>🌵 ${st.thorns}</span>` : '');

  // backpack, sorted best-first within slot grouping
  const wrap = $('backpack'); wrap.innerHTML = '';
  const items = [...p.inventory].sort((a, b) => itemScore(b) - itemScore(a));
  if (!items.length) { wrap.innerHTML = '<div class="empty-note">Backpack empty. Slay things; loot drops.</div>'; }
  for (const it of items) {
    const card = itemCard(it, false, p.equip[it.slot]);
    const btns = document.createElement('div'); btns.className = 'item-btns';
    const eq = document.createElement('button'); eq.textContent = 'Equip';
    eq.onclick = () => { game.equip(it); renderInventory(); };
    const tr = document.createElement('button'); tr.textContent = '✕'; tr.className = 'trash';
    tr.onclick = () => { game.discard(it); renderInventory(); };
    btns.appendChild(eq); btns.appendChild(tr);
    card.appendChild(btns);
    wrap.appendChild(card);
  }

  // codex
  const cdx = $('codex'); cdx.innerHTML = '';
  const lore = p.codex || [];
  if (!lore.length) { cdx.innerHTML = '<div class="empty-note">No lore yet. Touch the glowing shrines as you descend.</div>'; }
  for (const frag of lore) {
    const d = document.createElement('div'); d.className = 'lore';
    d.innerHTML = `<div class="lore-title">✦ ${frag.title}</div><div class="lore-body">${frag.lines.join('<br>')}</div>`;
    cdx.appendChild(d);
  }
}
