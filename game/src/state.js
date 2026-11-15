// state.js — owns the mutable gameplay state tree and the seeded random
// generator used by weapon spread and sentinel inaccuracy.
import { Vector3 } from "three";

const START_HEALTH = 100;
const START_ARMOUR = 75;
const START_MONEY = 3600;
const START_TIMER = 15;
const START_MAG = 30;
const START_RESERVE = 90;
const START_SPREAD = 0.002;
const START_POSITION = { x: 0, y: 0, z: 12 };
const START_EYE = 1.6;
const START_HEIGHT = 1.72;
const INITIAL_FUSE = 40;
const SPAWN_GRENADES = 1;
const SPAWN_SMOKES = 1;
const SPAWN_FLASHES = 1;

/**
 * Creates a fresh, complete gameplay state tree.
 * @returns {object} mutable state object shared by every system
 */
export function createState() {
  return {
    screen: "title",
    stats: { shots: 0, hits: 0, damage: 0 },
    health: START_HEALTH,
    armour: START_ARMOUR,
    money: START_MONEY,
    round: 1,
    lastWon: false,
    score: { wins: 0, losses: 0, kills: 0 },
    buyOpen: false,
    message: "",
    messageTime: 0,
    footsteps: 0,
    noise: { x: 0, z: 0, radius: 0, time: 0 },
    grenadeCount: SPAWN_GRENADES,
    smokeCount: SPAWN_SMOKES,
    flashCount: SPAWN_FLASHES,
    kit: false,
    scoreboard: false,
    damageAngle: 0,
    grenades: [],
    bomb: { status: "carried", x: 0, z: 0, site: "", fuse: INITIAL_FUSE, plant: 0, defuse: 0 },
    phase: "buy",
    timer: START_TIMER,
    elapsed: 0,
    hit: 0,
    damageFlash: 0,
    player: {
      previous: new Vector3(START_POSITION.x, START_POSITION.y, START_POSITION.z),
      position: new Vector3(START_POSITION.x, START_POSITION.y, START_POSITION.z),
      velocity: new Vector3(),
      yaw: 0,
      pitch: 0,
      eye: START_EYE,
      height: START_HEIGHT,
      onGround: true,
      crouching: false,
      recoil: 0,
    },
    weapon: {
      id: "rifle",
      mag: START_MAG,
      reserve: START_RESERVE,
      cooldown: 0,
      reloadLeft: 0,
      flash: 0,
      kick: 0,
      bloom: 0,
      spread: START_SPREAD,
    },
    bots: [],
  };
}

/**
 * Deterministic 32-bit PRNG, seeded so every match replays identically.
 * @param {number} seed initial state
 * @returns {() => number} generator yielding values in [0, 1)
 */
export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
