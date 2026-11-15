// Bootstrap and fixed 120 Hz simulation. Rendering never advances gameplay.
import { Color, WebGLRenderer, PCFShadowMap, REVISION, Scene, FogExp2, PerspectiveCamera, ACESFilmicToneMapping, SRGBColorSpace, Vector2 } from "three";
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.min.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.min.js';
import { GTAOPass } from '../vendor/addons/postprocessing/GTAOPass.min.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.min.js';
import { SMAAPass } from '../vendor/addons/postprocessing/SMAAPass.min.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.min.js';
import { createAtmosphere } from './atmosphere.js';
import { createEffects } from './effects.js';
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
const state = createState(),
  random = mulberry32(0x713abc);
const renderer = new WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
// r187 removed the legacy filter; use its supported PCF replacement before rendering.
if (Number(REVISION) >= 187) renderer.shadowMap.type = PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = SRGBColorSpace;
document.getElementById("game").appendChild(renderer.domElement);
const scene = new Scene();
scene.background = new Color(PALETTE.sky);
scene.fog = new FogExp2(PALETTE.sky, 0.012);
const camera = new PerspectiveCamera(74, innerWidth / innerHeight, 0.05, 100);
scene.add(camera);
const atmosphere = createAtmosphere(scene);
const effects = createEffects(scene);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
ao.output = GTAOPass.OUTPUT.Default;
ao.blendIntensity = 0.55;
ao.updateGtaoMaterial({samples:8,radius:.35});
ao.updatePdMaterial({samples:8});
composer.addPass(ao);
composer.addPass(new UnrealBloomPass(new Vector2(innerWidth, innerHeight), 0.35, 0.6, 0.85));
composer.addPass(new SMAAPass());
composer.addPass(new OutputPass());
// AO is deliberately half-resolution; final colour and antialiasing stay full-resolution.
ao.setSize(Math.ceil(innerWidth/2),Math.ceil(innerHeight/2));
const world = createWorld(scene),
  audio = createAudio();
world.effects = effects;
const player = createPlayer(world, state, audio),
  weapon = createWeapon(camera, state, world, random, audio);
const bots = createBots(scene, state, world, random, audio);
const objective = createObjective(state, audio),
  grenades = createGrenades(scene, state, world, audio);
const rounds = createRounds(state, player, weapon, bots, objective, grenades, effects),
  buy = createBuy(state, weapon);
const hud = createHud(state);
let screens;
const input = createInput(renderer.domElement, (locked) => screens?.lockChanged(locked));
rounds.reset();
screens = createScreens(state, rounds, input, audio);
function syncCamera(alpha = 1) {
  const p = state.player;
  camera.position.lerpVectors(p.previous, p.position, alpha);
  camera.position.y += p.eye;
  camera.rotation.set(Math.min(1.5, p.pitch + p.recoil), p.yaw, 0, "YXZ");
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
function frame(now) {
  requestAnimationFrame(frame);
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  const alpha = simulation.advance(dt, state.screen === "playing" && input.state.locked && !document.hidden);
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
  ao.setSize(Math.ceil(innerWidth/2),Math.ceil(innerHeight/2));
});
syncCamera();
requestAnimationFrame(frame);

// Tooling entry: browser checks inspect the actual live state and rendered scene.
window.crosscut = { state, camera, renderer, scene, rounds, weapon, objective, bots, player, grenades, screens };
