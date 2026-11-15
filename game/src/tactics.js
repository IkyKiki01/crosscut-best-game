// Owns persistent bot budgets, round buys and coordinated retake movement orders.
import { ROUTES, NODES, nextNode } from "./navigation.js";
export function equipBot(b, i, state) {
  b.money = Math.min(16000, (b.money ?? 600) + (state.round === 1 ? 0 : state.lastWon ? 1900 : 2700));
  const cycle = (state.round - 1) % 3;
  b.buy = cycle === 0 || b.money < 1400 ? "ECO" : cycle === 1 || b.money < 3450 ? "FORCE" : "FULL";
  b.weapon = b.buy === "ECO" ? "Sable pistol" : b.buy === "FORCE" ? "Mica SMG" : "Kestrel rifle";
  b.money -= b.buy === "ECO" ? 0 : b.buy === "FORCE" ? 1400 : 3450;
  b.gun.scale.z = b.buy === "ECO" ? 0.45 : b.buy === "FORCE" ? 0.75 : 1;
  b.kit = b.buy === "FULL";
  b.blind = 0; b.visibleEnemy = false; b.retakeHold = 0;
  b.retakeStarted = false; b.retreatLeft = 0;
  const route = ROUTES[(i + (state.round % 2 ? 0 : 3)) % ROUTES.length];
  b.route = route.nodes.flatMap(id => [NODES[id].x, NODES[id].z]);
}
export function retake(b, i, state, dt, move) {
  const bomb = state.bomb;
  let first = 0;
  while (first < state.bots.length && state.bots[first].health <= 0) first++;
  if (i === first) i = 0;
  b.mode = "rotate";
  const tx = bomb.x + (i === 0 ? 0 : i === 1 ? -2.2 : 2.2), tz = bomb.z + (i === 0 ? 0 : 2);
  if (Math.hypot(b.position.x-tx,b.position.z-tz) < (i === 0 ? 1.4 : 0.6)) {
    b.mode = i === 0 ? "defuse" : "hold-angle";
    b.retakeHold += dt;
    b.mesh.rotation.y = Math.PI + (i-1)*0.6;
    return;
  }
  if (!b.navigating || Math.hypot(b.position.x-b.navX,b.position.z-b.navZ)<0.3) {
    const n = nextNode(b.position.x,b.position.z,tx,tz); b.navX=n.x; b.navZ=n.z; b.navigating=true;
  }
  if (Math.hypot(b.position.x-tx,b.position.z-tz)<3) move(b,tx,tz,dt,2.7);
  else move(b,b.navX,b.navZ,dt,2.7);
}
