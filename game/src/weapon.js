// weapon.js — owns weapon handling: viewmodel sway, finite ammo, hitscan
// resolution with pellet spread, recoil delivery and the reload animation.
import { WEAPONS } from "./equipment.js";
import { Vector3 } from "three";
import { createViewmodel } from "./viewmodel.js";

const MODEL_X = 0.24;
const MODEL_Y = -0.2;
const MODEL_Z = -0.42;
const MUZZLE_OFFSET = { x: 0.24, y: -0.16, z: -1 };
const MAX_TRACE_DISTANCE = 100;

const SWAY_SLOW_FREQUENCY = 1.8;
const SWAY_SLOW_AMPLITUDE = 0.004;
const SWAY_FAST_FREQUENCY = 9;
const SWAY_FAST_AMPLITUDE = 0.008;
const SWAY_FAST_SPEED_CAP = 0.8;
const BOB_FREQUENCY = 18;
const BOB_AMPLITUDE = 0.006;
const BOB_SPEED_CAP = 1;
const SWAY_YAW_AMPLITUDE = 0.008;

const KICK_DECAY = 14;
const KICK_PITCH_SCALE = 2.2;
const BLOOM_DECAY = 0.025;
const BLOOM_PER_SHOT = 0.005;
const BLOOM_CAP = 0.04;
const MUZZLE_FLASH_SECONDS = 0.065;
const KICK_PER_SHOT = 0.055;
const MUZZLE_FLASH_LIGHT_INTENSITY = 4;
const FLASH_ROTATION_SCALE = 30;

const RELOAD_PITCH = 0.55;
const RELOAD_PITCH_RATE = 2;
const RELOAD_ROLL = 0.4;
const RELOAD_MAGAZINE_DROP = 0.45;
const RELOAD_MAGAZINE_TILT = 0.25;
const RELOAD_HAND_DROP = 0.15;
const MAGAZINE_REST_Y = -0.12;
const HAND_REST_Y = -0.29;

const SHOTGUN_PELLET_SPREAD = 0.09;
const BLOOM_SHOT_RECOIL_JITTER = 0.006;
const SHOT_YAW_JITTER = 0.007;
const GUN_NOISE_RADIUS = 35;
const GUN_NOISE_SECONDS = 0.8;

const RUN_SPEED_REFERENCE = 5.2;
const MOVEMENT_SPREAD = 0.028;
const AIRBORNE_SPREAD = 0.045;
const CROUCH_SPREAD_SCALE = 0.7;

const SHOTGUN_SCALE = 1.2;
const PISTOL_LENGTH_SCALE = 0.55;
const SMG_LENGTH_SCALE = 0.8;

/**
 * Viewmodel scale for a weapon id.
 * @param {string} weaponId weapon catalogue key
 * @returns {{x: number, y: number, z: number}} scale factors
 */
function modelScaleFor(weaponId) {
  const x = weaponId === "shotgun" ? SHOTGUN_SCALE : 1;
  let z = 1;
  if (weaponId === "pistol") z = PISTOL_LENGTH_SCALE;
  else if (weaponId === "smg") z = SMG_LENGTH_SCALE;
  else if (weaponId === "shotgun") z = SHOTGUN_SCALE;
  return { x, y: 1, z };
}

/**
 * Builds the weapon controller bound to the camera and the shared state.
 * @param {import('three').Camera} camera camera that owns the viewmodel
 * @param {object} game full gameplay state (weapon state lives at game.weapon)
 * @param {object} world world queries and effect hooks
 * @param {() => number} random seeded random source
 * @param {object} audio audio cue provider
 * @returns {{step: Function, ready: Function, fire: Function, reload: Function, spread: Function, refill: Function}} weapon API
 */
