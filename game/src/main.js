// main.js — owns bootstrap: renderer, scene, camera, post stack, subsystem wiring and frame loop.
import {
  Color,
  WebGLRenderer,
  PCFShadowMap,
  REVISION,
  Scene,
  FogExp2,
  PerspectiveCamera,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Vector2,
} from "three";
import { EffectComposer } from "../vendor/addons/postprocessing/EffectComposer.min.js";
import { RenderPass } from "../vendor/addons/postprocessing/RenderPass.min.js";
import { GTAOPass } from "../vendor/addons/postprocessing/GTAOPass.min.js";
import { UnrealBloomPass } from "../vendor/addons/postprocessing/UnrealBloomPass.min.js";
import { SMAAPass } from "../vendor/addons/postprocessing/SMAAPass.min.js";
import { OutputPass } from "../vendor/addons/postprocessing/OutputPass.min.js";
import { ShaderPass } from "../vendor/addons/postprocessing/ShaderPass.min.js";
import { BrightnessContrastShader } from "../vendor/addons/shaders/BrightnessContrastShader.min.js";
import { createAtmosphere } from "./atmosphere.js";
import { createEffects } from "./effects.js";
import { PALETTE } from "./palette.js";
import { createState, mulberry32 } from "./state.js";
import { createWorld } from "./world.js";
import { createInput } from "./input.js";
import { createPlayer } from "./player.js";
import { createWeapon } from "./weapon.js";
import { createBots } from "./bots.js";
import { createRounds } from "./rounds.js";
import { createScreens } from "./screens.js";
import { createHud } from "./hud.js";
import { createAudio } from "./audio.js";
import { createBuy } from "./buy.js";
import { createGrenades } from "./grenades.js";
import { createObjective } from "./objective.js";
import { createSimulation } from "./simulation.js";

const RANDOM_SEED = 0x713abc;
const MAX_PIXEL_RATIO = 2;
const CAMERA_FOV = 74;
const CAMERA_NEAR = 0.05;
const CAMERA_FAR = 100;
const TONE_MAPPING_EXPOSURE = 1.12;
const FOG_DENSITY = 0.0085;
const PCF_SHADOW_REVISION = 187;

const AO_BLEND_INTENSITY = 0.7;
const AO_SAMPLES = 8;
const AO_RADIUS = 0.35;
const BLOOM_STRENGTH = 0.5;
const BLOOM_RADIUS = 0.55;
const BLOOM_THRESHOLD = 0.9;
const AO_DOWNSCALE = 2;
const GRADE_CONTRAST = 0.09;

const MAX_CAMERA_PITCH = 1.5;

const state = createState();
const random = mulberry32(RANDOM_SEED);

const renderer = new WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
// r187 removed the legacy filter; use its supported PCF replacement before rendering.
if (Number(REVISION) >= PCF_SHADOW_REVISION) renderer.shadowMap.type = PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
renderer.outputColorSpace = SRGBColorSpace;
document.getElementById("game").appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(PALETTE.sky);
scene.fog = new FogExp2(PALETTE.sky, FOG_DENSITY);

const camera = new PerspectiveCamera(
  CAMERA_FOV,
  innerWidth / innerHeight,
  CAMERA_NEAR,
  CAMERA_FAR,
);
scene.add(camera);

const atmosphere = createAtmosphere(scene);
const effects = createEffects(scene);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
ao.output = GTAOPass.OUTPUT.Default;
ao.blendIntensity = AO_BLEND_INTENSITY;
ao.updateGtaoMaterial({ samples: AO_SAMPLES, radius: AO_RADIUS });
ao.updatePdMaterial({ samples: AO_SAMPLES });
composer.addPass(ao);
composer.addPass(
  new UnrealBloomPass(
    new Vector2(innerWidth, innerHeight),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  ),
);
composer.addPass(new SMAAPass());
composer.addPass(new OutputPass());
// Final grade separates the lit play space from the sky and the far walls.
const grade = new ShaderPass(BrightnessContrastShader);
grade.uniforms.brightness.value = 0;
grade.uniforms.contrast.value = GRADE_CONTRAST;
composer.addPass(grade);
// AO is deliberately half-resolution; final colour and antialiasing stay full-resolution.
ao.setSize(Math.ceil(innerWidth / AO_DOWNSCALE), Math.ceil(innerHeight / AO_DOWNSCALE));

const world = createWorld(scene);
const audio = createAudio();
world.effects = effects;

const player = createPlayer(world, state, audio);
const weapon = createWeapon(camera, state, world, random, audio);
const bots = createBots(scene, state, world, random, audio);
const objective = createObjective(state, audio);
const grenades = createGrenades(scene, state, world, audio);
const rounds = createRounds(state, player, weapon, bots, objective, grenades, effects);
const buy = createBuy(state, weapon);
const hud = createHud(state);

let screens;
const input = createInput(renderer.domElement, (locked) => screens?.lockChanged(locked));
rounds.reset();
screens = createScreens(state, rounds, input, audio);

/**
 * Places the camera at the interpolated player position and orientation.
 * @param {number} [alpha=1] interpolation between the previous and current tick
 * @returns {void}
 */
function syncCamera(alpha = 1) {
  const playerState = state.player;
  camera.position.lerpVectors(playerState.previous, playerState.position, alpha);
  camera.position.y += playerState.eye;
  camera.rotation.set(
    Math.min(MAX_CAMERA_PITCH, playerState.pitch + playerState.recoil),
    playerState.yaw,
    0,
    "YXZ",
  );
  camera.updateMatrixWorld();
}

const simulation = createSimulation(
  state,
  input.state,
  player,
  weapon,
  bots,
  rounds,
  buy,
  grenades,
  objective,
  syncCamera,
);

let lastTime = performance.now();

/**
 * Advances the simulation and draws one frame.
 * @param {number} now high-resolution timestamp in milliseconds
 * @returns {void}
 */
function frame(now) {
  requestAnimationFrame(frame);
  const deltaSeconds = (now - lastTime) / 1000;
  lastTime = now;

  const running = state.screen === "playing" && input.state.locked && !document.hidden;
  const alpha = simulation.advance(deltaSeconds, running);

  syncCamera(alpha);
  world.render(state);
  hud.render();
  screens.render();
  atmosphere.render(state.elapsed);
  effects.render(state.elapsed);
  composer.render();
}

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  ao.setSize(Math.ceil(innerWidth / AO_DOWNSCALE), Math.ceil(innerHeight / AO_DOWNSCALE));
});

syncCamera();
requestAnimationFrame(frame);

// Tooling entry: browser checks inspect the actual live state and rendered scene.
window.crosscut = {
  state,
  camera,
  renderer,
  scene,
  rounds,
  weapon,
  objective,
  bots,
  player,
  grenades,
  screens,
};
