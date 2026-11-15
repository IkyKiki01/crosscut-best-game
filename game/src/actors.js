// actors.js — owns sentinel meshes, rig parts and the startup actor records bots.js mutates.
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  CapsuleGeometry,
  SphereGeometry,
  BoxGeometry,
  CylinderGeometry,
  CircleGeometry,
} from "three";
import { PALETTE } from "./palette.js";
import { ROUTES, NODES } from "./navigation.js";

const SENTINEL_COUNT = 3;

const BODY_RADIUS = 0.29;
const BODY_LENGTH = 0.65;
const BODY_CAP_SEGMENTS = 4;
const BODY_RADIAL_SEGMENTS = 8;
const HEAD_RADIUS = 0.2;
const HEAD_WIDTH_SEGMENTS = 12;
const HEAD_HEIGHT_SEGMENTS = 8;
const GUN_SIZE = [0.12, 0.13, 0.7];
const LEG_SIZE = [0.18, 0.6, 0.22];
const ARM_SIZE = [0.17, 0.49, 0.18];
const BARREL_RADIUS = 0.024;
const BARREL_LENGTH = 0.35;
const BARREL_SEGMENTS = 8;
const BOOT_SIZE = [0.21, 0.17, 0.33];
const BOOT_OFFSET_X = 0.17;
const POUCH_OFFSETS = [-0.15, 0, 0.15];
const SHADOW_RADIUS = 0.42;
const SHADOW_SEGMENTS = 16;
const SHADOW_OPACITY = 0.3;
const SHADOW_HEIGHT = 0.014;
const MUZZLE_TILT = Math.PI / 2;

const BODY_Y = 1;
const HEAD_Y = 1.65;
const GUN_POSITION = { x: 0.28, y: 1.2, z: -0.36 };
const MUZZLE_POSITION = { x: 0.28, y: 1.2, z: -0.76 };
const VEST_SIZE = [0.48, 0.49, 0.23];
const VEST_POSITION = { x: 0, y: 1.06, z: -0.3 };
const VISOR_SIZE = [0.31, 0.1, 0.13];
const VISOR_POSITION = { x: 0, y: 1.68, z: -0.23 };
const ARM_Y = 1.1;
const BADGE_SIZE = [0.13, 0.05, 0.02];
const BADGE_POSITION = { x: -0.1, y: 1.18, z: -0.31 };
const LENS_SIZE = [0.26, 0.045, 0.025];
const LENS_POSITION = { x: 0, y: 1.69, z: -0.302 };
const POUCH_SIZE = [0.12, 0.19, 0.085];
const POUCH_POSITION = { y: 1.03, z: -0.44 };
const PACK_SIZE = [0.4, 0.43, 0.18];
const PACK_POSITION = { x: 0, y: 1.08, z: 0.24 };
const BARREL_POSITION = { x: 0.28, y: 1.23, z: -0.82 };
const BOOT_POSITION = { y: 0.1, z: -0.035 };

const ROLES = ["rusher", "holder", "rotator"];
const STARTING_HEALTH = 100;
const STARTING_ARMOUR = 50;

/**
 * Creates the shared sentinel materials.
 * @returns {{body: MeshStandardMaterial, dark: MeshStandardMaterial, accent: MeshStandardMaterial}} materials
 */
function createSentinelMaterials() {
  return {
    body: new MeshStandardMaterial({ color: PALETTE.dark, roughness: 0.7 }),
    dark: new MeshStandardMaterial({ color: PALETTE.surface }),
    accent: new MeshStandardMaterial({ color: PALETTE.accent }),
  };
}

/**
 * Builds one complete sentinel rig.
 * @param {object} materials shared sentinel materials
 * @param {object} geometry shared sentinel geometry
 * @returns {{mesh: Group, left: Mesh, right: Mesh, flash: Mesh, gun: Mesh}} rig parts
 */
