// Owns startup allocation of the first-person weapon meshes and lighting.
import { Group, Mesh, MeshStandardMaterial, MeshBasicMaterial, BoxGeometry, SphereGeometry, CylinderGeometry, PointLight, Color, DoubleSide, CanvasTexture, Sprite, SpriteMaterial, AdditiveBlending } from "three";
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
  // Machined handguard, muzzle brake, charging handle and open reflex optic.
  function box(w,h,d,x,y,z,mat=grip,parent=model) {
    const m=new Mesh(new BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  body.color.set('#89938b');grip.color.set(PALETTE.dark);body.metalness=.65;body.roughness=.36;
  box(.1,.095,.27,0,.005,-.3,body);
  for(let i=0;i<12;i++)box(.105,.012,.012,0,.068,.16-i*.04);
  for(let i=0;i<7;i++)for(const x of [-.052,.052])box(.008,.022,.023,x,0,-.2-i*.03);
  const muzzle=new Mesh(new CylinderGeometry(.029,.029,.17,12),grip);muzzle.rotation.x=Math.PI/2;muzzle.position.set(0,.025,-.61);model.add(muzzle);
  box(.02,.02,.09,.06,.03,.05,body);
  box(.065,.16,.075,0,-.16,.13).rotation.x=-.3;
  box(.1,.14,.04,0,-.035,.4,body);
  box(.066,.013,.06,0,.1,.04);
  box(.012,.068,.025,-.034,.134,.04,body);box(.012,.068,.025,.034,.134,.04,body);
  box(.08,.012,.025,0,.17,.04,body);
  for(let i=0;i<4;i++)box(.07,.008,.1,0,-.06-i*.035,0,grip,magazine);
  const cloth=new MeshStandardMaterial({color:PALETTE.surface,roughness:.95});
  const glove=new MeshStandardMaterial({color:'#51594e',roughness:.9});
  hand.material=glove;hand.scale.set(1,.75,.45);
  box(.13,.13,.35,.25,-.34,-.06,cloth,camera).rotation.x=-.25;
  const arm=box(.12,.13,.36,-.14,-.18,-.18,cloth);arm.rotation.y=-.7;arm.rotation.x=.22;
  box(.125,.09,.14,-.045,-.075,-.31,glove);
  box(.11,.13,.3,.04,-.25,.3,cloth);
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  const grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'#ffffeb');grad.addColorStop(.2,'#fff2b9');grad.addColorStop(.5,'#ffb84bb0');grad.addColorStop(1,'#ff751000');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const sprite=new Sprite(new SpriteMaterial({map:new CanvasTexture(c),blending:AdditiveBlending,depthWrite:false}));sprite.scale.set(.4,.4,1);flash.add(sprite);
  return { model, flash, flashLight, magazine, hand };
}
