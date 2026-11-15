// Owns weapon handling, finite ammo, hitscan and reload animation state.
import { WEAPONS } from "./equipment.js";
import { Vector3 } from "three";
import { createViewmodel } from "./viewmodel.js";

export function createWeapon(camera, game, world, random, audio) {
  const { model, flash, flashLight, magazine, hand } = createViewmodel(camera);
  const state = game.weapon;
  const origin = new Vector3(),
    direction = new Vector3(),
    right = new Vector3(),
    up = new Vector3();

  function step(dt) {
    model.scale.set(
      state.id === "shotgun" ? 1.2 : 1,
      1,
      state.id === "pistol" ? 0.55 : state.id === "smg" ? 0.8 : state.id === "shotgun" ? 1.2 : 1,
    );
    state.bloom = Math.max(0, state.bloom - dt * 0.025);
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    model.position.z = -0.42 + state.kick;
    model.rotation.x = state.kick * 2.2;
    model.rotation.z = 0;
    magazine.position.y = -0.12;
    hand.position.y = -0.29;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.55 * Math.min(1, (WEAPONS[state.id].reload - state.reloadLeft) * 2);
      const progress = 1-state.reloadLeft/WEAPONS[state.id].reload;
      const arc = Math.sin(progress*Math.PI);
      model.rotation.z = -0.4*arc;
      magazine.position.y = -0.12-0.28*arc;
      hand.position.y = -0.29-0.15*arc;
      if (state.reloadLeft === 0) {
        const need = WEAPONS[state.id].magazine - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
      }
    }
  }

  function ready() {
    return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
  }
  function fire(bots, player) {
    if (!ready()) return;
    state.mag--;
    state.bloom = Math.min(0.04, state.bloom + 0.005);
    state.cooldown = WEAPONS[state.id].gap;
    state.flash = 0.065;
    state.kick = 0.055;
    audio.shot(true);
    origin.copy(camera.position);
    direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const angle = random() * Math.PI * 2,
      radius = Math.sqrt(random()) * state.spread;
    direction
      .addScaledVector(right, Math.cos(angle) * radius)
      .addScaledVector(up, Math.sin(angle) * radius)
      .normalize();
    // Shotgun resolves independent pellets; scratch vectors are reused, including each ray.
    for (let pellet = 0; pellet < WEAPONS[state.id].pellets; pellet++) {
      if (pellet > 0) {
        direction.set(0, 0, -1).applyQuaternion(camera.quaternion);
        direction
          .addScaledVector(right, (random() - 0.5) * 0.09)
          .addScaledVector(up, (random() - 0.5) * 0.09)
          .normalize();
      }
      bots.hit(origin, direction, world.wallDistance(origin, direction), WEAPONS[state.id]);
    }
    game.noise.x = origin.x;
    game.noise.z = origin.z;
    game.noise.radius = 35;
    game.noise.time = 0.8;
    player.recoil(WEAPONS[state.id].recoil + random() * 0.006, (random() - 0.5) * 0.007);
  }
  return {
    step,
    ready,
    fire,
    reload() {
      if (state.reloadLeft > 0 || state.mag === WEAPONS[state.id].magazine || state.reserve === 0) return;
      state.reloadLeft = WEAPONS[state.id].reload;
    },
    spread(speed) {
      state.spread =
        (WEAPONS[state.id].spread +
          Math.min(1, speed / 5.2) * 0.028 +
          state.bloom +
          (game.player.onGround ? 0 : 0.045)) *
        (game.player.crouching ? 0.7 : 1);
      return state.spread;
    },
    refill() {
      state.mag = WEAPONS[state.id].magazine;
      state.reserve = WEAPONS[state.id].reserve;
      state.cooldown = 0;
      state.reloadLeft = 0;
      state.flash = 0;
      flash.visible = false;
      flashLight.intensity = 0;
      state.kick = 0;
      state.bloom = 0;
    },
  };
}
