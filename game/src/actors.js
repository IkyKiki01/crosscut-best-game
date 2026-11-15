// Owns sentinel geometry and startup actor records.
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  MeshBasicMaterial,
  CapsuleGeometry,
  SphereGeometry,
  BoxGeometry,
} from "three";
import { PALETTE } from "./palette.js";
import { ROUTES, NODES } from "./navigation.js";
// Stylised relay sentinels; all geometry and hit-state records are allocated at startup.
export function createActors(scene, state) {
  const bodyMat = new MeshStandardMaterial({ color: PALETTE.dark, roughness: 0.7 });
  const darkMat = new MeshStandardMaterial({ color: PALETTE.surface });
  const headMat = new MeshStandardMaterial({ color: PALETTE.accent });
  const bodyGeo = new CapsuleGeometry(0.29, 0.65, 4, 8),
    headGeo = new SphereGeometry(0.2, 12, 8);
  const gunGeo = new BoxGeometry(0.12, 0.13, 0.7),
    legGeo = new BoxGeometry(0.18, 0.6, 0.22);
  for (let i = 0; i < 3; i++) {
    const mesh = new Group();
    const body = new Mesh(bodyGeo, bodyMat);
    body.position.y = 1;
    const head = new Mesh(headGeo, headMat);
    head.position.y = 1.65;
    const gun = new Mesh(gunGeo, darkMat);
    gun.position.set(0.28, 1.2, -0.36);
    const left = new Mesh(legGeo, darkMat);
    left.position.set(-0.17, 0.3, 0);
    const right = new Mesh(legGeo, darkMat);
    right.position.set(0.17, 0.3, 0);
    const flash = new Mesh(new SphereGeometry(0.13, 5, 4), new MeshBasicMaterial({ color: PALETTE.accent }));
    flash.position.set(0.28, 1.2, -0.76);
    flash.visible = false;
    const vest = new Mesh(
      new BoxGeometry(0.48, 0.49, 0.23),
      new MeshStandardMaterial({ color: PALETTE.rust, roughness: 0.8 }),
    );
    vest.position.set(0, 1.06, -0.30);
    const visor = new Mesh(new BoxGeometry(0.31, 0.1, 0.13), darkMat);
    visor.position.set(0, 1.68, -0.23);
    const armGeo = new BoxGeometry(0.17, 0.49, 0.18),
      armL = new Mesh(armGeo, bodyMat),
      armR = new Mesh(armGeo, bodyMat);
    armL.position.set(-0.34, 1.1, -0.08);
    armR.position.set(0.34, 1.1, -0.2);
    armR.rotation.x = -0.8;
    const badge = new Mesh(new BoxGeometry(0.13, 0.05, 0.02), headMat);
    badge.position.set(-0.1, 1.18, -0.31);
    mesh.add(body, head, gun, left, right, flash, vest, visor, armL, armR, badge);
    mesh.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    scene.add(mesh);
    state.bots.push({
      mesh,
      left,
      right,
      flash,
      gun,
      position: mesh.position,
      health: 100,
      mode: "patrol",
      waypoint: 0,
      route: ROUTES[i].nodes.flatMap((id) => [NODES[id].x, NODES[id].z]),
      role: ["rusher", "holder", "rotator"][i],
      armour: 50,
      still: 0,
      hold: 0,
      navX: 0,
      navZ: 0,
      navigating: false,
      cooldown: 0,
      burst: 3,
      reaction: 0,
      lost: 0,
      cover: 0,
      coverX: 0,
      coverZ: 0,
      flashTime: 0,
      gait: 0,
      lastX: 0,
      lastZ: 0,
    });
  }
}
