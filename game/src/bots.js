// bots.js — owns sentinel navigation, perception, engagement, cover and damage resolution.
import { Vector3 } from "three";
import { createActors } from "./actors.js";
import { createHitboxes } from "./hitboxes.js";
import { equipBot, retake } from "./tactics.js";
import { smokeBlocks } from "./visibility.js";

const BOT_HEALTH = 100;
const BOT_ARMOUR_ECO = 0;
const BOT_ARMOUR_FORCE = 35;
const BOT_ARMOUR_FULL = 100;

const BOT_COLLIDER_HEIGHT = 1.85;
const BOT_COLLIDER_LIFT = 0.3;
const ARRIVE_DISTANCE = 0.2;
const GAIT_RATE = 3;
const GAIT_SWING = 0.5;
const DEATH_FALL_RATE = 5;
const DEATH_FALL_MAX = 1.5;

const BLIND_WALK_SPEED = 1.4;
const RETREAT_SPEED = 3.2;
const RETREAT_SECONDS = 0.9;
const SMOKE_PUSH_SPEED = 1.5;
const CHASE_SPEED = 2;
const RUSHER_SPEED = 2.8;
const PATROL_SPEED = 2.1;
const HOLD_SECONDS = 3;

const EYE_HEIGHT = 1.65;
const TARGET_EYE_SCALE = 0.8;
const SIGHT_RANGE = 31;
const FACING_THRESHOLD = 0.25;
const CLOSE_RANGE = 3;
const WALL_MARGIN = 0.02;
const TRACE_LIMIT = 100;

const STILL_MAX = 2;
const STILL_RATE = 1;
const LOST_MEMORY = 2.5;
const ALERT_REACTION_NOISE = 0.45;
const ALERT_REACTION_SIGHT = 0.5;

const MUZZLE_FLASH_SECONDS = 0.06;
const FLINCH_SECONDS = 0.22;
const FLINCH_TILT = 0.3;
const INACCURACY_BASE = 0.1;
const INACCURACY_STILL = 0.035;
const BOT_DAMAGE = 12;
const ARMOUR_ABSORB_MAX = 6;
const DAMAGE_FLASH_SECONDS = 0.3;
const BOT_BODY_RADIUS = 0.34;
const BOT_BODY_LOW = 0.35;
const BOT_BODY_HIGH_MARGIN = 0.28;

const FIRE_INTERVAL_ECO = 0.65;
const FIRE_INTERVAL_BURST = 0.15;
const FIRE_INTERVAL_BASE = 0.9;
const FIRE_INTERVAL_JITTER = 0.6;
const BURST_LENGTH = 3;

const TARGET_BODY_RADIUS = 0.3;
const TARGET_BODY_LOW = 0.48;
const TARGET_BODY_HIGH = 1.22;
const FALLOFF_FLOOR = 0.6;
const FALLOFF_RANGE = 100;
const ARMOUR_ABSORB_RATIO = 0.35;
const HIT_FLASH_SECONDS = 0.14;
const KILL_HIT_SECONDS = 0.25;
const KILL_REWARD = 300;
const MESSAGE_SECONDS = 4;

const COVER_SECONDS = 1.6;
const COVER_AVOID_MARGIN = 0.1;

const COOLDOWN_BASE = 0.7;
const COOLDOWN_PER_SLOT = 0.3;

const ENGAGE_STATES = new Set(["engage", "take-cover"]);
const ALERT_STATES = new Set(["engage", "alert", "take-cover"]);

/**
 * Builds the sentinel controller and registers the sentinel actors.
 * @param {import('three').Scene} scene scene the sentinel meshes live in
 * @param {object} state shared gameplay state
 * @param {object} world world collision and sight queries
 * @param {() => number} random seeded random source
 * @param {object} audio audio cue provider
 * @returns {{reset: Function, step: Function, hit: Function, remaining: Function}} sentinel API
 */
