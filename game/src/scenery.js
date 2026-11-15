// scenery.js — owns industrial set dressing: site pads, signage, frames, turbines, pipes and pylons.
import {
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  PlaneGeometry,
  DoubleSide,
  Group,
  PointLight,
  SRGBColorSpace,
} from "three";
import { surface, hazardMaterial } from "./textures.js";
import { PALETTE } from "./palette.js";

const SIGN_WIDTH = 512;
const SIGN_HEIGHT = 192;
const SIGN_BORDER = 8;
const SIGN_BORDER_SIZE = 496;
const SIGN_BORDER_HEIGHT = 176;
const SIGN_FONT = "bold 72px monospace";
const SIGN_CENTER_X = 256;
const SIGN_BASELINE_Y = 123;
const SIGN_PLANE_WIDTH = 4;
const SIGN_PLANE_HEIGHT = 1.5;

const SITE_COUNT = 2;
const SITE_PAD_SIZE = 7;
const SITE_OUTLINE_SIZE = 6.7;
const SITE_MARK_COUNT = 4;
const SITE_MARK_OFFSET = 3.25;
const SITE_LAMP_INTENSITY = 100;
const SITE_LAMP_RANGE = 16;
const SITE_LAMP_DECAY = 2;
const SITE_LAMP_HEIGHT = 3;
const SITE_MARKING_Y = 0.065;

const WALL_COURSE_START_Z = -16;
const WALL_COURSE_END_Z = 18;
const WALL_COURSE_STEP = 4;
const WALL_X_OFFSET = 15.7;
const RAIL_X_OFFSET = 1.52;
const RAIL_START_Z = -2;
const RAIL_END_Z = 6;
const RAIL_STEP = 2;

const HAZARD_STRIPS = [
  { x: 0, z: 6.53, width: 3 },
  { x: 0, z: -6.48, width: 3 },
  { x: 12, z: 7.03, width: 2.4 },
  { x: -10, z: -1.98, width: 3 },
];

const EXTERIOR_COUNT = 8;
const EXTERIOR_START_X = -23;
const EXTERIOR_SPACING = 7;

const FINS_COUNT = 10;
const FIN_HEIGHT = 2.3;
const FIN_START_Z = 3.2;
const FIN_STEP = 0.38;

const PORTAL_START_Z = -14;
const PORTAL_END_Z = 10;
const PORTAL_STEP = 8;

const TURBINE_COUNT = 3;
const TURBINE_RADIUS = 1.1;
const TURBINE_HEIGHT = 1.7;
const TURBINE_START_X = -12;
const TURBINE_SPACING = 3.2;
const TURBINE_Y = 5;
const TURBINE_Z = -4;

const PIPE_START_X = 10;
const PIPE_END_X = 14;
const PIPE_STEP = 0.7;
const PIPE_RADIUS = 0.12;
const PIPE_LENGTH = 29;
const PIPE_Y = 4.8;
const PIPE_Z = -1;

const RACK_COUNT = 12;
const RACK_START_X = 5;
const RACK_STEP = 0.6;
const RACK_Z = -16;
const RACK_ARM_Z = -14.8;

const PYLON_COUNT = 5;
const PYLON_START_X = -14;
const PYLON_SPACING = 7;
const PYLON_Z = -17.1;

