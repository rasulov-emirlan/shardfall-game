// Procedural dungeon: rectangular rooms + L-corridors carved into a tile grid.
import { makeRNG, hashSeed } from './rng.js';

export const TILE = 16;
export const WALL = 0, FLOOR = 1, STAIRS = 2;

function carveRoom(tiles, w, room) {
  for (let y = room.y; y < room.y + room.h; y++)
    for (let x = room.x; x < room.x + room.w; x++)
      tiles[y * w + x] = FLOOR;
}

function carveH(tiles, w, x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) tiles[y * w + x] = FLOOR;
}
function carveV(tiles, w, y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) tiles[y * w + x] = FLOOR;
}

const overlaps = (a, b, pad = 1) =>
  a.x - pad < b.x + b.w && a.x + a.w + pad > b.x &&
  a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;

export function genFloor(seed, floorNum, isBoss) {
  const rng = makeRNG(hashSeed(seed, floorNum, 777));
  const w = isBoss ? 40 : 52, h = isBoss ? 32 : 40;
  const tiles = new Uint8Array(w * h).fill(WALL);
  const rooms = [];

  if (isBoss) {
    // One grand arena + a short entry room.
    const arena = { x: (w >> 1) - 11, y: (h >> 1) - 9, w: 22, h: 18 };
    const entry = { x: arena.x + 8, y: h - 7, w: 6, h: 5 };
    carveRoom(tiles, w, arena); carveRoom(tiles, w, entry);
    carveV(tiles, w, arena.y + arena.h - 1, entry.y, entry.x + 3);
    rooms.push(entry, arena);
    const spawn = { x: entry.x + 3, y: entry.y + 2 };
    const bossSpot = { x: arena.x + (arena.w >> 1), y: arena.y + (arena.h >> 1) };
    return { tiles, w, h, rooms, spawn, bossSpot, enemySpots: [], stairs: null, isBoss: true };
  }

  const target = 7 + Math.min(6, Math.floor(floorNum / 2));
  let tries = 0;
  while (rooms.length < target && tries < 200) {
    tries++;
    const rw = rng.int(5, 10), rh = rng.int(4, 8);
    const room = { x: rng.int(1, w - rw - 2), y: rng.int(1, h - rh - 2), w: rw, h: rh };
    if (rooms.some(r => overlaps(r, room))) continue;
    rooms.push(room);
  }
  rooms.forEach(r => carveRoom(tiles, w, r));

  // Connect each room to the previous (centers) with an L corridor.
  const center = r => ({ x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) });
  for (let i = 1; i < rooms.length; i++) {
    const a = center(rooms[i - 1]), b = center(rooms[i]);
    if (rng.chance(0.5)) { carveH(tiles, w, a.x, b.x, a.y); carveV(tiles, w, a.y, b.y, b.x); }
    else { carveV(tiles, w, a.y, b.y, a.x); carveH(tiles, w, a.x, b.x, b.y); }
  }

  const spawnRoom = rooms[0];
  const spawn = { x: spawnRoom.x + (spawnRoom.w >> 1), y: spawnRoom.y + (spawnRoom.h >> 1) };

  // Stairs in the room farthest from spawn.
  let far = rooms[1] || rooms[0], best = -1;
  for (const r of rooms) {
    const c = center(r);
    const d = (c.x - spawn.x) ** 2 + (c.y - spawn.y) ** 2;
    if (d > best) { best = d; far = r; }
  }
  const stairs = { x: far.x + (far.w >> 1), y: far.y + (far.h >> 1) };
  tiles[stairs.y * w + stairs.x] = STAIRS;

  // Enemy spawn spots: scattered floor tiles in non-spawn rooms.
  const enemySpots = [];
  const count = 4 + floorNum * 2 + rng.int(0, 3);
  let guard = 0;
  while (enemySpots.length < count && guard < 400) {
    guard++;
    const r = rng.pick(rooms);
    if (r === spawnRoom) continue;
    const ex = r.x + rng.int(1, r.w - 2), ey = r.y + rng.int(1, r.h - 2);
    if (tiles[ey * w + ex] !== FLOOR) continue;
    if (ex === stairs.x && ey === stairs.y) continue;
    enemySpots.push({ x: ex, y: ey });
  }

  // Shrine: a lore glyph in some room that isn't the spawn or stairs room.
  let shrineSpot = null;
  for (let attempt = 0; attempt < 40 && !shrineSpot; attempt++) {
    const r = rng.pick(rooms);
    if (r === spawnRoom || r === far) continue;
    const sx = r.x + (r.w >> 1), sy = r.y + (r.h >> 1);
    if (tiles[sy * w + sx] === FLOOR && !(sx === stairs.x && sy === stairs.y)) shrineSpot = { x: sx, y: sy };
  }
  if (!shrineSpot && rooms.length > 1) { const r = rooms[1]; shrineSpot = { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1) }; }

  return { tiles, w, h, rooms, spawn, stairs, enemySpots, shrineSpot, bossSpot: null, isBoss: false };
}

// A small safe room reached after each boss: merchant, forge, and a down-stair.
export function genSanctum() {
  const w = 22, h = 15;
  const tiles = new Uint8Array(w * h).fill(WALL);
  const room = { x: 2, y: 2, w: w - 4, h: h - 4 };
  carveRoom(tiles, w, room);
  const cx = w >> 1;
  const spawn = { x: cx, y: h - 4 };
  const stairs = { x: cx, y: 3 };
  tiles[stairs.y * w + stairs.x] = STAIRS;
  const interactables = [
    { type: 'merchant', x: room.x + 2, y: room.y + 2 },
    { type: 'forge', x: room.x + room.w - 3, y: room.y + 2 },
  ];
  return { tiles, w, h, rooms: [room], spawn, stairs, interactables, enemySpots: [], shrineSpot: null, bossSpot: null, isBoss: false, isSanctum: true };
}

export function isSolid(floor, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= floor.w || ty >= floor.h) return true;
  return floor.tiles[ty * floor.w + tx] === WALL;
}
