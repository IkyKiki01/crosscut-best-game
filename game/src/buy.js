// Owns buy-phase requisitions, prices, purchases and equipment controls.
import { WEAPONS } from "./equipment.js";
export function createBuy(state, weapon) {
  const panel = document.getElementById("buy");
  const items = Object.keys(WEAPONS).concat("armour", "grenade", "ammo", "smoke", "flash", "kit");
  const prices = [2400, 1400, 400, 1800, 650, 300, 200, 300, 200, 400];
  let index = 0;
  panel.innerHTML =
    "<h2>FIELD REQUISITION</h2><p>1–9 / 0 kit · B close · Enter deploy<br>G frag · X smoke / 14s sight denial · F flash / 3s blind</p>";
  function add(id, title, price) {
    const button = document.createElement("button");
    button.innerHTML = `<span>${(++index) % 10} / ${title}</span><b>$${price}</b>`;
    button.onclick = () => purchase(id, price);
    panel.appendChild(button);
  }
  for (const id of Object.keys(WEAPONS)) add(id, WEAPONS[id].name, WEAPONS[id].price);
  add("armour", "Ceramic armour / 100 AP", 650);
  add("grenade", "Fragmentation grenade", 300);
  add("ammo", "Reserve ammunition", 200);
  add("smoke", "Smoke / 14s line-of-sight denial", 300);
  add("flash", "Flash / cone blindness + reacquire", 200);
  add("kit", "Defuse kit / 7s → 3.5s", 400);
  function purchase(id, price) {
    if (state.phase !== "buy" || state.money < price) return;
    state.money -= price;
    if (WEAPONS[id]) {
      state.weapon.id = id;
      weapon.refill();
    } else if (id === "armour") state.armour = 100;
    else if (id === "grenade") state.grenadeCount = Math.min(3, state.grenadeCount + 1);
    else if (id === "smoke") state.smokeCount = Math.min(2, state.smokeCount + 1);
    else if (id === "flash") state.flashCount = Math.min(2, state.flashCount + 1);
    else if (id === "kit") state.kit = true;
    else state.weapon.reserve += WEAPONS[state.weapon.id].magazine * 2;
  }
  return {
    step(keys) {
      if (keys.delete("KeyB")) state.buyOpen = !state.buyOpen && state.phase === "buy";
      if (keys.delete("Enter") && state.phase === "buy") state.timer = 0;
      if (state.phase !== "buy") state.buyOpen = false;
      if (state.buyOpen)
        for (let i = 0; i < items.length; i++) if (keys.delete("Digit" + ((i + 1) % 10))) purchase(items[i], prices[i]);
      panel.hidden = !state.buyOpen;
    },
  };
}
