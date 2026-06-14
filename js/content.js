// All game content: biomes, enemies, bosses, acts, story, lore. Data-driven so
// floors/acts/text scale without touching engine code.
// THEME: the city sewers, overrun by rats and mutants, ruled by the Rat King.
import { SPRITES, BOSSES } from './sprites.js';

// ---------- biome palettes (tile rendering per act) ----------
export const BIOMES = {
  drains:     { floorA: '#26281f', floorB: '#23251c', floorC: '#202219', wallFace: '#1e2018', wallTop: '#3e4630', wallEdge: '#10120a', tint: '#8fb86a' },
  cisterns:   { floorA: '#172a2c', floorB: '#142628', floorC: '#122224', wallFace: '#102224', wallTop: '#2f5a5c', wallEdge: '#08161a', tint: '#5fd0c0' },
  sludgeworks:{ floorA: '#2a2a14', floorB: '#262612', floorC: '#222210', wallFace: '#242410', wallTop: '#5a6a1a', wallEdge: '#121406', tint: '#b6e02a' },
  warrens:    { floorA: '#2a1f1a', floorB: '#261c17', floorC: '#221814', wallFace: '#221813', wallTop: '#5a3a2a', wallEdge: '#140c08', tint: '#e0926a' },
  throne:     { floorA: '#221a26', floorB: '#1e1622', floorC: '#1a141e', wallFace: '#1a1220', wallTop: '#4a3a5a', wallEdge: '#0c0814', tint: '#c9ff6a' },
  sanctum:    { floorA: '#2e2820', floorB: '#2a241c', floorC: '#262018', wallFace: '#241e18', wallTop: '#6a5a3a', wallEdge: '#16120c', tint: '#ffd24a' },
};

// ---------- enemies ----------
export const ENEMY_DEFS = {
  rat:        { sprite: SPRITES.rat,        hp: 13, atk: 5,  def: 0, speed: 50, xp: 6,  r: 6, kind: 'melee'   },
  roach:      { sprite: SPRITES.roach,      hp: 9,  atk: 4,  def: 0, speed: 60, xp: 5,  r: 5, kind: 'erratic' },
  bigrat:     { sprite: SPRITES.bigrat,     hp: 26, atk: 9,  def: 3, speed: 42, xp: 11, r: 7, kind: 'melee'   },
  plaguerat:  { sprite: SPRITES.plaguerat,  hp: 18, atk: 7,  def: 1, speed: 36, xp: 13, r: 6, kind: 'ranged'  },
  sludge:     { sprite: SPRITES.sludge,     hp: 34, atk: 11, def: 2, speed: 22, xp: 14, r: 6, kind: 'melee'   },
  mutant:     { sprite: SPRITES.mutant,     hp: 64, atk: 15, def: 5, speed: 28, xp: 24, r: 7, kind: 'melee'   },
  spittermut: { sprite: SPRITES.spittermut, hp: 22, atk: 9,  def: 1, speed: 26, xp: 15, r: 6, kind: 'ranged'  },
  ghoul:      { sprite: SPRITES.ghoul,      hp: 20, atk: 11, def: 0, speed: 70, xp: 16, r: 6, kind: 'erratic' },
  scavenger:  { sprite: SPRITES.scavenger,  hp: 22, atk: 10, def: 2, speed: 34, xp: 15, r: 6, kind: 'ranged'  },
  armoredmut: { sprite: SPRITES.armoredmut, hp: 80, atk: 16, def: 9, speed: 34, xp: 28, r: 7, kind: 'melee'   },
};

// ---------- bosses ----------
export const BOSS_DEFS = {
  gutter_matron: {
    name: 'Gnashka, the Gutter Matron', sprite: BOSSES.gutter_matron, hp: 340, atk: 16, def: 6, speed: 42, xp: 130, r: 14,
    pattern: 'brood',
    intro: ['A bloated rat the size of a dog drags herself', 'from a nest of squirming pink young.', '"Fresh meat in MY drains? My babies are hungry."'],
    slain: ['The Matron collapses and her brood scatters.', 'A bottlecap crown sits crooked on her brow —', 'you pry it loose. One crown of five.'],
  },
  bloatfiend: {
    name: 'The Bloatfiend', sprite: BOSSES.bloatfiend, hp: 760, atk: 22, def: 9, speed: 28, xp: 280, r: 15,
    pattern: 'tide',
    intro: ['The cistern water bulges and stands UP —', 'a man-shape swollen with rot and runoff.', '"...glug... it took me too. it will take you."'],
    slain: ['The Bloatfiend bursts and sloshes back to water.', 'Knotted in its gut: a second crown,', 'tin and filthy. Two of five.'],
  },
  sludge_abom: {
    name: 'The Rendering', sprite: BOSSES.sludge_abom, hp: 1260, atk: 27, def: 11, speed: 24, xp: 470, r: 15,
    pattern: 'choir',
    intro: ['Every drum of chemical waste fed one thing.', 'It rises, hissing, a green that eats light.', '"WE ARE WHAT THE CITY POURED AWAY."'],
    slain: ['The Rendering boils down to slag and steam.', 'A crown, half-dissolved, cools in the muck.', 'Three of five. The air burns less now.'],
  },
  plaguefather: {
    name: 'Skarn, the Plaguefather', sprite: BOSSES.plaguefather, hp: 1760, atk: 31, def: 13, speed: 30, xp: 720, r: 15,
    pattern: 'ring',
    intro: ['Armored in scrap and scab, the warren\'s warden', 'lifts a censer of rust-red spores and grins.', '"The King\'s gospel is sickness. Breathe deep, jack."'],
    slain: ['Skarn falls, censer guttering out at last.', 'You take his crown of welded teeth.', 'Four of five. Only the Throne remains.'],
  },
  ratking: {
    name: 'The Rat King', sprite: BOSSES.ratking, hp: 2700, atk: 36, def: 16, speed: 50, xp: 1200, r: 15,
    pattern: 'king',
    intro: ['A hundred rats, tails knotted into one body,', 'wearing one true crown and one cold mind.', '"We were vermin. Now we are sovereign.', 'The city throws its filth down to us, jack,', 'and we have made a KINGDOM of it. Kneel."'],
    slain: ['The knot unravels, rat by rat, until none remain', 'but a small bones thing and a crown too big for it.', 'Five crowns. Above, the taps will run clean by dawn.'],
  },
};