const CHARGE_BODY_SIZE = [0.55, 0.22, 0.4];
const CHARGE_CELL_COUNT = 3;
const CHARGE_CELL_RADIUS = 0.067;
const CHARGE_CELL_LENGTH = 0.55;
const CHARGE_CELL_SPACING = 0.19;
const CHARGE_STRAP_SIZE = [0.58, 0.025, 0.045];
const CHARGE_STRAP_SPACING = 0.17;
const CHARGE_DISPLAY_WIDTH = 128;
const CHARGE_DISPLAY_HEIGHT = 64;
const CHARGE_DISPLAY_PLANE = [0.32, 0.16];
const CHARGE_DISPLAY_Y = 0.15;
const CHARGE_DISPLAY_FONT = "bold 40px monospace";
const CHARGE_DISPLAY_TEXT_X = 64;
const CHARGE_DISPLAY_TEXT_Y = 46;
const CHARGE_ANTENNA_RADIUS = 0.009;
const CHARGE_ANTENNA_LENGTH = 0.32;
const CHARGE_ANTENNA_POSITION = { x: 0.24, y: 0.2, z: -0.14 };
const CHARGE_LIGHT_INTENSITY = 1.4;
const CHARGE_LIGHT_RANGE = 2;
const CHARGE_LIGHT_Y = 0.3;
const CHARGE_LAMP_SIZE = [0.25, 0.04, 0.2];
const CHARGE_LAMP_Y = 0.14;
const CHARGE_FLOOR_Y = 0.18;
const CHARGE_BLINK_FREQUENCY = 12;

/**
 * Builds the industrial dressing and returns its per-frame charge update.
 * @param {import('three').Scene} scene scene receiving the dressing
 * @returns {{render: (state: object) => void}} scenery API
 */