export function createWeapon(camera, game, world, random, audio) {
  const { model, flash, flashLight, magazine, hand } = createViewmodel(camera);
  const state = game.weapon;
  const origin = new Vector3();
  const direction = new Vector3();
  const right = new Vector3();
  const up = new Vector3();

  /**
   * Points the scratch direction down the camera's forward axis.
   * @returns {void}
   */
  function aimFromCamera() {
    direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
  }

  /**
   * Offsets the scratch direction inside the camera basis and renormalises it.
   * @param {number} horizontal right-axis offset
   * @param {number} vertical up-axis offset
   * @returns {void}
   */
  function scatterDirection(horizontal, vertical) {
    direction.addScaledVector(right, horizontal).addScaledVector(up, vertical).normalize();
  }

  /**
   * Applies the reload arc to the model, magazine and hand.
   * @param {number} reloadLeft seconds still remaining on the reload
   * @returns {void}
   */
  function poseReload(reloadLeft) {
    const definition = WEAPONS[state.id];
    model.rotation.x =
      -RELOAD_PITCH * Math.min(1, (definition.reload - reloadLeft) * RELOAD_PITCH_RATE);
    const progress = 1 - reloadLeft / definition.reload;
    const arc = Math.sin(progress * Math.PI);
    model.rotation.z = -RELOAD_ROLL * arc;
    magazine.position.y = MAGAZINE_REST_Y - RELOAD_MAGAZINE_DROP * arc;
    magazine.rotation.z = RELOAD_MAGAZINE_TILT * arc;
    hand.position.y = HAND_REST_Y - RELOAD_HAND_DROP * arc;
  }

  /**
   * Tops the magazine up when the reload timer finishes.
   * @returns {void}
   */
  function finishReload() {
    const definition = WEAPONS[state.id];
    const needed = definition.magazine - state.mag;
    const taken = Math.min(needed, state.reserve);
    state.mag += taken;
    state.reserve -= taken;
  }

  /**
   * Advances sway, muzzle flash, kick and reload animation by one step.
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function step(dt) {
    const scale = modelScaleFor(state.id);
    model.scale.set(scale.x, scale.y, scale.z);

    state.bloom = Math.max(0, state.bloom - dt * BLOOM_DECAY);
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * KICK_DECAY);

    model.position.z = MODEL_Z + state.kick;
    model.rotation.x = state.kick * KICK_PITCH_SCALE;
    model.rotation.z = 0;

    const speed = Math.hypot(game.player.velocity.x, game.player.velocity.z);
    model.position.x =
      MODEL_X +
      Math.sin(game.elapsed * SWAY_SLOW_FREQUENCY) * SWAY_SLOW_AMPLITUDE +
      Math.sin(game.elapsed * SWAY_FAST_FREQUENCY) *
        Math.min(speed, SWAY_FAST_SPEED_CAP) *
        SWAY_FAST_AMPLITUDE;
    model.position.y =
      MODEL_Y +
      Math.cos(game.elapsed * BOB_FREQUENCY) * Math.min(speed, BOB_SPEED_CAP) * BOB_AMPLITUDE;
    model.rotation.y = Math.sin(game.elapsed * SWAY_SLOW_FREQUENCY) * SWAY_YAW_AMPLITUDE;

    magazine.position.y = MAGAZINE_REST_Y;
    magazine.rotation.z = 0;
    hand.position.y = HAND_REST_Y;

    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * FLASH_ROTATION_SCALE;
    flashLight.intensity = state.flash > 0 ? MUZZLE_FLASH_LIGHT_INTENSITY : 0;

    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      poseReload(state.reloadLeft);
      if (state.reloadLeft === 0) finishReload();
    }
  }

  /**
   * True when the weapon can fire this tick.
   * @returns {boolean} whether a shot is allowed
   */
  function ready() {
    return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
  }

  /**
   * Fires one trigger pull, resolving every pellet of the weapon.
   * @param {object} bots sentinel controller providing hit()
   * @param {object} player player controller providing recoil()
   * @returns {void}
   */
  function fire(bots, player) {
    if (!ready()) return;

    const definition = WEAPONS[state.id];
    state.mag--;
    game.stats.shots++;
    let connected = false;

    state.bloom = Math.min(BLOOM_CAP, state.bloom + BLOOM_PER_SHOT);
    state.cooldown = definition.gap;
    state.flash = MUZZLE_FLASH_SECONDS;
    state.kick = KICK_PER_SHOT;
    audio.shot(true);

    origin.copy(camera.position);
    aimFromCamera();
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * state.spread;
    scatterDirection(Math.cos(angle) * radius, Math.sin(angle) * radius);

    // Shotgun resolves independent pellets; scratch vectors are reused, including each ray.
    for (let pelletIndex = 0; pelletIndex < definition.pellets; pelletIndex++) {
      if (pelletIndex > 0) {
        aimFromCamera();
        scatterDirection(
          (random() - 0.5) * SHOTGUN_PELLET_SPREAD,
          (random() - 0.5) * SHOTGUN_PELLET_SPREAD,
        );
      }

      const wall = world.wallDistance(origin, direction);
      const hitPoint = bots.hit(origin, direction, wall, definition);
      if (hitPoint) connected = true;

      const end = hitPoint || origin.clone().addScaledVector(direction, wall);
      const muzzle = new Vector3(MUZZLE_OFFSET.x, MUZZLE_OFFSET.y, MUZZLE_OFFSET.z).applyMatrix4(
        camera.matrixWorld,
      );
      world.effects?.shot(muzzle, end);
      if (!hitPoint && wall < MAX_TRACE_DISTANCE) world.effects?.burst(end);
    }

    if (connected) game.stats.hits++;

    game.noise.x = origin.x;
    game.noise.z = origin.z;
    game.noise.radius = GUN_NOISE_RADIUS;
    game.noise.time = GUN_NOISE_SECONDS;

    player.recoil(
      definition.recoil + random() * BLOOM_SHOT_RECOIL_JITTER,
      (random() - 0.5) * SHOT_YAW_JITTER,
    );
  }

  /**
   * Starts a reload when the magazine is not full and reserve ammo remains.
   * @returns {void}
   */
  function reload() {
    const definition = WEAPONS[state.id];
    if (state.reloadLeft > 0 || state.mag === definition.magazine || state.reserve === 0) return;
    state.reloadLeft = definition.reload;
  }

  /**
   * Recomputes the current cone of fire from stance, movement and bloom.
   * @param {number} speed current ground speed in metres per second
   * @returns {number} current spread in radians
   */
  function spread(speed) {
    const definition = WEAPONS[state.id];
    state.spread =
      (definition.spread +
        Math.min(1, speed / RUN_SPEED_REFERENCE) * MOVEMENT_SPREAD +
        state.bloom +
        (game.player.onGround ? 0 : AIRBORNE_SPREAD)) *
      (game.player.crouching ? CROUCH_SPREAD_SCALE : 1);
    return state.spread;
  }

  /**
   * Refills the weapon to its catalogue capacity and clears animation state.
   * @returns {void}
   */
  function refill() {
    const definition = WEAPONS[state.id];
    state.mag = definition.magazine;
    state.reserve = definition.reserve;
    state.cooldown = 0;
    state.reloadLeft = 0;
    state.flash = 0;
    flash.visible = false;
    flashLight.intensity = 0;
    state.kick = 0;
    state.bloom = 0;
  }

  return { step, ready, fire, reload, spread, refill };
}
