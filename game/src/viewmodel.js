// Owns startup allocation of the first-person weapon meshes and lighting.
import { Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, BoxGeometry, SphereGeometry, PointLight, Color, DoubleSide } from "three";
import { PALETTE } from "./palette.js";
export function createViewmodel(camera) {
  const grip = new MeshStandardMaterial({ color: new Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const body = new MeshStandardMaterial({ color: new Color(PALETTE.ink), roughness: 0.5, metalness: 0.35 });

  const model = new Group();
  const receiver = new Mesh(new BoxGeometry(0.09, 0.1, 0.42), body);
  const barrel = new Mesh(new BoxGeometry(0.045, 0.045, 0.4), grip);
  barrel.position.set(0, 0.025, -0.38);
  const stock = new Mesh(new BoxGeometry(0.075, 0.08, 0.22), grip);
  stock.position.set(0, -0.02, 0.3);
  model.add(receiver, barrel, stock);
  model.position.set(0.24, -0.2, -0.42);
  camera.add(model);

  const flash = new Mesh(
    new SphereGeometry(0.065, 6, 4),
    new MeshBasicMaterial({
      color: new Color(PALETTE.accent),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new PointLight(new Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  const port = new Mesh(new BoxGeometry(0.004, 0.036, 0.09), grip);
  port.position.set(0.047, 0.015, 0.02);
  model.add(port);
  const sight = new Mesh(new BoxGeometry(0.026, 0.04, 0.03), body);
  sight.position.set(0, 0.1, -0.25);
  model.add(sight);
  const hand = new Mesh(new BoxGeometry(0.11, 0.12, 0.3), grip);
  hand.position.set(0.22, -0.29, -0.3);
  camera.add(hand);
  const rail = new Mesh(new BoxGeometry(0.055, 0.04, 0.28), grip);
  rail.position.set(0, 0.075, -0.04);
  model.add(rail);
  const magazine = new Mesh(new BoxGeometry(0.065, 0.18, 0.11), grip);
  magazine.position.set(0, -0.12, 0.04);
  model.add(magazine);
  return { model, flash, flashLight, magazine, hand };
}
