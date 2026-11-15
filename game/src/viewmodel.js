// viewmodel.js — owns the first-person weapon mesh, muzzle flash, flash light and gloved hands.
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  PointLight,
  Color,
  DoubleSide,
  CanvasTexture,
  Sprite,
  SpriteMaterial,
  AdditiveBlending,
} from "three";
import { PALETTE } from "./palette.js";

const VIEWMODEL_OFFSET = { x: 0.24, y: -0.2, z: -0.42 };
const MUZZLE_FLASH_OFFSET = { x: 0.24, y: -0.18, z: -0.95 };
const FLASH_LIGHT_OFFSET = { x: 0.24, y: -0.16, z: -0.6 };
const FLASH_LIGHT_RANGE = 5;
const FLASH_SPHERE_RADIUS = 0.095;
const FLASH_SPHERE_WIDTH = 6;
const FLASH_SPHERE_HEIGHT = 4;
const FLASH_OPACITY = 0.95;
const FLASH_SPRITE_SCALE = 0.6;
const FLASH_TEXTURE_SIZE = 128;
const FLASH_TEXTURE_CENTER = 64;

const RAIL_RIB_COUNT = 12;
const RAIL_RIB_SPACING = 0.04;
const RAIL_RIB_START_Z = 0.16;
const VENT_ROW_COUNT = 7;
const VENT_ROW_SPACING = 0.03;
const VENT_ROW_START_Z = -0.2;
const VENT_SIDE_OFFSET = 0.052;
const MAGAZINE_RIB_COUNT = 4;
const MAGAZINE_RIB_SPACING = 0.035;
const MAGAZINE_RIB_START_Y = -0.06;
const HAND_SCALE = { x: 1, y: 0.75, z: 0.45 };
const MUZZLE_TILT = Math.PI / 2;

const BODY_TINT = "#89938b";
const BODY_METALNESS = 0.65;
const BODY_ROUGHNESS = 0.36;
const CLOTH_ROUGHNESS = 0.95;
const GLOVE_COLOR = "#51594e";
const GLOVE_ROUGHNESS = 0.9;

const SPRITE_STOPS = [
  [0, "#ffffeb"],
  [0.2, "#fff2b9"],
  [0.5, "#ffb84bb0"],
  [1, "#ff751000"],
];

/**
 * Creates the two shared metal materials of the weapon body.
 * @returns {{grip: MeshStandardMaterial, body: MeshStandardMaterial}} weapon materials
 */
function createWeaponMaterials() {
  const grip = new MeshStandardMaterial({
    color: new Color(PALETTE.hairline),
    roughness: 0.7,
    metalness: 0.2,
  });
  const body = new MeshStandardMaterial({
    color: new Color(PALETTE.ink),
    roughness: 0.5,
    metalness: 0.35,
  });
  return { grip, body };
}

/**
 * Builds the receiver, barrel, stock, rail, vents, optic and magazine.
 * @param {MeshStandardMaterial} grip dark grip material
 * @param {MeshStandardMaterial} body light body material
 * @returns {{model: Group, magazine: Mesh}} assembled weapon group and its magazine
 */
