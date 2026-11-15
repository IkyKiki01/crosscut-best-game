// Immutable weapon definitions: each purchase changes damage, handling and capacity together.
export const WEAPONS = {
  rifle: {
    name: "Kestrel / rifle",
    price: 2400,
    magazine: 30,
    reserve: 90,
    damage: 36,
    head: 3,
    gap: 0.105,
    reload: 1.9,
    recoil: 0.021,
    spread: 0.0015,
    pellets: 1,
  },
  smg: {
    name: "Mica / SMG",
    price: 1400,
    magazine: 32,
    reserve: 128,
    damage: 23,
    head: 2.7,
    gap: 0.065,
    reload: 1.5,
    recoil: 0.012,
    spread: 0.004,
    pellets: 1,
  },
  pistol: {
    name: "Sable / pistol",
    price: 400,
    magazine: 12,
    reserve: 48,
    damage: 42,
    head: 3.2,
    gap: 0.28,
    reload: 1.25,
    recoil: 0.035,
    spread: 0.001,
    pellets: 1,
  },
  shotgun: {
    name: "Breakwater / shotgun",
    price: 1800,
    magazine: 6,
    reserve: 30,
    damage: 15,
    head: 1.8,
    gap: 0.85,
    reload: 2.6,
    recoil: 0.07,
    spread: 0.045,
    pellets: 8,
  },
};
export function createBuy(state, weapon) {
  const panel = document.getElementById("buy");
  const items = Object.keys(WEAPONS).concat("armour", "grenade", "ammo");
  const prices = [2400, 1400, 400, 1800, 650, 300, 200];
  let index = 0;
  panel.innerHTML =
    "<h2>FIELD REQUISITION</h2><p>BUY PHASE ONLY / Press 1–7 to requisition · B to close · Enter to deploy</p>";
  function add(id, title, price) {
    const button = document.createElement("button");
    button.innerHTML = `<span>${++index} / ${title}</span><b>$${price}</b>`;
    button.onclick = () => purchase(id, price);
    panel.appendChild(button);
  }
  for (const id of Object.keys(WEAPONS)) add(id, WEAPONS[id].name, WEAPONS[id].price);
  add("armour", "Ceramic armour / 100 AP", 650);
  add("grenade", "Fragmentation grenade", 300);
  add("ammo", "Reserve ammunition", 200);
  function purchase(id, price) {
    if (state.phase !== "buy" || state.money < price) return;
    state.money -= price;
    if (WEAPONS[id]) {
      state.weapon.id = id;
      weapon.refill();
    } else if (id === "armour") state.armour = 100;
    else if (id === "grenade") state.grenadeCount = Math.min(3, state.grenadeCount + 1);
    else state.weapon.reserve += WEAPONS[state.weapon.id].magazine * 2;
  }
  return {
    step(keys) {
      if (keys.delete("KeyB")) state.buyOpen = !state.buyOpen && state.phase === "buy";
      if (keys.delete("Enter") && state.phase === "buy") state.timer = 0;
      if (state.phase !== "buy") state.buyOpen = false;
      if (state.buyOpen)
        for (let i = 0; i < items.length; i++) if (keys.delete("Digit" + (i + 1))) purchase(items[i], prices[i]);
      panel.hidden = !state.buyOpen;
    },
  };
}
