// Guard behaviour for Silent Corridors: patrol loops with look-around pauses,
// vision cones, coin investigations and short chases with a chance to recover.
import { TILE, HUD_H, hasLineOfSight, isHiddenTile } from './levels.js';

export const CONE_RANGE = 185;
export const CONE_HALF_ANGLE = 0.62; // ~35 degrees each side
export const PATROL_SPEED = 68;
export const CHASE_SPEED = 132;
export const INVESTIGATE_SPEED = 95;
export const CHASE_TIME = 3.5;
export const LOOK_AROUND_TIME = 2.2;

/** Build a live guard from a patrol definition (waypoints in tile coordinates). */
export function createGuard(def) {
  const [tx, ty] = def.waypoints[0];
  return {
    x: tx * TILE + TILE / 2,
    y: HUD_H + ty * TILE + TILE / 2,
    angle: 0,
    state: 'patrol', // patrol | pause | investigate | look | chase | return
    waypoints: def.waypoints.map(([wx, wy]) => ({ x: wx * TILE + TILE / 2, y: HUD_H + wy * TILE + TILE / 2 })),
    wpIndex: 1,
    pause: def.pause ?? 1.2,
    pauseT: 0,
    scanBase: 0,
    scanT: 0,
    target: null,
    chaseT: 0,
    lostT: 0,
    lastSeen: null, // where the thief was last seen: searched before giving up
    home: null,
    alert: 0, // 0 calm .. 1 fully alarmed; drives the "?" / "!" mark
  };
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function turnToward(guard, wanted, dt, rate) {
  let diff = wanted - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.angle += step;
  return Math.abs(diff) < 0.05;
}

/** Walk toward a point; true when arrived. */
function moveToward(guard, tx, ty, speed, dt, level) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  guard.angle = angleTo(guard.x, guard.y, nx, ny);
  guard.x = nx;
  guard.y = ny;
  return dist - step < 4;
}

/**
 * How visible the thief is to this guard right now: 0 when unseen, up to 1 when
 * fully exposed. Sneaking, distance, darkness and cover all lower it.
 */
export function guardSeesPlayer(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return 0;
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  let visibility = 1 - dist / CONE_RANGE;
  visibility = 0.35 + visibility * 0.65;
  if (player.sneaking) visibility *= 0.45;
  if (isHiddenTile(level, player.x, player.y)) visibility *= 0.3;
  return visibility;
}

/** The guard's current vision cone, for drawing and for the detection check. */
export function updateVisionCone(guard) {
  return { x: guard.x, y: guard.y, angle: guard.angle, range: CONE_RANGE, halfAngle: CONE_HALF_ANGLE };
}

/** Send the nearest guard that can hear it to investigate a landed coin. */
export function attractGuardsToNoise(guards, x, y) {
  let best = null;
  let bestDist = 340;
  for (const guard of guards) {
    if (guard.state === 'chase') continue;
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = guard;
    }
  }
  if (best) {
    best.state = 'investigate';
    best.target = { x, y };
    best.alert = Math.max(best.alert, 0.55);
  }
  return best;
}

/** Advance one guard one step: patrol, pause-and-look, investigate, chase, return. */
export function updateGuard(guard, dt, level, player, detection) {
  const seen = guardSeesPlayer(guard, player, level);
  if (guard.state !== 'chase') {
    guard.alert = Math.max(0, guard.alert - dt * 0.25);
    if (seen > 0) guard.alert = Math.min(1, guard.alert + seen * dt * 0.9);
  }

  if (guard.state === 'patrol') {
    const target = guard.waypoints[guard.wpIndex];
    if (moveToward(guard, target.x, target.y, PATROL_SPEED, dt, level)) {
      guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
      guard.state = 'pause';
      guard.pauseT = guard.pause;
      guard.scanBase = guard.angle;
      guard.scanT = 0;
    }
  } else if (guard.state === 'pause') {
    // Look-around: sweep the view left and right while standing at the waypoint.
    guard.pauseT -= dt;
    guard.scanT += dt;
    guard.angle = guard.scanBase + Math.sin(guard.scanT * 2.1) * 1.15;
    if (guard.pauseT <= 0) guard.state = 'patrol';
  } else if (guard.state === 'investigate') {
    if (moveToward(guard, guard.target.x, guard.target.y, INVESTIGATE_SPEED, dt, level)) {
      guard.state = 'look';
      guard.pauseT = LOOK_AROUND_TIME;
      guard.scanBase = guard.angle;
      guard.scanT = 0;
    }
  } else if (guard.state === 'look') {
    guard.pauseT -= dt;
    guard.scanT += dt;
    guard.angle = guard.scanBase + Math.sin(guard.scanT * 2.6) * 1.4;
    if (guard.pauseT <= 0) {
      guard.state = 'return';
      guard.home = guard.waypoints[guard.wpIndex];
    }
  } else if (guard.state === 'return') {
    if (moveToward(guard, guard.home.x, guard.home.y, PATROL_SPEED, dt, level)) {
      guard.state = 'patrol';
    }
  } else if (guard.state === 'chase') {
    guard.chaseT -= dt;
    if (seen > 0) {
      guard.lostT = 0;
      guard.lastSeen = { x: player.x, y: player.y };
      moveToward(guard, player.x, player.y, CHASE_SPEED, dt, level);
    } else {
      guard.lostT += dt;
      if (guard.lostT > 1.2 || guard.chaseT <= 0) {
        // Lost the thief: search the spot they were last seen before giving up.
        if (guard.lastSeen) {
          guard.state = 'investigate';
          guard.target = guard.lastSeen;
          guard.lastSeen = null;
          guard.alert = 0.6;
        } else {
          guard.state = 'return';
          guard.home = guard.waypoints[guard.wpIndex];
          guard.alert = 0.4;
        }
      }
    }
    if (guard.chaseT <= 0 && guard.state === 'chase') {
      guard.state = 'return';
      guard.home = guard.waypoints[guard.wpIndex];
      guard.alert = 0.4;
    }
  }

  // Full detection meter trips the alarm: this guard gives chase, briefly.
  if (detection >= 1 && guard.state !== 'chase' && seen > 0) {
    guard.state = 'chase';
    guard.chaseT = CHASE_TIME;
    guard.lostT = 0;
    guard.alert = 1;
  }
  return seen;
}