// ---------- acts (each: N normal floors, then 1 boss floor) ----------
export const ACTS = [
  {
    name: 'The Storm Drains', biome: 'drains', boss: 'gutter_matron', normalFloors: 4,
    enemies: ['rat', 'roach', 'rat', 'bigrat'],
    intro: ['ACT I — THE STORM DRAINS', 'You drop through a manhole into the city\'s gutters.',
      'The runoff stinks of more than rain down here.', 'Something has been breeding in the dark, and growing.'],
  },
  {
    name: 'The Overflow Cisterns', biome: 'cisterns', boss: 'bloatfiend', normalFloors: 4,
    enemies: ['bigrat', 'roach', 'scavenger', 'sludge'],
    intro: ['ACT II — THE OVERFLOW CISTERNS', 'Vast flooded tanks, black water to the knee.',
      'Things float that should have sunk, and watch you.', 'The deeper you wade, the less of them is still human.'],
  },
  {
    name: 'The Sludge Works', biome: 'sludgeworks', boss: 'sludge_abom', normalFloors: 4,
    enemies: ['sludge', 'spittermut', 'mutant', 'plaguerat'],
    intro: ['ACT III — THE SLUDGE WORKS', 'Old chemical outflows the city pretends it capped.',
      'Everything here is melting, mutating, or both.', 'Whatever the factories buried, it woke up hungry.'],
  },
  {
    name: 'The Plague Warrens', biome: 'warrens', boss: 'plaguefather', normalFloors: 4,
    enemies: ['plaguerat', 'ghoul', 'mutant', 'bigrat'],
    intro: ['ACT IV — THE PLAGUE WARRENS', 'The tunnels turn to nest: chewed walls, bone, spore.',
      'This is where the sickness above is brewed and blessed.', 'The rats here do not flee. They have a faith.'],
  },
  {
    name: 'The King\'s Throne', biome: 'throne', boss: 'ratking', normalFloors: 4,
    enemies: ['armoredmut', 'ghoul', 'scavenger', 'mutant'],
    intro: ['ACT V — THE KING\'S THRONE', 'The deepest vault, where every drain finally meets.',
      'It glows a sick green and hums with a thousand squeaks.', 'The Rat King is down here, on a throne of garbage,', 'and it has been waiting a long time for someone like you.'],
  },
];

// total floors and floor → act mapping
export const FLOOR_PLAN = (() => {
  const plan = [];
  plan.push(null);
  ACTS.forEach((act, ai) => {
    for (let i = 0; i < act.normalFloors; i++) plan.push({ actIndex: ai, isBoss: false, biome: act.biome });
    plan.push({ actIndex: ai, isBoss: true, biome: act.biome, boss: act.boss });
  });
  return plan;
})();
export const TOTAL_FLOORS = FLOOR_PLAN.length - 1;
export const SHARDS_TOTAL = ACTS.length; // crowns to collect

export function floorInfo(n) { return FLOOR_PLAN[n] || FLOOR_PLAN[TOTAL_FLOORS]; }
export function actOf(n) { return ACTS[floorInfo(n).actIndex]; }
export function isActStart(n) {
  const info = floorInfo(n); if (!info || info.isBoss) return false;
  const prev = FLOOR_PLAN[n - 1];
  return !prev || prev.actIndex !== info.actIndex;
}

