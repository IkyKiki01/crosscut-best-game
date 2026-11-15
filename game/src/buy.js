// buy.js — owns the buy-phase requisition panel: catalogue, prices,
// purchase resolution and the keyboard controls that drive it.
import { WEAPONS } from "./equipment.js";

const PANEL_HEADER =
  "<h2>FIELD REQUISITION</h2><p>1–9 / 0 kit · B close · Enter deploy<br>G frag · X smoke / 14s sight denial · F flash / 3s blind</p>";

const ARMOUR_PRICE = 650;
const GRENADE_PRICE = 300;
const AMMO_PRICE = 200;
const SMOKE_PRICE = 300;
const FLASH_PRICE = 200;
const KIT_PRICE = 400;

const ARMOUR_REFILL = 100;
const MAX_GRENADES = 3;
const MAX_SMOKES = 2;
const MAX_FLASHES = 2;
const AMMO_RESERVE_MULTIPLIER = 2;
const SLOT_COUNT = 10;

const EXTRA_ITEMS = [
  { id: "armour", title: "Ceramic armour / 100 AP", price: ARMOUR_PRICE },
  { id: "grenade", title: "Fragmentation grenade", price: GRENADE_PRICE },
  { id: "ammo", title: "Reserve ammunition", price: AMMO_PRICE },
  { id: "smoke", title: "Smoke / 14s line-of-sight denial", price: SMOKE_PRICE },
  { id: "flash", title: "Flash / cone blindness + reacquire", price: FLASH_PRICE },
  { id: "kit", title: "Defuse kit / 7s → 3.5s", price: KIT_PRICE },
];

/**
 * Builds the requisition panel and returns the per-tick input handler.
 * @param {object} state shared gameplay state
 * @param {{refill: Function}} weapon weapon controller used by weapon purchases
 * @returns {{step: (keys: Set<string>) => void}} buy-phase API
 */
export function createBuy(state, weapon) {
  const panel = document.getElementById("buy");
  const items = Object.keys(WEAPONS).concat(EXTRA_ITEMS.map((entry) => entry.id));
  const prices = Object.keys(WEAPONS)
    .map((weaponId) => WEAPONS[weaponId].price)
    .concat(EXTRA_ITEMS.map((entry) => entry.price));
  let slotIndex = 0;

  panel.innerHTML = PANEL_HEADER;

  /**
   * Appends one purchasable row to the panel.
   * @param {string} id catalogue key resolved by purchase()
   * @param {string} title label shown to the player
   * @param {number} price cost in dollars
   * @returns {void}
   */
  function add(id, title, price) {
    const button = document.createElement("button");
    button.innerHTML = `<span>${(++slotIndex) % SLOT_COUNT} / ${title}</span><b>$${price}</b>`;
    button.onclick = () => purchase(id, price);
    panel.appendChild(button);
  }

  for (const weaponId of Object.keys(WEAPONS)) {
    add(weaponId, WEAPONS[weaponId].name, WEAPONS[weaponId].price);
  }
  for (const entry of EXTRA_ITEMS) add(entry.id, entry.title, entry.price);

  /**
   * Charges the player and applies the purchased item.
   * @param {string} id catalogue key
   * @param {number} price cost in dollars
   * @returns {void}
   */
  function purchase(id, price) {
    if (state.phase !== "buy" || state.money < price) return;
    state.money -= price;

    if (WEAPONS[id]) {
      state.weapon.id = id;
      weapon.refill();
    } else if (id === "armour") state.armour = ARMOUR_REFILL;
    else if (id === "grenade") state.grenadeCount = Math.min(MAX_GRENADES, state.grenadeCount + 1);
    else if (id === "smoke") state.smokeCount = Math.min(MAX_SMOKES, state.smokeCount + 1);
    else if (id === "flash") state.flashCount = Math.min(MAX_FLASHES, state.flashCount + 1);
    else if (id === "kit") state.kit = true;
    else state.weapon.reserve += WEAPONS[state.weapon.id].magazine * AMMO_RESERVE_MULTIPLIER;
  }

  /**
   * Consumes the buy hotkeys for this tick and keeps the panel visibility in sync.
   * @param {Set<string>} keys pressed-key set, mutated as codes are consumed
   * @returns {void}
   */
  function step(keys) {
    if (keys.delete("KeyB")) state.buyOpen = !state.buyOpen && state.phase === "buy";
    if (keys.delete("Enter") && state.phase === "buy") state.timer = 0;
    if (state.phase !== "buy") state.buyOpen = false;
    if (state.buyOpen) {
      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        if (keys.delete("Digit" + ((itemIndex + 1) % SLOT_COUNT))) {
          purchase(items[itemIndex], prices[itemIndex]);
        }
      }
    }
    panel.hidden = !state.buyOpen;
  }

  return { step };
}
