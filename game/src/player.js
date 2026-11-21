// The thief: movement, sneaking, coin throws and the detection meter.
import { TILE, HUD_H, VIEW_W, VIEW_H, hitsWall, isHiddenTile } from './levels.js';

export const WALK_SPEED = 152;
export const SNEAK_SPEED = 86;
export const PLAYER_RADIUS = 13;
export const COIN_RANGE = 230;
export const COIN_FLIGHT = 0.42;

/** A fresh thief at the level's start tile. */
export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    sneaking: false,
    moving: false,
    stepT: 0,
    coins: 0,
    coinCooldown: 0,
  };
}

/** Move the thief with the held keys; walls stop the slide, axis by axis. */
export function updatePlayer(player, dt, input, level) {
  const speed = input.sneak ? SNEAK_SPEED : WALK_SPEED;
  player.sneaking = input.sneak;
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const nx = player.x + dx * speed * dt;
    if (!hitsWall(level, nx, player.y, player.radius)) player.x = nx;
    const ny = player.y + dy * speed * dt;
    if (!hitsWall(level, player.x, ny, player.radius)) player.y = ny;
    player.x = Math.max(TILE / 2, Math.min(VIEW_W - TILE / 2, player.x));
    player.y = Math.max(HUD_H + TILE / 2, Math.min(HUD_H + VIEW_H - TILE / 2, player.y));
    player.stepT -= dt;
  }
  if (player.coinCooldown > 0) player.coinCooldown -= dt;
  return player.moving && player.stepT <= 0;
}

/**
 * Throw a coin toward a canvas point (mouse click or E key): it arcs out to at most
 * COIN_RANGE and lands with a ring of noise. Returns the coin, or null when the
 * thief is out of coins or still winding up.
 */
export function throwCoin(player, targetX, targetY) {
  if (player.coins <= 0 || player.coinCooldown > 0) return null;
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy);
  const reach = Math.min(dist, COIN_RANGE);
  const nx = player.x + (dist === 0 ? 0 : (dx / dist) * reach);
  const ny = player.y + (dist === 0 ? 0 : (dy / dist) * reach);
  player.coins -= 1;
  player.coinCooldown = 0.35;
  return {
    x: player.x,
    y: player.y,
    fromX: player.x,
    fromY: player.y,
    toX: nx,
    toY: ny,
    t: 0,
    landed: false,
    ring: 0,
    ringMax: 64,
  };
}

/** Fly a thrown coin to its landing spot, then ring outward until it fades. */
export function updateCoins(coins, dt) {
  for (const coin of coins) {
    if (!coin.landed) {
      coin.t += dt / COIN_FLIGHT;
      if (coin.t >= 1) {
        coin.t = 1;
        coin.landed = true;
        coin.x = coin.toX;
        coin.y = coin.toY;
      } else {
        const ease = coin.t;
        coin.x = coin.fromX + (coin.toX - coin.fromX) * ease;
        coin.y = coin.fromY + (coin.toY - coin.fromY) * ease;
      }
    } else if (coin.ring < coin.ringMax) {
      coin.ring += dt * 130;
    }
  }
  return coins.filter((coin) => !coin.landed || coin.ring < coin.ringMax);
}

/**
 * Fill or drain the detection meter: guards that see the thief fill it (faster when
 * the thief runs in the open, slower while sneaking or in the dark); hiding drains it.
 * Returns the new meter value, 0..1.
 */
export function fillDetectionMeter(meter, dt, visibility, player, level) {
  if (visibility > 0) {
    let rate = 0.55 + visibility * 0.9;
    if (player.sneaking) rate *= 0.55;
    if (isHiddenTile(level, player.x, player.y)) rate *= 0.4;
    return Math.min(1, meter + rate * dt);
  }
  return Math.max(0, meter - dt * 0.5);
}