function buildSentinelMesh(materials, geometry) {
  const mesh = new Group();
  // Yaw first so a hit flinch pitches relative to the sentinel's facing.
  mesh.rotation.order = "YXZ";

  const body = new Mesh(geometry.body, materials.body);
  body.position.y = BODY_Y;
  const head = new Mesh(geometry.head, materials.dark);
  head.position.y = HEAD_Y;
  const gun = new Mesh(geometry.gun, materials.dark);
  gun.position.set(GUN_POSITION.x, GUN_POSITION.y, GUN_POSITION.z);
  const left = new Mesh(geometry.leg, materials.dark);
  left.position.set(-BOOT_OFFSET_X, 0.3, 0);
  const right = new Mesh(geometry.leg, materials.dark);
  right.position.set(BOOT_OFFSET_X, 0.3, 0);
  const flash = new Mesh(
    new SphereGeometry(0.18, 6, 4),
    new MeshBasicMaterial({ color: PALETTE.accent }),
  );
  flash.position.set(MUZZLE_POSITION.x, MUZZLE_POSITION.y, MUZZLE_POSITION.z);
  flash.visible = false;
  const vest = new Mesh(
    new BoxGeometry(VEST_SIZE[0], VEST_SIZE[1], VEST_SIZE[2]),
    new MeshStandardMaterial({ color: PALETTE.rust, roughness: 0.8 }),
  );
  vest.position.set(VEST_POSITION.x, VEST_POSITION.y, VEST_POSITION.z);
  const visor = new Mesh(
    new BoxGeometry(VISOR_SIZE[0], VISOR_SIZE[1], VISOR_SIZE[2]),
    materials.dark,
  );
  visor.position.set(VISOR_POSITION.x, VISOR_POSITION.y, VISOR_POSITION.z);
  const armLeft = new Mesh(geometry.arm, materials.body);
  const armRight = new Mesh(geometry.arm, materials.body);
  armLeft.position.set(-0.34, ARM_Y, -0.08);
  armRight.position.set(0.34, ARM_Y, -0.2);
  armRight.rotation.x = -0.8;
  const badge = new Mesh(
    new BoxGeometry(BADGE_SIZE[0], BADGE_SIZE[1], BADGE_SIZE[2]),
    materials.accent,
  );
  badge.position.set(BADGE_POSITION.x, BADGE_POSITION.y, BADGE_POSITION.z);

  mesh.add(body, head, gun, left, right, flash, vest, visor, armLeft, armRight, badge);

  const lens = new Mesh(
    new BoxGeometry(LENS_SIZE[0], LENS_SIZE[1], LENS_SIZE[2]),
    new MeshStandardMaterial({ color: PALETTE.teal, metalness: 0.65, roughness: 0.15 }),
  );
  lens.position.set(LENS_POSITION.x, LENS_POSITION.y, LENS_POSITION.z);
  mesh.add(lens);

  for (const pouchX of POUCH_OFFSETS) {
    const pouch = new Mesh(
      new BoxGeometry(POUCH_SIZE[0], POUCH_SIZE[1], POUCH_SIZE[2]),
      materials.dark,
    );
    pouch.position.set(pouchX, POUCH_POSITION.y, POUCH_POSITION.z);
    mesh.add(pouch);
  }

  const pack = new Mesh(
    new BoxGeometry(PACK_SIZE[0], PACK_SIZE[1], PACK_SIZE[2]),
    materials.dark,
  );
  pack.position.set(PACK_POSITION.x, PACK_POSITION.y, PACK_POSITION.z);
  mesh.add(pack);

  const barrel = new Mesh(
    new CylinderGeometry(BARREL_RADIUS, BARREL_RADIUS, BARREL_LENGTH, BARREL_SEGMENTS),
    materials.body,
  );
  barrel.rotation.x = MUZZLE_TILT;
  barrel.position.set(BARREL_POSITION.x, BARREL_POSITION.y, BARREL_POSITION.z);
  mesh.add(barrel);

  for (const bootX of [-BOOT_OFFSET_X, BOOT_OFFSET_X]) {
    const boot = new Mesh(
      new BoxGeometry(BOOT_SIZE[0], BOOT_SIZE[1], BOOT_SIZE[2]),
      materials.body,
    );
    boot.position.set(bootX, BOOT_POSITION.y, BOOT_POSITION.z);
    mesh.add(boot);
  }

  const shadow = new Mesh(
    new CircleGeometry(SHADOW_RADIUS, SHADOW_SEGMENTS),
    new MeshBasicMaterial({
      color: PALETTE.dark,
      transparent: true,
      opacity: SHADOW_OPACITY,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = SHADOW_HEIGHT;
  mesh.add(shadow);

  mesh.traverse((object) => {
    if (object.isMesh) object.receiveShadow = true;
  });

  return { mesh, left, right, flash, gun };
}

/**
 * Creates the shared sentinel geometry once.
 * @returns {object} geometry set keyed by part name
 */
function createSentinelGeometry() {
  return {
    body: new CapsuleGeometry(BODY_RADIUS, BODY_LENGTH, BODY_CAP_SEGMENTS, BODY_RADIAL_SEGMENTS),
    head: new SphereGeometry(HEAD_RADIUS, HEAD_WIDTH_SEGMENTS, HEAD_HEIGHT_SEGMENTS),
    gun: new BoxGeometry(GUN_SIZE[0], GUN_SIZE[1], GUN_SIZE[2]),
    leg: new BoxGeometry(LEG_SIZE[0], LEG_SIZE[1], LEG_SIZE[2]),
    arm: new BoxGeometry(ARM_SIZE[0], ARM_SIZE[1], ARM_SIZE[2]),
  };
}

/**
 * Appends the mutable per-sentinel gameplay record.
 * @param {object} state shared gameplay state
 * @param {object} rig mesh parts returned by buildSentinelMesh
 * @param {number} index sentinel slot
 * @returns {void}
 */
function registerSentinel(state, rig, index) {
  state.bots.push({
    mesh: rig.mesh,
    left: rig.left,
    right: rig.right,
    flash: rig.flash,
    gun: rig.gun,
    position: rig.mesh.position,
    health: STARTING_HEALTH,
    mode: "patrol",
    waypoint: 0,
    route: ROUTES[index].nodes.flatMap((nodeId) => [NODES[nodeId].x, NODES[nodeId].z]),
    role: ROLES[index],
    armour: STARTING_ARMOUR,
    still: 0,
    hold: 0,
    navX: 0,
    navZ: 0,
    navigating: false,
    cooldown: 0,
    burst: 3,
    reaction: 0,
    lost: 0,
    cover: 0,
    coverX: 0,
    coverZ: 0,
    flashTime: 0,
    flinch: 0,
    gait: 0,
    lastX: 0,
    lastZ: 0,
  });
}

/**
 * Builds the relay sentinels and registers their hit-state records.
 * All geometry is allocated once at startup.
 * @param {import('three').Scene} scene scene the sentinels are added to
 * @param {object} state shared gameplay state
 * @returns {void}
 */
export function createActors(scene, state) {
  const materials = createSentinelMaterials();
  const geometry = createSentinelGeometry();

  for (let sentinelIndex = 0; sentinelIndex < SENTINEL_COUNT; sentinelIndex++) {
    const rig = buildSentinelMesh(materials, geometry);
    scene.add(rig.mesh);
    registerSentinel(state, rig, sentinelIndex);
  }
}
