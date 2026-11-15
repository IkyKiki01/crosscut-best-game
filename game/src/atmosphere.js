// atmosphere.js — owns the sky gradient dome and the drifting ambient dust
// layer that gives the relay its hazy depth.
import {
  Mesh,
  SphereGeometry,
  ShaderMaterial,
  BackSide,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Color,
} from "three";
import { PALETTE } from "./palette.js";

const SKY_RADIUS = 90;
const SKY_WIDTH_SEGMENTS = 24;
const SKY_HEIGHT_SEGMENTS = 16;
const SKY_HIGH_COLOR = "#356579";
const SKY_GRADIENT_HEIGHT = 70;

const DUST_COUNT = 280;
const DUST_HALF_SPREAD_X = 16;
const DUST_SPREAD_Y = 7;
const DUST_HALF_SPREAD_Z = 18;
const DUST_SIZE = 0.024;
const DUST_OPACITY = 0.28;

const DRIFT_X_AMPLITUDE = 0.5;
const DRIFT_X_FREQUENCY = 0.08;
const DRIFT_Y_AMPLITUDE = 0.25;
const DRIFT_Y_FREQUENCY = 0.12;

const SKY_VERTEX_SHADER = [
  "varying vec3 v;",
  "void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
].join("");

const SKY_FRAGMENT_SHADER = [
  "varying vec3 v;uniform vec3 low;uniform vec3 high;",
  "void main(){gl_FragColor=vec4(mix(low,high,smoothstep(0.,70.,v.y)),1.);}",
].join("");

/**
 * Builds the sky dome and the floating dust field, returning a render hook.
 * @param {import('three').Scene} scene scene the atmosphere is attached to
 * @returns {{render: (elapsed: number) => void}} per-frame drift update
 */
export function createAtmosphere(scene) {
  const skyMaterial = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      low: { value: new Color(PALETTE.sky) },
      high: { value: new Color(SKY_HIGH_COLOR) },
    },
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
  });
  const sky = new Mesh(
    new SphereGeometry(SKY_RADIUS, SKY_WIDTH_SEGMENTS, SKY_HEIGHT_SEGMENTS),
    skyMaterial,
  );
  scene.add(sky);

  const dustPositions = [];
  for (let dustIndex = 0; dustIndex < DUST_COUNT; dustIndex++) {
    dustPositions.push(
      Math.random() * (DUST_HALF_SPREAD_X * 2) - DUST_HALF_SPREAD_X,
      Math.random() * DUST_SPREAD_Y,
      Math.random() * (DUST_HALF_SPREAD_Z * 2) - DUST_HALF_SPREAD_Z,
    );
  }
  const dustGeometry = new BufferGeometry();
  dustGeometry.setAttribute("position", new Float32BufferAttribute(dustPositions, 3));
  const dust = new Points(
    dustGeometry,
    new PointsMaterial({
      color: PALETTE.ink,
      size: DUST_SIZE,
      transparent: true,
      opacity: DUST_OPACITY,
      depthWrite: false,
    }),
  );
  scene.add(dust);

  /**
   * Slides the whole dust field along a lazy figure-of-eight.
   * @param {number} elapsed simulation time in seconds
   * @returns {void}
   */
  function render(elapsed) {
    dust.position.x = Math.sin(elapsed * DRIFT_X_FREQUENCY) * DRIFT_X_AMPLITUDE;
    dust.position.y = Math.sin(elapsed * DRIFT_Y_FREQUENCY) * DRIFT_Y_AMPLITUDE;
  }

  return { render };
}
