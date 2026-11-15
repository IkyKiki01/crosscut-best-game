// Fixed simulation owns gameplay time. Rendering consumes the accumulator's interpolation.
export function createSimulation(state, input, player, weapon, bots, rounds, buy, grenades, objective, syncCamera) {
  const STEP = 1 / 120;
  let accumulator = 0;
  function tick(dt) {
    const p = state.player;
    p.previous.copy(p.position);
    state.elapsed += dt;
    state.hit = Math.max(0, state.hit - dt);
    state.damageFlash = Math.max(0, state.damageFlash - dt);
    state.noise.time = Math.max(0, state.noise.time - dt);
    state.messageTime = Math.max(0, state.messageTime - dt);
    player.look(input.lookX, input.lookY);
    input.lookX = 0;
    input.lookY = 0;
    buy.step(input.pressed);
    state.scoreboard = input.keys.has("Tab");
    const active = state.health > 0 && !state.buyOpen && (state.phase === "buy" || state.phase === "live");
    if (active) player.step(dt, input.keys);
    weapon.step(dt);
    weapon.spread(player.groundSpeed());
    if (active && (input.pressed.delete("KeyR") || input.keys.has("KeyR"))) weapon.reload();
    if (active && state.phase === "live" && input.firing) {
      syncCamera(1);
      weapon.fire(bots, player);
    }
    grenades.step(dt, input.pressed);
    bots.step(dt);
    objective.step(dt, input.keys);
    rounds.step(dt);
  }
  return {
    advance(dt, running) {
      if (!running) {
        accumulator = 0;
        return 1;
      }
      accumulator += Math.min(dt, 0.1);
      while (accumulator >= STEP) {
        tick(STEP);
        accumulator -= STEP;
      }
      return accumulator / STEP;
    },
  };
}
