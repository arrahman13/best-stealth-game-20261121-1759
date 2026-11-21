// Fixed screenshot scenes behind ?shot=start|play|end. Each one places the real game
// objects in a deterministic mid-game arrangement and draws one frame, so the same
// URL always renders the same picture with no input needed.
import { TILE, HUD_H } from './levels.js';

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: HUD_H + ty * TILE + TILE / 2 };
}

/** The title scene: the menu over level 1, guards mid-patrol. */
function stageStart(game) {
  const g1 = tileCentre(12, 2);
  game.guards[0].x = g1.x;
  game.guards[0].y = g1.y;
  game.guards[0].angle = 0;
  game.guards[0].wpIndex = 2;
  const g2 = tileCentre(8, 10);
  game.guards[1].x = g2.x;
  game.guards[1].y = g2.y;
  game.guards[1].angle = Math.PI / 2;
  game.guards[1].wpIndex = 1;
  game.screen = 'menu';
}

/**
 * The mid-game scene: the thief sneaking behind a crate while a guard's cone sweeps
 * toward them, one artifact already pocketed, the exit glowing across the floor.
 */
function stagePlay(game) {
  const playerAt = tileCentre(4, 7);
  game.player.x = playerAt.x;
  game.player.y = playerAt.y;
  game.player.sneaking = true;
  game.player.faceAngle = Math.PI / 2;
  game.player.coins = 4;
  const guardAt = tileCentre(5, 6);
  game.guards[0].x = guardAt.x;
  game.guards[0].y = guardAt.y;
  game.guards[0].angle = Math.PI * 0.75; // cone sweeping down-left, at the thief
  game.guards[0].alert = 0.5;
  const guard2At = tileCentre(13, 10);
  game.guards[1].x = guard2At.x;
  game.guards[1].y = guard2At.y;
  game.guards[1].angle = -Math.PI / 2;
  game.guards[1].wpIndex = 2;
  game.level.artifacts[0].taken = true;
  game.detection = 0.45;
  game.time = 47;
  game.score = 320;
  game.screen = 'playing';
}

/** The rating scene: the level-clear panel with a GHOST rating. */
function stageEnd(game) {
  for (const art of game.level.artifacts) art.taken = true;
  game.lastStats = {
    time: 83,
    spotted: 0,
    coinsUsed: 2,
    artifacts: game.level.artifacts.length,
    artifactsTotal: game.level.artifacts.length,
    score: 1240,
    final: false,
  };
  game.score = 1240;
  game.time = 83;
  game.screen = 'levelComplete';
}

/** Set the game to the named scene (start, play or end; any other name is start). */
export function stageShot(name, game) {
  if (name === 'play') stagePlay(game);
  else if (name === 'end') stageEnd(game);
  else stageStart(game);
}
