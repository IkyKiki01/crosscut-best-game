// equipment.js — owns the weapon catalogue: names, prices, capacity, damage, cadence and recoil.

/**
 * Weapon definitions keyed by weapon id. Field names are consumed by buy.js,
 * weapon.js and hud.js, so the shape here is part of the interface.
 * @type {Record<string, {name: string, price: number, magazine: number, reserve: number, damage: number, head: number, gap: number, reload: number, recoil: number, spread: number, pellets: number}>}
 */
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
