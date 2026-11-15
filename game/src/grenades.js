// grenades.js — owns the fixed grenade pool: ballistics, bounces, smoke, flash and frag damage.
import {
  Vector3,
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Group,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  SRGBColorSpace,
} from "three";
import { flashBots } from "./visibility.js";
import { PALETTE } from "./palette.js";

const POOL_SIZE = 8;

const SMOKE_TEXTURE_SIZE = 128;
const SMOKE_GRADIENT_CENTER = 64;
const SMOKE_GRADIENT_INNER = 8;
const SMOKE_NOISE_X_FREQUENCY = 0.12;
const SMOKE_NOISE_Y_FREQUENCY = 0.14;
const SMOKE_NOISE_Y_PHASE = 3;
const SMOKE_NOISE_Y2_FREQUENCY = 0.17;
const SMOKE_NOISE_X2_FREQUENCY = 0.11;
const SMOKE_NOISE_X2_PHASE = 2;
const SMOKE_SHADE_BASE = 150;
const SMOKE_SHADE_RANGE = 26;
const SMOKE_GREEN_OFFSET = 9;
const SMOKE_BLUE_OFFSET = 7;
const SMOKE_ALPHA_BASE = 0.72;
const SMOKE_ALPHA_RANGE = 0.18;

const PUFF_COUNT = 9;
const PUFF_ANGLE_STEP = 2.4;
const PUFF_RADIUS = 2.2;
const PUFF_HEIGHT_STEP = 0.7;
const PUFF_HEIGHT_BASE = -0.7;
const PUFF_SCALE = [5, 4.5, 1];
const SMOKE_MATERIAL_OPACITY = 0.95;

const BODY_RADIUS = 0.1;
const BLAST_RADIUS = 1;
const BLAST_OPACITY = 0.25;
const BLAST_GLOW_SECONDS = 0.4;
const SMOKE_GLOW_SECONDS = 14;
const SMOKE_BLAST_HEIGHT = 1.5;
const SMOKE_BLAST_SCALE = 4;
const BLAST_SCALE_BASE = 1;
const BLAST_SCALE_GROWTH = 5;
const SMOKE_CLOUD_OPACITY_RATE = 0.6;
const SMOKE_BLAST_OPACITY_RATE = 0.8;
const SMOKE_BLAST_OPACITY_MAX = 0.94;
const SMOKE_TINT = "#b1c1bd";
const FLASH_TINT = "#ffffff";
const CLOUD_SPIN_RATE = 0.07;

const THROW_FUSE_SECONDS = 1.8;
const THROW_SPEED = 10;
const THROW_LIFT = 4;
const THROW_PITCH_SCALE = 8;
const GRAVITY = 18;
const BOUNCE_DAMPING = -0.5;
const GROUND_HEIGHT = 0.12;
const GROUND_BOUNCE = 0.4;
const GROUND_FRICTION = 0.96;
const GRENADE_PROBE_RADIUS = 0.15;
const GRENADE_PROBE_LIFT = 0.1;

const FRAG_RADIUS = 6;
const FRAG_DAMAGE = 140;
const FRAG_WALL_MARGIN = 0.5;
const FRAG_KILL_REWARD = 300;
const FRAG_NOISE_RADIUS = 40;
const FRAG_NOISE_SECONDS = 1;
const FRAG_MESSAGE = "YOU  /  FRAG  /  SENTINEL";
const FRAG_MESSAGE_SECONDS = 4;

/**
 * Paints the soft noisy smoke sprite used by every smoke cloud.
 * @returns {CanvasTexture} reusable smoke texture
 */
function createSmokeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SMOKE_TEXTURE_SIZE;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    SMOKE_GRADIENT_CENTER,
    SMOKE_GRADIENT_CENTER,
    SMOKE_GRADIENT_INNER,
    SMOKE_GRADIENT_CENTER,
    SMOKE_GRADIENT_CENTER,
    SMOKE_GRADIENT_CENTER,
  );
  gradient.addColorStop(0, "rgba(177,193,189,1)");
  gradient.addColorStop(0.55, "rgba(177,193,189,.95)");
  gradient.addColorStop(1, "rgba(177,193,189,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SMOKE_TEXTURE_SIZE, SMOKE_TEXTURE_SIZE);

  const pixels = context.getImageData(0, 0, SMOKE_TEXTURE_SIZE, SMOKE_TEXTURE_SIZE);
  for (let y = 0; y < SMOKE_TEXTURE_SIZE; y++) {
    for (let x = 0; x < SMOKE_TEXTURE_SIZE; x++) {
      const index = (y * SMOKE_TEXTURE_SIZE + x) * 4;
      const noise =
        (Math.sin(
          x * SMOKE_NOISE_X_FREQUENCY +
            Math.sin(y * SMOKE_NOISE_Y_FREQUENCY) * SMOKE_NOISE_Y_PHASE,
        ) +
          Math.cos(
            y * SMOKE_NOISE_Y2_FREQUENCY +
              Math.sin(x * SMOKE_NOISE_X2_FREQUENCY) * SMOKE_NOISE_X2_PHASE,
          )) *
        0.5;
      const shade = SMOKE_SHADE_BASE + noise * SMOKE_SHADE_RANGE;
      pixels.data[index] = shade;
      pixels.data[index + 1] = shade + SMOKE_GREEN_OFFSET;
      pixels.data[index + 2] = shade + SMOKE_BLUE_OFFSET;
      pixels.data[index + 3] *= SMOKE_ALPHA_BASE + noise * SMOKE_ALPHA_RANGE;
    }
  }
  context.putImageData(pixels, 0, 0);

  const smokeTexture = new CanvasTexture(canvas);
  smokeTexture.colorSpace = SRGBColorSpace;
  return smokeTexture;
}

/**
 * Allocates one pooled grenade with its projectile mesh, blast sphere and
 * smoke cloud.
 * @param {import('three').Scene} scene scene receiving the meshes
 * @param {CanvasTexture} smokeTexture shared smoke sprite texture
 * @returns {object} grenade record
 */
function createGrenade(scene, smokeTexture) {
  const mesh = new Mesh(
    new SphereGeometry(BODY_RADIUS, 8, 6),
    new MeshStandardMaterial({ color: PALETTE.accent }),
  );
  scene.add(mesh);
  mesh.visible = false;

  const blast = new Mesh(
    new SphereGeometry(BLAST_RADIUS, 24, 16),
    new MeshBasicMaterial({
      color: PALETTE.accent,
      transparent: true,
      opacity: BLAST_OPACITY,
      depthWrite: false,
    }),
  );
  scene.add(blast);
  blast.visible = false;

  const cloud = new Group();
  const smokeMaterial = new SpriteMaterial({
    map: smokeTexture,
    depthWrite: false,
    opacity: SMOKE_MATERIAL_OPACITY,
  });
  for (let puffIndex = 0; puffIndex < PUFF_COUNT; puffIndex++) {
    const puff = new Sprite(smokeMaterial);
    const angle = puffIndex * PUFF_ANGLE_STEP;
    puff.position.set(
      Math.cos(angle) * PUFF_RADIUS,
      (puffIndex % 3) * PUFF_HEIGHT_STEP + PUFF_HEIGHT_BASE,
      Math.sin(angle) * PUFF_RADIUS,
    );
    puff.scale.set(PUFF_SCALE[0], PUFF_SCALE[1], PUFF_SCALE[2]);
    cloud.add(puff);
  }
  scene.add(cloud);
  cloud.visible = false;

  return {
    mesh,
    blast,
    cloud,
    smokeMaterial,
    velocity: new Vector3(),
    active: false,
    fuse: 0,
    glow: 0,
  };
}

/**
 * Builds the grenade pool and returns its step and reset hooks.
 * Throwing, physics and blasts allocate nothing during simulation.
 * @param {import('three').Scene} scene scene receiving the pooled meshes
 * @param {object} state shared gameplay state
 * @param {object} world world collision and sight queries
 * @param {object} audio audio cue provider
 * @returns {{step: Function, reset: Function}} grenade API
 */
