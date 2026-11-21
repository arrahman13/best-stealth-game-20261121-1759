// Level definitions for Silent Corridors: three museum floors, each a 24x15 tile map.
// Tile legend: '#' wall, '.' floor, 'C' crate (cover, blocks sight), 'D' display case
// (cover, blocks sight), 'P' plant (soft cover: hides the thief, sight passes over it),
// 'S' shadow pool (dark floor: the thief is harder to spot there), 'A' artifact to steal,
// 'E' exit door, 'T' thief start. Guards patrol the waypoint loops below.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const HUD_H = 40;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 600
export const CANVAS_W = VIEW_W;
export const CANVAS_H = HUD_H + VIEW_H; // 640

export const LEVELS = [
  {
    name: 'Night Gallery',
    coins: 5,
    map: [
      '########################',
      '#....C......A..........#',
      '#..P...........D.......#',
      '#......##.......C......#',
      '#..S...##.......P......#',
      '#......##..............#',
      '#..C..........A....#...#',
      '#.................#....#',
      '#..A....####....#...E..#',
      '#.......#.......#......#',
      '#..P....#...C...#...S..#',
      '#.......#.......#......#',
      '#..C....#...A...#...P..#',
      '#..T...................#',
      '########################',
    ],
    guards: [
      { waypoints: [[5, 2], [18, 2], [18, 6], [5, 6]], pause: 1.4 },
      { waypoints: [[4, 10], [11, 10], [11, 12], [20, 12]], pause: 1.2 },
    ],
  },
  {
    name: 'Sculpture Hall',
    coins: 5,
    map: [
      '########################',
      '#..A.....C......P....E.#',
      '#.......##......#......#',
      '#..D....##..A...#..C...#',
      '#.......##......#......#',
      '#..S..........P........#',
      '#....####..........##..#',
      '#....#........C....##..#',
      '#..C.#....A.......##...#',
      '#....#.....P..........D#',
      '#..P.#....####....S....#',
      '#....#....#.......C....#',
      '#..A.#....#..P.....A...#',
      '#..T...................#',
      '########################',
    ],
    guards: [
      { waypoints: [[3, 2], [10, 2], [10, 5], [3, 5]], pause: 1.2 },
      { waypoints: [[14, 1], [21, 1], [21, 7], [13, 7]], pause: 1.5 },
      { waypoints: [[6, 9], [16, 9], [16, 13], [6, 13]], pause: 1.0 },
    ],
  },
  {
    name: 'The Vault Wing',
    coins: 6,
    map: [
      '########################',
      '#..A..C....D.....A...E.#',
      '#.....#....#....#......#',
      '#..P..#....#....#..C...#',
      '#.....#....#....#......#',
      '#..S..#....#..P.#..S...#',
      '#.....#....#....#......#',
      '#..C..#....#....#..D...#',
      '#.....#....#....#......#',
      '#..P..#....#..A.#..P...#',
      '#.....#....#....#......#',
      '#..A..#....#....#..C...#',
      '#.....#....#....#......#',
      '#..T..#....#....#..A...#',
      '########################',
    ],
    guards: [
      { waypoints: [[2, 2], [2, 12], [4, 12], [4, 2]], pause: 1.3 },
      { waypoints: [[10, 2], [10, 12], [14, 12], [14, 2]], pause: 1.1 },
      { waypoints: [[17, 2], [21, 2], [21, 12], [17, 12]], pause: 1.4 },
      { waypoints: [[8, 7], [15, 7], [15, 9], [8, 9]], pause: 0.9 },
    ],
  },
];

/** Check one level definition before it ships: shape, one start, one exit, at least
 * one artifact, and every guard waypoint on a walkable tile. Returns problem strings. */
