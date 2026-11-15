// textures.js — owns the deterministic procedural surface textures and the
// material cache shared by the map shell and its industrial dressing.
import {
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  MeshStandardMaterial,
  Vector2,
} from "three";
import { PALETTE } from "./palette.js";

const TEXTURE_SIZE = 256;
const TEXTURE_SEED = 923;
const GRAIN_DOT_COUNT = 2400;
const GRAIN_DOT_MIN = 0.4;
const GRAIN_DOT_JITTER = 2;
const GRAIN_DOT_ALPHA = 0.14;
const NORMAL_BASE = "#8080ff";
const NORMAL_RED_BASE = 120;
const NORMAL_GREEN_BASE = 120;
const NORMAL_RED_JITTER = 16;
const NORMAL_GREEN_JITTER = 16;
const NORMAL_BLUE = 252;

const STAIN_COUNT = 20;
const STAIN_MIN_RADIUS = 10;
const STAIN_RADIUS_JITTER = 65;
const STAIN_CORE = "#142c3424";
const STAIN_EDGE = "#142c3400";

const WOOD_PLANK_STEP = 42;
const WOOD_PLANK_THICKNESS = 3;
const WOOD_GRAIN_COUNT = 30;
const WOOD_GRAIN_LENGTH = 100;
const WOOD_GRAIN_COLOR = "#dfdfcc22";
const WOOD_PEG_OFFSET = 9;
const WOOD_PEG_SIZE = 4;

const METAL_BORDER_COLOR = "#dfdfcc65";
const METAL_BORDER_WIDTH = 2;
const METAL_SCRATCH_COUNT = 85;
const METAL_SCRATCH_COLOR = "#142c3470";
const METAL_SCRATCH_LENGTH = 13;
const METAL_SCRATCH_HEIGHT = 2;

const HAZARD_STRIPE_STEP = 64;
const HAZARD_STRIPE_WIDTH = 32;
const HAZARD_STRIPE_SKEW = 256;

const FLOOR_BORDER_COLOR = "#dfdfcc18";
const FLOOR_BORDER_WIDTH = 2;

const ANISOTROPY = 4;
const NORMAL_SCALE = new Vector2(0.16, 0.16);
const METAL_ROUGHNESS = 0.56;
const STONE_ROUGHNESS = 0.91;
const METAL_METALNESS = 0.48;

let seed = TEXTURE_SEED;

/**
 * Deterministic linear-congruential noise source, so every reload paints
 * the same surfaces.
 * @returns {number} pseudo-random value in [0, 1)
 */
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

/**
 * Paints the flat base colour of the tile.
 * @param {CanvasRenderingContext2D} context 2D painting context
 * @param {boolean} normal true when painting the tangent-space normal map
 * @param {string} color base colour for the albedo variant
 * @returns {void}
 */
function paintBase(context, normal, color) {
  context.fillStyle = normal ? NORMAL_BASE : color;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
}

/**
 * Scatters the fine speckle grain that keeps large surfaces from reading flat.
 * @param {CanvasRenderingContext2D} context 2D painting context
 * @param {boolean} normal true when painting the tangent-space normal map
 * @returns {void}
 */
function paintGrain(context, normal) {
  for (let dotIndex = 0; dotIndex < GRAIN_DOT_COUNT; dotIndex++) {
    const x = rand() * TEXTURE_SIZE;
    const y = rand() * TEXTURE_SIZE;
    const value = rand();
    if (normal) {
      const green = NORMAL_GREEN_BASE + rand() * NORMAL_GREEN_JITTER;
      context.fillStyle = `rgb(${NORMAL_RED_BASE + value * NORMAL_RED_JITTER},${green},${NORMAL_BLUE})`;
    } else {
      const tone = value > 0.5 ? "255,255,230" : "5,18,20";
      context.fillStyle = `rgba(${tone},${rand() * GRAIN_DOT_ALPHA})`;
    }
    context.fillRect(
      x,
      y,
      rand() * GRAIN_DOT_JITTER + GRAIN_DOT_MIN,
      rand() * GRAIN_DOT_JITTER + GRAIN_DOT_MIN,
    );
  }
}

/**
 * Lays soft radial rust and salt stains over the albedo.
 * @param {CanvasRenderingContext2D} context 2D painting context
 * @returns {void}
 */
function paintStains(context) {
  for (let stainIndex = 0; stainIndex < STAIN_COUNT; stainIndex++) {
    const x = rand() * TEXTURE_SIZE;
    const y = rand() * TEXTURE_SIZE;
    const radius = STAIN_MIN_RADIUS + rand() * STAIN_RADIUS_JITTER;
    const stain = context.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, STAIN_CORE);
    stain.addColorStop(1, STAIN_EDGE);
    context.fillStyle = stain;
    context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  }
}

/**
 * Draws horizontal plank seams, grain streaks and corner pegs.
 * @param {CanvasRenderingContext2D} context 2D painting context
 * @returns {void}
 */