export function createGrenades(scene, state, world, audio) {
  const scratch = new Vector3();
  const smokeTexture = createSmokeTexture();
  for (let poolIndex = 0; poolIndex < POOL_SIZE; poolIndex++) {
    state.grenades.push(createGrenade(scene, smokeTexture));
  }

  /**
   * Resolves which grenade kind the consumed hotkeys request.
   * @param {Set<string>} keys pressed-key set, mutated as codes are consumed
   * @returns {string} "smoke", "flash", "frag" or an empty string
   */
  function consumeThrowKey(keys) {
    if (keys.delete("KeyX")) return "smoke";
    if (keys.delete("KeyF")) return "flash";
    if (keys.delete("KeyG")) return "frag";
    return "";
  }

  /**
   * Inventory field that a grenade kind draws from.
   * @param {string} kind grenade kind
   * @returns {string} state field name
   */
  function inventoryFieldFor(kind) {
    if (kind === "smoke") return "smokeCount";
    if (kind === "flash") return "flashCount";
    return "grenadeCount";
  }

  /**
   * Launches one grenade from the player's eye if a hotkey and stock allow it.
   * @param {Set<string>} keys pressed-key set, mutated as codes are consumed
   * @returns {void}
   */
  function launchFromKeys(keys) {
    const kind = consumeThrowKey(keys);
    const inventory = inventoryFieldFor(kind);
    const canThrow = kind && state.phase === "live" && state.health > 0 && state[inventory] > 0;
    if (!canThrow) return;

    for (let poolIndex = 0; poolIndex < state.grenades.length; poolIndex++) {
      const grenade = state.grenades[poolIndex];
      if (grenade.active || grenade.glow > 0) continue;

      state[inventory]--;
      grenade.kind = kind;
      grenade.throwX = -Math.sin(state.player.yaw);
      grenade.throwZ = -Math.cos(state.player.yaw);
      grenade.active = true;
      grenade.fuse = THROW_FUSE_SECONDS;
      grenade.mesh.visible = true;
      grenade.mesh.position.copy(state.player.position);
      grenade.mesh.position.y += state.player.eye;
      grenade.velocity.set(
        -Math.sin(state.player.yaw) * THROW_SPEED,
        THROW_LIFT - Math.sin(state.player.pitch) * THROW_PITCH_SCALE,
        -Math.cos(state.player.yaw) * THROW_SPEED,
      );
      break;
    }
  }

  /**
   * Ages a grenade's glow and repaints its blast sphere or smoke cloud.
   * @param {object} grenade pooled grenade record
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function updateGrenadeVisuals(grenade, dt) {
    grenade.glow = Math.max(0, grenade.glow - dt);
    grenade.blast.visible = grenade.glow > 0 && grenade.kind !== "smoke";
    grenade.cloud.visible = grenade.glow > 0 && grenade.kind === "smoke";
    grenade.cloud.position.copy(grenade.blast.position);
    grenade.cloud.rotation.y = state.elapsed * CLOUD_SPIN_RATE;
    grenade.smokeMaterial.opacity = Math.min(
      SMOKE_MATERIAL_OPACITY,
      grenade.glow * SMOKE_CLOUD_OPACITY_RATE,
    );

    const smoke = grenade.kind === "smoke";
    grenade.blast.scale.setScalar(
      smoke
        ? SMOKE_BLAST_SCALE
        : BLAST_SCALE_BASE + (1 - grenade.glow / BLAST_GLOW_SECONDS) * BLAST_SCALE_GROWTH,
    );
    grenade.blast.material.opacity = smoke
      ? Math.min(SMOKE_BLAST_OPACITY_MAX, grenade.glow * SMOKE_BLAST_OPACITY_RATE)
      : BLAST_OPACITY;
  }

  /**
   * Integrates a live grenade's flight, wall bounces and floor bounces.
   * @param {object} grenade pooled grenade record
   * @param {number} dt fixed timestep in seconds
   * @returns {void}
   */
  function advanceGrenadePhysics(grenade, dt) {
    grenade.fuse -= dt;
    grenade.velocity.y -= GRAVITY * dt;

    const position = grenade.mesh.position;
    const nextX = position.x + grenade.velocity.x * dt;
    const nextZ = position.z + grenade.velocity.z * dt;
    if (world.overlap(nextX, position.y, nextZ, GRENADE_PROBE_RADIUS, GRENADE_PROBE_LIFT)) {
      grenade.velocity.x *= BOUNCE_DAMPING;
      grenade.velocity.z *= BOUNCE_DAMPING;
    } else {
      position.x = nextX;
      position.z = nextZ;
    }

    position.y += grenade.velocity.y * dt;
    if (position.y < GROUND_HEIGHT) {
      position.y = GROUND_HEIGHT;
      grenade.velocity.y = Math.abs(grenade.velocity.y) * GROUND_BOUNCE;
      grenade.velocity.x *= GROUND_FRICTION;
      grenade.velocity.z *= GROUND_FRICTION;
    }
  }

  /**
   * Applies fragmentation damage to every sentinel inside the blast radius.
   * @param {object} grenade detonating frag grenade, used as sight scratch
   * @param {import('three').Vector3} position detonation point
   * @returns {void}
   */
  function applyFragDamage(grenade, position) {
    state.noise.x = position.x;
    state.noise.z = position.z;
    state.noise.radius = FRAG_NOISE_RADIUS;
    state.noise.time = FRAG_NOISE_SECONDS;

    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      const bot = state.bots[botIndex];
      const distance = bot.position.distanceTo(position);
      if (bot.health <= 0 || distance > FRAG_RADIUS) continue;

      grenade.velocity.subVectors(bot.position, position);
      grenade.velocity.y = 1;
      grenade.velocity.normalize();
      if (world.wallDistance(position, grenade.velocity, distance) < distance - FRAG_WALL_MARGIN) {
        continue;
      }

      const damage = FRAG_DAMAGE * (1 - distance / FRAG_RADIUS);
      state.stats.damage += Math.min(bot.health, damage);
      bot.health -= damage;
      if (bot.health <= 0) {
        bot.mode = "dead";
        state.score.kills++;
        state.money += FRAG_KILL_REWARD;
        state.message = FRAG_MESSAGE;
        state.messageTime = FRAG_MESSAGE_SECONDS;
      }
    }
  }

  /**
   * Ends a grenade's flight and runs its kind-specific detonation.
   * @param {object} grenade pooled grenade record
   * @returns {void}
   */
  function detonateGrenade(grenade) {
    const position = grenade.mesh.position;
    grenade.active = false;
    grenade.mesh.visible = false;
    grenade.glow = BLAST_GLOW_SECONDS;
    grenade.blast.position.copy(position);

    if (grenade.kind === "smoke") {
      grenade.glow = SMOKE_GLOW_SECONDS;
      grenade.blast.position.y = SMOKE_BLAST_HEIGHT;
      grenade.blast.material.color.set(SMOKE_TINT);
      return;
    }

    grenade.blast.material.color.set(grenade.kind === "flash" ? FLASH_TINT : PALETTE.accent);
    if (grenade.kind === "flash") {
      flashBots(state, grenade, world, scratch);
      audio.hit();
      return;
    }

    audio.shot(true);
    applyFragDamage(grenade, position);
  }

  /**
   * Advances every pooled grenade by one fixed step.
   * @param {number} dt fixed timestep in seconds
   * @param {Set<string>} keys pressed-key set, mutated as throw codes are consumed
   * @returns {void}
   */
  function step(dt, keys) {
    launchFromKeys(keys);

    for (let poolIndex = 0; poolIndex < state.grenades.length; poolIndex++) {
      const grenade = state.grenades[poolIndex];
      updateGrenadeVisuals(grenade, dt);
      if (!grenade.active) continue;
      advanceGrenadePhysics(grenade, dt);
      if (grenade.fuse <= 0) detonateGrenade(grenade);
    }
  }

  /**
   * Stows every grenade and hides all effect meshes for a fresh round.
   * @returns {void}
   */
  function reset() {
    for (let poolIndex = 0; poolIndex < state.grenades.length; poolIndex++) {
      const grenade = state.grenades[poolIndex];
      grenade.active = false;
      grenade.mesh.visible = false;
      grenade.glow = 0;
      grenade.blast.visible = false;
      grenade.cloud.visible = false;
    }
  }

  return { step, reset };
}
