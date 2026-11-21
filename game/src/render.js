// All canvas drawing for Silent Corridors: the museum floor, cover, vision cones,
// the thief, the HUD and the menu / rating screens. Everything is canvas shapes —
// no images, no fonts loaded over the network.
import { TILE, COLS, ROWS, HUD_H, VIEW_W, VIEW_H, CANVAS_W, CANVAS_H } from './levels.js';
import { CONE_RANGE, CONE_HALF_ANGLE } from './guards.js';

const FLOOR_A = '#20242f';
const FLOOR_B = '#1b1f2a';
const WALL = '#3a4157';
const WALL_TOP = '#565f7d';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = col * TILE;
      const y = HUD_H + row * TILE;
      const ch = level.map[row][col];
      ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 'S') {
        ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
        ctx.fillRect(x, y, TILE, TILE);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Warm pools of lamplight over the artifacts and the exit: what is safe to read.
  ctx.save();
  for (const art of level.artifacts) {
    const g = ctx.createRadialGradient(art.x, art.y, 8, art.x, art.y, 110);
    g.addColorStop(0, 'rgba(255, 196, 90, 0.16)');
    g.addColorStop(1, 'rgba(255, 196, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(art.x - 110, art.y - 110, 220, 220);
  }
  const e = level.exit;
  const g = ctx.createRadialGradient(e.x, e.y, 8, e.x, e.y, 120);
  g.addColorStop(0, 'rgba(80, 255, 150, 0.14)');
  g.addColorStop(1, 'rgba(80, 255, 150, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(e.x - 120, e.y - 120, 240, 240);
  ctx.restore();
}

function drawCover(ctx, level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = level.map[row][col];
      const x = col * TILE;
      const y = HUD_H + row * TILE;
      if (ch === '#') {
        ctx.fillStyle = WALL;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(x, y, TILE, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y + TILE - 5, TILE, 5);
      } else if (ch === 'C') {
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = '#8a6238';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
      } else if (ch === 'D') {
        ctx.fillStyle = 'rgba(140, 190, 255, 0.25)';
        ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
        ctx.strokeStyle = '#9fc4ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = '#d7e6ff';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'P') {
        ctx.fillStyle = '#1e5c2e';
        ctx.beginPath();
        ctx.arc(x + 13, y + 15, 11, 0, Math.PI * 2);
        ctx.arc(x + 27, y + 13, 12, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 27, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2f8f46';
        ctx.beginPath();
        ctx.arc(x + 15, y + 13, 6, 0, Math.PI * 2);
        ctx.arc(x + 26, y + 24, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawArtifactsAndExit(ctx, game) {
  const level = game.level;
  for (const art of level.artifacts) {
    if (art.taken) continue;
    const pulse = 1 + Math.sin(game.time * 3 + art.tx) * 0.12;
    ctx.save();
    ctx.translate(art.x, art.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd34d';
    ctx.shadowColor = '#ffbf2e';
    ctx.shadowBlur = 14;
    const s = 9 * pulse;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(art.x, art.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const exit = level.exit;
  const allTaken = level.artifacts.every((a) => a.taken);
  ctx.save();
  ctx.fillStyle = allTaken ? '#2ecc71' : '#5a6b52';
  ctx.shadowColor = allTaken ? '#2ecc71' : 'transparent';
  ctx.shadowBlur = allTaken ? 18 : 0;
  roundRect(ctx, exit.x - 16, exit.y - 16, 32, 32, 6);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#062b16';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', exit.x, exit.y + 1);
  if (allTaken) {
    ctx.fillStyle = '#a9f5c6';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('OPEN — GO!', exit.x, exit.y - 26);
  }
}

function drawVisionCone(ctx, guard) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, CONE_RANGE, guard.angle - CONE_HALF_ANGLE, guard.angle + CONE_HALF_ANGLE);
  ctx.closePath();
  const g = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, CONE_RANGE);
  const hot = guard.state === 'chase';
  g.addColorStop(0, hot ? 'rgba(255, 70, 60, 0.34)' : 'rgba(255, 205, 70, 0.30)');
  g.addColorStop(1, hot ? 'rgba(255, 70, 60, 0.05)' : 'rgba(255, 205, 70, 0.05)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = hot ? 'rgba(255, 90, 80, 0.55)' : 'rgba(255, 215, 110, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard) {
  drawVisionCone(ctx, guard);
  // Body: a night guard in a dark uniform with a red cap, visible against the floor.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c2f3a';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  // Torch beam direction tick.
  ctx.rotate(guard.angle);
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(8, -2.5, 12, 5);
  ctx.restore();
  // State mark: "?" when suspicious, "!" when chasing.
  let mark = null;
  if (guard.state === 'chase') mark = '!';
  else if (guard.state === 'investigate' || guard.state === 'look' || guard.alert > 0.45) mark = '?';
  if (mark) {
    ctx.fillStyle = guard.state === 'chase' ? '#ff5a4d' : '#ffd34d';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mark, guard.x, guard.y - 26);
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // Soft shadow under the thief.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const r = p.sneaking ? 10 : 13;
  ctx.fillStyle = '#19c2b8';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0e7c78';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  // Hood point shows facing.
  ctx.rotate(p.faceAngle ?? 0);
  ctx.fillStyle = '#e8fffb';
  ctx.beginPath();
  ctx.moveTo(r + 4, 0);
  ctx.lineTo(r - 4, -5);
  ctx.lineTo(r - 4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (p.sneaking) {
    ctx.fillStyle = '#9ff5ef';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAKING', p.x, p.y - 22);
  }
}

function drawCoins(ctx, coins) {
  for (const coin of coins) {
    const lift = coin.landed ? 0 : Math.sin((coin.t * Math.PI)) * 26;
    ctx.save();
    ctx.fillStyle = '#ffd34d';
    ctx.shadowColor = '#ffbf2e';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y - lift, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (coin.landed && coin.ring > 0 && coin.ring < coin.ringMax) {
      ctx.strokeStyle = `rgba(255, 211, 77, ${0.7 * (1 - coin.ring / coin.ringMax)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.ring, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawHUD(ctx, game) {
  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = '#2a2f40';
  ctx.fillRect(0, HUD_H - 2, CANVAS_W, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`LEVEL ${game.levelIndex + 1}/${game.levelCount} · ${game.level.name}`, 12, HUD_H / 2);
  const taken = game.level.artifacts.filter((a) => a.taken).length;
  ctx.fillStyle = '#ffd34d';
  ctx.fillText(`◆ ${taken}/${game.level.artifacts.length}`, 250, HUD_H / 2);
  ctx.fillStyle = '#ffb347';
  ctx.fillText(`◉ ${game.player.coins}`, 330, HUD_H / 2);
  // Detection meter: fills when a guard sees the thief, decays when hidden.
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('DETECTION', 400, HUD_H / 2 - 1);
  const mw = 150;
  const mx = 480;
  ctx.fillStyle = '#262b38';
  roundRect(ctx, mx, HUD_H / 2 - 8, mw, 16, 4);
  ctx.fill();
  const frac = game.detection;
  ctx.fillStyle = frac < 0.5 ? '#2ecc71' : frac < 0.85 ? '#f5b301' : '#ff4d3d';
  if (frac > 0.01) {
    roundRect(ctx, mx, HUD_H / 2 - 8, mw * frac, 16, 4);
    ctx.fill();
  }
  ctx.strokeStyle = '#565f7d';
  ctx.lineWidth = 1;
  roundRect(ctx, mx, HUD_H / 2 - 8, mw, 16, 4);
  ctx.stroke();
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatTime(game.time), 800, HUD_H / 2);
  ctx.fillStyle = '#ffd34d';
  ctx.fillText(`★ ${game.score}`, 948, HUD_H / 2);
  ctx.textAlign = 'left';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#12151f';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, 230, 130, 500, 380, 14);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(title, CANVAS_W / 2, 185);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = '15px sans-serif';
  let y = 240;
  for (const line of lines) {
    ctx.fillText(line, CANVAS_W / 2, y);
    y += 30;
  }
  ctx.fillStyle = '#9aa3b8';
  ctx.font = '13px sans-serif';
  ctx.fillText('Press ENTER to continue', CANVAS_W / 2, 480);
  ctx.textAlign = 'left';
}

function drawMenu(ctx, game) {
  overlayPanel(ctx, 'SILENT CORRIDORS', [
    'A thief. A museum at night. Three floors of guards.',
    'Steal every artifact, then slip out through the EXIT — unseen.',
    '',
    'WASD / Arrows — move      SHIFT — sneak (slow, hard to spot)',
    'Click / E — throw a coin to lure a guard      R — restart level',
    'Hide behind crates, cases and plants. Shadows make you harder to see.',
    'Fill the detection meter and the guard gives chase — break line of',
    'sight to slip away again.      M — mute',
  ], '#19c2b8');
}

function ghostRating(spotted) {
  if (spotted === 0) return 'GHOST';
  if (spotted === 1) return 'SHADOW';
  return 'SPOTTED';
}

function drawLevelComplete(ctx, game) {
  const s = game.lastStats;
  const rating = ghostRating(s.spotted);
  const color = rating === 'GHOST' ? '#2ecc71' : rating === 'SHADOW' ? '#f5b301' : '#ff4d3d';
  overlayPanel(ctx, s.final ? 'HEIST COMPLETE!' : 'LEVEL CLEAR!', [
    `${game.level.name} — cleared in ${formatTime(s.time)}`,
    '',
    `Rating:  ${rating}`,
    `Times spotted: ${s.spotted}      Coins thrown: ${s.coinsUsed}`,
    `Artifacts: ${s.artifacts}/${s.artifactsTotal}      Score: ★ ${s.score}`,
    '',
    s.final ? 'Every floor robbed. The museum never saw you coming.' : 'Next floor: more guards, tighter patrols.',
  ], color);
}

function drawCaught(ctx, game) {
  overlayPanel(ctx, 'CAUGHT!', [
    'A guard got their hands on you.',
    'The museum keeps its artifacts — this time.',
    '',
    `Level ${game.levelIndex + 1} · ${game.level.name}`,
    'Press ENTER to try the floor again.',
  ], '#ff4d3d');
}

/** Draw the whole game state to the canvas. */
export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#0b0d14';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawFloor(ctx, game.level);
  drawCover(ctx, game.level);
  drawArtifactsAndExit(ctx, game);
  drawCoins(ctx, game.coins);
  for (const guard of game.guards) drawGuard(ctx, guard);
  if (game.screen === 'playing' || game.screen === 'menu') drawPlayer(ctx, game);
  drawHUD(ctx, game);
  if (game.screen === 'menu') drawMenu(ctx, game);
  if (game.screen === 'levelComplete') drawLevelComplete(ctx, game);
  if (game.screen === 'caught') drawCaught(ctx, game);
}