function paintWoodGrain(context) {
  for (let y = 0; y < TEXTURE_SIZE; y += WOOD_PLANK_STEP) {
    context.fillStyle = PALETTE.dark;
    context.fillRect(0, y, TEXTURE_SIZE, WOOD_PLANK_THICKNESS);
    for (let streakIndex = 0; streakIndex < WOOD_GRAIN_COUNT; streakIndex++) {
      context.fillStyle = WOOD_GRAIN_COLOR;
      context.fillRect(
        rand() * TEXTURE_SIZE,
        y + rand() * WOOD_PLANK_STEP,
        rand() * WOOD_GRAIN_LENGTH,
        1,
      );
    }
    context.fillStyle = PALETTE.dark;
    context.fillRect(WOOD_PEG_OFFSET, y + WOOD_PEG_OFFSET - 1, WOOD_PEG_SIZE, WOOD_PEG_SIZE);
    context.fillRect(
      TEXTURE_SIZE - WOOD_PEG_OFFSET - WOOD_PEG_SIZE,
      y + WOOD_PEG_OFFSET - 1,
      WOOD_PEG_SIZE,
      WOOD_PEG_SIZE,
    );
  }
}

/**
 * Frames the plate and scribbles the chipped paint of a steel surface.
 * @param {CanvasRenderingContext2D} context 2D painting context
 * @returns {void}
 */
function paintMetalWear(context) {
  context.strokeStyle = METAL_BORDER_COLOR;
  context.lineWidth = METAL_BORDER_WIDTH;
  context.strokeRect(3, 3, 250, 250);
  for (let scratchIndex = 0; scratchIndex < METAL_SCRATCH_COUNT; scratchIndex++) {
    context.fillStyle = METAL_SCRATCH_COLOR;
    const x = rand() * TEXTURE_SIZE;
    const edgeBand = rand() < 0.5 ? rand() * 8 : 248 + rand() * 8;
    context.fillRect(x, edgeBand, rand() * METAL_SCRATCH_LENGTH, METAL_SCRATCH_HEIGHT);
  }
}

/**
 * Paints the diagonal hazard stripes used on thresholds and blast walls.
 * @param {CanvasRenderingContext2D} context 2D painting context
 * @returns {void}
 */
function paintHazardStripes(context) {
  for (let x = -TEXTURE_SIZE; x < TEXTURE_SIZE * 2; x += HAZARD_STRIPE_STEP) {
    context.fillStyle = PALETTE.dark;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + HAZARD_STRIPE_WIDTH, 0);
    context.lineTo(x + HAZARD_STRIPE_SKEW + HAZARD_STRIPE_WIDTH, TEXTURE_SIZE);
    context.lineTo(x + HAZARD_STRIPE_SKEW, TEXTURE_SIZE);
    context.fill();
  }
}

/**
 * Outlines the tiled deck plates.
 * @param {CanvasRenderingContext2D} context 2D painting context
 * @returns {void}
 */
function paintFloorBorder(context) {
  context.strokeStyle = FLOOR_BORDER_COLOR;
  context.lineWidth = FLOOR_BORDER_WIDTH;
  context.strokeRect(1, 1, 254, 254);
}

/**
 * Paints one tile and wraps it as a repeating texture.
 * @param {string} kind surface family: wood, metal, hazard, floor or plain
 * @param {string} color albedo base colour
 * @param {boolean} [normal=false] true to paint the tangent-space normal map
 * @returns {CanvasTexture} repeating texture ready for a material slot
 */
function texture(kind, color, normal = false) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext("2d");

  paintBase(context, normal, color);
  paintGrain(context, normal);

  if (!normal) {
    paintStains(context);
    if (kind === "wood") paintWoodGrain(context);
    if (kind === "metal") paintMetalWear(context);
    if (kind === "hazard") paintHazardStripes(context);
    if (kind === "floor") paintFloorBorder(context);
  }

  const result = new CanvasTexture(canvas);
  result.wrapS = result.wrapT = RepeatWrapping;
  result.colorSpace = normal ? "" : SRGBColorSpace;
  result.anisotropy = ANISOTROPY;
  return result;
}

const cache = {};

/**
 * Returns a cached standard material for a named palette colour.
 * @param {string} color palette key, or a literal CSS colour
 * @param {string} [kind="concrete"] surface family driving the procedural paint
 * @param {number} [repeat=2] tiling factor applied to both maps
 * @returns {MeshStandardMaterial} shared, cached material instance
 */
export function surface(color, kind = "concrete", repeat = 2) {
  const key = color + kind + repeat;
  if (cache[key]) return cache[key];

  const map = texture(kind, PALETTE[color] || color);
  map.repeat.set(repeat, repeat);
  const normalMap = texture("normal", NORMAL_BASE, true);
  normalMap.repeat.copy(map.repeat);

  const metal = kind === "metal";
  const material = new MeshStandardMaterial({
    map,
    normalMap,
    normalScale: NORMAL_SCALE,
    roughness: metal ? METAL_ROUGHNESS : STONE_ROUGHNESS,
    metalness: metal ? METAL_METALNESS : 0,
  });
  cache[key] = material;
  return material;
}

/**
 * Returns the shared hazard-striped material.
 * @returns {MeshStandardMaterial} cached hazard material
 */
export function hazardMaterial() {
  return surface("accent", "hazard", 4);
}
