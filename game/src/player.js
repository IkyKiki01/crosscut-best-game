// player.js — owns first-person look, recoil delivery, stance changes and the
// collision-resolved movement of the raid party's point man.
import { Vector3 } from "three";

const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
const WALK_SPEED = 5.2;
const CROUCH_SPEED = 2.4;
const SLOW_WALK_SPEED = 2.8;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 9;
const FRICTION = 9;
const GRAVITY = 20;
const JUMP_SPEED = 6.2;
const MAX_FALL_SPEED = 30;

const LOOK_SENSITIVITY = 0.0022;
const PITCH_LIMIT = 1.45;
const MAX_RECOIL = 0.22;
const RECOIL_DECAY = 9;
const EYE_LERP_RATE = 12;

const STAND_TEST_LIFT = 0.02;
const MOVE_LIFT = 0.04;
const STEP_UP_HEIGHT = 0.18;
const GROUND_PROBE = 0.001;

const FOOTSTEP_INTERVAL = 0.4;
const FOOTSTEP_MIN_SPEED = 1;
const METAL_HEIGHT = 0.3;
const METAL_Z = -9;
const NOISE_RADIUS_SNEAK = 3;
const NOISE_RADIUS_RUN = 12;
const NOISE_SECONDS = 0.3;

const SPAWN_POSITION = { x: 6, y: 0, z: 13 };

/**
 * Builds the player controller.
 * @param {object} world world queries (overlap and supportHeight)
 * @param {object} state shared gameplay state
 * @param {object} [audio] audio cue provider
 * @returns {{reset: Function, step: Function, look: Function, recoil: Function, groundSpeed: Function}} player API
 */
