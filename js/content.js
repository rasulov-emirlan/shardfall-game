// All game content: biomes, enemies, bosses, acts, story, lore. Data-driven so
// floors/acts/text scale without touching engine code.
import { SPRITES, BOSSES } from './sprites.js';

// ---------- biome palettes (tile rendering per act) ----------
export const BIOMES = {
  crypt:   { floorA: '#241d3a', floorB: '#211a35', floorC: '#1e1832', wallFace: '#1b1730', wallTop: '#3a3160', wallEdge: '#0e0b1c', tint: '#6fe0ff' },
  warrens: { floorA: '#1d2e1f', floorB: '#1a2a1c', floorC: '#182618', wallFace: '#16261a', wallTop: '#2f5236', wallEdge: '#0a160c', tint: '#7fe08a' },
  vault:   { floorA: '#15283a', floorB: '#132435', floorC: '#112132', wallFace: '#102234', wallTop: '#2f5a72', wallEdge: '#081420', tint: '#6fd0e0' },
  ashen:   { floorA: '#2e1a16', floorB: '#2a1714', floorC: '#261512', wallFace: '#241410', wallTop: '#6a2f1a', wallEdge: '#160806', tint: '#ff8a4a' },
  throne:  { floorA: '#241a30', floorB: '#20162c', floorC: '#1c1428', wallFace: '#1a1226', wallTop: '#5a3f7a', wallEdge: '#0c0816', tint: '#c98fff' },
  sanctum: { floorA: '#2e2820', floorB: '#2a241c', floorC: '#262018', wallFace: '#241e18', wallTop: '#6a5a3a', wallEdge: '#16120c', tint: '#ffd24a' },
};

// ---------- enemies ----------
export const ENEMY_DEFS = {
  slime:    { sprite: SPRITES.slime,    hp: 14, atk: 5,  def: 0, speed: 30, xp: 6,  r: 6, kind: 'melee'   },
  bat:      { sprite: SPRITES.bat,      hp: 9,  atk: 4,  def: 0, speed: 58, xp: 5,  r: 5, kind: 'erratic' },
  skeleton: { sprite: SPRITES.skeleton, hp: 24, atk: 9,  def: 3, speed: 40, xp: 11, r: 6, kind: 'melee'   },
  mage:     { sprite: SPRITES.mage,     hp: 16, atk: 7,  def: 1, speed: 30, xp: 13, r: 6, kind: 'ranged'  },
  spider:   { sprite: SPRITES.spider,   hp: 12, atk: 6,  def: 0, speed: 66, xp: 8,  r: 6, kind: 'erratic' },
  spitter:  { sprite: SPRITES.spitter,  hp: 20, atk: 7,  def: 1, speed: 24, xp: 11, r: 6, kind: 'ranged'  },
  drowned:  { sprite: SPRITES.drowned,  hp: 36, atk: 12, def: 2, speed: 24, xp: 15, r: 6, kind: 'melee'   },
  brute:    { sprite: SPRITES.brute,    hp: 64, atk: 15, def: 5, speed: 28, xp: 24, r: 7, kind: 'melee'   },
  cultist:  { sprite: SPRITES.cultist,  hp: 24, atk: 10, def: 2, speed: 30, xp: 17, r: 6, kind: 'ranged'  },
  wraith:   { sprite: SPRITES.wraith,   hp: 20, atk: 11, def: 0, speed: 70, xp: 16, r: 6, kind: 'erratic' },
  knight:   { sprite: SPRITES.knight,   hp: 78, atk: 16, def: 9, speed: 34, xp: 28, r: 7, kind: 'melee'   },
  archer:   { sprite: SPRITES.archer,   hp: 22, atk: 10, def: 2, speed: 34, xp: 15, r: 6, kind: 'ranged'  },
};