export function createBots(scene, state, world, random, audio) {
  const eye = new Vector3();
  const target = new Vector3();
  const direction = new Vector3();
  const { capsuleDistance, sphereDistance } = createHitboxes();

  createActors(scene, state);

  /**
   * Restores one sentinel to its route start with a fresh buy and duty.
   * @param {object} bot sentinel record
   * @param {number} index sentinel slot
   * @returns {void}
   */
  function resetBot(bot, index) {
    equipBot(bot, index, state);
    bot.position.set(bot.route[0], 0, bot.route[1]);

    // Cycle duties each round while retaining each sentinel's named lane route.
    const duty = (index + state.round - 1) % 3;
    bot.role = duty === 0 ? "rusher" : duty === 1 ? "holder" : "rotator";

    bot.navigating = false;
    bot.health = BOT_HEALTH;
    if (bot.buy === "ECO") bot.armour = BOT_ARMOUR_ECO;
    else if (bot.buy === "FORCE") bot.armour = BOT_ARMOUR_FORCE;
    else bot.armour = BOT_ARMOUR_FULL;

    bot.still = 0;
    bot.hold = 0;
    bot.mode = "patrol";
    bot.waypoint = 1;
    bot.cooldown = COOLDOWN_BASE + index * COOLDOWN_PER_SLOT;
    bot.burst = BURST_LENGTH;
    bot.reaction = 0;
    bot.lost = 0;
    bot.cover = 0;
    bot.flashTime = 0;
    bot.gait = 0;
    bot.mesh.rotation.set(0, 0, 0);
    bot.left.rotation.x = 0;
    bot.right.rotation.x = 0;
    bot.flash.visible = false;
  }

  /**
   * Resets every sentinel for a new round.
   * @returns {void}
   */
  function reset() {
    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      resetBot(state.bots[botIndex], botIndex);
    }
  }

  /**
   * Steps a sentinel toward a point with axis-separated collision and gait swing.
   * @param {object} bot sentinel record
   * @param {number} x target x
   * @param {number} z target z
   * @param {number} dt fixed timestep in seconds
   * @param {number} speed movement speed in metres per second
   * @returns {boolean} true once the sentinel is within arrival distance
   */
  function move(bot, x, z, dt, speed) {
    const deltaX = x - bot.position.x;
    const deltaZ = z - bot.position.z;
    const length = Math.hypot(deltaX, deltaZ);
    if (length < ARRIVE_DISTANCE) return true;

    const amount = Math.min(length, dt * speed);
    const nextX = bot.position.x + (deltaX / length) * amount;
    const nextZ = bot.position.z + (deltaZ / length) * amount;
    if (!world.overlap(nextX, 0, bot.position.z, BOT_COLLIDER_HEIGHT, BOT_COLLIDER_LIFT)) {
      bot.position.x = nextX;
    }
    if (!world.overlap(bot.position.x, 0, nextZ, BOT_COLLIDER_HEIGHT, BOT_COLLIDER_LIFT)) {
      bot.position.z = nextZ;
    }

    bot.mesh.rotation.y = Math.atan2(-deltaX, -deltaZ);
    bot.gait += dt * speed * GAIT_RATE;
    bot.left.rotation.x = Math.sin(bot.gait) * GAIT_SWING;
    bot.right.rotation.x = -bot.left.rotation.x;
    return false;
  }

  /**
   * Advances the muzzle flash timer and topples a dead sentinel.
   * @param {object} bot sentinel record
   * @param {number} dt fixed timestep in seconds
   * @returns {boolean} true when the sentinel is dead and its tick is finished
   */
  function updateFlashAndDeath(bot, dt) {
    bot.flashTime = Math.max(0, bot.flashTime - dt);
    bot.flash.visible = bot.flashTime > 0;
    bot.flinch = Math.max(0, bot.flinch - dt);
    if (bot.mode !== "dead") bot.mesh.rotation.x = -FLINCH_TILT * (bot.flinch / FLINCH_SECONDS);
    if (bot.mode !== "dead") return false;
    bot.mesh.rotation.z = Math.min(DEATH_FALL_MAX, bot.mesh.rotation.z + dt * DEATH_FALL_RATE);
    return true;
  }

  /**
   * Handles blindness: the sentinel drops its target and walks back to route start.
   * @param {object} bot sentinel record
   * @param {number} dt fixed timestep in seconds
   * @returns {boolean} true when blindness consumed the tick
   */
  function handleBlindness(bot, dt) {
    bot.blind = Math.max(0, bot.blind - dt);
    if (bot.blind <= 0) return false;
    bot.visibleEnemy = false;
    bot.mode = "blinded";
    move(bot, bot.route[0], bot.route[1], dt, BLIND_WALK_SPEED);
    return true;
  }

  /**
   * Handles the brief retreat that follows a plant, before the retake order.
   * @param {object} bot sentinel record
   * @param {number} dt fixed timestep in seconds
   * @returns {boolean} true when the retreat consumed the tick
   */
  function handleRetreat(bot, dt) {
    const bomb = state.bomb;
    if (bomb.status === "planted" && !bot.retakeStarted) {
      bot.retakeStarted = true;
      bot.retreatLeft = RETREAT_SECONDS;
    }
    if (bot.retreatLeft <= 0) return false;
    bot.retreatLeft -= dt;
    bot.mode = "retreat";
    bot.visibleEnemy = false;
    move(bot, bot.route[2], bot.route[3], dt, RETREAT_SPEED);
    return true;
  }

  /**
   * Escalates a patrolling sentinel that hears a noise.
   * @param {object} bot sentinel record
   * @returns {void}
   */
  function reactToNoise(bot) {
    const noise = state.noise;
    const heard =
      noise.time > 0 &&
      Math.hypot(bot.position.x - noise.x, bot.position.z - noise.z) < noise.radius &&
      bot.mode === "patrol";
    if (!heard) return;
    bot.mode = "alert";
    bot.lastX = noise.x;
    bot.lastZ = noise.z;
    bot.reaction = ALERT_REACTION_NOISE;
  }

  /**
   * Computes whether the sentinel can see the player, leaving the shared
   * direction vector pointing at the player.
   * @param {object} bot sentinel record
   * @returns {{visible: boolean, distance: number}} perception result
   */
  function perceivePlayer(bot) {
    const playerState = state.player;
    eye.set(bot.position.x, EYE_HEIGHT, bot.position.z);
    target.set(
      playerState.position.x,
      playerState.position.y + playerState.eye * TARGET_EYE_SCALE,
      playerState.position.z,
    );
    direction.subVectors(target, eye);
    const distance = direction.length();
    direction.normalize();

    const facing =
      -Math.sin(bot.mesh.rotation.y) * direction.x -
      Math.cos(bot.mesh.rotation.y) * direction.z;
    const visible =
      state.health > 0 &&
      distance < SIGHT_RANGE &&
      (facing > FACING_THRESHOLD || bot.mode === "engage" || distance < CLOSE_RANGE) &&
      !smokeBlocks(state, eye, direction, distance) &&
      world.wallDistance(eye, direction, distance) >= distance - WALL_MARGIN;

    bot.visibleEnemy = visible;
    return { visible, distance };
  }

  /**
   * Fires one inaccurate sentinel shot at the player and resolves the hit.
   * @param {object} bot sentinel record
   * @returns {void}
   */
  function fireAtPlayer(bot) {
    const playerState = state.player;
    bot.flashTime = MUZZLE_FLASH_SECONDS;
    audio.shot(false);

    // Aim at the player, then test an inaccurate ray against the actual body and cover.
    const inaccuracy = INACCURACY_BASE - bot.still * INACCURACY_STILL;
    direction.x += (random() - 0.5) * inaccuracy;
    direction.y += (random() - 0.5) * inaccuracy;
    direction.z += (random() - 0.5) * inaccuracy;
    direction.normalize();

    const hit = capsuleDistance(
      eye,
      direction,
      playerState.position,
      BOT_BODY_RADIUS,
      BOT_BODY_LOW,
      playerState.height - BOT_BODY_HIGH_MARGIN,
    );
    if (hit < world.wallDistance(eye, direction, TRACE_LIMIT)) {
      const absorbed = Math.min(state.armour, ARMOUR_ABSORB_MAX);
      state.armour -= absorbed;
      state.health = Math.max(0, state.health - (BOT_DAMAGE - absorbed));
      state.damageFlash = DAMAGE_FLASH_SECONDS;
      state.damageAngle =
        Math.atan2(bot.position.x - playerState.position.x, bot.position.z - playerState.position.z) +
        playerState.yaw;
      if (state.health === 0) {
        state.message = `SENTINEL / ${bot.weapon} / YOU`;
        state.messageTime = MESSAGE_SECONDS;
      }
    }

    bot.burst--;
    if (bot.buy === "ECO") bot.cooldown = FIRE_INTERVAL_ECO;
    else if (bot.burst > 0) bot.cooldown = FIRE_INTERVAL_BURST;
    else bot.cooldown = FIRE_INTERVAL_BASE + random() * FIRE_INTERVAL_JITTER;
    if (!bot.burst) bot.burst = BURST_LENGTH;
  }

  /**
   * Runs the sentinel's behaviour while it has the player in sight.
   * @param {object} bot sentinel record
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function engagePlayer(bot, dt) {
    const playerState = state.player;
    bot.navigating = false;
    bot.lost = 0;
    bot.lastX = playerState.position.x;
    bot.lastZ = playerState.position.z;

    if (!ALERT_STATES.has(bot.mode)) {
      bot.mode = "alert";
      bot.reaction = ALERT_REACTION_SIGHT;
    }
    if (bot.mode === "alert") {
      bot.reaction -= dt;
      if (bot.reaction <= 0) bot.mode = "engage";
    }

    bot.mesh.rotation.y = Math.atan2(-direction.x, -direction.z);

    if (bot.mode === "take-cover") {
      bot.cover -= dt;
      move(bot, bot.coverX, bot.coverZ, dt, RETREAT_SPEED);
      if (bot.cover <= 0) bot.mode = "engage";
    }

    if (ENGAGE_STATES.has(bot.mode) && bot.cooldown <= 0) fireAtPlayer(bot);
  }

  /**
   * Runs the sentinel's behaviour while the player is out of sight.
   * @param {object} bot sentinel record
   * @param {number} dt fixed timestep in seconds
   * @param {number} distance last measured distance to the player
   * @returns {void}
   */
  function losePlayer(bot, dt, distance) {
    const bomb = state.bomb;
    bot.lost += dt;

    if (smokeBlocks(state, eye, direction, distance) && bomb.status !== "planted") {
      bot.mode = bot.role === "rusher" ? "smoke-push" : "hold";
      if (bot.role === "rusher") {
        move(bot, bot.route[bot.waypoint * 2], bot.route[bot.waypoint * 2 + 1], dt, SMOKE_PUSH_SPEED);
      }
      return;
    }

    if (ALERT_STATES.has(bot.mode) && bot.lost < LOST_MEMORY) {
      bot.mode = "alert";
      move(bot, bot.lastX, bot.lastZ, dt, CHASE_SPEED);
      return;
    }

    if (bomb.status === "planted") return;

    if (bot.hold > 0) {
      bot.mode = "hold";
      bot.hold -= dt;
      return;
    }

    bot.mode = "patrol";
    const waypointIndex = bot.waypoint * 2;
    const arrived = move(
      bot,
      bot.route[waypointIndex],
      bot.route[waypointIndex + 1],
      dt,
      bot.role === "rusher" ? RUSHER_SPEED : PATROL_SPEED,
    );
    if (!arrived) return;

    bot.waypoint = (bot.waypoint + 1) % (bot.route.length / 2);
    if (bot.role === "holder") bot.hold = HOLD_SECONDS;
  }

  /**
   * Advances every sentinel by one fixed step.
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function step(dt) {
    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      const bot = state.bots[botIndex];
      if (updateFlashAndDeath(bot, dt)) continue;
      if (state.phase !== "live") continue;
      if (handleBlindness(bot, dt)) continue;

      bot.cooldown -= dt;
      const holding = bot.mode === "engage" || bot.mode === "hold";
      bot.still = holding ? Math.min(STILL_MAX, bot.still + dt * STILL_RATE) : 0;

      if (handleRetreat(bot, dt)) continue;
      if (state.bomb.status === "planted" && bot.mode !== "engage") {
        retake(bot, botIndex, state, dt, move);
      }

      reactToNoise(bot);
      const perception = perceivePlayer(bot);
      if (perception.visible) engagePlayer(bot, dt);
      else losePlayer(bot, dt, perception.distance);
    }
  }

  /**
   * Resolves a hitscan ray against every living sentinel and applies damage.
   * @param {import('three').Vector3} origin ray origin
   * @param {import('three').Vector3} dir unit ray direction
   * @param {number} wall nearest wall distance along the ray
   * @param {object} weapon weapon definition supplying damage and head multiplier
   * @returns {import('three').Vector3 | undefined} impact point when something was hit
   */
  function hit(origin, dir, wall, weapon) {
    let selected = null;
    let nearest = wall;
    let headshot = false;

    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      const bot = state.bots[botIndex];
      if (bot.health <= 0) continue;
      const body = capsuleDistance(
        origin,
        dir,
        bot.position,
        TARGET_BODY_RADIUS,
        TARGET_BODY_LOW,
        TARGET_BODY_HIGH,
      );
      const head = sphereDistance(origin, dir, bot.position);
      const candidate = Math.min(body, head);
      if (candidate < nearest) {
        nearest = candidate;
        selected = bot;
        headshot = head < body;
      }
    }

    if (!selected) return undefined;

    const falloff = Math.max(FALLOFF_FLOOR, 1 - nearest / FALLOFF_RANGE);
    const damage = weapon.damage * falloff * (headshot ? weapon.head : 1);
    const absorbed = Math.min(selected.armour, damage * ARMOUR_ABSORB_RATIO);
    selected.armour -= absorbed;
    state.stats.damage += Math.min(selected.health, damage - absorbed);
    selected.health -= damage - absorbed;
    selected.flinch = FLINCH_SECONDS;
    state.hit = HIT_FLASH_SECONDS;

    const hitPoint = origin.clone().addScaledVector(dir, nearest);
    world.effects?.burst(hitPoint, true);
    audio.hit();

    if (selected.health <= 0) {
      state.message = `YOU  /  ${weapon.name} ${headshot ? " / HEADSHOT" : ""}  /  SENTINEL`;
      state.messageTime = MESSAGE_SECONDS;
      selected.mode = "dead";
      state.score.kills++;
      state.money += KILL_REWARD;
      state.hit = KILL_HIT_SECONDS;
    } else {
      takeCover(selected);
    }
    return hitPoint;
  }

  /**
   * Sends a wounded sentinel to the nearest route node that breaks line of sight.
   * @param {object} bot sentinel record
   * @returns {void}
   */
  function takeCover(bot) {
    const playerState = state.player;
    bot.mode = "take-cover";
    bot.cover = COVER_SECONDS;
    bot.lastX = playerState.position.x;
    bot.lastZ = playerState.position.z;
    bot.coverX = bot.route[bot.waypoint * 2];
    bot.coverZ = bot.route[bot.waypoint * 2 + 1];

    eye.set(bot.lastX, playerState.position.y + playerState.eye, bot.lastZ);
    let nearest = Infinity;
    for (let routeIndex = 0; routeIndex < bot.route.length; routeIndex += 2) {
      target.set(bot.route[routeIndex], EYE_HEIGHT, bot.route[routeIndex + 1]);
      direction.subVectors(target, eye);
      const distance = direction.length();
      direction.normalize();
      const travel = Math.hypot(target.x - bot.position.x, target.z - bot.position.z);
      const blocked =
        world.wallDistance(eye, direction, distance) < distance - COVER_AVOID_MARGIN;
      if (travel < nearest && blocked) {
        nearest = travel;
        bot.coverX = target.x;
        bot.coverZ = target.z;
      }
    }
  }

  /**
   * Counts the sentinels still standing.
   * @returns {number} living sentinel count
   */
  function remaining() {
    let count = 0;
    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      if (state.bots[botIndex].health > 0) count++;
    }
    return count;
  }

  return { reset, step, hit, remaining };
}