function buildWeaponBody(grip, body) {
  const model = new Group();
  const receiver = new Mesh(new BoxGeometry(0.09, 0.1, 0.42), body);
  const barrel = new Mesh(new BoxGeometry(0.045, 0.045, 0.4), grip);
  barrel.position.set(0, 0.025, -0.38);
  const stock = new Mesh(new BoxGeometry(0.075, 0.08, 0.22), grip);
  stock.position.set(0, -0.02, 0.3);
  model.add(receiver, barrel, stock);
  model.position.set(VIEWMODEL_OFFSET.x, VIEWMODEL_OFFSET.y, VIEWMODEL_OFFSET.z);

  const port = new Mesh(new BoxGeometry(0.004, 0.036, 0.09), grip);
  port.position.set(0.047, 0.015, 0.02);
  model.add(port);
  const sight = new Mesh(new BoxGeometry(0.026, 0.04, 0.03), body);
  sight.position.set(0, 0.1, -0.25);
  model.add(sight);
  const rail = new Mesh(new BoxGeometry(0.055, 0.04, 0.28), grip);
  rail.position.set(0, 0.075, -0.04);
  model.add(rail);
  const magazine = new Mesh(new BoxGeometry(0.065, 0.18, 0.11), grip);
  magazine.position.set(0, -0.12, 0.04);
  model.add(magazine);

  /**
   * Adds one axis-aligned box to a parent group.
   * @param {number} width box width
   * @param {number} height box height
   * @param {number} depth box depth
   * @param {number} x local x
   * @param {number} y local y
   * @param {number} z local z
   * @param {import('three').Material} [material=grip] material to apply
   * @param {import('three').Object3D} [parent=model] parent object
   * @returns {Mesh} the created mesh
   */
  function addBox(width, height, depth, x, y, z, material = grip, parent = model) {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  // Machined handguard, muzzle brake, charging handle and open reflex optic.
  body.color.set(BODY_TINT);
  grip.color.set(PALETTE.dark);
  body.metalness = BODY_METALNESS;
  body.roughness = BODY_ROUGHNESS;

  addBox(0.1, 0.095, 0.27, 0, 0.005, -0.3, body);
  for (let ribIndex = 0; ribIndex < RAIL_RIB_COUNT; ribIndex++) {
    addBox(0.105, 0.012, 0.012, 0, 0.068, RAIL_RIB_START_Z - ribIndex * RAIL_RIB_SPACING);
  }
  for (let ventIndex = 0; ventIndex < VENT_ROW_COUNT; ventIndex++) {
    for (const sideX of [-VENT_SIDE_OFFSET, VENT_SIDE_OFFSET]) {
      addBox(0.008, 0.022, 0.023, sideX, 0, VENT_ROW_START_Z - ventIndex * VENT_ROW_SPACING);
    }
  }

  const muzzle = new Mesh(new CylinderGeometry(0.029, 0.029, 0.17, 12), grip);
  muzzle.rotation.x = MUZZLE_TILT;
  muzzle.position.set(0, 0.025, -0.61);
  model.add(muzzle);

  addBox(0.02, 0.02, 0.09, 0.06, 0.03, 0.05, body);
  addBox(0.065, 0.16, 0.075, 0, -0.16, 0.13).rotation.x = -0.3;
  addBox(0.1, 0.14, 0.04, 0, -0.035, 0.4, body);
  addBox(0.066, 0.013, 0.06, 0, 0.1, 0.04);
  addBox(0.012, 0.068, 0.025, -0.034, 0.134, 0.04, body);
  addBox(0.012, 0.068, 0.025, 0.034, 0.134, 0.04, body);
  addBox(0.08, 0.012, 0.025, 0, 0.17, 0.04, body);
  for (let ribIndex = 0; ribIndex < MAGAZINE_RIB_COUNT; ribIndex++) {
    addBox(
      0.07,
      0.008,
      0.1,
      0,
      MAGAZINE_RIB_START_Y - ribIndex * MAGAZINE_RIB_SPACING,
      0,
      grip,
      magazine,
    );
  }

  return { model, magazine };
}

/**
 * Builds the gloved hand, the sleeve and the support arm.
 * @param {import('three').Group} model weapon group receiving the sleeve geometry
 * @param {MeshStandardMaterial} grip grip material used as the hand's base
 * @returns {{hand: Mesh}} the camera-space hand mesh
 */
function buildHands(model, grip) {
  const cloth = new MeshStandardMaterial({ color: PALETTE.surface, roughness: CLOTH_ROUGHNESS });
  const glove = new MeshStandardMaterial({ color: GLOVE_COLOR, roughness: GLOVE_ROUGHNESS });

  const hand = new Mesh(new BoxGeometry(0.11, 0.12, 0.3), grip);
  hand.position.set(0.22, -0.29, -0.3);
  hand.material = glove;
  hand.scale.set(HAND_SCALE.x, HAND_SCALE.y, HAND_SCALE.z);

  /**
   * Adds one box to a parent object for the hand assembly.
   * @param {number} width box width
   * @param {number} height box height
   * @param {number} depth box depth
   * @param {number} x local x
   * @param {number} y local y
   * @param {number} z local z
   * @param {import('three').Material} material material to apply
   * @param {import('three').Object3D} [parent=model] parent object
   * @returns {Mesh} the created mesh
   */
  function addBox(width, height, depth, x, y, z, material, parent = model) {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  return { hand, cloth, glove, addBox };
}

/**
 * Builds the muzzle flash sphere, its additive sprite and its point light.
 * @param {import('three').Camera} camera camera that owns the flash
 * @returns {{flash: Mesh, flashLight: PointLight}} flash meshes
 */
function buildMuzzleFlash(camera) {
  const flash = new Mesh(
    new SphereGeometry(FLASH_SPHERE_RADIUS, FLASH_SPHERE_WIDTH, FLASH_SPHERE_HEIGHT),
    new MeshBasicMaterial({
      color: new Color(PALETTE.accent),
      transparent: true,
      opacity: FLASH_OPACITY,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  flash.position.set(MUZZLE_FLASH_OFFSET.x, MUZZLE_FLASH_OFFSET.y, MUZZLE_FLASH_OFFSET.z);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new PointLight(new Color(PALETTE.accent), 0, FLASH_LIGHT_RANGE);
  flashLight.position.set(FLASH_LIGHT_OFFSET.x, FLASH_LIGHT_OFFSET.y, FLASH_LIGHT_OFFSET.z);
  camera.add(flashLight);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = FLASH_TEXTURE_SIZE;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(
    FLASH_TEXTURE_CENTER,
    FLASH_TEXTURE_CENTER,
    0,
    FLASH_TEXTURE_CENTER,
    FLASH_TEXTURE_CENTER,
    FLASH_TEXTURE_CENTER,
  );
  for (const [offset, color] of SPRITE_STOPS) gradient.addColorStop(offset, color);
  context.fillStyle = gradient;
  context.fillRect(0, 0, FLASH_TEXTURE_SIZE, FLASH_TEXTURE_SIZE);

  const sprite = new Sprite(
    new SpriteMaterial({
      map: new CanvasTexture(canvas),
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  sprite.scale.set(FLASH_SPRITE_SCALE, FLASH_SPRITE_SCALE, 1);
  flash.add(sprite);

  return { flash, flashLight };
}

/**
 * Builds the complete first-person weapon rig and parents it to the camera.
 * @param {import('three').Camera} camera camera the viewmodel hangs from
 * @returns {{model: Group, flash: Mesh, flashLight: PointLight, magazine: Mesh, hand: Mesh}} viewmodel API
 */
export function createViewmodel(camera) {
  const { grip, body } = createWeaponMaterials();
  const { model, magazine } = buildWeaponBody(grip, body);
  camera.add(model);

  const { flash, flashLight } = buildMuzzleFlash(camera);
  const { hand, cloth, glove, addBox } = buildHands(model, grip);
  camera.add(hand);

  addBox(0.13, 0.13, 0.35, 0.25, -0.34, -0.06, cloth, camera).rotation.x = -0.25;
  const arm = addBox(0.12, 0.13, 0.36, -0.14, -0.18, -0.18, cloth);
  arm.rotation.y = -0.7;
  arm.rotation.x = 0.22;
  addBox(0.125, 0.09, 0.14, -0.045, -0.075, -0.31, glove);
  addBox(0.11, 0.13, 0.3, 0.04, -0.25, 0.3, cloth);

  return { model, flash, flashLight, magazine, hand };
}
