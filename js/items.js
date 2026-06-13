// Item system: rarities, procedural generation, stat rolls, comparison.

export const RARITIES = [
  { key: 'common',    name: 'Common',    color: '#b8b8c0', mult: 1.0,  weight: 50 },
  { key: 'uncommon',  name: 'Uncommon',  color: '#5fd16b', mult: 1.25, weight: 28 },
  { key: 'rare',      name: 'Rare',      color: '#4aa3ff', mult: 1.6,  weight: 14 },
  { key: 'epic',      name: 'Epic',      color: '#b56bff', mult: 2.1,  weight: 6  },
  { key: 'legendary', name: 'Legendary', color: '#ffb02e', mult: 3.0,  weight: 2  },
];

export const SLOTS = ['weapon', 'armor', 'ring'];

const WEAPON_NAMES = ['Dagger', 'Shortsword', 'Cleaver', 'Mace', 'Rapier', 'Warblade', 'Halberd', 'Glaive', 'Reaver', 'Edge'];
const WEAPON_PREFIX = ['Rusty', 'Iron', 'Keen', 'Cruel', 'Gleaming', 'Hollow', 'Starlit', 'Vengeful', 'Ashen', 'Lodestar'];
const ARMOR_NAMES = ['Rags', 'Leather', 'Chainmail', 'Plate', 'Aegis', 'Carapace', 'Bulwark', 'Hauberk'];
const ARMOR_PREFIX = ['Tattered', 'Sturdy', 'Hardened', 'Warded', 'Runed', 'Bastion', 'Ironclad', 'Shardbound'];
const RING_NAMES = ['Band', 'Loop', 'Signet', 'Circlet', 'Seal'];
const RING_PREFIX = ['Cracked', 'Polished', 'Glowing', 'Ember', 'Storm', 'Vital', 'Savage', 'Lucent'];

function rarityFor(rng) {
  return rng.weighted(RARITIES.map(r => [r, r.weight]));
}

// Generate an item appropriate to a floor/ilvl. Optional forced rarity (bosses).
export function genItem(rng, ilvl, slot = null, forcedRarity = null) {
  slot = slot || rng.pick(SLOTS);
  const rarity = forcedRarity || rarityFor(rng);
  const m = rarity.mult;
  const lv = Math.max(1, ilvl);
  const stats = {};
  let prefix, base;

  if (slot === 'weapon') {
    prefix = WEAPON_PREFIX[Math.min(WEAPON_PREFIX.length - 1, RARITIES.indexOf(rarity) * 2 + rng.int(0, 1))];
    base = rng.pick(WEAPON_NAMES);
    stats.atk = Math.round((4 + lv * 2.2) * m * rng.float(0.9, 1.1));
    stats.crit = Math.round((3 + lv * 0.4) * m);          // % crit chance
    stats.speed = +(1 + (RARITIES.indexOf(rarity) * 0.06) + lv * 0.004).toFixed(2); // attack rate mult
    if (RARITIES.indexOf(rarity) >= 3) stats.lifesteal = Math.round(4 + RARITIES.indexOf(rarity) * 3); // % heal
  } else if (slot === 'armor') {
    prefix = ARMOR_PREFIX[Math.min(ARMOR_PREFIX.length - 1, RARITIES.indexOf(rarity) + rng.int(0, 1))];
    base = rng.pick(ARMOR_NAMES);
    stats.def = Math.round((2 + lv * 1.4) * m * rng.float(0.9, 1.1));
    stats.maxHp = Math.round((6 + lv * 3) * m);
    if (RARITIES.indexOf(rarity) >= 3) stats.thorns = Math.round(2 + RARITIES.indexOf(rarity) * 2);
  } else { // ring
    prefix = RING_PREFIX[Math.min(RING_PREFIX.length - 1, RARITIES.indexOf(rarity) + rng.int(0, 1))];
    base = rng.pick(RING_NAMES);
    // rings roll 1-2 random secondary stats
    const pool = ['atk', 'def', 'maxHp', 'crit', 'speed'];
    const n = 1 + (RARITIES.indexOf(rarity) >= 2 ? 1 : 0);
    const chosen = [];
    for (let i = 0; i < n; i++) {
      const p = rng.pick(pool.filter(x => !chosen.includes(x)));
      chosen.push(p);
      if (p === 'atk') stats.atk = Math.round((2 + lv * 0.8) * m);
      else if (p === 'def') stats.def = Math.round((1 + lv * 0.6) * m);
      else if (p === 'maxHp') stats.maxHp = Math.round((8 + lv * 2) * m);
      else if (p === 'crit') stats.crit = Math.round((2 + lv * 0.3) * m);
      else if (p === 'speed') stats.speed = +(0.05 + RARITIES.indexOf(rarity) * 0.03).toFixed(2);
    }
  }

  let affix = null;
  if (slot === 'weapon') {
    const chance = [0.12, 0.26, 0.46, 0.72, 1.0][RARITIES.indexOf(rarity)];
    if (rng.chance(chance)) affix = rollAffix(rng, lv);
  }

  const name = `${prefix} ${base}`;
  return { id: Math.floor(rng() * 1e9), slot, name, rarity: rarity.key, rarityColor: rarity.color, ilvl: lv, stats, affix };
}

