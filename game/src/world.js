// Owns map construction and allocation-free collision and sight queries.
import { createScenery } from "./scenery.js";
import { surface } from './textures.js';
import {
  Vector3,
  Group,
  Mesh,
  BoxGeometry,
  Box3,
  Ray,
  HemisphereLight,
  DirectionalLight,
} from "three";
import { PALETTE } from "./palette.js";
export function createWorld(scene) {
  const colliders = [],
    materials = {},
    group = new Group();
  scene.add(group);
  for (const name of Object.keys(PALETTE))
    materials[name] = surface(name, name==='muted'?'wood':name==='rust'||name==='teal'?'metal':name==='hairline'?'floor':'concrete',name==='hairline'?14:3);
  function box(w, h, d, x, y, z, color = "surface") {
    const mesh = new Mesh(new BoxGeometry(w, h, d), materials[color]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new Box3().setFromObject(mesh));
  }
  box(32, 0.4, 36, 0, -0.2, 0, "hairline");
  box(0.5, 5, 36, -16, 2.5, 0);
  box(0.5, 5, 36, 16, 2.5, 0);
  box(32, 5, 0.5, 0, 2.5, -18);
  box(32, 5, 0.5, 0, 2.5, 18);
  // Broken central spine makes two lanes connected at both ends and through a cross-cut.
  box(3, 4.5, 9, 0, 2.25, 2);
  box(3, 4.5, 6, 0, 2.25, -11);
  box(10, 0.4, 9, -10, 4.3, -2, "ink");
  box(0.5, 4.5, 5, -5, 2.25, -9);
  box(0.5, 4.5, 5, -5, 2.25, 5);
  box(3, 1.1, 2, -10, 0.55, -3, "muted");
  box(2.4, 1.3, 2.4, 8, 0.65, 1, "muted");
  box(2, 2.5, 3, 12, 1.25, -7);
  box(3, 1, 2, 5, 0.5, -11, "muted");
  box(3, 1, 1.5, -8, 0.5, 9, "muted");
  box(2, 1.2, 2, 10, 0.6, 10, "muted");
  // West elevated service catwalk with walkable steps, low parapet and rail posts.
  box(3, 1, 5, -14, 0.5, -13, "teal");
  for (let i=0;i<10;i++) box(2, (i+1)*0.1, 0.4, -14, (i+1)*0.05, -6.9-i*0.4, "hairline");
  box(0.15, 0.6, 5, -15.4, 1.3, -13, "muted");
  for (let i=0;i<5;i++) box(0.08, 1, 0.08, -15.4, 1.5, -15+i, "ink");
  box(0.1, 0.1, 5, -15.4, 2, -13, "accent");
  // Low blast wall and corrugated container preserve both crosscut chokepoints.
  box(4, 0.8, 0.5, -8, 0.4, 2, "teal");
  box(2.4, 2.5, 4, 12, 1.25, 5, "rust");
  // A shallow stepped ramp reaches the rear observation deck; each rise is walkable.
  box(6, 1, 3, 8, 0.5, -16.2);
  for (let i = 0; i < 10; i++) box(3, (i + 1) * 0.1, 0.4, 8, (i + 1) * 0.05, -10.9 - i * 0.4, "hairline");
  // Lane markings are visual only.
  for (let z = -15; z < 16; z += 3) {
    const mesh = new Mesh(new BoxGeometry(0.12, 0.012, 1), materials.accent);
    mesh.position.set(4, 0.012, z);
    group.add(mesh);
  }
  scene.add(new HemisphereLight('#b6d9ec', PALETTE.dark, 1.3));
  const sun = new DirectionalLight('#ffe1ab', 3.1);
  sun.position.set(-15, 23, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, far: 70 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 3;
  scene.add(sun);
  const scenery = createScenery(scene);
  const probe = new Box3(),
    ray = new Ray(),
    point = new Vector3();
  function overlap(x, y, z, height, radius = 0.34) {
    probe.min.set(x - radius, y + 0.015, z - radius);
    probe.max.set(x + radius, y + height - 0.015, z + radius);
    for (let i = 0; i < colliders.length; i++) if (probe.intersectsBox(colliders[i])) return colliders[i];
    return null;
  }
  function wallDistance(origin, direction, limit = 100) {
    ray.set(origin, direction);
    let nearest = limit;
    for (let i = 0; i < colliders.length; i++) {
      if (ray.intersectBox(colliders[i], point)) nearest = Math.min(nearest, origin.distanceTo(point));
    }
    return nearest;
  }
  function supportHeight(x, z, maximum, radius = 0.34) {
    let highest = -Infinity;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (
        x + radius > box.min.x &&
        x - radius < box.max.x &&
        z + radius > box.min.z &&
        z - radius < box.max.z &&
        box.max.y <= maximum
      )
        highest = Math.max(highest, box.max.y);
    }
    return highest;
  }
  return { colliders, overlap, wallDistance, supportHeight, render: scenery.render };
}
