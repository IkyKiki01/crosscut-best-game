// Attackers plant; defending bots rotate to the charge and must remain beside it to defuse.
export const SITES = [
  { name: "A", x: -11, z: -12 },
  { name: "B", x: 10, z: -12 },
];
export function createObjective(state, audio) {
  function reset() {
    const b = state.bomb;
    b.status = "carried";
    b.plant = 0;
    b.defuse = 0;
    b.fuse = 40;
    b.site = "";
  }
  function step(dt, keys) {
    if (state.phase !== "live") return;
    const b = state.bomb,
      p = state.player.position;
    if (b.status === "carried") {
      let site = null;
      for (let i = 0; i < SITES.length; i++) if (Math.hypot(p.x - SITES[i].x, p.z - SITES[i].z) < 3) site = SITES[i];
      if (site && keys.has("KeyE") && state.health > 0 && state.player.velocity.lengthSq() < 0.3) {
        b.plant += dt;
        if (b.plant >= 3) {
          b.status = "planted";
          b.site = site.name;
          b.x = p.x;
          b.z = p.z;
          state.money += 300;
          audio.hit();
        }
      } else b.plant = 0;
    } else if (b.status === "planted") {
      b.fuse = Math.max(0, b.fuse - dt);
      let defusing = false;
      for (let i = 0; i < state.bots.length; i++) {
        const bot = state.bots[i];
        if (bot.health > 0 && Math.hypot(bot.position.x - b.x, bot.position.z - b.z) < 1.8 && bot.mode !== "engage") {
          defusing = true;
          bot.mode = "defuse";
        }
      }
      b.defuse = defusing ? b.defuse + dt : 0;
      if (b.defuse >= 7) b.status = "defused";
      else if (b.fuse === 0) {
        b.status = "exploded";
        audio.shot(true);
      }
    }
  }
  return { reset, step };
}
