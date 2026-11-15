// hitboxes.js — owns reusable ray primitives behind body-capsule and head-sphere queries.
import { Ray, Sphere, Vector3 } from "three";

const HEAD_HEIGHT_OFFSET = 1.65;
const HEAD_RADIUS = 0.2;
const MIN_HORIZONTAL_DIRECTION_SQUARED = 0.000001;

/**
 * Creates the shared query scratch and exposes the two distance tests.
 * Neither test allocates while firing.
 * @returns {{capsuleDistance: Function, sphereDistance: Function}} hitbox query API
 */
export function createHitboxes() {
  const ray = new Ray();
  const sphereCenter = new Vector3();
  const sphere = new Sphere(sphereCenter, HEAD_RADIUS);
  const intersectionPoint = new Vector3();

  /**
   * Distance to the nearest intersection with the spherical cap at a given height.
   * @param {import('three').Vector3} origin ray origin
   * @param {import('three').Vector3} direction unit ray direction
   * @param {import('three').Vector3} position capsule base position
   * @param {number} radius sphere radius
   * @param {number} heightOffset offset above the capsule base
   * @param {number} nearest current best distance
   * @returns {number} possibly improved nearest distance
   */
  function capDistance(origin, direction, position, radius, heightOffset, nearest) {
    ray.set(origin, direction);
    sphere.radius = radius;
    sphereCenter.set(position.x, position.y + heightOffset, position.z);
    if (ray.intersectSphere(sphere, intersectionPoint)) {
      return Math.min(nearest, origin.distanceTo(intersectionPoint));
    }
    return nearest;
  }

  /**
   * Ray against a vertical capsule: a finite cylinder plus its spherical endcaps.
   * @param {import('three').Vector3} origin ray origin
   * @param {import('three').Vector3} direction unit ray direction
   * @param {import('three').Vector3} position capsule base position
   * @param {number} radius capsule radius
   * @param {number} low lowest capsule height above the base
   * @param {number} high highest capsule height above the base
   * @returns {number} hit distance, or Infinity when the ray misses
   */
  function capsuleDistance(origin, direction, position, radius, low, high) {
    const offsetX = origin.x - position.x;
    const offsetZ = origin.z - position.z;
    const horizontalDirectionSq = direction.x * direction.x + direction.z * direction.z;
    const projection = offsetX * direction.x + offsetZ * direction.z;
    const constantTerm = offsetX * offsetX + offsetZ * offsetZ - radius * radius;
    let nearest = Infinity;

    const discriminant = projection * projection - horizontalDirectionSq * constantTerm;
    if (horizontalDirectionSq > MIN_HORIZONTAL_DIRECTION_SQUARED && discriminant >= 0) {
      const distance = (-projection - Math.sqrt(discriminant)) / horizontalDirectionSq;
      const height = origin.y + direction.y * distance - position.y;
      if (distance >= 0 && height >= low && height <= high) nearest = distance;
    }

    nearest = capDistance(origin, direction, position, radius, low, nearest);
    nearest = capDistance(origin, direction, position, radius, high, nearest);
    return nearest;
  }

  /**
   * Ray against the sentinel head sphere, one radius above the eye line.
   * @param {import('three').Vector3} origin ray origin
   * @param {import('three').Vector3} direction unit ray direction
   * @param {import('three').Vector3} position sentinel base position
   * @returns {number} hit distance, or Infinity when the ray misses
   */
  function sphereDistance(origin, direction, position) {
    ray.set(origin, direction);
    sphere.radius = HEAD_RADIUS;
    sphereCenter.set(position.x, position.y + HEAD_HEIGHT_OFFSET, position.z);
    return ray.intersectSphere(sphere, intersectionPoint)
      ? origin.distanceTo(intersectionPoint)
      : Infinity;
  }

  return { capsuleDistance, sphereDistance };
}
