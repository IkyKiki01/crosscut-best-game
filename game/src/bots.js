// Owns sentinel navigation, perception, combat and damage resolution.
import { Vector3 } from "three";
import { createActors } from "./actors.js";
import { createHitboxes } from "./hitboxes.js";
import { equipBot, retake } from "./tactics.js";
import { smokeBlocks } from "./visibility.js";
export function createBots(scene, state, world, random, audio) {
  const eye = new Vector3(),
    target = new Vector3(),
    direction = new Vector3();
  const { capsuleDistance, sphereDistance } = createHitboxes();
  createActors(scene, state);
  function reset() {
    for (let i = 0; i < state.bots.length; i++) {
      const b = state.bots[i];
      equipBot(b, i, state);
      b.position.set(b.route[0], 0, b.route[1]);
      // Cycle duties each round while retaining each sentinel's named lane route.
      const duty = (i + state.round - 1) % 3;
      b.role = duty === 0 ? "rusher" : duty === 1 ? "holder" : "rotator";
      b.navigating = false;
      b.health = 100;
      b.armour = b.buy === "ECO" ? 0 : b.buy === "FORCE" ? 35 : 100;
      b.still = 0;
      b.hold = 0;
      b.mode = "patrol";
      b.waypoint = 1;
      b.cooldown = 0.7 + i * 0.3;
      b.burst = 3;
      b.reaction = 0;
      b.lost = 0;
      b.cover = 0;
      b.flashTime = 0;
      b.gait = 0;
      b.mesh.rotation.set(0, 0, 0);
      b.left.rotation.x = 0;
      b.right.rotation.x = 0;
      b.flash.visible = false;
    }
  }
  function move(b, x, z, dt, speed) {
    const dx = x - b.position.x,
      dz = z - b.position.z,
      length = Math.hypot(dx, dz);
    if (length < 0.2) return true;
    const amount = Math.min(length, dt * speed),
      nx = b.position.x + (dx / length) * amount,
      nz = b.position.z + (dz / length) * amount;
    if (!world.overlap(nx, 0, b.position.z, 1.85, 0.3)) b.position.x = nx;
    if (!world.overlap(b.position.x, 0, nz, 1.85, 0.3)) b.position.z = nz;
    b.mesh.rotation.y = Math.atan2(-dx, -dz);
    b.gait += dt * speed * 3;
    b.left.rotation.x = Math.sin(b.gait) * 0.5;
    b.right.rotation.x = -b.left.rotation.x;
    return false;
  }
  function step(dt) {
    const p = state.player;
    for (let i = 0; i < state.bots.length; i++) {
      const b = state.bots[i];
      b.flashTime = Math.max(0, b.flashTime - dt);
      b.flash.visible = b.flashTime > 0;
      if (b.mode === "dead") {
        b.mesh.rotation.z = Math.min(1.5, b.mesh.rotation.z + dt * 5);
        continue;
      }
      if (state.phase !== "live") continue;
      b.blind = Math.max(0, b.blind - dt);
      if (b.blind > 0) { b.visibleEnemy = false; b.mode = "blinded"; move(b, b.route[0], b.route[1], dt, 1.4); continue; }
      b.cooldown -= dt;
      b.still = b.mode === "engage" || b.mode === "hold" ? Math.min(2, b.still + dt) : 0;
      const bomb = state.bomb;
      if (bomb.status === "planted" && !b.retakeStarted) { b.retakeStarted = true; b.retreatLeft = 0.9; }
      if (b.retreatLeft > 0) {
        b.retreatLeft -= dt; b.mode = "retreat"; b.visibleEnemy = false;
        move(b, b.route[2], b.route[3], dt, 3.2); continue;
      }
      if (bomb.status === "planted" && b.mode !== "engage") retake(b, i, state, dt, move);
      const noise = state.noise;
      if (
        noise.time > 0 &&
        Math.hypot(b.position.x - noise.x, b.position.z - noise.z) < noise.radius &&
        b.mode === "patrol"
      ) {
        b.mode = "alert";
        b.lastX = noise.x;
        b.lastZ = noise.z;
        b.reaction = 0.45;
      }
      eye.set(b.position.x, 1.65, b.position.z);
      target.set(p.position.x, p.position.y + p.eye * 0.8, p.position.z);
      direction.subVectors(target, eye);
      const distance = direction.length();
      direction.normalize();
      const facing = -Math.sin(b.mesh.rotation.y) * direction.x - Math.cos(b.mesh.rotation.y) * direction.z;
      const visible =
        state.health > 0 &&
        distance < 31 &&
        (facing > 0.25 || b.mode === "engage" || distance < 3) &&
        !smokeBlocks(state, eye, direction, distance) &&
        world.wallDistance(eye, direction, distance) >= distance - 0.02;
      b.visibleEnemy = visible;
      if (visible) {
        b.navigating = false;
        b.lost = 0;
        b.lastX = p.position.x;
        b.lastZ = p.position.z;
        if (b.mode !== "engage" && b.mode !== "alert" && b.mode !== "take-cover") {
          b.mode = "alert";
          b.reaction = 0.5;
        }
        if (b.mode === "alert") {
          b.reaction -= dt;
          if (b.reaction <= 0) b.mode = "engage";
        }
        b.mesh.rotation.y = Math.atan2(-direction.x, -direction.z);
        if (b.mode === "take-cover") {
          b.cover -= dt;
          move(b, b.coverX, b.coverZ, dt, 3.2);
          if (b.cover <= 0) b.mode = "engage";
        }
        if ((b.mode === "engage" || b.mode === "take-cover") && b.cooldown <= 0) {
          b.flashTime = 0.06;
          audio.shot(false);
          // Aim at the player, then test an inaccurate ray against the actual body and cover.
          direction.x += (random() - 0.5) * (0.1 - b.still * 0.035);
          direction.y += (random() - 0.5) * (0.1 - b.still * 0.035);
          direction.z += (random() - 0.5) * (0.1 - b.still * 0.035);
          direction.normalize();
          const hit = capsuleDistance(eye, direction, p.position, 0.34, 0.35, p.height - 0.28);
          if (hit < world.wallDistance(eye, direction, 100)) {
            const absorbed = Math.min(state.armour, 6);
            state.armour -= absorbed;
            state.health = Math.max(0, state.health - (12 - absorbed));
            state.damageFlash = 0.3;
            state.damageAngle = Math.atan2(b.position.x-p.position.x,b.position.z-p.position.z) + p.yaw;
            if (state.health === 0) { state.message = `SENTINEL / ${b.weapon} / YOU`; state.messageTime = 4; }
          }
          b.burst--;
          b.cooldown = b.buy === "ECO" ? 0.65 : b.burst > 0 ? 0.15 : 0.9 + random() * 0.6;
          if (!b.burst) b.burst = 3;
        }
      } else {
        b.lost += dt;
        if (smokeBlocks(state, eye, direction, distance) && bomb.status !== "planted") {
          b.mode = b.role === "rusher" ? "smoke-push" : "hold";
          if (b.role === "rusher") move(b, b.route[b.waypoint*2], b.route[b.waypoint*2+1], dt, 1.5);
          continue;
        }
        if ((b.mode === "engage" || b.mode === "alert" || b.mode === "take-cover") && b.lost < 2.5) {
          b.mode = "alert";
          move(b, b.lastX, b.lastZ, dt, 2);
        } else {
          if (state.bomb.status === "planted") continue;
          if (b.hold > 0) {
            b.mode = "hold";
            b.hold -= dt;
            continue;
          }
          b.mode = "patrol";
          const j = b.waypoint * 2;
          if (move(b, b.route[j], b.route[j + 1], dt, b.role === "rusher" ? 2.8 : 2.1)) {
            b.waypoint = (b.waypoint + 1) % (b.route.length / 2);
            if (b.role === "holder") b.hold = 3;
          }
        }
      }
    }
  }
  function hit(origin, dir, wall, weapon) {
    let selected = null,
      nearest = wall,
      headshot = false;
    for (let i = 0; i < state.bots.length; i++) {
      const b = state.bots[i];
      if (b.health <= 0) continue;
      const body = capsuleDistance(origin, dir, b.position, 0.3, 0.48, 1.22);
      const head = sphereDistance(origin, dir, b.position);
      const t = Math.min(body, head);
      if (t < nearest) {
        nearest = t;
        selected = b;
        headshot = head < body;
      }
    }
    if (!selected) return;
    const damage = weapon.damage * Math.max(0.6, 1 - nearest / 100) * (headshot ? weapon.head : 1);
    const absorbed = Math.min(selected.armour, damage * 0.35);
    selected.armour -= absorbed;
    state.stats.damage += Math.min(selected.health, damage - absorbed);
    selected.health -= damage - absorbed;
    state.hit = 0.14;
    const hitPoint = origin.clone().addScaledVector(dir, nearest);
    world.effects?.burst(hitPoint, true);
    audio.hit();
    if (selected.health <= 0) {
      state.message = `YOU  /  ${weapon.name} ${headshot ? " / HEADSHOT" : ""}  /  SENTINEL`;
      state.messageTime = 4;
      selected.mode = "dead";
      state.score.kills++;
      state.money += 300;
      state.hit = 0.25;
    } else takeCover(selected);
    return hitPoint;
  }
  function takeCover(b) {
    b.mode = "take-cover";
    b.cover = 1.6;
    b.lastX = state.player.position.x;
    b.lastZ = state.player.position.z;
    b.coverX = b.route[b.waypoint * 2];
    b.coverZ = b.route[b.waypoint * 2 + 1];
    eye.set(b.lastX, state.player.position.y + state.player.eye, b.lastZ);
    let nearest = Infinity;
    for (let j = 0; j < b.route.length; j += 2) {
      target.set(b.route[j], 1.65, b.route[j + 1]);
      direction.subVectors(target, eye);
      const distance = direction.length();
      direction.normalize();
      const travel = Math.hypot(target.x - b.position.x, target.z - b.position.z);
      if (travel < nearest && world.wallDistance(eye, direction, distance) < distance - 0.1) {
        nearest = travel;
        b.coverX = target.x;
        b.coverZ = target.z;
      }
    }
  }
  function remaining() {
    let count = 0;
    for (let i = 0; i < state.bots.length; i++) if (state.bots[i].health > 0) count++;
    return count;
  }
  return { reset, step, hit, remaining };
}
