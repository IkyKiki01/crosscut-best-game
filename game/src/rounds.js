// One round authority; first to five wins. A planted charge survives the round clock.
export function createRounds(state, player, weapon, bots, objective, grenades) {
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
      if (state.phase === "match") {
        state.round = 0;
        state.score.wins = 0;
        state.score.losses = 0;
        state.money = 3600;
      }
      state.round++;
      reset();
    }
  }
  return { reset, step };
}