export function createPlayer(world, state, audio) {
  const player = state.player;
  const wish = new Vector3();

  /**
   * Player-probe overlap test that insets the vertical extent by a lift amount.
   * @param {number} x probe centre x
   * @param {number} y probe base y
   * @param {number} z probe centre z
   * @param {number} height probe height
   * @param {number} lift inset applied to the base and the top
   * @returns {object | null} overlapping collider, or null
   */
  function overlaps(x, y, z, height, lift) {
    return world.overlap(x, y + lift, z, height - lift * 2);
  }

  /**
   * Applies mouse movement to yaw and clamped pitch.
   * @param {number} deltaX horizontal mouse delta in pixels
   * @param {number} deltaY vertical mouse delta in pixels
   * @param {number} [sensitivity=LOOK_SENSITIVITY] radians per pixel
   * @returns {void}
   */
  function look(deltaX, deltaY, sensitivity = LOOK_SENSITIVITY) {
    player.yaw -= deltaX * sensitivity;
    player.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, player.pitch - deltaY * sensitivity));
  }

  /**
   * Adds a camera kick from weapon fire.
   * @param {number} pitchKick upward pitch impulse
   * @param {number} yawKick lateral yaw impulse
   * @returns {void}
   */
  function recoil(pitchKick, yawKick) {
    player.recoil = Math.min(MAX_RECOIL, player.recoil + pitchKick);
    player.yaw += yawKick;
  }

  /**
   * Toggles the crouch stance, refusing to stand under low geometry.
   * @param {boolean} wantsCrouch whether a crouch key is held
   * @returns {void}
   */
  function updateStance(wantsCrouch) {
    if (wantsCrouch && !player.crouching) {
      player.crouching = true;
      player.height = CROUCH_HEIGHT;
      return;
    }
    if (!wantsCrouch && player.crouching) {
      const blocked = overlaps(
        player.position.x,
        player.position.y,
        player.position.z,
        STAND_HEIGHT,
        STAND_TEST_LIFT,
      );
      if (!blocked) {
        player.crouching = false;
        player.height = STAND_HEIGHT;
      }
    }
  }

  /**
   * Eases the eye height toward the current stance target.
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function updateEyeHeight(dt) {
    const eyeTarget = player.crouching ? CROUCH_EYE : STAND_EYE;
    player.eye += (eyeTarget - player.eye) * Math.min(1, dt * EYE_LERP_RATE);
  }

  /**
   * Builds the normalised wish direction from the movement keys and yaw.
   * @param {Set<string>} keys currently held keys
   * @returns {void}
   */
  function updateWish(keys) {
    const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    wish.set(0, 0, 0);
    if (!forward && !strafe) return;

    const sinYaw = Math.sin(player.yaw);
    const cosYaw = Math.cos(player.yaw);
    wish
      .set(
        -sinYaw * forward + cosYaw * strafe,
        0,
        -cosYaw * forward - sinYaw * strafe,
      )
      .normalize();
  }

  /**
   * Current target speed for the held stance and walk modifier.
   * @param {Set<string>} keys currently held keys
   * @returns {number} metres per second
   */
  function targetSpeed(keys) {
    if (player.crouching) return CROUCH_SPEED;
    if (keys.has("ShiftLeft") || keys.has("ShiftRight")) return SLOW_WALK_SPEED;
    return WALK_SPEED;
  }

  /**
   * Accelerates horizontal velocity toward the wish direction, then applies
   * ground friction when the player is not asking to move.
   * @param {number} dt fixed timestep in seconds
   * @param {number} speed current target speed
   * @returns {void}
   */
  function integrateHorizontal(dt, speed) {
    const acceleration = player.onGround ? GROUND_ACCEL : AIR_ACCEL;
    const blend = Math.min(1, (acceleration * dt) / speed);
    player.velocity.x += (wish.x * speed - player.velocity.x) * blend;
    player.velocity.z += (wish.z * speed - player.velocity.z) * blend;

    if (player.onGround && !wish.lengthSq()) {
      const damp = Math.max(0, 1 - FRICTION * dt);
      player.velocity.x *= damp;
      player.velocity.z *= damp;
    }
  }

  /**
   * Resolves one horizontal axis, stepping up onto low ledges when possible.
   * @param {number} nextX candidate x position
   * @param {number} nextZ candidate z position
   * @param {"x" | "z"} axis axis being moved
   * @returns {void}
   */
  function moveAlongAxis(nextX, nextZ, axis) {
    const height = player.height;
    if (!overlaps(nextX, player.position.y, nextZ, height, MOVE_LIFT)) {
      player.position[axis] = axis === "x" ? nextX : nextZ;
      return;
    }
    const steppedY = player.position.y + STEP_UP_HEIGHT;
    if (player.onGround && !overlaps(nextX, steppedY, nextZ, height, MOVE_LIFT)) {
      player.position.y = world.supportHeight(
        nextX,
        nextZ,
        player.position.y + STEP_UP_HEIGHT,
      );
      player.position[axis] = axis === "x" ? nextX : nextZ;
      return;
    }
    player.velocity[axis] = 0;
  }

  /**
   * Applies jump input and gravity to the vertical velocity.
   * @param {number} dt fixed timestep in seconds
   * @param {Set<string>} keys currently held keys
   * @returns {void}
   */
  function applyJumpAndGravity(dt, keys) {
    if (keys.has("Space") && player.onGround) {
      player.velocity.y = JUMP_SPEED;
      player.onGround = false;
    }
    player.velocity.y -= GRAVITY * dt;
  }

  /**
   * Integrates the vertical velocity and resolves floor and ceiling contacts.
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function resolveVertical(dt) {
    const previousY = player.position.y;
    player.position.y += player.velocity.y * dt;
    player.onGround = false;

    if (player.velocity.y <= 0) {
      const floor = world.supportHeight(
        player.position.x,
        player.position.z,
        previousY + GROUND_PROBE,
      );
      if (player.position.y <= floor) {
        player.position.y = floor;
        player.velocity.y = 0;
        player.onGround = true;
      }
    } else {
      const hit = overlaps(
        player.position.x,
        player.position.y,
        player.position.z,
        player.height,
        0,
      );
      if (hit) {
        player.position.y = hit.min.y - player.height;
        player.velocity.y = 0;
      }
    }
    player.velocity.y = Math.max(-MAX_FALL_SPEED, player.velocity.y);
  }

  /**
   * Emits the audible footstep and noise record when the player strides.
   * @param {number} dt fixed timestep in seconds
   * @param {Set<string>} keys currently held keys
   * @returns {void}
   */
  function emitFootstep(dt, keys) {
    state.footsteps -= dt;
    const striding = Math.hypot(player.velocity.x, player.velocity.z) > FOOTSTEP_MIN_SPEED;
    if (!player.onGround || !striding || state.footsteps > 0 || player.crouching) return;

    const sneaking = keys.has("ShiftLeft") || keys.has("ShiftRight");
    state.footsteps = FOOTSTEP_INTERVAL;
    audio?.footstep(player.position.y > METAL_HEIGHT || player.position.z < METAL_Z, sneaking);
    state.noise.x = player.position.x;
    state.noise.z = player.position.z;
    state.noise.radius = keys.has("ShiftLeft") ? NOISE_RADIUS_SNEAK : NOISE_RADIUS_RUN;
    state.noise.time = NOISE_SECONDS;
  }

  /**
   * Advances the player by one fixed step.
   * @param {number} dt fixed timestep in seconds
   * @param {Set<string>} keys currently held keys
   * @returns {void}
   */
  function step(dt, keys) {
    const wantsCrouch =
      keys.has("ControlLeft") || keys.has("ControlRight") || keys.has("KeyC");
    updateStance(wantsCrouch);
    updateEyeHeight(dt);

    updateWish(keys);
    const speed = targetSpeed(keys);
    player.recoil *= Math.exp(-dt * RECOIL_DECAY);
    integrateHorizontal(dt, speed);

    applyJumpAndGravity(dt, keys);

    moveAlongAxis(player.position.x + player.velocity.x * dt, player.position.z, "x");
    moveAlongAxis(player.position.x, player.position.z + player.velocity.z * dt, "z");

    resolveVertical(dt);

    emitFootstep(dt, keys);
  }

  /**
   * Resets the player to the spawn point in the standing stance.
   * @returns {void}
   */
  function reset() {
    player.position.set(SPAWN_POSITION.x, SPAWN_POSITION.y, SPAWN_POSITION.z);
    player.previous.copy(player.position);
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    player.pitch = 0;
    player.recoil = 0;
    player.height = STAND_HEIGHT;
    player.eye = STAND_EYE;
    player.crouching = false;
    player.onGround = true;
  }

  /**
   * Horizontal speed, used to derive weapon spread.
   * @returns {number} metres per second
   */
  function groundSpeed() {
    return Math.hypot(player.velocity.x, player.velocity.z);
  }

  return { reset, step, look, recoil, groundSpeed };
}
