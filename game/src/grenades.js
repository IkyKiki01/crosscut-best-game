// Owns pooled grenade flight, smoke volumes, flash bursts and fragmentation damage.
import { Vector3, Mesh, SphereGeometry, MeshStandardMaterial, MeshBasicMaterial, Group, Sprite, SpriteMaterial, CanvasTexture, SRGBColorSpace } from "three";
import { flashBots } from "./visibility.js";
import { PALETTE } from "./palette.js";
export function createGrenades(scene, state, world, audio) {
  // Fixed pool: throwing, physics and blast effects allocate no objects during simulation.
  const scratch = new Vector3();
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d"), gradient = ctx.createRadialGradient(64,64,8,64,64,64);
  gradient.addColorStop(0,"rgba(177,193,189,1)"); gradient.addColorStop(0.55,"rgba(177,193,189,.95)"); gradient.addColorStop(1,"rgba(177,193,189,0)");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const pixels=ctx.getImageData(0,0,128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    const i=(y*128+x)*4;
    const noise=(Math.sin(x*.12+Math.sin(y*.14)*3)+Math.cos(y*.17+Math.sin(x*.11)*2))*.5;
    const shade=150+noise*26;
    pixels.data[i]=shade;pixels.data[i+1]=shade+9;pixels.data[i+2]=shade+7;
    pixels.data[i+3]*=.72+noise*.18;
  }
  ctx.putImageData(pixels,0,0);
  const smokeTexture = new CanvasTexture(canvas);
  smokeTexture.colorSpace=SRGBColorSpace;
  for (let i = 0; i < 8; i++) {
    const mesh = new Mesh(new SphereGeometry(0.1, 8, 6), new MeshStandardMaterial({ color: PALETTE.accent }));
    scene.add(mesh);
    mesh.visible = false;
    const blast = new Mesh(
      new SphereGeometry(1, 24, 16),
      new MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    scene.add(blast);
    blast.visible = false;
    const cloud = new Group(), smokeMaterial = new SpriteMaterial({map:smokeTexture,depthWrite:false,opacity:0.95});
    for(let j=0;j<9;j++) {
      const puff=new Sprite(smokeMaterial); const a=j*2.4;
      puff.position.set(Math.cos(a)*2.2, (j%3)*0.7-0.7, Math.sin(a)*2.2);puff.scale.set(5,4.5,1);cloud.add(puff);
    }
    scene.add(cloud);cloud.visible=false;
    state.grenades.push({ mesh, blast, cloud, smokeMaterial, velocity: new Vector3(), active: false, fuse: 0, glow: 0 });
  }
  function step(dt, keys) {
    const kind = keys.delete("KeyX") ? "smoke" : keys.delete("KeyF") ? "flash" : keys.delete("KeyG") ? "frag" : "";
    const inventory = kind === "smoke" ? "smokeCount" : kind === "flash" ? "flashCount" : "grenadeCount";
    if (kind && state.phase === "live" && state.health > 0 && state[inventory] > 0) {
      for (let i = 0; i < state.grenades.length; i++) {
        const g = state.grenades[i];
        if (g.active || g.glow > 0) continue;
        state[inventory]--;
        g.kind = kind;
        g.throwX = -Math.sin(state.player.yaw); g.throwZ = -Math.cos(state.player.yaw);
        g.active = true;
        g.fuse = 1.8;
        g.mesh.visible = true;
        g.mesh.position.copy(state.player.position);
        g.mesh.position.y += state.player.eye;
        g.velocity.set(
          -Math.sin(state.player.yaw) * 10,
          4 - Math.sin(state.player.pitch) * 8,
          -Math.cos(state.player.yaw) * 10,
        );
        break;
      }
    }
    for (let i = 0; i < state.grenades.length; i++) {
      const g = state.grenades[i];
      g.glow = Math.max(0, g.glow - dt);
      g.blast.visible = g.glow > 0 && g.kind !== "smoke";
      g.cloud.visible = g.glow > 0 && g.kind === "smoke";
      g.cloud.position.copy(g.blast.position);
      g.cloud.rotation.y = state.elapsed*0.07;
      g.smokeMaterial.opacity = Math.min(0.95,g.glow*0.6);
      g.blast.scale.setScalar(g.kind === "smoke" ? 4 : 1 + (1 - g.glow / 0.4) * 5);
      g.blast.material.opacity = g.kind === "smoke" ? Math.min(0.94, g.glow * 0.8) : 0.25;
      if (!g.active) continue;
      g.fuse -= dt;
      g.velocity.y -= 18 * dt;
      const p = g.mesh.position,
        x = p.x + g.velocity.x * dt,
        z = p.z + g.velocity.z * dt;
      if (world.overlap(x, p.y, z, 0.15, 0.1)) {
        g.velocity.x *= -0.5;
        g.velocity.z *= -0.5;
      } else {
        p.x = x;
        p.z = z;
      }
      p.y += g.velocity.y * dt;
      if (p.y < 0.12) {
        p.y = 0.12;
        g.velocity.y = Math.abs(g.velocity.y) * 0.4;
        g.velocity.x *= 0.96;
        g.velocity.z *= 0.96;
      }
      if (g.fuse <= 0) {
        g.active = false;
        g.mesh.visible = false;
        g.glow = 0.4;
        g.blast.position.copy(p);
        if (g.kind === "smoke") {
          g.glow = 14; g.blast.position.y = 1.5;
          g.blast.material.color.set("#b1c1bd");
          continue;
        }
        g.blast.material.color.set(g.kind === "flash" ? "#ffffff" : PALETTE.accent);
        if (g.kind === "flash") { flashBots(state, g, world, scratch); audio.hit(); continue; }
        audio.shot(true);
        state.noise.x = p.x;
        state.noise.z = p.z;
        state.noise.radius = 40;
        state.noise.time = 1;
        for (let j = 0; j < state.bots.length; j++) {
          const b = state.bots[j],
            d = b.position.distanceTo(p);
          if (b.health <= 0 || d > 6) continue;
          g.velocity.subVectors(b.position, p);
          g.velocity.y = 1;
          g.velocity.normalize();
          if (world.wallDistance(p, g.velocity, d) < d - 0.5) continue;
          b.health -= 140 * (1 - d / 6);
          if (b.health <= 0) {
            b.mode = "dead";
            state.score.kills++;
            state.money += 300;
            state.message = "YOU  /  FRAG  /  SENTINEL";
            state.messageTime = 4;
          }
        }
      }
    }
  }
  return {
    step,
    reset() {
      for (let i = 0; i < state.grenades.length; i++) {
        const g = state.grenades[i];
        g.active = false;
        g.mesh.visible = false;
        g.glow = 0;
        g.blast.visible = false;
        g.cloud.visible = false;
      }
    },
  };
}
