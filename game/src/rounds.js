// rounds.js — owns round transitions, first-to-five scoring, per-round reset and match restart.
import { createState } from "./state.js";

const START_HEALTH = 100;
const ARMOUR_FLOOR = 50;
const BUY_SECONDS = 15;
const LIVE_SECONDS = 105;
const RESULT_SECONDS = 6;
const MATCH_SECONDS = 12;
const WINS_TO_MATCH = 5;
const WIN_INCOME = 2700;
const LOSS_INCOME = 1900;
const MONEY_CAP = 16000;
const MIN_GRENADES = 1;
const SENTINEL_STARTING_MONEY = 600;

/**
 * Builds the single round authority for the match.
 * A planted charge survives the round clock; first to five wins.
 * @param {object} state shared gameplay state
 * @param {object} player player controller
 * @param {object} weapon weapon controller
 * @param {object} bots sentinel controller
 * @param {object} objective plant/defuse controller
 * @param {object} grenades grenade pool controller
 * @param {object} [effects] transient effect pool, reset on match restart
 * @returns {{reset: Function, restart: Function, step: Function}} round API
 */
export function createRounds(state, player, weapon, bots, objective, grenades, effects) {
  /**
   * Restores per-round vitals, timers, economy floor and every subsystem.
   * @returns {void}
   */
  function reset() {
    state.health = START_HEALTH;
    state.armour = Math.max(ARMOUR_FLOOR, state.armour);
    state.phase = "buy";
    state.timer = BUY_SECONDS;
    state.buyOpen = false;
    state.messageTime = 0;
    state.noise.time = 0;
    state.footsteps = 0;
    state.hit = 0;
    state.damageFlash = 0;
    state.grenadeCount = Math.max(MIN_GRENADES, state.grenadeCount);
    player.reset();
    weapon.refill();
    bots.reset();
    objective.reset();
    grenades.reset();
  }

  /**
   * Settles a round in favour of the player or the sentinels.
   * @param {boolean} won true when the player's side takes the round
   * @returns {void}
   */
  function end(won) {
    state.lastWon = won;
    state.phase = won ? "won" : "lost";
    state.timer = RESULT_SECONDS;
    if (won) state.score.wins++;
    else state.score.losses++;
    state.money = Math.min(MONEY_CAP, state.money + (won ? WIN_INCOME : LOSS_INCOME));
    if (state.score.wins >= WINS_TO_MATCH || state.score.losses >= WINS_TO_MATCH) {
      state.phase = "match";
      state.timer = MATCH_SECONDS;
    }
  }

  /**
   * Resolves the live round's win condition, if any has been met.
   * @returns {void}
   */
  function resolveLiveRound() {
    const bomb = state.bomb;
    if (bomb.status === "exploded") end(true);
    else if (bomb.status === "defused") end(false);
    else if (state.health <= 0 && bomb.status !== "planted") end(false);
    else if (bots.remaining() === 0 && state.health > 0) end(true);
    else if (state.timer === 0 && bomb.status !== "planted") end(false);
  }

  /**
   * Advances the round clock and its phase transitions.
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function step(dt) {
    if (state.phase === "match") return;
    state.timer = Math.max(0, state.timer - dt);

    if (state.phase === "buy" && state.timer === 0) {
      state.phase = "live";
      state.timer = LIVE_SECONDS;
    } else if (state.phase === "live") {
      resolveLiveRound();
    } else if (state.timer === 0 && state.phase !== "buy") {
      state.round++;
      reset();
    }
  }

  /**
   * Wipes the whole match while keeping the captured subsystem objects alive.
   * @returns {void}
   */
  function restart() {
    const fresh = createState();
    // Keep objects captured by player/weapon and the scene's actor/grenade pools.
    const { player: playerRecord, weapon: weaponRecord, bots: actorPool, grenades: grenadePool } = state;
    Object.assign(playerRecord, fresh.player);
    Object.assign(weaponRecord, fresh.weapon);
    Object.assign(state, fresh, {
      player: playerRecord,
      weapon: weaponRecord,
      bots: actorPool,
      grenades: grenadePool,
    });
    for (const bot of actorPool) {
      bot.money = SENTINEL_STARTING_MONEY;
      bot.blind = 0;
      bot.visibleEnemy = false;
    }
    effects?.reset();
    reset();
  }

  return { reset, restart, step };
}
