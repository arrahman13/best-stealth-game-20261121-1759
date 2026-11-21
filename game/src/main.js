// Silent Corridors: game loop, state machine and input. The canvas is 960x640 with a
// 40px HUD bar on top and a 960x600 playfield below. Screens: menu, playing,
// levelComplete, caught. URL param ?shot=start|play|end renders a fixed scene for
// screenshots (see shots.js) with no input needed.
import { LEVELS, parseLevel, validateLevel, CANVAS_W, CANVAS_H, HUD_H, VIEW_W, VIEW_H } from './levels.js';
import { createGuard, updateGuard, guardSeesPlayer, attractGuardsToNoise } from './guards.js';
import { createPlayer, updatePlayer, throwCoin, updateCoins, fillDetectionMeter } from './player.js';
import { drawGame, formatTime } from './render.js';
import { SoundFX } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const sfx = new SoundFX();

/** The whole mutable game state, in one place. */
export const game = {
  screen: 'menu', // menu | playing | levelComplete | caught
  levelIndex: 0,
  levelCount: LEVELS.length,
  level: parseLevel(LEVELS[0]),
  player: null,
  guards: [],
  coins: [],
  detection: 0,
  time: 0,
  score: 0,
  spotted: 0,
  coinsUsed: 0,
  lastStats: null,
  alarmOn: false,
};

const input = { left: false, right: false, up: false, down: false, sneak: false };

function loadLevel(index) {
  game.levelIndex = index;
  game.level = parseLevel(LEVELS[index]);
  game.player = createPlayer(game.level.playerStart);
  game.player.coins = game.level.coins;
  game.player.faceAngle = -Math.PI / 2;
  game.guards = game.level.guardDefs.map((def) => createGuard(def));
  game.coins = [];
  game.detection = 0;
  game.time = 0;
  game.spotted = 0;
  game.coinsUsed = 0;
  game.alarmOn = false;
}

