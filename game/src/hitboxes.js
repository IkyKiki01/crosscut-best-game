import { Ray, Sphere, Vector3 } from "three";
// Reusable query scratch: neither head-sphere nor body-capsule tests allocate while firing.
export function createHitboxes() {
  const ray = new Ray(),
    center = new Vector3(),
    sphere = new Sphere(center, 0.2),
    point = new Vector3();
  // Ray against a vertical capsule: finite cylinder plus its spherical endcaps.
  function capsuleDistance(origin, dir, position, radius, low, high) {
    const ox = origin.x - position.x,
      oz = origin.z - position.z;
    const a = dir.x * dir.x + dir.z * dir.z,
      h = ox * dir.x + oz * dir.z;
    const c = ox * ox + oz * oz - radius * radius;
    let nearest = Infinity;
    const discriminant = h * h - a * c;
    if (a > 0.000001 && discriminant >= 0) {
      const t = (-h - Math.sqrt(discriminant)) / a,
        y = origin.y + dir.y * t - position.y;
      if (t >= 0 && y >= low && y <= high) nearest = t;
    }
    ray.set(origin, dir);
    sphere.radius = radius;
    center.set(position.x, position.y + low, position.z);
    if (ray.intersectSphere(sphere, point)) nearest = Math.min(nearest, origin.distanceTo(point));
    center.y = position.y + high;
    if (ray.intersectSphere(sphere, point)) nearest = Math.min(nearest, origin.distanceTo(point));
    return nearest;
  }

  function sphereDistance(origin, dir, position) {
    ray.set(origin, dir);
    sphere.radius = 0.2;
    center.set(position.x, position.y + 1.65, position.z);
    return ray.intersectSphere(sphere, point) ? origin.distanceTo(point) : Infinity;
  }
  return { capsuleDistance, sphereDistance };
}
