// Player movement: acceleration, friction, gravity, crouch and jump, resolved as a box against
// the world's colliders one axis at a time, so a wall never swallows the player.
import { Vector3 } from "three";

const STAND_HEIGHT = 1.72;
const CROUCH_HEIGHT = 1.12;
const STAND_EYE = 1.6;
const CROUCH_EYE = 1.02;
const WALK_SPEED = 5.2;
const CROUCH_SPEED = 2.4;
const GROUND_ACCEL = 42;
const AIR_ACCEL = 9;
const FRICTION = 9;
const GRAVITY = 20;
const JUMP_SPEED = 6.2;

export function createPlayer(world, state, audio) {
  const player = state.player;
  const wish = new Vector3();
  function overlaps(x, y, z, height, lift) {
    return world.overlap(x, y + lift, z, height - lift * 2);
  }
  function look(dx, dy, sensitivity = 0.0022) {
    player.yaw -= dx * sensitivity;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - dy * sensitivity));
  }

  function recoil(pitchKick, yawKick) {
    player.recoil = Math.min(0.22, player.recoil + pitchKick);
    player.yaw += yawKick;
  }

  function step(dt, keys) {
    const crouching = keys.has("ControlLeft") || keys.has("ControlRight") || keys.has("KeyC");
    if (crouching && !player.crouching) {
      player.crouching = true;
      player.height = CROUCH_HEIGHT;
    } else if (
      !crouching &&
      player.crouching &&
      !overlaps(player.position.x, player.position.y, player.position.z, STAND_HEIGHT, 0.02)
    ) {
      player.crouching = false;
      player.height = STAND_HEIGHT;
    }
    const eyeTarget = player.crouching ? CROUCH_EYE : STAND_EYE;
    player.eye += (eyeTarget - player.eye) * Math.min(1, dt * 12);

    const forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    wish.set(0, 0, 0);
    if (forward || strafe) {
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      wish.set(-sin * forward + cos * strafe, 0, -cos * forward - sin * strafe).normalize();
    }

    const speed = player.crouching ? CROUCH_SPEED : keys.has("ShiftLeft") || keys.has("ShiftRight") ? 2.8 : WALK_SPEED;
    player.recoil *= Math.exp(-dt * 9);
    const blend = Math.min(1, ((player.onGround ? GROUND_ACCEL : AIR_ACCEL) * dt) / speed);
    player.velocity.x += (wish.x * speed - player.velocity.x) * blend;
    player.velocity.z += (wish.z * speed - player.velocity.z) * blend;
    if (player.onGround && !wish.lengthSq()) {
      const damp = Math.max(0, 1 - FRICTION * dt);
      player.velocity.x *= damp;
      player.velocity.z *= damp;
    }

    if (keys.has("Space") && player.onGround) {
      player.velocity.y = JUMP_SPEED;
      player.onGround = false;
    }
    player.velocity.y -= GRAVITY * dt;

    const nextX = player.position.x + player.velocity.x * dt;
    if (!overlaps(nextX, player.position.y, player.position.z, player.height, 0.04)) player.position.x = nextX;
    else if (player.onGround && !overlaps(nextX, player.position.y + 0.18, player.position.z, player.height, 0.04)) {
      player.position.y = world.supportHeight(nextX, player.position.z, player.position.y + 0.18);
      player.position.x = nextX;
    } else player.velocity.x = 0;
    const nextZ = player.position.z + player.velocity.z * dt;
    if (!overlaps(player.position.x, player.position.y, nextZ, player.height, 0.04)) player.position.z = nextZ;
    else if (player.onGround && !overlaps(player.position.x, player.position.y + 0.18, nextZ, player.height, 0.04)) {
      player.position.y = world.supportHeight(player.position.x, nextZ, player.position.y + 0.18);
      player.position.z = nextZ;
    } else player.velocity.z = 0;

    const previousY = player.position.y;
    player.position.y += player.velocity.y * dt;
    player.onGround = false;
    if (player.velocity.y <= 0) {
      const floor = world.supportHeight(player.position.x, player.position.z, previousY + 0.001);
      if (player.position.y <= floor) {
        player.position.y = floor;
        player.velocity.y = 0;
        player.onGround = true;
      }
    } else {
      const hit = overlaps(player.position.x, player.position.y, player.position.z, player.height, 0);
      if (hit) {
        player.position.y = hit.min.y - player.height;
        player.velocity.y = 0;
      }
    }
    player.velocity.y = Math.max(-30, player.velocity.y);
    // A single reusable noise record gives bots the latest audible event.
    state.footsteps -= dt;
    if (
      player.onGround &&
      Math.hypot(player.velocity.x, player.velocity.z) > 1 &&
      state.footsteps <= 0 &&
      !player.crouching
    ) {
      state.footsteps = 0.4;
      audio?.footstep(player.position.y > 0.3 || player.position.z < -9, keys.has("ShiftLeft") || keys.has("ShiftRight"));
      state.noise.x = player.position.x;
      state.noise.z = player.position.z;
      state.noise.radius = keys.has("ShiftLeft") ? 3 : 12;
      state.noise.time = 0.3;
    }
  }

  return {
    reset() {
      player.position.set(6, 0, 13);
      player.previous.copy(player.position);
      player.velocity.set(0, 0, 0);
      player.yaw = 0;
      player.pitch = 0;
      player.recoil = 0;
      player.height = STAND_HEIGHT;
      player.eye = STAND_EYE;
      player.crouching = false;
      player.onGround = true;
    },
    step,
    look,
    recoil,
    groundSpeed() {
      return Math.hypot(player.velocity.x, player.velocity.z);
    },
  };
}
