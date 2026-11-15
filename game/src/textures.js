// Deterministic, entirely local surface library. Colour textures are sRGB; normals are linear.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, MeshStandardMaterial, Vector2 } from 'three';
import { PALETTE } from './palette.js';
let seed = 923;
function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function texture(kind, color, normal = false) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = normal ? '#8080ff' : color; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = rand()*256, y = rand()*256, v = rand();
    g.fillStyle = normal ? `rgb(${120+v*16},${120+rand()*16},252)` : `rgba(${v>.5?'255,255,230':'5,18,20'},${rand()*.14})`;
    g.fillRect(x,y,rand()*2+0.4,rand()*2+0.4);
  }
  if (!normal) {
    for (let i=0;i<20;i++) {
      const x=rand()*256,y=rand()*256,r=10+rand()*65;
      const stain=g.createRadialGradient(x,y,0,x,y,r);
      stain.addColorStop(0,'#142c3424');stain.addColorStop(1,'#142c3400');
      g.fillStyle=stain;g.fillRect(0,0,256,256);
    }
    if (kind==='wood') for(let y=0;y<256;y+=42) {
      g.fillStyle='#142c34';g.fillRect(0,y,256,3);
      for(let i=0;i<30;i++){g.fillStyle='#dfdfcc22';g.fillRect(rand()*256,y+rand()*40,rand()*100,1);}
      g.fillStyle='#142c34';g.fillRect(9,y+8,4,4);g.fillRect(243,y+8,4,4);
    }
    if(kind==='metal') {
      g.strokeStyle='#dfdfcc65';g.lineWidth=2;g.strokeRect(3,3,250,250);
      for(let i=0;i<85;i++){g.fillStyle='#142c3470';g.fillRect(rand()*256,rand()<.5?rand()*8:248+rand()*8,rand()*13,2);}
    }
    if(kind==='hazard') for(let x=-256;x<512;x+=64){g.fillStyle=PALETTE.dark;g.beginPath();g.moveTo(x,0);g.lineTo(x+32,0);g.lineTo(x+288,256);g.lineTo(x+256,256);g.fill();}
    if(kind==='floor') {g.strokeStyle='#dfdfcc18';g.lineWidth=2;g.strokeRect(1,1,254,254);}
  }
  const t = new CanvasTexture(c);t.wrapS=t.wrapT=RepeatWrapping;
  t.colorSpace=normal?'':SRGBColorSpace;t.anisotropy=4;return t;
}
const cache = {};
export function surface(color, kind='concrete', repeat=2) {
  const key=color+kind+repeat;if(cache[key])return cache[key];
  const map=texture(kind,PALETTE[color] || color);map.repeat.set(repeat,repeat);
  const normalMap=texture('normal','#8080ff',true);normalMap.repeat.copy(map.repeat);
  return cache[key]=new MeshStandardMaterial({map,normalMap,normalScale:new Vector2(.16,.16),roughness:kind==='metal'?.56:.91,metalness:kind==='metal'?.48:0});
}
export function hazardMaterial() {return surface('accent','hazard',4);}