// ---------- opening / epilogue ----------
export const OPENING = [
  'SHARDFALL: THE SEWERS',
  'The city\'s taps run brown. The fevered fill the wards.',
  'It all flows up from below — from the sewers, where the',
  'rats grew big and clever and the runoff grew teeth.',
  'They say something rules the deep drains now: a Rat King,',
  'a hundred vermin bound into one crowned mind, breeding',
  'plague like a sacrament.',
  'You are a sewerjack. You go down so the city can drink.',
  'Take the five crowns. End the King. Make the water clean.',
];
export const EPILOGUE = [
  'EPILOGUE',
  'You haul yourself up the last ladder into grey morning.',
  'Behind you the drains are quiet — just water, moving water.',
  'In a day the fever wards will empty. In a week the taps',
  'will run clear and no one will know why, or thank you.',
  'You smell like the underworld and your hands won\'t come clean.',
  'You did not do it for thanks. You did it so they could drink.',
  'Somewhere a faucet runs cold and clear. That\'s the whole of it.',
  '— THE END —',
];

// ---------- lore fragments (found at shrines) ----------
export const LORE = [
  { title: 'Sewerjack\'s Creed', lines: ['"I go down so the city need not look down.', 'I keep the water moving and the dark in its place.', 'The job is never thanked and never finished."'] },
  { title: 'Works Memo, Stained', lines: ['"Re: rodent activity in the eastern drains —', 'larger and bolder than reported. Recommend we stop', 'recommending and start sealing tunnels. — never sent"'] },
  { title: 'On the Rat King', lines: ['When enough rats are trapped together in the filth,', 'their tails knot, and the knot does not die when they do.', 'Old jacks call it a Rat King. They say it can think.'] },
  { title: 'A Mother\'s Note', lines: ['"My boy drank from the kitchen tap and now he burns.', 'The doctor says it\'s in the water. Where does water come', 'from? Down. It all comes from down there. God help us."'] },
  { title: 'The Mutations', lines: ['It isn\'t just rats. The chemical outflows did the rest —', 'what the city poured away came back changed, and walking.', 'Some of them still have faces you might recognize.'] },
  { title: 'Bloatfiend', lines: ['He was a cistern keeper, they think, who fell in and stayed.', 'The water preserved him and the water kept growing him.', 'Now he IS the cistern, and the cistern is angry.'] },
  { title: 'Plague Gospel', lines: ['Scrawled on a warren wall in something brown:', '"SICKNESS IS THE KING\'S GIFT. ROT IS THE KING\'S CROWN.', 'WHAT FLOWS UP IS HIS WORD. DRINK AND BE FAITHFUL."'] },
  { title: 'Sewerjack\'s Creed, cont.', lines: ['"...and if the dark takes me, do not come for the body.', 'Seal the tunnel and forget the name. A jack who is mourned', 'is a jack who slowed someone down. Keep the water moving."'] },
  { title: 'Lost Crew', lines: ['Six jacks went down to map the new tunnels last spring.', 'One came back, raving about a crowned thing in the deep.', 'We pensioned him. We should have armed him.'] },
  { title: 'The Rendering', lines: ['Every barrel the factories swore they\'d disposed of', 'went down a pipe and pooled in one forgotten sump.', 'It has been mixing for thirty years. It is awake now.'] },
  { title: 'Counting Crowns', lines: ['The big ones wear crowns — bottlecaps, tin, welded teeth.', 'Aping the King, or anointed by him. Five hold the warren', 'together. Take all five and the whole nest comes apart.'] },
  { title: 'Why the Rats Won', lines: ['We gave them everything: warmth, dark, endless food,', 'and a hundred years with no one watching the drains.', 'We did not lose the sewers. We abandoned them.'] },
  { title: 'Skarn', lines: ['The Plaguefather was a sewerjack once, the oldest of us.', 'He went down to seal the warrens and came back preaching.', 'If you meet him, he will know your face. Do it anyway.'] },
  { title: 'On Crowns and Kings', lines: ['A crown is just a thing a desperate creature picks up', 'to feel like more than vermin. The King wears a real one.', 'Nobody knows where a real crown came from, down here.'] },
  { title: 'The Knot', lines: ['To kill a Rat King you cannot kill one rat. You must', 'unmake the knot — break it faster than it can re-tie.', 'Hit it where the many become one. Then keep hitting.'] },
  { title: 'Last Map', lines: ['A jack\'s chart, water-warped: Drains, Cisterns, Works,', 'Warrens — and at the very bottom, circled hard enough', 'to tear the paper, two words: THE THRONE.'] },
  { title: 'Sewerjack\'s Creed, last line', lines: ['"I do not go down to be a hero in a sealed tunnel.', 'I go down to climb back up and turn on a tap and drink.', 'Remember the climbing up. Remember the water."'] },
  { title: 'Overheard in the Deep', lines: ['Three floors down, if the pipes go quiet, you can hear it:', 'a thousand rats squeaking in perfect, patient unison.', 'They are not hunting. They are praying. To something below.'] },
  { title: 'The Clean Tap', lines: ['An old jack kept a tin cup hung by the entrance ladder.', '"For when you come back up," he\'d say. "First clean water', 'tastes like the whole reason." His cup is still there.'] },
  { title: 'Before the Throne', lines: ['"If you\'re reading this you\'re nearly at the bottom.', 'The King will talk. It will make filth sound like a kingdom.', 'Take its crown. Climb out. Go drink. — a jack who didn\'t"'] },
];
