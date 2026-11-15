// Owns round transitions, first-to-five scoring and match resets.
import { createState } from "./state.js";
// One round authority; first to five wins. A planted charge survives the round clock.
export function createRounds(state, player, weapon, bots, objective, grenades, effects) {
  function reset() {
    state.health = 100;
    state.armour = Math.max(50, state.armour);
    state.phase = "buy";
    state.timer = 15;
    state.buyOpen = false;
    state.messageTime = 0;
    state.noise.time = 0;
    state.footsteps = 0;
    state.hit = 0;
    state.damageFlash = 0;
    state.grenadeCount = Math.max(1, state.grenadeCount);
    player.reset();
    weapon.refill();
    bots.reset();
    objective.reset();
    grenades.reset();
  }
  function end(won) {
    state.lastWon = won;
    state.phase = won ? "won" : "lost";
    state.timer = 6;
    if (won) state.score.wins++;
    else state.score.losses++;
    state.money = Math.min(16000, state.money + (won ? 2700 : 1900));
    if (state.score.wins >= 5 || state.score.losses >= 5) {
      state.phase = "match";
      state.timer = 12;
    }
  }
  function step(dt) {
    if (state.phase === "match") return;
    state.timer = Math.max(0, state.timer - dt);
    if (state.phase === "buy" && state.timer === 0) {
      state.phase = "live";
      state.timer = 105;
    } else if (state.phase === "live") {
      const b = state.bomb;
      if (b.status === "exploded") end(true);
      else if (b.status === "defused") end(false);
      else if (state.health <= 0 && b.status !== "planted") end(false);
      else if (bots.remaining() === 0 && state.health > 0) end(true);
      else if (state.timer === 0 && b.status !== "planted") end(false);
    } else if (state.timer === 0 && state.phase !== "buy") {
      state.round++;
      reset();
    }
  }
  function restart() {
    const fresh = createState();
    // Keep objects captured by player/weapon and the scene's actor/grenade pools.
    const { player: p, weapon: w, bots: actors, grenades: pool } = state;
    Object.assign(p, fresh.player);
    Object.assign(w, fresh.weapon);
    Object.assign(state, fresh, { player: p, weapon: w, bots: actors, grenades: pool });
    for (const bot of actors) { bot.money = 600; bot.blind = 0; bot.visibleEnemy = false; }
    effects?.reset();
    reset();
  }
  return { reset, restart, step };
}
