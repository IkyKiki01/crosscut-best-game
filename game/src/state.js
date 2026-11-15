// All mutable gameplay data lives beneath this single state tree.
import { Vector3 } from "three";
export function createState() {
  return {
    health: 100,
    armour: 75,
    money: 3600,
    round: 1,
    score: { wins: 0, losses: 0, kills: 0 },
    buyOpen: false,
    message: "",
    messageTime: 0,
    footsteps: 0,
    noise: { x: 0, z: 0, radius: 0, time: 0 },
    grenadeCount: 1,
    grenades: [],
    bomb: { status: "carried", x: 0, z: 0, site: "", fuse: 40, plant: 0, defuse: 0 },
    phase: "buy",
    timer: 15,
    elapsed: 0,
    hit: 0,
    damageFlash: 0,
    player: {
      previous: new Vector3(0, 0, 12),
      position: new Vector3(0, 0, 12),
      velocity: new Vector3(),
      yaw: 0,
      pitch: 0,
      eye: 1.6,
      height: 1.72,
      onGround: true,
      crouching: false,
      recoil: 0,
    },
    weapon: {
      id: "rifle",
      mag: 30,
      reserve: 90,
      cooldown: 0,
      reloadLeft: 0,
      flash: 0,
      kick: 0,
      bloom: 0,
      spread: 0.002,
    },
    bots: [],
  };
}
export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