// A single comparable "power" number for auto-sort / quick compare.
// ---------- weapon affixes (the skill/build flavour) ----------
export const AFFIX_KEYS = ['flaming', 'venomous', 'frost', 'shocking', 'cleaving', 'heavy', 'vampiric'];

export function rollAffix(rng, lv) {
  const key = rng.pick(AFFIX_KEYS);
  switch (key) {
    case 'flaming':  return { key, name: 'Flaming',  dps: Math.round(2 + lv * 0.8), dur: 3 };
    case 'venomous': return { key, name: 'Venomous', dps: Math.round(1 + lv * 0.45), dur: 4 };
    case 'frost':    return { key, name: 'Frost',    slow: 0.45, dur: 2.6 };
    case 'shocking': return { key, name: 'Shocking', chance: 0.25, dur: 0.7 };
    case 'cleaving': return { key, name: 'Cleaving', arc: 1 };
    case 'heavy':    return { key, name: 'Heavy',    aoe: Math.round(4 + lv * 0.9) };
    case 'vampiric': return { key, name: 'Vampiric', steal: Math.round(6 + lv * 0.5) };
  }
}
export function affixLabel(a) {
  if (!a) return '';
  switch (a.key) {
    case 'flaming':  return `🔥 Flaming — burn ${a.dps}/s (${a.dur}s)`;
    case 'venomous': return `☣ Venomous — poison ${a.dps}/s, stacks (${a.dur}s)`;
    case 'frost':    return `❄ Frost — chill −${Math.round(a.slow * 100)}% spd (${a.dur}s)`;
    case 'shocking': return `⚡ Shocking — ${Math.round(a.chance * 100)}% stun (${a.dur}s)`;
    case 'cleaving': return `🌀 Cleaving — wide sweeping arc`;
    case 'heavy':    return `🔨 Heavy — huge knockback + ${a.aoe} splash`;
    case 'vampiric': return `🩸 Vampiric — heal ${a.steal}% of damage`;
  }
  return a.name || '';
}
function affixScore(a) {
  if (!a) return 0;
  return 14 + (a.dps || 0) * 2 + (a.aoe || 0) * 2 + (a.steal || 0) * 1.5 + (a.slow ? 12 : 0) + (a.chance ? 14 : 0) + (a.arc ? 10 : 0);
}

// ---------- consumables ----------
export const CONSUMABLES = {
  health:    { name: 'Health Potion',    color: '#ff7a8a', icon: '♥', kind: 'heal', mag: 0.45 },
  greater:   { name: 'Greater Potion',   color: '#ff3a6a', icon: '✚', kind: 'heal', mag: 0.85 },
  firebomb:  { name: 'Fire Bomb',        color: '#ff8a2a', icon: '✸', kind: 'bomb', status: 'burn' },
  frostbomb: { name: 'Frost Bomb',       color: '#6fd0e0', icon: '❄', kind: 'bomb', status: 'chill' },
  venombomb: { name: 'Venom Bomb',       color: '#9affb0', icon: '☣', kind: 'bomb', status: 'poison' },
  rage:      { name: 'Elixir of Rage',   color: '#ff5a3a', icon: '⚔', kind: 'buff', buff: 'rage', dur: 9 },
  stoneskin: { name: 'Stoneskin Draught', color: '#9aa0b8', icon: '◈', kind: 'buff', buff: 'stoneskin', dur: 9 },
};
const CONSUMABLE_WEIGHTS = [['health', 34], ['greater', 10], ['firebomb', 14], ['frostbomb', 12], ['venombomb', 12], ['rage', 9], ['stoneskin', 9]];

export function genConsumable(rng, key = null) {
  key = key || rng.weighted(CONSUMABLE_WEIGHTS);
  const def = CONSUMABLES[key];
  return { slot: 'consumable', key, name: def.name, color: def.color, icon: def.icon, kind: def.kind };
}

export function itemScore(item) {
  if (!item) return 0;
  const s = item.stats || {};
  return (s.atk || 0) * 2.5 + (s.def || 0) * 2 + (s.maxHp || 0) * 0.5
    + (s.crit || 0) * 1.5 + (s.speed || 0) * 20 + (s.lifesteal || 0) * 2
    + (s.thorns || 0) * 1.5 + affixScore(item.affix);
}

export function statLines(item) {
  if (!item) return [];
  const s = item.stats || {};
  const out = [];
  if (s.atk) out.push(`+${s.atk} ATK`);
  if (s.def) out.push(`+${s.def} DEF`);
  if (s.maxHp) out.push(`+${s.maxHp} HP`);
  if (s.crit) out.push(`+${s.crit}% Crit`);
  if (s.speed) {
    const pct = item.slot === 'weapon' ? Math.round((s.speed - 1) * 100) : Math.round(s.speed * 100);
    out.push(`+${pct}% Speed`);
  }
  if (s.lifesteal) out.push(`${s.lifesteal}% Lifesteal`);
  if (s.thorns) out.push(`${s.thorns} Thorns`);
  if (item.affix) out.push(affixLabel(item.affix));
  return out;
}
