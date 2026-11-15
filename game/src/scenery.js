import {
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  PlaneGeometry,
  DoubleSide,
  Group,
} from "three";
import { PALETTE } from "./palette.js";
// Original tidal relay architecture: turbine crowns and suspended copper transmission bus.
export function createScenery(scene) {
  const mat = {};
  for (const key of Object.keys(PALETTE))
    mat[key] = new MeshStandardMaterial({ color: PALETTE[key], roughness: 0.72, metalness: 0.18 });
  function block(w, h, d, x, y, z, color) {
    const m = new Mesh(new BoxGeometry(w, h, d), mat[color]);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  function label(text, x, y, z, color = "ink", scale = 1, rotation = 0) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 192;
    const ctx = c.getContext("2d");
    ctx.fillStyle = PALETTE.dark;
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = PALETTE[color];
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 176);
    ctx.fillStyle = PALETTE[color];
    ctx.textAlign = "center";
    ctx.font = "bold 72px monospace";
    ctx.fillText(text, 256, 123);
    const m = new Mesh(
      new PlaneGeometry(4 * scale, 1.5 * scale),
      new MeshBasicMaterial({ map: new CanvasTexture(c), side: DoubleSide }),
    );
    m.position.set(x, y, z);
    m.rotation.y = rotation;
    scene.add(m);
  }
  // Site floor mats and painted outlines, with distinct hardware and signage.
  for (let site = 0; site < 2; site++) {
    const x = site ? 10 : -11,
      z = -12,
      c = site ? "rust" : "teal";
    block(7, 0.025, 7, x, 0.018, z, c);
    block(6.7, 0.035, 6.7, x, 0.025, z, "hairline");
    for (let i = 0; i < 4; i++) {
      const dx = i < 2 ? -3.25 : 3.25,
        dz = i % 2 ? -3.25 : 3.25;
      block(0.12, 0.02, 1.7, x + dx, 0.05, z + dz * 0.75, c);
    }
    label(site ? "B / COIL" : "A / TIDE", x, 3.5, -17.7, c, 1.4);
    block(2.1, 1.7, 1.4, x + 2, 0.85, z - 1, c);
    for (let k = 0; k < 5; k++) block(1.7, 0.08, 0.04, x + 2, 0.45 + k * 0.22, z - 0.27, "dark");
    block(1.1, 0.08, 0.8, x + 2, 1.74, z - 1, "ink");
  }
  label("CROSSCUT", 0, 5, -17.72, "accent", 1.2);
  label("02 / MID", 1.53, 2.9, 1, "accent", 0.75, Math.PI / 2);
  label("RELAY 07", -15.7, 3, 5, "teal", 1, -Math.PI / 2);
  label("B  >", 6, 2.9, 17.72, "rust", 0.8, Math.PI);
  // Portal frames give strong near/middle/far depth and route silhouettes.
  for (let z = -14; z <= 10; z += 8) {
    block(0.3, 5.4, 0.35, 3.1, 2.7, z, "rust");
    block(0.3, 5.4, 0.35, 14.5, 2.7, z, "rust");
    block(11.7, 0.3, 0.4, 8.8, 5.3, z, "rust");
    block(2.2, 0.06, 0.35, 8.8, 5.08, z, "ink");
  }
  for (let i = 0; i < 3; i++) {
    const turbine = new Mesh(new CylinderGeometry(1.1, 1.1, 1.7, 16), mat.teal);
    turbine.position.set(-12 + i * 3.2, 5, -4);
    scene.add(turbine);
    block(1.3, 0.2, 1.3, -12 + i * 3.2, 6, -4, "ink");
  }
  // Copper service pipes travel above the east lane; rack fins catch the sun.
  for (let x = 10; x < 14; x += 0.7) {
    const pipe = new Mesh(new CylinderGeometry(0.12, 0.12, 29, 10), mat.rust);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 4.8, -1);
    scene.add(pipe);
  }
  for (let i = 0; i < 12; i++) {
    block(0.08, 1, 0.12, 5 + i * 0.6, 1.6, -16, "ink");
    block(0.09, 0.75, 0.1, 5 + i * 0.6, 1.35, -14.8, "rust");
  }
  block(7, 0.1, 0.1, 8, 2.1, -16, "ink");
  // Distant shoreline power pylons remain inside the playable enclosure's skyline.
  for (let i = 0; i < 5; i++) {
    const x = -14 + i * 7;
    block(0.4, 8, 0.4, x, 4, -17.1, "muted");
    block(3, 0.25, 0.25, x, 7.5, -17.1, "dark");
  }
  // Charge is visible only after planting, and pulses from the authoritative fuse.
  const charge = new Group();
  charge.add(new Mesh(new BoxGeometry(0.55, 0.22, 0.4), mat.dark));
  const lamp = new Mesh(new BoxGeometry(0.25, 0.04, 0.2), new MeshBasicMaterial({ color: PALETTE.accent }));
  lamp.position.y = 0.14;
  charge.add(lamp);
  scene.add(charge);
  return {
    render(state) {
      charge.visible = state.bomb.status === "planted";
      charge.position.set(state.bomb.x, 0.18, state.bomb.z);
      lamp.visible = Math.sin(state.elapsed * 12) > 0;
    },
  };
}
