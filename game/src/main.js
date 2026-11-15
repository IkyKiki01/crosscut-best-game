// Bootstrap and fixed 120 Hz simulation. Rendering never advances gameplay.
import { Color, WebGLRenderer, PCFShadowMap, Scene, Fog, PerspectiveCamera } from "three";
import { PALETTE } from "./palette.js";
import { createState, mulberry32 } from "./state.js";
import { createWorld } from "./world.js";
import { createInput } from "./input.js";
import { createPlayer } from "./player.js";
import { createWeapon } from "./weapon.js";
import { createBots } from "./bots.js";
import { createRounds } from "./rounds.js";
import { createHud } from "./hud.js";
import { createAudio } from "./audio.js";
import { createBuy } from "./buy.js";
import { createGrenades } from "./grenades.js";
import { createObjective } from "./objective.js";
import { createSimulation } from "./simulation.js";
const state = createState(),
  random = mulberry32(0x713abc);
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
document.getElementById("game").appendChild(renderer.domElement);
const scene = new Scene();
scene.background = new Color(PALETTE.sky);
scene.fog = new Fog(PALETTE.sky, 35, 85);
const camera = new PerspectiveCamera(74, innerWidth / innerHeight, 0.05, 100);
scene.add(camera);
const world = createWorld(scene),
  audio = createAudio();
const player = createPlayer(world, state, audio),
  weapon = createWeapon(camera, state, world, random, audio);
const bots = createBots(scene, state, world, random, audio);
const objective = createObjective(state, audio),
  grenades = createGrenades(scene, state, world, audio);
const rounds = createRounds(state, player, weapon, bots, objective, grenades),
  buy = createBuy(state, weapon);
const hud = createHud(state);
const input = createInput(renderer.domElement, (locked) => hud.setLocked(locked));
hud.onPlay(() => {
  audio.unlock();
  input.requestLock();
});
rounds.reset();
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
  const alpha = simulation.advance(dt, input.state.locked && !document.hidden);
  syncCamera(alpha);
  world.render(state);
  hud.render();
  renderer.render(scene, camera);
}
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
syncCamera();
requestAnimationFrame(frame);

// Tooling entry: browser checks inspect the actual live state and rendered scene.
window.crosscut = { state, camera, renderer, scene, rounds, weapon, objective, bots, player, grenades };
