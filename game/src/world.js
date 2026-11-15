// world.js — owns the relay map shell, colliders and allocation-free overlap, sight and support queries.
import { createScenery } from "./scenery.js";
import { surface } from "./textures.js";
import {
  Vector3,
  Group,
  Mesh,
  BoxGeometry,
  Box3,
  Ray,
  HemisphereLight,
  DirectionalLight,
} from "three";
import { PALETTE } from "./palette.js";

const PLAYER_RADIUS = 0.34;
const OVERLAP_INSET = 0.015;
const DEFAULT_SIGHT_LIMIT = 100;

const LANE_MARKING_START_Z = -15;
const LANE_MARKING_END_Z = 16;
const LANE_MARKING_STEP = 3;
const LANE_MARKING_X = 4;
const LANE_MARKING_Y = 0.012;
const LANE_MARKING_SIZE = [0.12, 0.012, 1];

const STEP_COUNT = 10;
const RAIL_POST_COUNT = 5;
const CATWALK_RAIL_X = -15.4;
const CATWALK_STEP_X = -14;
const CATWALK_STEP_START_Z = -6.9;
const CATWALK_STEP_STEP = 0.4;
const REAR_STEP_X = 8;
const REAR_STEP_START_Z = -10.9;

const HEMISPHERE_SKY = "#9fc8dd";
const HEMISPHERE_INTENSITY = 1.0;
const SUN_COLOR = "#ffe6b6";
const SUN_INTENSITY = 3.9;
const SUN_POSITION = { x: -15, y: 23, z: 8 };
const FILL_COLOR = "#93c9de";
const FILL_INTENSITY = 0.8;
const FILL_POSITION = { x: 14, y: 10, z: -6 };
const SUN_SHADOW_MAP = 2048;
const SUN_SHADOW_EXTENT = 25;
const SUN_SHADOW_FAR = 70;
const SUN_SHADOW_BIAS = -0.0005;
const SUN_SHADOW_RADIUS = 3;

/**
 * Maps a palette key to the procedural surface family used for it.
 * @param {string} name palette key
 * @returns {string} surface family
 */
function surfaceKindFor(name) {
  if (name === "muted") return "wood";
  if (name === "rust" || name === "teal") return "metal";
  if (name === "hairline") return "floor";
  return "concrete";
}

/**
 * Tiling factor for a palette key's surface.
 * @param {string} name palette key
 * @returns {number} repeat count
 */
function surfaceRepeatFor(name) {
  return name === "hairline" ? 14 : 3;
}

/**
 * Builds one shared material per palette key.
 * @returns {Record<string, import('three').Material>} materials keyed by palette name
 */
function buildMaterials() {
  const materials = {};
  for (const name of Object.keys(PALETTE)) {
    materials[name] = surface(name, surfaceKindFor(name), surfaceRepeatFor(name));
  }
  return materials;
}

/**
 * Adds the floor, perimeter walls, central spine, cover blocks, catwalk and
 * rear ramp, registering a collider for every solid box.
 * @param {Group} group scene group receiving the geometry
 * @param {Record<string, import('three').Material>} materials palette materials
 * @param {Box3[]} colliders collider list appended to
 * @returns {void}
 */
function buildArchitecture(group, materials, colliders) {
  /**
   * Adds one collidable box to the map.
   * @param {number} width box width
   * @param {number} height box height
   * @param {number} depth box depth
   * @param {number} x centre x
   * @param {number} y centre y
   * @param {number} z centre z
   * @param {string} [color="surface"] palette key for the material
   * @returns {void}
   */
  function box(width, height, depth, x, y, z, color = "surface") {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), materials[color]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new Box3().setFromObject(mesh));
  }

  box(32, 0.4, 36, 0, -0.2, 0, "hairline");
  box(0.5, 5, 36, -16, 2.5, 0);
  box(0.5, 5, 36, 16, 2.5, 0);
  box(32, 5, 0.5, 0, 2.5, -18);
  box(32, 5, 0.5, 0, 2.5, 18);

  // Broken central spine makes two lanes connected at both ends and through a cross-cut.
  box(3, 4.5, 9, 0, 2.25, 2);
  box(3, 4.5, 6, 0, 2.25, -11);
  box(10, 0.4, 9, -10, 4.3, -2, "ink");
  box(0.5, 4.5, 5, -5, 2.25, -9);
  box(0.5, 4.5, 5, -5, 2.25, 5);
  box(3, 1.1, 2, -10, 0.55, -3, "muted");
  box(2.4, 1.3, 2.4, 8, 0.65, 1, "muted");
  box(2, 2.5, 3, 12, 1.25, -7);
  box(3, 1, 2, 5, 0.5, -11, "muted");
  box(3, 1, 1.5, -8, 0.5, 9, "muted");
  box(2, 1.2, 2, 10, 0.6, 10, "muted");

  // West elevated service catwalk with walkable steps, low parapet and rail posts.
  box(3, 1, 5, -14, 0.5, -13, "teal");
  for (let stepIndex = 0; stepIndex < STEP_COUNT; stepIndex++) {
    box(
      2,
      (stepIndex + 1) * 0.1,
      0.4,
      CATWALK_STEP_X,
      (stepIndex + 1) * 0.05,
      CATWALK_STEP_START_Z - stepIndex * CATWALK_STEP_STEP,
      "hairline",
    );
  }
  box(0.15, 0.6, 5, CATWALK_RAIL_X, 1.3, -13, "muted");
  for (let postIndex = 0; postIndex < RAIL_POST_COUNT; postIndex++) {
    box(0.08, 1, 0.08, CATWALK_RAIL_X, 1.5, -15 + postIndex, "ink");
  }
  box(0.1, 0.1, 5, CATWALK_RAIL_X, 2, -13, "accent");

  // Low blast wall and corrugated container preserve both crosscut chokepoints.
  box(4, 0.8, 0.5, -8, 0.4, 2, "teal");
  box(2.4, 2.5, 4, 12, 1.25, 5, "rust");

  // A shallow stepped ramp reaches the rear observation deck; each rise is walkable.
  box(6, 1, 3, 8, 0.5, -16.2);
  for (let stepIndex = 0; stepIndex < STEP_COUNT; stepIndex++) {
    box(
      3,
      (stepIndex + 1) * 0.1,
      0.4,
      REAR_STEP_X,
      (stepIndex + 1) * 0.05,
      REAR_STEP_START_Z - stepIndex * CATWALK_STEP_STEP,
      "hairline",
    );
  }

  // Lane markings are visual only.
  for (let z = LANE_MARKING_START_Z; z < LANE_MARKING_END_Z; z += LANE_MARKING_STEP) {
    const marking = new Mesh(
      new BoxGeometry(LANE_MARKING_SIZE[0], LANE_MARKING_SIZE[1], LANE_MARKING_SIZE[2]),
      materials.accent,
    );
    marking.position.set(LANE_MARKING_X, LANE_MARKING_Y, z);
    group.add(marking);
  }
}

