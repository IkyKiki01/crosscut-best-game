// Owns industrial dressing, wayfinding, site lamps and charge presentation.
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
import { surface, hazardMaterial } from './textures.js';
import { PALETTE } from "./palette.js";
// Original tidal relay architecture: turbine crowns and suspended copper transmission bus.
export function createScenery(scene) {
  const mat = {};
  for (const key of Object.keys(PALETTE))
    mat[key] = surface(key,'metal',2);
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
    const texture = new CanvasTexture(c);texture.colorSpace=SRGBColorSpace;
    const m = new Mesh(
      new PlaneGeometry(4 * scale, 1.5 * scale),
      new MeshBasicMaterial({ map: texture, side: DoubleSide }),
    );
    m.position.set(x, y, z);
    m.rotation.y = rotation;
    scene.add(m);
    return m;
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
    const lamp = new PointLight(site ? '#ff9454' : '#59dbe8', 100, 16, 2);
    lamp.position.set(x, 3, z); scene.add(lamp);
    block(1.2, 0.12, 0.3, x, 3.8, -17.4, "accent");
    const marking = label(site ? "B / COIL" : "A / TIDE", x, 0.065, z+1, c, 0.85);
    marking.rotation.x = -Math.PI/2;
    block(2.1, 1.7, 1.4, x + 2, 0.85, z - 1, c);
    for (let k = 0; k < 5; k++) block(1.7, 0.08, 0.04, x + 2, 0.45 + k * 0.22, z - 0.27, "dark");
    block(1.1, 0.08, 0.8, x + 2, 1.74, z - 1, "ink");
  }
  label("CROSSCUT", 0, 5, -17.72, "accent", 1.2);
  // Recessed wall courses, expansion joints and protective footings.
  for(let z=-16;z<18;z+=4) {
    for(const x of [-15.7,15.7]) {
      block(.16,4.7,.18,x,2.35,z,'dark');
      block(.22,.24,3.8,x,.2,z+1.9,'dark');
    }
  }
  for(const x of [-1.52,1.52]) for(let z=-2;z<6;z+=2)block(.04,.06,1.8,x,1.1,z,'muted');
  const hazard=hazardMaterial();
  for(const [x,z,w] of [[0,6.53,3],[0,-6.48,3],[12,7.03,2.4],[-10,-1.98,3]]) {
    const strip=new Mesh(new BoxGeometry(w,.17,.018),hazard);strip.position.set(x,.24,z);scene.add(strip);
  }
  // Exterior silhouettes extend the industrial world beyond its playable walls.
  for(let i=0;i<8;i++) {
    const x=-23+i*7;
    block(4,4+i%3*2,4,x,3,-24,'surface');
    block(.7,9+i%3, .7,x+1,5,-25,'muted');
  }
  label('RESTRICTED / RELAY OPERATIONS',8.7,4.2,-17.68,'ink',.85);
  label('07',-1.52,3,2,'ink',.7,-Math.PI/2);
  label("01 / TIDE", -8, 3, 17.72, "teal", 0.8, Math.PI);
  label("03 / COIL", 15.7, 3, 5, "rust", 0.7, -Math.PI/2);
  for(let i=0;i<10;i++) block(0.05,2.3,0.12,10.77,1.25,3.2+i*0.38,"accent");
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
  for(let i=0;i<3;i++) {
    const cell=new Mesh(new CylinderGeometry(.067,.067,.55,12),mat.rust);cell.rotation.x=Math.PI/2;cell.position.set(-.19+i*.19,.02,0);charge.add(cell);
    const strap=new Mesh(new BoxGeometry(.58,.025,.045),mat.ink);strap.position.set(0,.105,-.17+i*.17);charge.add(strap);
  }
  const displayCanvas=document.createElement('canvas');displayCanvas.width=128;displayCanvas.height=64;
  const displayContext=displayCanvas.getContext('2d');const displayTexture=new CanvasTexture(displayCanvas);displayTexture.colorSpace=SRGBColorSpace;
  const display=new Mesh(new PlaneGeometry(.32,.16),new MeshBasicMaterial({map:displayTexture}));display.rotation.x=-Math.PI/2;display.position.set(0,.15,0);charge.add(display);
  const antenna=new Mesh(new CylinderGeometry(.009,.009,.32,6),mat.dark);antenna.position.set(.24,.2,-.14);charge.add(antenna);
  const chargeLight=new PointLight(PALETTE.accent,1.4,2);chargeLight.position.y=.3;charge.add(chargeLight);
  let lastFuse=-1;
  const lamp = new Mesh(new BoxGeometry(0.25, 0.04, 0.2), new MeshBasicMaterial({ color: PALETTE.accent }));
  lamp.position.y = 0.14;
  charge.add(lamp);
  scene.add(charge);
  return {
    render(state) {
      charge.visible = state.bomb.status === "planted";
      charge.position.set(state.bomb.x, 0.18, state.bomb.z);
      lamp.visible = Math.sin(state.elapsed * 12) > 0;
      const fuse=Math.ceil(state.bomb.fuse);
      if(fuse!==lastFuse){lastFuse=fuse;displayContext.fillStyle=PALETTE.dark;displayContext.fillRect(0,0,128,64);displayContext.fillStyle=PALETTE.accent;displayContext.font='bold 40px monospace';displayContext.textAlign='center';displayContext.fillText('00:'+String(fuse).padStart(2,'0'),64,46);displayTexture.needsUpdate=true;}
    },
  };
}