export function validateLevel(def) {
  const problems = [];
  if (def.map.length !== ROWS) problems.push(`${def.name}: ${def.map.length} rows, want ${ROWS}`);
  let starts = 0;
  let exits = 0;
  let artifacts = 0;
  def.map.forEach((row, i) => {
    if (row.length !== COLS) problems.push(`${def.name}: row ${i} is ${row.length} tiles, want ${COLS}`);
    for (const ch of row) {
      if (ch === 'T') starts += 1;
      if (ch === 'E') exits += 1;
      if (ch === 'A') artifacts += 1;
      if (!'# .CDPSEAT'.includes(ch)) problems.push(`${def.name}: unknown tile '${ch}' in row ${i}`);
    }
  });
  if (starts !== 1) problems.push(`${def.name}: ${starts} thief starts, want 1`);
  if (exits !== 1) problems.push(`${def.name}: ${exits} exits, want 1`);
  if (artifacts < 1) problems.push(`${def.name}: no artifacts to steal`);
  for (const g of def.guards) {
    for (const [wx, wy] of g.waypoints) {
      const ch = def.map[wy] && def.map[wy][wx];
      if (ch === '#' || ch === 'C' || ch === 'D' || ch === undefined) {
        problems.push(`${def.name}: guard waypoint (${wx},${wy}) is blocked by '${ch}'`);
      }
    }
  }
  return problems;
}

/** Parse one level definition into the live level object the game uses. */
export function parseLevel(def) {
  const level = {
    name: def.name,
    coins: def.coins,
    map: def.map,
    walls: new Set(),
    sightBlockers: new Set(),
    plants: new Set(),
    shadows: new Set(),
    artifacts: [],
    exit: null,
    playerStart: null,
    guardDefs: def.guards,
  };
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = def.map[row][col];
      const key = `${col},${row}`;
      if (ch === '#') level.walls.add(key);
      if (ch === 'C' || ch === 'D' || ch === '#') level.sightBlockers.add(key);
      if (ch === 'P') level.plants.add(key);
      if (ch === 'S') level.shadows.add(key);
      if (ch === 'A') level.artifacts.push({ tx: col, ty: row, x: col * TILE + TILE / 2, y: HUD_H + row * TILE + TILE / 2, taken: false });
      if (ch === 'E') level.exit = { tx: col, ty: row, x: col * TILE + TILE / 2, y: HUD_H + row * TILE + TILE / 2 };
      if (ch === 'T') level.playerStart = { tx: col, ty: row, x: col * TILE + TILE / 2, y: HUD_H + row * TILE + TILE / 2 };
    }
  }
  return level;
}

/** Tile coordinates of a pixel position inside the playfield. */
export function tileOf(x, y) {
  return { tx: Math.floor(x / TILE), ty: Math.floor((y - HUD_H) / TILE) };
}

export function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

export function isWall(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return level.walls.has(tileKey(tx, ty));
}

/** A tile that stops a guard's line of sight (walls and tall cover). */
export function blocksSight(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return level.sightBlockers.has(tileKey(tx, ty));
}

/** True when the thief stands in a plant or a shadow pool: hard to spot there. */
export function isHiddenTile(level, x, y) {
  const { tx, ty } = tileOf(x, y);
  return level.plants.has(tileKey(tx, ty)) || level.shadows.has(tileKey(tx, ty));
}

/** Circle-vs-tile collision: true when a circle at (x, y) with radius r hits a wall. */
export function hitsWall(level, x, y, r) {
  const { tx, ty } = tileOf(x, y);
  for (let row = ty - 1; row <= ty + 1; row += 1) {
    for (let col = tx - 1; col <= tx + 1; col += 1) {
      if (!isWall(level, col, row)) continue;
      const nearestX = Math.max(col * TILE, Math.min(x, col * TILE + TILE));
      const nearestY = Math.max(HUD_H + row * TILE, Math.min(y, HUD_H + row * TILE + TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

/**
 * Line of sight between two pixel points: sample along the segment and fail when a
 * sight-blocking tile is crossed. Guards use it for vision cones; the thief uses it
 * to know whether cover really hides them.
 */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    const { tx, ty } = tileOf(x, y);
    if (blocksSight(level, tx, ty)) return false;
  }
  return true;
}
