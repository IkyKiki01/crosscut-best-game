// effects.js — owns the transient impact particles and tracer beams, their
// pooling-free lifetime bookkeeping and their disposal.
import {
  Group,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Vector3,
  CylinderGeometry,
  AdditiveBlending,
} from "three";

const SPARK_COLOR = "#ffcb76";
const DUST_COLOR = "#a8ada0";
const BLOOD_COLOR = "#9b2925";

const BURST_PARTICLE_COUNT = 17;
const BURST_SPARK_COUNT = 8;
const BURST_VELOCITY_SPREAD = 2;
const BURST_VELOCITY_LIFT = 0.2;
const BURST_SPAWN_OFFSET = 0.08;
const SPARK_SCALE = 0.018;
const DUST_SCALE_BASE = 0.035;
const DUST_SCALE_JITTER = 0.035;
const SPARK_LIFETIME = 0.28;
const DUST_LIFETIME = 0.65;
const GRAVITY = 1.5;

const TRACER_RADIUS = 0.008;
const TRACER_SEGMENTS = 5;
const TRACER_LIFETIME = 0.09;
const TRACER_AXIS = new Vector3(0, 1, 0);

const MAX_FRAME_STEP = 0.05;

/**
 * Builds the impact particle system and returns its spawn and render hooks.
 * @param {import('three').Scene} scene scene the effect group is attached to
 * @returns {{reset: () => void, burst: Function, shot: Function, render: Function}} effect API
 */
export function createEffects(scene) {
  const group = new Group();
  scene.add(group);
  const active = [];
  const sharedSphere = new SphereGeometry(1, 5, 4);
  const materials = {
    spark: new MeshBasicMaterial({
      color: SPARK_COLOR,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
    dust: new MeshBasicMaterial({ color: DUST_COLOR, transparent: true, depthWrite: false }),
    blood: new MeshBasicMaterial({ color: BLOOD_COLOR, transparent: true, depthWrite: false }),
  };
  let clock = 0;
  let previousTime = 0;

  /**
   * Registers a freshly created particle mesh for ageing.
   * @param {import('three').Mesh} mesh particle mesh already added to the group
   * @param {import('three').Vector3} velocity metres per second
   * @param {number} life lifetime in seconds
   * @returns {void}
   */
  function add(mesh, velocity, life) {
    group.add(mesh);
    active.push({ mesh, velocity, life, born: clock });
  }

  /**
   * Removes a particle from the scene and frees its per-particle resources.
   * @param {object} entry particle bookkeeping record
   * @returns {void}
   */
  function release(entry) {
    group.remove(entry.mesh);
    if (entry.mesh.geometry !== sharedSphere) entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();
  }

  /**
   * Sprays a short-lived cluster of sparks, dust or blood at a point.
   * @param {import('three').Vector3} point impact location
   * @param {boolean} [blood=false] true for a blood spray instead of debris
   * @returns {void}
   */
  function burst(point, blood = false) {
    for (let particleIndex = 0; particleIndex < BURST_PARTICLE_COUNT; particleIndex++) {
      const kind = blood ? "blood" : particleIndex < BURST_SPARK_COUNT ? "spark" : "dust";
      const mesh = new Mesh(sharedSphere, materials[kind].clone());
      const velocity = new Vector3(
        (Math.random() - 0.5) * BURST_VELOCITY_SPREAD,
        (Math.random() - BURST_VELOCITY_LIFT) * BURST_VELOCITY_SPREAD,
        (Math.random() - 0.5) * BURST_VELOCITY_SPREAD,
      );
      mesh.position.copy(point).addScaledVector(velocity, BURST_SPAWN_OFFSET);
      mesh.scale.setScalar(
        kind === "spark" ? SPARK_SCALE : DUST_SCALE_BASE + Math.random() * DUST_SCALE_JITTER,
      );
      add(mesh, velocity, kind === "spark" ? SPARK_LIFETIME : DUST_LIFETIME);
    }
  }

  /**
   * Empties the effect pool and rewinds the internal clock.
   * @returns {void}
   */
  function reset() {
    for (const entry of active) release(entry);
    active.length = 0;
    clock = 0;
    previousTime = 0;
  }

  /**
   * Spawns a short tracer cylinder between two points.
   * @param {import('three').Vector3} start muzzle position
   * @param {import('three').Vector3} end impact position
   * @returns {void}
   */
  function shot(start, end) {
    const delta = new Vector3().subVectors(end, start);
    const mesh = new Mesh(
      new CylinderGeometry(TRACER_RADIUS, TRACER_RADIUS, delta.length(), TRACER_SEGMENTS),
      materials.spark.clone(),
    );
    mesh.position.copy(start).addScaledVector(delta, 0.5);
    mesh.quaternion.setFromUnitVectors(TRACER_AXIS, delta.normalize());
    add(mesh, new Vector3(), TRACER_LIFETIME);
  }

  /**
   * Ages, fades and expires every live particle.
   * @param {number} time current simulation time in seconds
   * @returns {void}
   */
  function render(time) {
    const deltaTime = Math.max(0, Math.min(MAX_FRAME_STEP, time - previousTime));
    previousTime = time;
    clock += deltaTime;
    for (let index = active.length - 1; index >= 0; index--) {
      const entry = active[index];
      const age = clock - entry.born;
      if (age > entry.life) {
        release(entry);
        active.splice(index, 1);
        continue;
      }
      entry.mesh.material.opacity = 1 - age / entry.life;
      entry.mesh.position.addScaledVector(entry.velocity, deltaTime);
      entry.velocity.y -= deltaTime * GRAVITY;
    }
  }

  return { reset, burst, shot, render };
}
