// Owns allocation-free smoke intersection and flash cone perception queries.
export function smokeBlocks(state, origin, direction, distance) {
  for (const g of state.grenades) {
    if (g.kind !== "smoke" || g.glow <= 0) continue;
    const p = g.blast.position;
    const t = Math.max(0, Math.min(distance, (p.x-origin.x)*direction.x + (p.y-origin.y)*direction.y + (p.z-origin.z)*direction.z));
    if ((origin.x+direction.x*t-p.x)**2 + (origin.y+direction.y*t-p.y)**2 + (origin.z+direction.z*t-p.z)**2 < 16) return true;
  }
  return false;
}
export function flashBots(state, g, world, scratch) {
  for (const b of state.bots) {
    scratch.subVectors(b.position, g.mesh.position); scratch.y = 1.5-g.mesh.position.y;
    const distance = scratch.length(); scratch.normalize();
    if (distance > 14 || scratch.x*g.throwX + scratch.z*g.throwZ < 0.25 || world.wallDistance(g.mesh.position, scratch, distance) < distance-0.3) continue;
    b.blind = 3; b.mode = "blinded"; b.lost = 3; b.reaction = 0.65; b.visibleEnemy = false;
  }
}