// ---------- bosses ----------
export const BOSS_DEFS = {
  warden: {
    name: 'The Hollow Warden', sprite: BOSSES.warden, hp: 340, atk: 16, def: 6, speed: 42, xp: 130, r: 14,
    pattern: 'ring',
    intro: ['A rusted titan unfolds from the dark.', '"I have guarded the first shard since the fall.', 'Turn back, Wardenscar, while you are still warm."'],
    slain: ['The Warden buckles. Its breastplate splits and', 'a shard tumbles out, humming with cold light.', 'One of five. The descent has only begun.'],
  },
  broodmother: {
    name: 'The Brood Mother', sprite: BOSSES.broodmother, hp: 760, atk: 22, def: 9, speed: 30, xp: 280, r: 15,
    pattern: 'brood',
    intro: ['The walls breathe. Ten thousand eyes open.', '"You took a shard from my warren, little warmth.', 'You will feed my children for the theft."'],
    slain: ['Her chittering dies to silence. The second shard', 'cools in your palm, slick with her ichor.', 'Two of five. Something below is waiting.'],
  },
  tidewrought: {
    name: 'The Tidewrought', sprite: BOSSES.tidewrought, hp: 1260, atk: 27, def: 11, speed: 26, xp: 470, r: 15,
    pattern: 'tide',
    intro: ['The flooded vault stirs. A drowned god rises,', 'shard-light pouring from its ribs like a lantern.', '"The deep keeps what it swallows. Even stars."'],
    slain: ['The leviathan sinks back into still black water,', 'and the third shard floats up to meet your hand.', 'Three of five. You are far from any sky now.'],
  },
  ashenchoir: {
    name: 'The Ashen Choir', sprite: BOSSES.ashenchoir, hp: 1760, atk: 31, def: 13, speed: 30, xp: 720, r: 15,
    pattern: 'choir',
    intro: ['A conclave fused into one burning shape turns', 'as one, and sings your name in a hundred voices.', '"We were pilgrims once. The King taught us fire.', 'Kneel, and the fourth shard is yours to bear."'],
    slain: ['The Choir gutters out, voice by voice, until one', 'ember remains — the fourth shard, white-hot, then cold.', 'Four of five. Only the Throne lies beneath you.'],
  },
  hollowking: {
    name: 'The Hollow King', sprite: BOSSES.hollowking, hp: 2700, atk: 36, def: 16, speed: 50, xp: 1200, r: 15,
    pattern: 'king',
    intro: ['On a throne of fused shard-bone, a figure waits.', 'Its brand matches yours. It was a Wardenscar, once.', '"I gathered all five. I tried to reforge the star.', 'The star reforged ME. This is what it asks, kinling —', 'everything warm in you, for a little light. Come."'],
    slain: ['The King unmakes — not in rage, but relief.', '"...thank you," it breathes, and is gone.', 'The five shards rise and circle, drawn together,', 'and the Lodestar remembers how to be whole.'],
  },
};

// ---------- acts (each: N normal floors, then 1 boss floor) ----------
export const ACTS = [
  {
    name: 'The Undercroft', biome: 'crypt', boss: 'warden', normalFloors: 4,
    enemies: ['slime', 'bat', 'slime', 'skeleton'],
    intro: ['ACT I — THE UNDERCROFT', 'You climb down into the bone-cellars beneath the world.',
      'The Lodestar\'s warmth fades behind you, stair by stair.', 'Somewhere below, the first shard is caged.'],
  },
  {
    name: 'The Brood Warrens', biome: 'warrens', boss: 'broodmother', normalFloors: 4,
    enemies: ['spider', 'bat', 'spitter', 'skeleton'],
    intro: ['ACT II — THE BROOD WARRENS', 'The stone gives way to silk and chitin. The Warrens.',
      'Things scuttle just past your light. They are not afraid.', 'They are hungry, and they are between you and the second shard.'],
  },
  {
    name: 'The Drowned Vault', biome: 'vault', boss: 'tidewrought', normalFloors: 4,
    enemies: ['drowned', 'archer', 'brute', 'mage'],
    intro: ['ACT III — THE DROWNED VAULT', 'Black water laps at flooded halls older than the surface.',
      'The drowned do not rot here — the shard-light keeps them.', 'It keeps them, and it hates the living for being warm.'],
  },
  {
    name: 'The Ashen Deep', biome: 'ashen', boss: 'ashenchoir', normalFloors: 4,
    enemies: ['cultist', 'wraith', 'brute', 'mage'],
    intro: ['ACT IV — THE ASHEN DEEP', 'Heat now, where there should be only cold and depth.',
      'Pilgrims came this far chasing the King\'s promise of fire.', 'They never left. They became the fire. They are still singing.'],
  },
  {
    name: 'The Hollow Throne', biome: 'throne', boss: 'hollowking', normalFloors: 4,
    enemies: ['knight', 'wraith', 'cultist', 'archer'],
    intro: ['ACT V — THE HOLLOW THRONE', 'The deepest dark, and it is not dark at all —',
      'it glows with stolen starlight, sourceless and sick.', 'The First Wardenscar sits at the bottom of the world.', 'You have come to take back what it took, or to join it.'],
  },
];

// total floors and floor → act mapping
export const FLOOR_PLAN = (() => {
  const plan = []; // index 0 unused; plan[floorNum] = {actIndex, isBoss, biome, boss}
  plan.push(null);
  ACTS.forEach((act, ai) => {
    for (let i = 0; i < act.normalFloors; i++) plan.push({ actIndex: ai, isBoss: false, biome: act.biome });
    plan.push({ actIndex: ai, isBoss: true, biome: act.biome, boss: act.boss }); // boss floor
  });
  return plan;
})();
export const TOTAL_FLOORS = FLOOR_PLAN.length - 1;
export const SHARDS_TOTAL = ACTS.length;

export function floorInfo(n) { return FLOOR_PLAN[n] || FLOOR_PLAN[TOTAL_FLOORS]; }
export function actOf(n) { return ACTS[floorInfo(n).actIndex]; }
// is this the first floor of its act? (for act-intro dialog)
export function isActStart(n) {
  const info = floorInfo(n); if (!info || info.isBoss) return false;
  const prev = FLOOR_PLAN[n - 1];
  return !prev || prev.actIndex !== info.actIndex;
}