export function createScenery(scene) {
  const mat = {};
  for (const key of Object.keys(PALETTE)) mat[key] = surface(key, "metal", 2);

  /**
   * Adds one dressed, shadow-casting box to the scene.
   * @param {number} width box width
   * @param {number} height box height
   * @param {number} depth box depth
   * @param {number} x centre x
   * @param {number} y centre y
   * @param {number} z centre z
   * @param {string} color palette key
   * @returns {Mesh} the created mesh
   */
  function block(width, height, depth, x, y, z, color) {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), mat[color]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  /**
   * Paints a stencilled wayfinding sign onto a canvas and hangs it in the scene.
   * @param {string} text sign text
   * @param {number} x plane centre x
   * @param {number} y plane centre y
   * @param {number} z plane centre z
   * @param {string} [color="ink"] palette key for ink and border
   * @param {number} [scale=1] plane scale factor
   * @param {number} [rotation=0] yaw in radians
   * @returns {Mesh} the sign plane
   */
  function label(text, x, y, z, color = "ink", scale = 1, rotation = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = SIGN_WIDTH;
    canvas.height = SIGN_HEIGHT;
    const context = canvas.getContext("2d");
    context.fillStyle = PALETTE.dark;
    context.fillRect(0, 0, SIGN_WIDTH, SIGN_HEIGHT);
    context.strokeStyle = PALETTE[color];
    context.lineWidth = SIGN_BORDER;
    context.strokeRect(SIGN_BORDER, SIGN_BORDER, SIGN_BORDER_SIZE, SIGN_BORDER_HEIGHT);
    context.fillStyle = PALETTE[color];
    context.textAlign = "center";
    context.font = SIGN_FONT;
    context.fillText(text, SIGN_CENTER_X, SIGN_BASELINE_Y);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const mesh = new Mesh(
      new PlaneGeometry(SIGN_PLANE_WIDTH * scale, SIGN_PLANE_HEIGHT * scale),
      new MeshBasicMaterial({ map: texture, side: DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    scene.add(mesh);
    return mesh;
  }

  /**
   * Lays the two sabotage pads with their outline, corner marks, lamps,
   * consoles and floor stencils.
   * @returns {void}
   */
  function buildSitePads() {
    for (let siteIndex = 0; siteIndex < SITE_COUNT; siteIndex++) {
      const x = siteIndex ? 10 : -11;
      const z = -12;
      const color = siteIndex ? "rust" : "teal";

      block(SITE_PAD_SIZE, 0.025, SITE_PAD_SIZE, x, 0.018, z, color);
      block(SITE_OUTLINE_SIZE, 0.035, SITE_OUTLINE_SIZE, x, 0.025, z, "hairline");
      for (let markIndex = 0; markIndex < SITE_MARK_COUNT; markIndex++) {
        const offsetX = markIndex < 2 ? -SITE_MARK_OFFSET : SITE_MARK_OFFSET;
        const offsetZ = markIndex % 2 ? -SITE_MARK_OFFSET : SITE_MARK_OFFSET;
        block(0.12, 0.02, 1.7, x + offsetX, 0.05, z + offsetZ * 0.75, color);
      }

      const siteName = siteIndex ? "B / COIL" : "A / TIDE";
      label(siteName, x, 3.5, -17.7, color, 1.4);

      const lamp = new PointLight(
        siteIndex ? "#ff9454" : "#59dbe8",
        SITE_LAMP_INTENSITY,
        SITE_LAMP_RANGE,
        SITE_LAMP_DECAY,
      );
      lamp.position.set(x, SITE_LAMP_HEIGHT, z);
      scene.add(lamp);

      block(1.2, 0.12, 0.3, x, 3.8, -17.4, "accent");
      const marking = label(siteName, x, SITE_MARKING_Y, z + 1, color, 0.85);
      marking.rotation.x = -Math.PI / 2;

      block(2.1, 1.7, 1.4, x + 2, 0.85, z - 1, color);
      for (let ventIndex = 0; ventIndex < 5; ventIndex++) {
        block(1.7, 0.08, 0.04, x + 2, 0.45 + ventIndex * 0.22, z - 0.27, "dark");
      }
      block(1.1, 0.08, 0.8, x + 2, 1.74, z - 1, "ink");
    }

    label("CROSSCUT", 0, 5, -17.72, "accent", 1.2);
  }

  /**
   * Adds recessed wall courses, expansion joints, inner rails and the hazard
   * threshold strips.
   * @returns {void}
   */
  function buildWallCourses() {
    for (let z = WALL_COURSE_START_Z; z < WALL_COURSE_END_Z; z += WALL_COURSE_STEP) {
      for (const x of [-WALL_X_OFFSET, WALL_X_OFFSET]) {
        block(0.16, 4.7, 0.18, x, 2.35, z, "dark");
        block(0.22, 0.24, 3.8, x, 0.2, z + 1.9, "dark");
      }
    }
    for (const x of [-RAIL_X_OFFSET, RAIL_X_OFFSET]) {
      for (let z = RAIL_START_Z; z < RAIL_END_Z; z += RAIL_STEP) {
        block(0.04, 0.06, 1.8, x, 1.1, z, "muted");
      }
    }

    const hazard = hazardMaterial();
    for (const stripSpec of HAZARD_STRIPS) {
      const strip = new Mesh(
        new BoxGeometry(stripSpec.width, 0.17, 0.018),
        hazard,
      );
      strip.position.set(stripSpec.x, 0.24, stripSpec.z);
      scene.add(strip);
    }
  }

  /**
   * Builds the exterior silhouettes that extend the world beyond the playable
   * enclosure.
   * @returns {void}
   */
  function buildExterior() {
    for (let blockIndex = 0; blockIndex < EXTERIOR_COUNT; blockIndex++) {
      const x = EXTERIOR_START_X + blockIndex * EXTERIOR_SPACING;
      block(4, 4 + (blockIndex % 3) * 2, 4, x, 3, -24, "surface");
      block(0.7, 9 + (blockIndex % 3), 0.7, x + 1, 5, -25, "muted");
    }
  }

  /**
   * Hangs the wayfinding label cluster and the accent fin rack.
   * @returns {void}
   */
  function buildSignage() {
    label("RESTRICTED / RELAY OPERATIONS", 8.7, 4.2, -17.68, "ink", 0.85);
    label("07", -1.52, 3, 2, "ink", 0.7, -Math.PI / 2);
    label("01 / TIDE", -8, 3, 17.72, "teal", 0.8, Math.PI);
    label("03 / COIL", 15.7, 3, 5, "rust", 0.7, -Math.PI / 2);

    for (let finIndex = 0; finIndex < FINS_COUNT; finIndex++) {
      block(0.05, FIN_HEIGHT, 0.12, 10.77, 1.25, FIN_START_Z + finIndex * FIN_STEP, "accent");
    }

    label("02 / MID", 1.53, 2.9, 1, "accent", 0.75, Math.PI / 2);
    label("RELAY 07", -15.7, 3, 5, "teal", 1, -Math.PI / 2);
    label("B  >", 6, 2.9, 17.72, "rust", 0.8, Math.PI);
  }

  /**
   * Raises the near, middle and far portal frames that carry route silhouettes.
   * @returns {void}
   */
  function buildPortalFrames() {
    for (let z = PORTAL_START_Z; z <= PORTAL_END_Z; z += PORTAL_STEP) {
      block(0.3, 5.4, 0.35, 3.1, 2.7, z, "rust");
      block(0.3, 5.4, 0.35, 14.5, 2.7, z, "rust");
      block(11.7, 0.3, 0.4, 8.8, 5.3, z, "rust");
      block(2.2, 0.06, 0.35, 8.8, 5.08, z, "ink");
    }
  }

  /**
   * Places the turbine crowns above the west lane.
   * @returns {void}
   */
  function buildTurbines() {
    for (let turbineIndex = 0; turbineIndex < TURBINE_COUNT; turbineIndex++) {
      const x = TURBINE_START_X + turbineIndex * TURBINE_SPACING;
      const turbine = new Mesh(
        new CylinderGeometry(TURBINE_RADIUS, TURBINE_RADIUS, TURBINE_HEIGHT, 16),
        mat.teal,
      );
      turbine.position.set(x, TURBINE_Y, TURBINE_Z);
      scene.add(turbine);
      block(1.3, 0.2, 1.3, x, 6, TURBINE_Z, "ink");
    }
  }

  /**
   * Runs the copper service pipes and the rack fins over the east lane.
   * @returns {void}
   */
  function buildPipesAndRacks() {
    for (let x = PIPE_START_X; x < PIPE_END_X; x += PIPE_STEP) {
      const pipe = new Mesh(
        new CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, PIPE_LENGTH, 10),
        mat.rust,
      );
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, PIPE_Y, PIPE_Z);
      scene.add(pipe);
    }

    for (let rackIndex = 0; rackIndex < RACK_COUNT; rackIndex++) {
      const x = RACK_START_X + rackIndex * RACK_STEP;
      block(0.08, 1, 0.12, x, 1.6, RACK_Z, "ink");
      block(0.09, 0.75, 0.1, x, 1.35, RACK_ARM_Z, "rust");
    }
    block(7, 0.1, 0.1, 8, 2.1, -16, "ink");
  }

  /**
   * Places the shoreline power pylons that close the skyline.
   * @returns {void}
   */
  function buildPylons() {
    for (let pylonIndex = 0; pylonIndex < PYLON_COUNT; pylonIndex++) {
      const x = PYLON_START_X + pylonIndex * PYLON_SPACING;
      block(0.4, 8, 0.4, x, 4, PYLON_Z, "muted");
      block(3, 0.25, 0.25, x, 7.5, PYLON_Z, "dark");
    }
  }

  /**
   * Builds the plantable charge prop with its cell straps, fuse display,
   * antenna, lamp and light.
   * @returns {{charge: Group, lamp: Mesh, displayContext: object, displayTexture: CanvasTexture, fuse: {last: number}}} charge rig
   */
  function buildCharge() {
    const charge = new Group();
    charge.add(new Mesh(new BoxGeometry(CHARGE_BODY_SIZE[0], CHARGE_BODY_SIZE[1], CHARGE_BODY_SIZE[2]), mat.dark));

    for (let cellIndex = 0; cellIndex < CHARGE_CELL_COUNT; cellIndex++) {
      const cell = new Mesh(
        new CylinderGeometry(CHARGE_CELL_RADIUS, CHARGE_CELL_RADIUS, CHARGE_CELL_LENGTH, 12),
        mat.rust,
      );
      cell.rotation.x = Math.PI / 2;
      cell.position.set(-CHARGE_CELL_SPACING + cellIndex * CHARGE_CELL_SPACING, 0.02, 0);
      charge.add(cell);

      const strap = new Mesh(
        new BoxGeometry(CHARGE_STRAP_SIZE[0], CHARGE_STRAP_SIZE[1], CHARGE_STRAP_SIZE[2]),
        mat.ink,
      );
      strap.position.set(0, 0.105, -CHARGE_STRAP_SPACING + cellIndex * CHARGE_STRAP_SPACING);
      charge.add(strap);
    }

    const displayCanvas = document.createElement("canvas");
    displayCanvas.width = CHARGE_DISPLAY_WIDTH;
    displayCanvas.height = CHARGE_DISPLAY_HEIGHT;
    const displayContext = displayCanvas.getContext("2d");
    const displayTexture = new CanvasTexture(displayCanvas);
    displayTexture.colorSpace = SRGBColorSpace;
    const display = new Mesh(
      new PlaneGeometry(CHARGE_DISPLAY_PLANE[0], CHARGE_DISPLAY_PLANE[1]),
      new MeshBasicMaterial({ map: displayTexture }),
    );
    display.rotation.x = -Math.PI / 2;
    display.position.set(0, CHARGE_DISPLAY_Y, 0);
    charge.add(display);

    const antenna = new Mesh(
      new CylinderGeometry(CHARGE_ANTENNA_RADIUS, CHARGE_ANTENNA_RADIUS, CHARGE_ANTENNA_LENGTH, 6),
      mat.dark,
    );
    antenna.position.set(
      CHARGE_ANTENNA_POSITION.x,
      CHARGE_ANTENNA_POSITION.y,
      CHARGE_ANTENNA_POSITION.z,
    );
    charge.add(antenna);

    const chargeLight = new PointLight(PALETTE.accent, CHARGE_LIGHT_INTENSITY, CHARGE_LIGHT_RANGE);
    chargeLight.position.y = CHARGE_LIGHT_Y;
    charge.add(chargeLight);

    const lamp = new Mesh(
      new BoxGeometry(CHARGE_LAMP_SIZE[0], CHARGE_LAMP_SIZE[1], CHARGE_LAMP_SIZE[2]),
      new MeshBasicMaterial({ color: PALETTE.accent }),
    );
    lamp.position.y = CHARGE_LAMP_Y;
    charge.add(lamp);

    scene.add(charge);
    return { charge, lamp, displayContext, displayTexture, fuse: { last: -1 } };
  }

  buildSitePads();
  buildWallCourses();
  buildExterior();
  buildSignage();
  buildPortalFrames();
  buildTurbines();
  buildPipesAndRacks();
  buildPylons();
  const { charge, lamp, displayContext, displayTexture, fuse } = buildCharge();

  /**
   * Places and animates the charge prop from the authoritative bomb record.
   * @param {object} state shared gameplay state
   * @returns {void}
   */
  function render(state) {
    charge.visible = state.bomb.status === "planted";
    charge.position.set(state.bomb.x, CHARGE_FLOOR_Y, state.bomb.z);
    lamp.visible = Math.sin(state.elapsed * CHARGE_BLINK_FREQUENCY) > 0;

    const remaining = Math.ceil(state.bomb.fuse);
    if (remaining === fuse.last) return;
    fuse.last = remaining;
    displayContext.fillStyle = PALETTE.dark;
    displayContext.fillRect(0, 0, CHARGE_DISPLAY_WIDTH, CHARGE_DISPLAY_HEIGHT);
    displayContext.fillStyle = PALETTE.accent;
    displayContext.font = CHARGE_DISPLAY_FONT;
    displayContext.textAlign = "center";
    displayContext.fillText(
      "00:" + String(remaining).padStart(2, "0"),
      CHARGE_DISPLAY_TEXT_X,
      CHARGE_DISPLAY_TEXT_Y,
    );
    displayTexture.needsUpdate = true;
  }

  return { render };
}
