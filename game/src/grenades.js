import { Vector3, Mesh, SphereGeometry, MeshStandardMaterial, MeshBasicMaterial } from "three";
import { PALETTE } from "./palette.js";
export function createGrenades(scene, state, world, audio) {
  // Fixed pool: throwing, physics and blast effects allocate no objects during simulation.
  for (let i = 0; i < 4; i++) {
    const mesh = new Mesh(new SphereGeometry(0.1, 8, 6), new MeshStandardMaterial({ color: PALETTE.accent }));
    scene.add(mesh);
    mesh.visible = false;
    const blast = new Mesh(
      new SphereGeometry(1, 12, 8),
      new MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    scene.add(blast);
    blast.visible = false;
    state.grenades.push({ mesh, blast, velocity: new Vector3(), active: false, fuse: 0, glow: 0 });
  }
  function step(dt, keys) {
    if (keys.delete("KeyG") && state.phase === "live" && state.health > 0 && state.grenadeCount > 0) {
      for (let i = 0; i < state.grenades.length; i++) {
        const g = state.grenades[i];
        if (g.active) continue;
        state.grenadeCount--;
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
      g.blast.visible = g.glow > 0;
      g.blast.scale.setScalar(1 + (1 - g.glow / 0.4) * 5);
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
      }
    },
  };
}
