// simulation.js — owns the fixed-step gameplay clock; rendering consumes the
// leftover accumulator as an interpolation factor.

const FIXED_STEP = 1 / 120;
const MAX_FRAME_DELTA = 0.1;

/**
 * Wires every gameplay system to a fixed 120 Hz tick.
 * @param {object} state shared gameplay state
 * @param {object} input live input state (keys, pressed, look deltas, firing)
 * @param {object} player player controller
 * @param {object} weapon weapon controller
 * @param {object} bots sentinel controller
 * @param {object} rounds round authority
 * @param {object} buy buy-phase controller
 * @param {object} grenades grenade pool controller
 * @param {object} objective plant/defuse controller
 * @param {(alpha: number) => void} syncCamera camera sync used before hitscan
 * @returns {{advance: (dt: number, running: boolean) => number}} simulation API
 */
export function createSimulation(
  state,
  input,
  player,
  weapon,
  bots,
  rounds,
  buy,
  grenades,
  objective,
  syncCamera,
) {
  let accumulator = 0;

  /**
   * Ages every transient timer by one fixed step.
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function advanceTimers(dt) {
    state.elapsed += dt;
    state.hit = Math.max(0, state.hit - dt);
    state.damageFlash = Math.max(0, state.damageFlash - dt);
    state.noise.time = Math.max(0, state.noise.time - dt);
    state.messageTime = Math.max(0, state.messageTime - dt);
  }

  /**
   * Applies accumulated mouse movement and clears the deltas.
   * @returns {void}
   */
  function applyLook() {
    player.look(input.lookX, input.lookY);
    input.lookX = 0;
    input.lookY = 0;
  }

  /**
   * True when the player may move, aim and shoot this tick.
   * @returns {boolean} whether player control is live
   */
  function playerActive() {
    return (
      state.health > 0 &&
      !state.buyOpen &&
      (state.phase === "buy" || state.phase === "live")
    );
  }

  /**
   * Advances exactly one fixed gameplay step.
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function tick(dt) {
    state.player.previous.copy(state.player.position);
    advanceTimers(dt);
    applyLook();

    buy.step(input.pressed);
    state.scoreboard = input.keys.has("Tab");

    const active = playerActive();
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

  /**
   * Consumes real frame time and returns the interpolation fraction left over.
   * @param {number} dt real frame delta in seconds
   * @param {boolean} running false pauses the clock and drops the backlog
   * @returns {number} accumulator remainder in [0, 1)
   */
  function advance(dt, running) {
    if (!running) {
      accumulator = 0;
      return 1;
    }
    accumulator += Math.min(dt, MAX_FRAME_DELTA);
    while (accumulator >= FIXED_STEP) {
      tick(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
    return accumulator / FIXED_STEP;
  }

  return { advance };
}
