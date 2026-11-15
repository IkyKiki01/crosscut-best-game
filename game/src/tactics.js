// tactics.js — owns the sentinels' persistent economy, their per-round buys
// and the coordinated post-plant retake orders.
import { ROUTES, NODES, nextNode } from "./navigation.js";

const MONEY_CAP = 16000;
const STARTING_MONEY = 600;
const ROUND_WIN_INCOME = 1900;
const ROUND_LOSS_INCOME = 2700;
const ECO_MONEY_THRESHOLD = 1400;
const FORCE_MONEY_THRESHOLD = 3450;
const FORCE_COST = 1400;
const FULL_COST = 3450;
const BUY_CYCLE_LENGTH = 3;
const ROUTE_SIDE_OFFSET = 3;

const ECO_WEAPON = "Sable pistol";
const FORCE_WEAPON = "Mica SMG";
const FULL_WEAPON = "Kestrel rifle";
const ECO_GUN_SCALE = 0.45;
const FORCE_GUN_SCALE = 0.75;
const FULL_GUN_SCALE = 1;

const RETAKE_SPEED = 2.7;
const RETAKE_ARRIVE_PRIMARY = 1.4;
const RETAKE_ARRIVE_SUPPORT = 0.6;
const RETAKE_FLANK_OFFSET_X = 2.2;
const RETAKE_SUPPORT_OFFSET_Z = 2;
const RETAKE_DIRECT_DISTANCE = 3;
const WAYPOINT_REACHED_DISTANCE = 0.3;
const RETAKE_YAW_STEP = 0.6;

/**
 * Refreshes one sentinel's bank, buy tier, weapon, kit and patrol route.
 * @param {object} bot sentinel record created by actors.js
 * @param {number} index sentinel slot, used for route rotation
 * @param {object} state shared gameplay state
 * @returns {void}
 */
export function equipBot(bot, index, state) {
  const income = state.round === 1 ? 0 : state.lastWon ? ROUND_WIN_INCOME : ROUND_LOSS_INCOME;
  bot.money = Math.min(MONEY_CAP, (bot.money ?? STARTING_MONEY) + income);

  const cycle = (state.round - 1) % BUY_CYCLE_LENGTH;
  if (cycle === 0 || bot.money < ECO_MONEY_THRESHOLD) bot.buy = "ECO";
  else if (cycle === 1 || bot.money < FORCE_MONEY_THRESHOLD) bot.buy = "FORCE";
  else bot.buy = "FULL";

  if (bot.buy === "ECO") {
    bot.weapon = ECO_WEAPON;
    bot.gun.scale.z = ECO_GUN_SCALE;
  } else if (bot.buy === "FORCE") {
    bot.weapon = FORCE_WEAPON;
    bot.gun.scale.z = FORCE_GUN_SCALE;
  } else {
    bot.weapon = FULL_WEAPON;
    bot.gun.scale.z = FULL_GUN_SCALE;
  }

  if (bot.buy === "FORCE") bot.money -= FORCE_COST;
  else if (bot.buy === "FULL") bot.money -= FULL_COST;

  bot.kit = bot.buy === "FULL";
  bot.blind = 0;
  bot.visibleEnemy = false;
  bot.retakeHold = 0;
  bot.retakeStarted = false;
  bot.retreatLeft = 0;

  const routeSlot = (index + (state.round % 2 ? 0 : ROUTE_SIDE_OFFSET)) % ROUTES.length;
  bot.route = ROUTES[routeSlot].nodes.flatMap((nodeId) => [NODES[nodeId].x, NODES[nodeId].z]);
}

/**
 * Drives one sentinel toward the planted charge and settles it onto a hold angle.
 * @param {object} bot sentinel record
 * @param {number} index sentinel slot; reassigned to the primary slot when this bot leads
 * @param {object} state shared gameplay state
 * @param {number} dt fixed timestep in seconds
 * @param {Function} move shared collision-resolved mover from bots.js
 * @returns {void}
 */
export function retake(bot, index, state, dt, move) {
  const bomb = state.bomb;

  let firstAlive = 0;
  while (firstAlive < state.bots.length && state.bots[firstAlive].health <= 0) firstAlive++;
  if (index === firstAlive) index = 0;

  bot.mode = "rotate";

  let targetX = bomb.x;
  if (index === 1) targetX = bomb.x - RETAKE_FLANK_OFFSET_X;
  else if (index >= 2) targetX = bomb.x + RETAKE_FLANK_OFFSET_X;
  const targetZ = bomb.z + (index === 0 ? 0 : RETAKE_SUPPORT_OFFSET_Z);

  const arriveRadius = index === 0 ? RETAKE_ARRIVE_PRIMARY : RETAKE_ARRIVE_SUPPORT;
  if (Math.hypot(bot.position.x - targetX, bot.position.z - targetZ) < arriveRadius) {
    bot.mode = index === 0 ? "defuse" : "hold-angle";
    bot.retakeHold += dt;
    bot.mesh.rotation.y = Math.PI + (index - 1) * RETAKE_YAW_STEP;
    return;
  }

  const needsWaypoint =
    !bot.navigating ||
    Math.hypot(bot.position.x - bot.navX, bot.position.z - bot.navZ) < WAYPOINT_REACHED_DISTANCE;
  if (needsWaypoint) {
    const waypoint = nextNode(bot.position.x, bot.position.z, targetX, targetZ);
    bot.navX = waypoint.x;
    bot.navZ = waypoint.z;
    bot.navigating = true;
  }

  if (Math.hypot(bot.position.x - targetX, bot.position.z - targetZ) < RETAKE_DIRECT_DISTANCE) {
    move(bot, targetX, targetZ, dt, RETAKE_SPEED);
  } else {
    move(bot, bot.navX, bot.navZ, dt, RETAKE_SPEED);
  }
}
