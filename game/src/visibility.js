// visibility.js — owns the allocation-free perception queries shared by bots:
// smoke line-of-sight denial and the flash cone blindness test.

const SMOKE_BLOCK_RADIUS = 4;
const SMOKE_BLOCK_RADIUS_SQUARED = SMOKE_BLOCK_RADIUS * SMOKE_BLOCK_RADIUS;

const FLASH_EYE_HEIGHT = 1.5;
const FLASH_RANGE = 14;
const FLASH_CONE_DOT = 0.25;
const FLASH_WALL_MARGIN = 0.3;
const FLASH_BLIND_SECONDS = 3;
const FLASH_REACTION_SECONDS = 0.65;

/**
 * Distance along the ray, clamped to the queried segment, closest to the smoke centre.
 * @param {{x: number, y: number, z: number}} origin ray origin
 * @param {{x: number, y: number, z: number}} direction unit ray direction
 * @param {{x: number, y: number, z: number}} point smoke volume centre
 * @param {number} distance length of the segment being tested
 * @returns {number} clamped projection of the centre onto the ray
 */
function clampedProjection(origin, direction, point, distance) {
  const projection =
    (point.x - origin.x) * direction.x +
    (point.y - origin.y) * direction.y +
    (point.z - origin.z) * direction.z;
  return Math.max(0, Math.min(distance, projection));
}

/**
 * Tests whether any live smoke volume intersects the sight segment.
 * @param {{grenades: Array<object>}} state shared gameplay state
 * @param {{x: number, y: number, z: number}} origin eye position
 * @param {{x: number, y: number, z: number}} direction unit sight direction
 * @param {number} distance sight distance to the target
 * @returns {boolean} true when a smoke volume covers the segment
 */
export function smokeBlocks(state, origin, direction, distance) {
  for (const grenade of state.grenades) {
    if (grenade.kind !== "smoke" || grenade.glow <= 0) continue;
    const centre = grenade.blast.position;
    const alongRay = clampedProjection(origin, direction, centre, distance);
    const offsetX = origin.x + direction.x * alongRay - centre.x;
    const offsetY = origin.y + direction.y * alongRay - centre.y;
    const offsetZ = origin.z + direction.z * alongRay - centre.z;
    if (offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ < SMOKE_BLOCK_RADIUS_SQUARED) {
      return true;
    }
  }
  return false;
}

/**
 * Blinds every sentinel caught inside the flash cone with clear line of sight.
 * @param {{bots: Array<object>}} state shared gameplay state
 * @param {object} grenade the detonating flash grenade
 * @param {{wallDistance: Function}} world collision query provider
 * @param {import('three').Vector3} scratch reusable vector, mutated in place
 * @returns {void}
 */
export function flashBots(state, grenade, world, scratch) {
  for (const bot of state.bots) {
    scratch.subVectors(bot.position, grenade.mesh.position);
    scratch.y = FLASH_EYE_HEIGHT - grenade.mesh.position.y;
    const distance = scratch.length();
    scratch.normalize();
    const withinCone = scratch.x * grenade.throwX + scratch.z * grenade.throwZ >= FLASH_CONE_DOT;
    if (distance > FLASH_RANGE || !withinCone) continue;
    if (world.wallDistance(grenade.mesh.position, scratch, distance) < distance - FLASH_WALL_MARGIN) {
      continue;
    }
    bot.blind = FLASH_BLIND_SECONDS;
    bot.mode = "blinded";
    bot.lost = FLASH_BLIND_SECONDS;
    bot.reaction = FLASH_REACTION_SECONDS;
    bot.visibleEnemy = false;
  }
}