function startGame() {
  loadLevel(0);
  game.score = 0;
  game.screen = 'playing';
  announce('Level 1: Night Gallery. Steal every artifact, then reach the exit.');
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function levelScore(time, spotted, coinsUsed) {
  return Math.max(100, 1000 - Math.floor(time) * 5 - spotted * 150 - coinsUsed * 20);
}

function finishLevel() {
  const s = {
    time: game.time,
    spotted: game.spotted,
    coinsUsed: game.coinsUsed,
    artifacts: game.level.artifacts.length,
    artifactsTotal: game.level.artifacts.length,
    score: levelScore(game.time, game.spotted, game.coinsUsed),
    final: game.levelIndex === LEVELS.length - 1,
  };
  game.score += s.score;
  game.lastStats = s;
  game.screen = 'levelComplete';
  sfx.win();
  announce(`Level clear. Rating ${s.spotted === 0 ? 'Ghost' : s.spotted === 1 ? 'Shadow' : 'Spotted'}. Score ${game.score}.`);
}

function getCaught() {
  game.screen = 'caught';
  sfx.caught();
  announce('Caught by a guard. Press Enter to retry the level.');
}

/** Canvas point of a mouse click, accounting for the canvas being scaled to fit. */
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function throwCoinAt(x, y) {
  if (game.screen !== 'playing') return;
  const coin = throwCoin(game.player, x, y);
  if (coin) {
    game.coins.push(coin);
    game.coinsUsed += 1;
    sfx.coinLand();
  }
}

function onKeyDown(event) {
  sfx.ensure();
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') input.up = true;
  else if (key === 'arrowdown' || key === 's') input.down = true;
  else if (key === 'arrowleft' || key === 'a') input.left = true;
  else if (key === 'arrowright' || key === 'd') input.right = true;
  else if (key === 'shift') input.sneak = true;
  else if (key === 'e') {
    // Throw a coin ahead of the thief, in the direction they are facing.
    const reach = 150;
    throwCoinAt(
      game.player.x + Math.cos(game.player.faceAngle) * reach,
      game.player.y + Math.sin(game.player.faceAngle) * reach,
    );
  }
  else if (key === 'm') {
    const muted = sfx.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  } else if (key === 'r' && game.screen === 'playing') {
    loadLevel(game.levelIndex);
  } else if (key === 'enter') {
    if (game.screen === 'menu') startGame();
    else if (game.screen === 'levelComplete') {
      if (game.lastStats.final) startGame();
      else {
        loadLevel(game.levelIndex + 1);
        game.screen = 'playing';
      }
    } else if (game.screen === 'caught') {
      loadLevel(game.levelIndex);
      game.screen = 'playing';
    }
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'w') input.up = false;
  else if (key === 'arrowdown' || key === 's') input.down = false;
  else if (key === 'arrowleft' || key === 'a') input.left = false;
  else if (key === 'arrowright' || key === 'd') input.right = false;
  else if (key === 'shift') input.sneak = false;
}

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
canvas.addEventListener('mousedown', (event) => {
  sfx.ensure();
  if (game.screen === 'menu') {
    startGame();
    return;
  }
  const p = canvasPoint(event);
  throwCoinAt(p.x, p.y);
});

/** One fixed step of the simulation; returns false when the step ends the run. */
function step(dt) {
  if (game.screen !== 'playing') return;
  game.time += dt;
  const player = game.player;
  const stepped = updatePlayer(player, dt, input, game.level);
  if (stepped) {
    player.stepT = player.sneaking ? 0.45 : 0.34;
    sfx.footstep(player.sneaking);
  }
  if (input.left) player.faceAngle = Math.PI;
  else if (input.right) player.faceAngle = 0;
  else if (input.up) player.faceAngle = -Math.PI / 2;
  else if (input.down) player.faceAngle = Math.PI / 2;

  // Detection: the most alert guard's view fills the meter.
  let visibility = 0;
  for (const guard of game.guards) {
    visibility = Math.max(visibility, guardSeesPlayer(guard, player, game.level));
  }
  // Loud footsteps give the thief away: running close to a guard raises its alert
  // even outside the cone, so sneaking past a patrol really matters.
  if (player.moving && !player.sneaking) {
    for (const guard of game.guards) {
      const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
      if (dist < 130) guard.alert = Math.min(1, guard.alert + dt * 0.35);
    }
  }
  const wasAlarmed = game.detection >= 1;
  game.detection = fillDetectionMeter(game.detection, dt, visibility, player, game.level);
  if (game.detection >= 1 && !wasAlarmed) {
    game.spotted += 1;
    game.alarmOn = true;
    sfx.alarm();
    announce('Spotted! Break line of sight to slip away.');
  }
  if (game.detection < 0.4) game.alarmOn = false;

  for (const guard of game.guards) updateGuard(guard, dt, game.level, player, game.detection);

  // A chasing guard that touches the thief catches them.
  for (const guard of game.guards) {
    if (guard.state === 'chase' && Math.hypot(guard.x - player.x, guard.y - player.y) < 26) {
      getCaught();
      return;
    }
  }

  // Landed coins pull the nearest guard over to look.
  const landed = game.coins.filter((c) => c.landed && c.ring < 8);
  for (const coin of landed) attractGuardsToNoise(game.guards, coin.x, coin.y);
  game.coins = updateCoins(game.coins, dt);

  // Artifacts: walk over one to pocket it.
  for (const art of game.level.artifacts) {
    if (!art.taken && Math.hypot(art.x - player.x, art.y - player.y) < 26) {
      art.taken = true;
      sfx.pickup();
      announce(`Artifact stolen. ${game.level.artifacts.filter((a) => a.taken).length} of ${game.level.artifacts.length}.`);
    }
  }

  // Exit opens once every artifact is stolen; stepping in ends the level.
  const exit = game.level.exit;
  const allTaken = game.level.artifacts.every((a) => a.taken);
  if (allTaken && Math.hypot(exit.x - player.x, exit.y - player.y) < 24) finishLevel();
}

// Debug handle for play-testing (read-only state snapshot for automated checks).
window.__game = game;

// Boot: refuse to start a broken floor — a bad map should warn loudly, not silently
// strand the thief behind a wall. A ?shot= query renders one fixed scene for
// screenshots (see shots.js) with no input needed.
for (const def of LEVELS) {
  for (const problem of validateLevel(def)) console.warn('level problem:', problem);
}
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  loadLevel(0);
  stageShot(shot, game);
  drawGame(ctx, game);
  document.title = `Silent Corridors — ${shot} shot`;
} else {
  loadLevel(0);
  let last = performance.now();
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    // Guards keep patrolling behind the menu so the title scene is alive.
    if (game.screen === 'menu') {
      for (const guard of game.guards) updateGuard(guard, dt, game.level, game.player, 0);
    }
    drawGame(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