/**
 * Adds the hemisphere fill and the shadow-casting sun.
 * @param {import('three').Scene} scene scene receiving the lights
 * @returns {void}
 */
function buildLighting(scene) {
  scene.add(new HemisphereLight(HEMISPHERE_SKY, PALETTE.dark, HEMISPHERE_INTENSITY));

  const sun = new DirectionalLight(SUN_COLOR, SUN_INTENSITY);
  sun.position.set(SUN_POSITION.x, SUN_POSITION.y, SUN_POSITION.z);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SUN_SHADOW_MAP, SUN_SHADOW_MAP);
  Object.assign(sun.shadow.camera, {
    left: -SUN_SHADOW_EXTENT,
    right: SUN_SHADOW_EXTENT,
    top: SUN_SHADOW_EXTENT,
    bottom: -SUN_SHADOW_EXTENT,
    far: SUN_SHADOW_FAR,
  });
  sun.shadow.bias = SUN_SHADOW_BIAS;
  sun.shadow.radius = SUN_SHADOW_RADIUS;
  scene.add(sun);

  // Cool east fill keeps the shadowed lane readable without flattening the key light.
  const fill = new DirectionalLight(FILL_COLOR, FILL_INTENSITY);
  fill.position.set(FILL_POSITION.x, FILL_POSITION.y, FILL_POSITION.z);
  scene.add(fill);
}

/**
 * Builds the map and returns its geometry plus the collision queries.
 * @param {import('three').Scene} scene scene the map is added to
 * @returns {{colliders: Box3[], overlap: Function, wallDistance: Function, supportHeight: Function, render: Function}} world API
 */
export function createWorld(scene) {
  const colliders = [];
  const group = new Group();
  scene.add(group);

  const materials = buildMaterials();
  buildArchitecture(group, materials, colliders);
  buildLighting(scene);

  const scenery = createScenery(scene);
  const probe = new Box3();
  const ray = new Ray();
  const point = new Vector3();

  /**
   * Returns the first collider overlapping a vertical player-sized probe.
   * @param {number} x probe centre x
   * @param {number} y probe base y
   * @param {number} z probe centre z
   * @param {number} height probe height
   * @param {number} [radius=PLAYER_RADIUS] probe radius
   * @returns {Box3 | null} overlapping collider, or null
   */
  function overlap(x, y, z, height, radius = PLAYER_RADIUS) {
    probe.min.set(x - radius, y + OVERLAP_INSET, z - radius);
    probe.max.set(x + radius, y + height - OVERLAP_INSET, z + radius);
    for (let colliderIndex = 0; colliderIndex < colliders.length; colliderIndex++) {
      if (probe.intersectsBox(colliders[colliderIndex])) return colliders[colliderIndex];
    }
    return null;
  }

  /**
   * Casts a ray against every collider and reports the nearest wall distance.
   * @param {import('three').Vector3} origin ray origin
   * @param {import('three').Vector3} direction unit ray direction
   * @param {number} [limit=DEFAULT_SIGHT_LIMIT] maximum distance considered
   * @returns {number} nearest wall distance, clamped to the limit
   */
  function wallDistance(origin, direction, limit = DEFAULT_SIGHT_LIMIT) {
    ray.set(origin, direction);
    let nearest = limit;
    for (let colliderIndex = 0; colliderIndex < colliders.length; colliderIndex++) {
      if (ray.intersectBox(colliders[colliderIndex], point)) {
        nearest = Math.min(nearest, origin.distanceTo(point));
      }
    }
    return nearest;
  }

  /**
   * Finds the highest walkable surface under a footprint at or below a ceiling.
   * @param {number} x footprint centre x
   * @param {number} z footprint centre z
   * @param {number} maximum highest surface height allowed
   * @param {number} [radius=PLAYER_RADIUS] footprint radius
   * @returns {number} supporting surface height, or -Infinity when unsupported
   */
  function supportHeight(x, z, maximum, radius = PLAYER_RADIUS) {
    let highest = -Infinity;
    for (let colliderIndex = 0; colliderIndex < colliders.length; colliderIndex++) {
      const collider = colliders[colliderIndex];
      const overlapsFootprint =
        x + radius > collider.min.x &&
        x - radius < collider.max.x &&
        z + radius > collider.min.z &&
        z - radius < collider.max.z &&
        collider.max.y <= maximum;
      if (overlapsFootprint) highest = Math.max(highest, collider.max.y);
    }
    return highest;
  }

  return { colliders, overlap, wallDistance, supportHeight, render: scenery.render };
}