// ---------- opening / epilogue ----------
export const OPENING = [
  'SHARDFALL',
  'The Lodestar — the star that burned at the heart of the',
  'deep and lit the whole world from below — has shattered.',
  'Its five shards fell further down, into the Underhold,',
  'and woke things that should have slept forever.',
  'Above, the light is going out, hour by hour.',
  'You are a Wardenscar, oath-branded to the star.',
  'Descend. Recover all five shards. Reforge the Lodestar —',
  'before the dark below climbs up to meet the dark above.',
];
export const EPILOGUE = [
  'EPILOGUE',
  'The reforged Lodestar sinks back to its old seat and',
  'catches — a slow, certain dawn pushing up through stone.',
  'You climb. The brand on your arm goes cold and quiet,',
  'its oath kept. The King\'s last word follows you up:',
  'a warning, and a thanks, from one who could not climb back.',
  'You step out into morning. You are tired. You are warm.',
  'You are, still, yourself. That was the whole victory.',
  '— THE END —',
];

// ---------- lore fragments (found at shrines) ----------
export const LORE = [
  { title: 'Warden\'s Oath', lines: ['"I take the brand not for glory but for dawn.', 'I descend so others need not. I keep the warmth."', '— the Wardenscar oath, first line'] },
  { title: 'On the Lodestar', lines: ['The star never hung in the sky. It burned below,', 'and the world was lit from its own deep heart.', 'We forgot that. We thought light fell from above.'] },
  { title: 'The First to Fall', lines: ['One Wardenscar came before all the rest, they say,', 'and recovered every shard, and was never seen again.', 'We struck a statue for the hero. It is always cold.'] },
  { title: 'Cellarer\'s Note', lines: ['"The bones down here won\'t stay buried. They sit up', 'when the shard-light flickers, like men remembering', 'they had somewhere to be. I have stopped digging."'] },
  { title: 'The Hollowing', lines: ['A shard is not a lantern you carry. It is a mouth.', 'It gives light and takes warmth, slow, year by year,', 'until the bearer is all light and nothing else.'] },
  { title: 'Brood-Speech', lines: ['The spiders do not hunt for hunger alone. They weave', 'the shard-song into their silk and listen to it.', 'Whatever it tells them, it tells them to multiply.'] },
  { title: 'A Pilgrim\'s Letter', lines: ['"We go down to the Deep to be warmed by the King\'s fire.', 'He says cold is the only sin and he will burn it out of us.', 'If you read this, do not follow. The fire does not stop."'] },
  { title: 'On the Drowned', lines: ['Water should rot a corpse. Here it preserves them,', 'shard-lit and patient, mistaking the living for thieves.', 'They are not wrong. We are all here to steal the light.'] },
  { title: 'Warden\'s Oath, cont.', lines: ['"...and if I am hollowed, let another take the brand,', 'and let them put me down as I would a Warden lost.', 'No shard is worth a Warden who forgets the dawn."'] },
  { title: 'The King\'s First Word', lines: ['Scratched into the throne-stair, in a Warden\'s hand:', '"It worked. The star is whole. Why am I still cold?', 'Why is it asking for more? I have nothing left to give—"'] },
  { title: 'Counting the Shards', lines: ['Five fell. Five must return. Reforging needs them all —', 'four is a furnace with no fire, a lamp with no flame.', 'Stop at four and you have only fed the dark below.'] },
  { title: 'The Tidewrought', lines: ['Before it drowned, it was the vault\'s last keeper,', 'who swallowed a shard to keep it from raiders.', 'The shard kept HIM. Now he keeps the whole black flood.'] },
  { title: 'Choir Practice', lines: ['You can hear them three floors up if the stone is quiet:', 'a hundred pilgrims singing in one fused, burning throat.', 'They are not in pain. That is the most frightening part.'] },
  { title: 'Why We Descend', lines: ['A child on the surface asked why the Wardens go down', 'and never come back up the same, or at all.', 'Her grandmother said: "So that you will see a morning."'] },
  { title: 'The Brand', lines: ['The oath-brand is a sliver of the Lodestar set in skin.', 'It warms when the bearer keeps faith, cools when they fail,', 'and goes out entirely the moment they are hollowed through.'] },
  { title: 'Warden\'s Oath, last line', lines: ['"I do not descend to become a legend in cold stone.', 'I descend to climb back out. Remember the climbing out.', 'That is the part the King forgot. Do not forget it."'] },
  { title: 'On Reforging', lines: ['The star is not reforged by strength but by surrender —', 'you must give it the shards AND refuse to give it you.', 'Hold the line between. That line is the whole of the art.'] },
  { title: 'Map Fragment', lines: ['Someone charted the descent before losing their nerve:', 'Undercroft, Warrens, Vault, Deep, and at the floor', 'of the world a single word, underlined twice: THRONE.'] },
  { title: 'The Statue, Revisited', lines: ['The hero\'s statue on the surface — the First Wardenscar —', 'they carved it crowned. No Warden is ever crowned.', 'Someone, long ago, already knew what he had become.'] },
  { title: 'Last Note Before the Throne', lines: ['"If you are reading this, you are nearly at the bottom.', 'He will sound reasonable. He will sound like you, tired.', 'Give the star the shards. Do not give it the rest. Climb."'] },
];
